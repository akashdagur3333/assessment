import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, finalize, forkJoin, of } from 'rxjs';
import { ManagerLeadSummaryComponent } from '../manager-lead-summary/manager-lead-summary.component';
import { ModalComponent } from '../modal/modal.component';
import { PeoplePanelComponent, UserRoleChange, UserTeamLeadChange } from '../people-panel/people-panel.component';
import { TaskFormComponent } from '../task-form/task-form.component';
import { TaskListComponent } from '../task-list/task-list.component';
import { TaskStatsComponent } from '../task-stats/task-stats.component';
import {
  CreateTaskPayload,
  PaginatedData,
  PaginationMeta,
  Role,
  Task,
  TaskStats,
  TaskStatus,
  TeamLeadSummary,
  User
} from '../../models/api.models';
import { AuthService } from '../../services/auth.service';
import { RealtimeService } from '../../services/realtime.service';
import { TaskService } from '../../services/task.service';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TaskStatsComponent,
    TaskListComponent,
    TaskFormComponent,
    PeoplePanelComponent,
    ManagerLeadSummaryComponent,
    ModalComponent
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly toastService = inject(ToastService);

  filterStatus: TaskStatus | 'all' = 'all';
  taskSearchTerm = '';
  peopleSearchTerm = '';
  assigneeSearchTerm = '';
  teamLeadSearchTerm = '';
  tasks: Task[] = [];
  users: User[] = [];
  assignableUsers: User[] = [];
  teamLeads: User[] = [];
  teamLeadSummaries: TeamLeadSummary[] = [];
  taskStats: TaskStats = {
    total: 0,
    pending: 0,
    completed: 0
  };
  taskPagination: PaginationMeta = this.emptyPagination(5);
  peoplePagination: PaginationMeta = this.emptyPagination(5);
  assigneePagination: PaginationMeta = this.emptyPagination(5);
  teamLeadPagination: PaginationMeta = this.emptyPagination(5);
  editingTask: Task | null = null;
  showTaskModal = false;
  taskToDelete: Task | null = null;
  loading = false;
  private readonly realtimeSubscription = new Subscription();

  ngOnInit(): void {
    this.loadWorkspace();
    this.connectRealtimeUpdates();
  }

  ngOnDestroy(): void {
    this.realtimeSubscription.unsubscribe();
    this.realtimeService.disconnect();
  }

  get currentUser(): User {
    const user = this.authService.currentUser();

    if (!user) {
      throw new Error('Dashboard route requires an authenticated user');
    }

    return user;
  }

  get canReassignTasks(): boolean {
    return this.currentUser.role === 'Manager' || this.currentUser.role === 'Team Lead';
  }

  get canViewPeople(): boolean {
    return this.currentUser.role === 'Manager' || this.currentUser.role === 'Team Lead';
  }

  logout(): void {
    this.authService.logout();
    this.realtimeService.disconnect();
    this.router.navigate(['/login']);
  }

  loadWorkspace(): void {
    this.startRequest();

    forkJoin({
      usersPage: this.userService.getUsers({
        page: this.peoplePagination.page,
        limit: this.peoplePagination.limit,
        search: this.peopleSearchTerm
      }),
      tasksPage: this.taskService.getTasks({
        status: this.filterStatus,
        page: this.taskPagination.page,
        limit: this.taskPagination.limit,
        search: this.taskSearchTerm
      }),
      taskStats: this.taskService.getStats(),
      assignableUsersPage: this.canReassignTasks
        ? this.userService.getAssignableUsers({
            page: this.assigneePagination.page,
            limit: this.assigneePagination.limit,
            search: this.assigneeSearchTerm
          })
        : of(this.emptyPage<User>(this.assigneePagination.limit)),
      teamLeadsPage:
        this.currentUser.role === 'Manager'
          ? this.userService.getUsers({
              role: 'Team Lead',
              page: this.teamLeadPagination.page,
              limit: this.teamLeadPagination.limit,
              search: this.teamLeadSearchTerm
            })
          : of(this.emptyPage<User>(this.teamLeadPagination.limit)),
      summaries: this.currentUser.role === 'Manager' ? this.userService.getTeamLeadsWithTasks() : of([])
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ usersPage, tasksPage, taskStats, assignableUsersPage, teamLeadsPage, summaries }) => {
          this.applyUsersPage(usersPage);
          this.applyTasksPage(tasksPage);
          this.taskStats = taskStats;
          this.applyAssignableUsersPage(assignableUsersPage);
          this.applyTeamLeadsPage(teamLeadsPage);
          this.teamLeadSummaries = summaries;
        },
        error: (error) => this.handleError(error)
      });
  }

  openCreateTaskModal(): void {
    this.resetTaskFormState();
    this.editingTask = null;
    this.showTaskModal = true;
    this.loadAssignableUsers();
  }

  setFilter(status: TaskStatus | 'all'): void {
    this.filterStatus = status;
    this.taskPagination = { ...this.taskPagination, page: 1 };
    this.loadTasks();
  }

  setTaskSearch(searchTerm: string): void {
    this.taskSearchTerm = searchTerm;
    this.taskPagination = { ...this.taskPagination, page: 1 };
    this.loadTasks();
  }

  changeTaskPage(page: number): void {
    this.taskPagination = { ...this.taskPagination, page };
    this.loadTasks();
  }

  setPeopleSearch(searchTerm: string): void {
    this.peopleSearchTerm = searchTerm;
    this.peoplePagination = { ...this.peoplePagination, page: 1 };
    this.loadPeople();
  }

  changePeoplePage(page: number): void {
    this.peoplePagination = { ...this.peoplePagination, page };
    this.loadPeople();
  }

  setTeamLeadSearch(searchTerm: string): void {
    this.teamLeadSearchTerm = searchTerm;
    this.teamLeadPagination = { ...this.teamLeadPagination, page: 1 };
    this.loadTeamLeads();
  }

  changeTeamLeadPage(page: number): void {
    this.teamLeadPagination = { ...this.teamLeadPagination, page };
    this.loadTeamLeads();
  }

  setAssigneeSearch(searchTerm: string): void {
    this.assigneeSearchTerm = searchTerm;
    this.assigneePagination = { ...this.assigneePagination, page: 1 };
    this.loadAssignableUsers();
  }

  saveTask(payload: CreateTaskPayload): void {
    this.startRequest();

    const request = this.editingTask
      ? this.taskService.updateTask(this.editingTask._id, payload)
      : this.taskService.createTask(payload);

    request.pipe(finalize(() => (this.loading = false))).subscribe({
      next: () => {
        this.toastService.success(this.editingTask ? 'Task updated successfully.' : 'Task created successfully.');
        this.editingTask = null;
        this.showTaskModal = false;
        this.loadWorkspace();
      },
      error: (error) => this.handleError(error)
    });
  }

  editTask(task: Task): void {
    this.resetTaskFormState();
    this.editingTask = task;
    this.showTaskModal = true;
    this.loadAssignableUsers();
  }

  clearEditingTask(): void {
    this.editingTask = null;
    this.showTaskModal = false;
    this.resetTaskFormState();
  }

  toggleTaskStatus(task: Task): void {
    this.startRequest();
    this.taskService
      .updateTask(task._id, { status: task.status === 'completed' ? 'pending' : 'completed' })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastService.success(task.status === 'completed' ? 'Task reopened.' : 'Task completed.');
          this.loadWorkspace();
        },
        error: (error) => this.handleError(error)
      });
  }

  confirmDeleteTask(task: Task): void {
    this.taskToDelete = task;
  }

  cancelDeleteTask(): void {
    this.taskToDelete = null;
  }

  deleteTask(): void {
    if (!this.taskToDelete) {
      return;
    }

    this.startRequest();
    this.taskService
      .deleteTask(this.taskToDelete._id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastService.success('Task deleted successfully.');
          this.taskToDelete = null;
          this.loadWorkspace();
        },
        error: (error) => this.handleError(error)
      });
  }

  updateUserRole(change: UserRoleChange): void {
    this.updateUser(change.user, { role: change.role });
  }

  updateUserTeamLead(change: UserTeamLeadChange): void {
    this.updateUser(change.user, { teamLead: change.teamLead });
  }

  private loadTasks(): void {
    this.startRequest();
    this.taskService
      .getTasks({
        status: this.filterStatus,
        page: this.taskPagination.page,
        limit: this.taskPagination.limit,
        search: this.taskSearchTerm
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (tasksPage) => this.applyTasksPage(tasksPage),
        error: (error) => this.handleError(error)
      });
  }

  private loadPeople(): void {
    this.startRequest();
    this.userService
      .getUsers({
        page: this.peoplePagination.page,
        limit: this.peoplePagination.limit,
        search: this.peopleSearchTerm
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (usersPage) => this.applyUsersPage(usersPage),
        error: (error) => this.handleError(error)
      });
  }

  private loadAssignableUsers(): void {
    if (!this.canReassignTasks) {
      return;
    }

    this.startRequest();
    this.userService
      .getAssignableUsers({
        page: this.assigneePagination.page,
        limit: this.assigneePagination.limit,
        search: this.assigneeSearchTerm
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (usersPage) => this.applyAssignableUsersPage(usersPage),
        error: (error) => this.handleError(error)
      });
  }

  private loadTeamLeads(): void {
    if (this.currentUser.role !== 'Manager') {
      return;
    }

    this.startRequest();
    this.userService
      .getUsers({
        role: 'Team Lead',
        page: this.teamLeadPagination.page,
        limit: this.teamLeadPagination.limit,
        search: this.teamLeadSearchTerm
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (teamLeadsPage) => this.applyTeamLeadsPage(teamLeadsPage),
        error: (error) => this.handleError(error)
      });
  }

  private updateUser(user: User, payload: { role?: Role; teamLead?: string | null }): void {
    this.startRequest();
    this.userService
      .updateUser(user._id, payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastService.success('User updated successfully.');
          this.loadWorkspace();
        },
        error: (error) => this.handleError(error)
      });
  }

  private startRequest(): void {
    this.loading = true;
  }

  private resetTaskFormState(): void {
    this.assigneeSearchTerm = '';
    this.assigneePagination = { ...this.assigneePagination, page: 1 };
  }

  private applyTasksPage(tasksPage: PaginatedData<Task>): void {
    this.tasks = tasksPage.items;
    this.taskPagination = tasksPage.pagination;
  }

  private applyUsersPage(usersPage: PaginatedData<User>): void {
    this.users = usersPage.items;
    this.peoplePagination = usersPage.pagination;
  }

  private applyAssignableUsersPage(usersPage: PaginatedData<User>): void {
    this.assignableUsers = usersPage.items;
    this.assigneePagination = usersPage.pagination;
  }

  private applyTeamLeadsPage(usersPage: PaginatedData<User>): void {
    this.teamLeads = usersPage.items;
    this.teamLeadPagination = usersPage.pagination;
  }

  private emptyPagination(limit: number): PaginationMeta {
    return {
      page: 1,
      limit,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false
    };
  }

  private emptyPage<T>(limit: number): PaginatedData<T> {
    return {
      items: [],
      pagination: this.emptyPagination(limit)
    };
  }

  private connectRealtimeUpdates(): void {
    this.realtimeService.connect();
    this.realtimeSubscription.add(
      this.realtimeService.tasksChanged$.subscribe(() => {
        this.loadWorkspace();
      })
    );
    this.realtimeSubscription.add(
      this.realtimeService.usersChanged$.subscribe(() => {
        this.loadWorkspace();
      })
    );
  }

  private handleError(error: unknown): void {
    const apiError = error as { error?: { message?: string; details?: Record<string, string> } };
    const details = apiError.error?.details ? Object.values(apiError.error.details).join(' ') : '';
    this.toastService.error(details || apiError.error?.message || 'Request failed. Please try again.');
  }
}
