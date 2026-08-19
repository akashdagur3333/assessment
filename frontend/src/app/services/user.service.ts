import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, PaginatedData, Role, TeamLeadSummary, User, UserQuery } from '../models/api.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = `${environment.apiBaseUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  getUsers(query: UserQuery = {}): Observable<PaginatedData<User>> {
    return this.http
      .get<ApiResponse<PaginatedData<User>>>(this.apiUrl, { params: this.toParams(query) })
      .pipe(map((response) => response.data));
  }

  getAssignableUsers(query: UserQuery = {}): Observable<PaginatedData<User>> {
    return this.http
      .get<ApiResponse<PaginatedData<User>>>(`${this.apiUrl}/assignable`, { params: this.toParams(query) })
      .pipe(map((response) => response.data));
  }

  getTeamLeadsWithTasks(): Observable<TeamLeadSummary[]> {
    return this.http
      .get<ApiResponse<TeamLeadSummary[]>>(`${this.apiUrl}/team-leads-with-tasks`)
      .pipe(map((response) => response.data));
  }

  updateUser(id: string, payload: { username?: string; role?: Role; teamLead?: string | null }): Observable<User> {
    return this.http
      .patch<ApiResponse<User>>(`${this.apiUrl}/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  private toParams(query: UserQuery): Record<string, string> {
    const params: Record<string, string> = {};

    if (query.page) {
      params['page'] = String(query.page);
    }

    if (query.limit) {
      params['limit'] = String(query.limit);
    }

    if (query.search) {
      params['search'] = query.search;
    }

    if (query.role) {
      params['role'] = query.role;
    }

    return params;
  }
}
