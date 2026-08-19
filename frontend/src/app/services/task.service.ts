import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ApiResponse,
  CreateTaskPayload,
  PaginatedData,
  Task,
  TaskQuery,
  TaskStats,
  TaskStatus,
  UpdateTaskPayload
} from '../models/api.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly apiUrl = `${environment.apiBaseUrl}/tasks`;

  constructor(private readonly http: HttpClient) {}

  getTasks(query: TaskQuery = {}): Observable<PaginatedData<Task>> {
    return this.http
      .get<ApiResponse<PaginatedData<Task>>>(this.apiUrl, { params: this.toParams(query) })
      .pipe(map((response) => response.data));
  }

  getStats(): Observable<TaskStats> {
    return this.http
      .get<ApiResponse<TaskStats>>(`${this.apiUrl}/stats`)
      .pipe(map((response) => response.data));
  }

  createTask(payload: CreateTaskPayload): Observable<Task> {
    return this.http
      .post<ApiResponse<Task>>(this.apiUrl, payload)
      .pipe(map((response) => response.data));
  }

  updateTask(id: string, payload: UpdateTaskPayload): Observable<Task> {
    return this.http
      .patch<ApiResponse<Task>>(`${this.apiUrl}/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  deleteTask(id: string): Observable<{ id: string }> {
    return this.http
      .delete<ApiResponse<{ id: string }>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  private toParams(query: TaskQuery): Record<string, string> {
    const params: Record<string, string> = {};

    if (query.status && query.status !== 'all') {
      params['status'] = query.status;
    }

    if (query.page) {
      params['page'] = String(query.page);
    }

    if (query.limit) {
      params['limit'] = String(query.limit);
    }

    if (query.search) {
      params['search'] = query.search;
    }

    return params;
  }
}
