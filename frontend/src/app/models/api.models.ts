export type Role = 'Manager' | 'Team Lead' | 'Employee';
export type TaskStatus = 'pending' | 'completed';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  details?: Record<string, string>;
  data: T;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PageQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface UserQuery extends PageQuery {
  role?: Role;
}

export interface TaskQuery extends PageQuery {
  status?: TaskStatus | 'all';
}

export interface User {
  _id: string;
  username: string;
  email: string;
  role: Role;
  teamLead?: User | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdBy: User;
  assignedTo: User;
  createdAt: string;
  updatedAt: string;
}

export interface AuthData {
  token: string;
  user: User;
}

export interface TeamLeadSummary extends User {
  tasks: Task[];
}

export interface TaskStats {
  total: number;
  pending: number;
  completed: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  assignedTo?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  assignedTo?: string;
}
