import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../shared/types/api.types';
import { JwtPayload, verifyAccessToken } from '../../shared/utils/jwt.util';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token nije pronađen', 401);
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      throw new AppError('Nevažeći ili istekao token', 401);
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Neautorizovan pristup', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Nemate dozvolu za ovu akciju', 403));
    }

    next();
  };
};
