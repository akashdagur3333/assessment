import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PaginationMeta, Task, TaskStatus } from '../../models/api.models';

@Component({
  selector: 'app-task-list',
  standalone: true,
  templateUrl: './task-list.component.html'
})
export class TaskListComponent {
  @Input() tasks: Task[] = [];
  @Input() filterStatus: TaskStatus | 'all' = 'all';
  @Input() canCreateTask = true;
  @Input() searchTerm = '';
  @Input() pagination: PaginationMeta = {
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  };

  @Output() createRequested = new EventEmitter<void>();
  @Output() filterChanged = new EventEmitter<TaskStatus | 'all'>();
  @Output() searchChanged = new EventEmitter<string>();
  @Output() pageChanged = new EventEmitter<number>();
  @Output() editRequested = new EventEmitter<Task>();
  @Output() statusToggled = new EventEmitter<Task>();
  @Output() deleteRequested = new EventEmitter<Task>();

  readonly statuses: (TaskStatus | 'all')[] = ['all', 'pending', 'completed'];

  trackByTaskId(_: number, task: Task): string {
    return task._id;
  }

  updateSearch(event: Event): void {
    this.searchChanged.emit((event.target as HTMLInputElement).value);
  }
}
