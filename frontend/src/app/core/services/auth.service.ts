import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_LOADER } from '../interceptors/loader.interceptor';
import { CommunicationChannel, User } from '../models/user.model';
import { MarketingService } from './marketing.service';

const ACCESS_TOKEN_KEY = 'zk_access_token';
const REFRESH_TOKEN_KEY = 'zk_refresh_token';
const USER_KEY = 'zk_user';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface MessageResponse {
  message: string;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  whatsapp_number: string | null;
  preferred_communication: CommunicationChannel;
  website?: string;
  started_at?: number;
  next?: string | null;
}

const quiet = () => ({ context: new HttpContext().set(SKIP_LOADER, true) });

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSignal = signal<User | null>(this.readStoredUser());

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly isOwner = computed(() => this.currentUserSignal()?.role === 'owner');
  readonly isStaff = computed(() => ['owner', 'manager', 'worker'].includes(this.currentUserSignal()?.role ?? ''));
  readonly isOfficeWorker = computed(() => this.currentUserSignal()?.role === 'manager');
  readonly isServiceWorker = computed(() => this.currentUserSignal()?.role === 'worker');
  readonly isManager = computed(() => this.isOwner() || this.isOfficeWorker());
  readonly isSuspended = computed(() => this.currentUserSignal()?.suspended === true);
  readonly homeUrl = computed(() => (this.isStaff() ? '/admin' : this.isSuspended() ? '/suspended' : this.isAuthenticated() ? '/my-appointments' : '/'));

  isRefreshing = false;
  readonly refreshedAccessToken = new BehaviorSubject<string | null>(null);

  private http = inject(HttpClient);
  private router = inject(Router);
  private marketing = inject(MarketingService);
  private api = `${environment.apiUrl}/auth`;

  login(email: string, password: string): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${this.api}/login`, { email, password, referral: this.marketing.referral() }, quiet())
      .pipe(tap((res) => this.storeSession(res)));
  }

  register(payload: RegisterPayload): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/register`, { ...payload, referral: this.marketing.referral() }, quiet());
  }

  verifyEmail(token: string): Observable<MessageResponse & Partial<TokenResponse>> {
    return this.http
      .post<MessageResponse & Partial<TokenResponse>>(`${this.api}/verify-email`, { token }, quiet())
      .pipe(tap((res) => res.access_token && res.refresh_token && res.user && this.storeSession(res as TokenResponse)));
  }

  resendVerification(email: string, next: string | null = null): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/resend-verification`, { email, next }, quiet());
  }

  refreshTokens(): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${this.api}/refresh`, { refresh_token: this.getRefreshToken() }, quiet())
      .pipe(tap((res) => this.storeSession(res)));
  }

  updateProfile(payload: Omit<RegisterPayload, 'email' | 'password'>): Observable<User> {
    return this.http.put<User>(`${this.api}/profile`, payload).pipe(tap((user) => this.storeUser(user)));
  }

  setFavoriteStaff(staffMemberId: number | null): Observable<User> {
    return this.http.put<User>(`${this.api}/favorite-staff`, { staff_member_id: staffMemberId }).pipe(tap((user) => this.storeUser(user)));
  }

  loadMe(): Observable<User> {
    return this.http.get<User>(`${this.api}/me`).pipe(tap((user) => this.storeUser(user)));
  }

  forgotPassword(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/forgot-password`, { email }, quiet());
  }

  resetPassword(payload: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/reset-password`, payload, quiet());
  }

  changePassword(payload: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/change-password`, payload);
  }

  logout(redirectTo = '/login'): void {
    this.http.post(`${this.api}/logout`, { refresh_token: this.getRefreshToken() }, quiet()).subscribe({
      complete: () => this.clearSession(redirectTo),
      error: () => this.clearSession(redirectTo),
    });
  }

  clearSession(redirectTo = '/login'): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSignal.set(null);
    this.router.navigateByUrl(redirectTo);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private storeSession(res: TokenResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, res.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refresh_token);
    this.storeUser(res.user);
  }

  private storeUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private readStoredUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
