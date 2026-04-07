import { RefreshToken, User } from '../../core/database/models';
import { CommunicationType, UserRole } from '../../core/database/models/User.model';
import { AppError } from '../../shared/types/api.types';
import {
  generateAccessToken,
  generateEmailVerificationToken,
  generateRefreshToken,
  generateResetPasswordToken,
  getRefreshTokenExpiry,
  JwtPayload,
} from '../../shared/utils/jwt.util';
import { comparePassword, hashPassword } from '../../shared/utils/password.util';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterClientData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  whatsappNumber?: string;
  preferredCommunication?: CommunicationType;
}

export interface RegisterBusinessData extends RegisterClientData {
  businessName: string;
  businessCategory: string;
  pib?: string;
  registrationNumber?: string;
  businessPhone?: string;
  businessWhatsapp?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  async login(credentials: LoginCredentials): Promise<{ tokens: AuthTokens; user: User }> {
    const { email, password } = credentials;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new AppError('Pogrešan email ili lozinka', 401);
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new AppError('Pogrešan email ili lozinka', 401);
    }

    user.lastLogin = new Date();
    await user.save();

    const tokens = await this.generateTokens(user);

    const userWithoutPassword = user.toJSON();
    delete (userWithoutPassword as any).password;

    return { tokens, user: userWithoutPassword as User };
  }

  async registerClient(data: RegisterClientData): Promise<{ userId: number }> {
    const existingUser = await User.findOne({ where: { email: data.email } });

    if (existingUser) {
      throw new AppError('Korisnik sa ovim email-om već postoji', 400);
    }

    const hashedPassword = await hashPassword(data.password);

    const emailVerificationToken = generateEmailVerificationToken();
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

    const user = await User.create({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      whatsappNumber: data.whatsappNumber,
      role: UserRole.CLIENT,
      isEmailVerified: false,
      preferredCommunication: data.preferredCommunication || CommunicationType.EMAIL,
      emailVerificationToken,
      emailVerificationExpires,
    });

    return { userId: user.id };
  }

  async registerBusiness(data: RegisterBusinessData): Promise<{ userId: number }> {
    const existingUser = await User.findOne({ where: { email: data.email } });

    if (existingUser) {
      throw new AppError('Korisnik sa ovim email-om već postoji', 400);
    }

    const hashedPassword = await hashPassword(data.password);

    const emailVerificationToken = generateEmailVerificationToken();
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

    const user = await User.create({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      whatsappNumber: data.whatsappNumber,
      role: UserRole.PROVIDER,
      isEmailVerified: false,
      preferredCommunication: data.preferredCommunication || CommunicationType.EMAIL,
      emailVerificationToken,
      emailVerificationExpires,
    });

    return { userId: user.id };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return;
    }

    const resetPasswordToken = generateResetPasswordToken();
    const resetPasswordExpires = new Date();
    resetPasswordExpires.setHours(resetPasswordExpires.getHours() + 1);

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
      },
    });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new AppError('Token je nevažeći ili je istekao', 400);
    }

    const hashedPassword = await hashPassword(newPassword);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
  }

  async verifyEmail(token: string): Promise<{ user: User }> {
    const user = await User.findOne({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      throw new AppError('Token je nevažeći ili je istekao', 400);
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const userWithoutPassword = user.toJSON();
    delete (userWithoutPassword as any).password;

    return { user: userWithoutPassword as User };
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    const tokenRecord = await RefreshToken.findOne({
      where: { token: refreshToken },
      include: [{ model: User, as: 'user' }],
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new AppError('Nevažeći ili istekao refresh token', 401);
    }

    const user = (tokenRecord as any).user;

    if (!user) {
      throw new AppError('Korisnik nije pronađen', 404);
    }

    await tokenRecord.destroy();

    const newTokens = await this.generateTokens(user);

    return newTokens;
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken();
    const expiresAt = getRefreshTokenExpiry();

    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}

export default new AuthService();
