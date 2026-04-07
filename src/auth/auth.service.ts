import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '../environments/environment';
import {
  AuthResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
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
            this.setSession(response.data.token, response.data.user);
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
  // Logout
  // ============================================

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  // ============================================
  // Session Management
  // ============================================

  private setSession(token: string, user: User): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
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
    return localStorage.getItem('token');
  }

  hasRole(role: UserRole): boolean {
    return this.currentUser()?.role === role;
  }

  isClient(): boolean {
    return this.hasRole(UserRole.CLIENT);
  }

  isBusinessOwner(): boolean {
    return this.hasRole(UserRole.BUSINESS_OWNER);
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }
}
