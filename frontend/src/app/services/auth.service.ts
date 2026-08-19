import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { ApiResponse, AuthData, User } from '../models/api.models';
import { environment } from '../../environments/environment';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends LoginPayload {
  username: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiBaseUrl}/auth`;
  private readonly tokenKey = environment.storageKeys.token;
  private readonly userKey = environment.storageKeys.user;

  readonly currentUser = signal<User | null>(this.readStoredUser());

  constructor(private readonly http: HttpClient) {}

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  login(payload: LoginPayload): Observable<AuthData> {
    return this.http.post<ApiResponse<AuthData>>(`${this.apiUrl}/login`, payload).pipe(
      map((response) => response.data),
      tap((data) => this.persistAuth(data))
    );
  }

  register(payload: RegisterPayload): Observable<AuthData> {
    return this.http.post<ApiResponse<AuthData>>(`${this.apiUrl}/register`, payload).pipe(
      map((response) => response.data),
      tap((data) => this.persistAuth(data))
    );
  }

  refreshProfile(): Observable<User> {
    return this.http.get<ApiResponse<{ user: User }>>(`${this.apiUrl}/me`).pipe(
      map((response) => response.data.user),
      tap((user) => {
        this.currentUser.set(user);
        localStorage.setItem(this.userKey, JSON.stringify(user));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null);
  }

  private persistAuth(data: AuthData): void {
    localStorage.setItem(this.tokenKey, data.token);
    localStorage.setItem(this.userKey, JSON.stringify(data.user));
    this.currentUser.set(data.user);
  }

  private readStoredUser(): User | null {
    const rawUser = localStorage.getItem(this.userKey);
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as User;
    } catch {
      localStorage.removeItem(this.userKey);
      return null;
    }
  }
}
