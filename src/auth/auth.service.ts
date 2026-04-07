import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '../environments/environment';
import {
  AuthResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterBusinessRequest,
  RegisterClientRequest,
  RegisterResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  User,
  UserRole,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from './auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  isLoading = signal<boolean>(false);

  constructor() {
    this.loadUserFromStorage();
  }

  // ============================================
  // Login
  // ============================================

  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.isLoading.set(true);

    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap({
        next: (response) => {
          if (response.success) {
            this.setSession(
              response.data.accessToken,
              response.data.refreshToken,
              response.data.user,
            );
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      }),
    );
  }

  // ============================================
  // Register Client
  // ============================================

  registerClient(data: RegisterClientRequest): Observable<RegisterResponse> {
    this.isLoading.set(true);

    return this.http.post<RegisterResponse>(`${environment.apiUrl}/auth/register`, data).pipe(
      tap({
        next: () => {
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      }),
    );
  }

  // ============================================
  // Register Business Owner
  // ============================================

  registerBusiness(data: RegisterBusinessRequest): Observable<RegisterResponse> {
    this.isLoading.set(true);

    return this.http
      .post<RegisterResponse>(`${environment.apiUrl}/auth/register/business`, data)
      .pipe(
        tap({
          next: () => {
            this.isLoading.set(false);
          },
          error: () => {
            this.isLoading.set(false);
          },
        }),
      );
  }

  // ============================================
  // Forgot Password
  // ============================================

  forgotPassword(data: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    this.isLoading.set(true);

    return this.http
      .post<ForgotPasswordResponse>(`${environment.apiUrl}/auth/forgot-password`, data)
      .pipe(
        tap({
          next: () => {
            this.isLoading.set(false);
          },
          error: () => {
            this.isLoading.set(false);
          },
        }),
      );
  }

  // ============================================
  // Reset Password
  // ============================================

  resetPassword(data: ResetPasswordRequest): Observable<ResetPasswordResponse> {
    this.isLoading.set(true);

    return this.http
      .post<ResetPasswordResponse>(`${environment.apiUrl}/auth/reset-password`, data)
      .pipe(
        tap({
          next: () => {
            this.isLoading.set(false);
          },
          error: () => {
            this.isLoading.set(false);
          },
        }),
      );
  }

  // ============================================
  // Verify Email
  // ============================================

  verifyEmail(data: VerifyEmailRequest): Observable<VerifyEmailResponse> {
    this.isLoading.set(true);

    return this.http
      .post<VerifyEmailResponse>(`${environment.apiUrl}/auth/verify-email`, data)
      .pipe(
        tap({
          next: () => {
            this.isLoading.set(false);
          },
          error: () => {
            this.isLoading.set(false);
          },
        }),
      );
  }

  // ============================================
  // Refresh Access Token
  // ============================================

  refreshAccessToken(): Observable<RefreshTokenResponse> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('Refresh token nije dostupan');
    }

    const data: RefreshTokenRequest = { refreshToken };

    return this.http
      .post<RefreshTokenResponse>(`${environment.apiUrl}/auth/refresh-token`, data)
      .pipe(
        tap({
          next: (response) => {
            if (response.success) {
              this.updateTokens(response.data.accessToken, response.data.refreshToken);
            }
          },
        }),
      );
  }

  // ============================================
  // Logout
  // ============================================

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  // ============================================
  // Session Management
  // ============================================

  private setSession(accessToken: string, refreshToken: string, user: User): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  private updateTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private loadUserFromStorage(): void {
    const accessToken = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');

    if (accessToken && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        this.currentUser.set(user);
      } catch {
        this.logout();
      }
    }
  }

  // ============================================
  // Helpers
  // ============================================

  isAuthenticated(): boolean {
    return !!this.currentUser();
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  hasRole(role: UserRole): boolean {
    return this.currentUser()?.role === role;
  }

  isClient(): boolean {
    return this.hasRole(UserRole.CLIENT);
  }

  isProvider(): boolean {
    return this.hasRole(UserRole.PROVIDER);
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }
}
