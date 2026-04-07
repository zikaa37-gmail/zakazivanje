export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const createSuccessResponse = <T>(data: T, meta?: any): ApiResponse<T> => ({
  success: true,
  data,
  ...(meta && { meta }),
});

export const createErrorResponse = (message: string, code?: string): ApiResponse => ({
  success: false,
  error: { message, code },
});
