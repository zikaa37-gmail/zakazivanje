// ============================================
// Auth Models & Types
// ============================================

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  whatsappNumber?: string;
  avatar?: string;
  role: UserRole;
  isEmailVerified: boolean;
  preferredCommunication: CommunicationType;
  createdAt: string;
  lastLogin?: string;
}

export enum UserRole {
  CLIENT = 'client',
  BUSINESS_OWNER = 'business_owner',
  ADMIN = 'admin',
}

export enum CommunicationType {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  BOTH = 'both',
}

// ============================================
// Auth Requests
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterClientRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  whatsappNumber?: string;
  preferredCommunication?: CommunicationType;
}

export interface RegisterBusinessRequest extends RegisterClientRequest {
  businessName: string;
  businessCategory: string;
  pib?: string;
  registrationNumber?: string;
  businessPhone?: string;
  businessWhatsapp?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// ============================================
// Auth Responses
// ============================================

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
  message?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data?: {
    userId: number;
  };
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
  };
}
