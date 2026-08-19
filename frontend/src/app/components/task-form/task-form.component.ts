import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateTaskPayload, Task, TaskStatus, User } from '../../models/api.models';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './task-form.component.html'
})
export class TaskFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) currentUser!: User;
  @Input() task: Task | null = null;
  @Input() assignableUsers: User[] = [];
  @Input() assigneeSearchTerm = '';
  @Input() canReassignTasks = false;
  @Input() loading = false;

  @Output() saved = new EventEmitter<CreateTaskPayload>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() assigneeSearchChanged = new EventEmitter<string>();
  openAssigneeDropdown = false;
  selectedAssignee: User | null = null;

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(1000)]],
    status: ['pending' as TaskStatus, [Validators.required]],
    assignedTo: ['']
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] || changes['currentUser']) {
      this.populateForm();
      return;
    }

    if (changes['assignableUsers'] && !this.form.controls.assignedTo.value) {
      this.form.controls.assignedTo.setValue(this.defaultAssignee);
      this.syncSelectedAssignee();
    }

    if (changes['assignableUsers']) {
      this.syncSelectedAssignee();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saved.emit({
      title: value.title,
      description: value.description,
      status: value.status,
      assignedTo: this.canReassignTasks ? value.assignedTo : this.currentUser._id
    });
  }

  cancel(): void {
    this.cancelled.emit();
    this.populateForm();
  }

  updateAssigneeSearch(event: Event): void {
    this.assigneeSearchChanged.emit((event.target as HTMLInputElement).value);
  }

  toggleAssigneeDropdown(): void {
    this.openAssigneeDropdown = !this.openAssigneeDropdown;
  }

  selectAssignee(userId: string): void {
    this.form.controls.assignedTo.setValue(userId);
    this.selectedAssignee = this.getAssigneeOptions().find((user) => user._id === userId) || null;
    this.openAssigneeDropdown = false;
  }

  getAssigneeLabel(): string {
    const selectedUserId = this.form.controls.assignedTo.value;
    const selectedUser = this.selectedAssignee?._id === selectedUserId
      ? this.selectedAssignee
      : this.getAssigneeOptions().find((user) => user._id === selectedUserId);

    if (!selectedUser) {
      return 'Select assignee';
    }

    return `${selectedUser.username} - ${selectedUser.role}`;
  }

  getAssigneeOptions(): User[] {
    const selectedUserId = this.form.controls.assignedTo.value;
    const assignedUser =
      this.selectedAssignee?._id === selectedUserId
        ? this.selectedAssignee
        : this.task?.assignedTo?._id === selectedUserId
          ? this.task.assignedTo
          : null;

    if (!assignedUser || this.assignableUsers.some((user) => user._id === assignedUser._id)) {
      return this.assignableUsers;
    }

    return [assignedUser, ...this.assignableUsers];
  }

  trackByUserId(_: number, user: User): string {
    return user._id;
  }

  private get defaultAssignee(): string {
    return this.assignableUsers[0]?._id || this.currentUser?._id || '';
  }

  private populateForm(): void {
    const assignedTo = this.task?.assignedTo?._id || this.defaultAssignee;

    this.form.reset({
      title: this.task?.title || '',
      description: this.task?.description || '',
      status: this.task?.status || 'pending',
      assignedTo
    });
    this.syncSelectedAssignee();
  }

  private syncSelectedAssignee(): void {
    const selectedUserId = this.form.controls.assignedTo.value;

    const selectedFromResults = this.assignableUsers.find((user) => user._id === selectedUserId);

    if (this.task?.assignedTo?._id === selectedUserId) {
      this.selectedAssignee = this.task.assignedTo;
      return;
    }

    if (selectedFromResults) {
      this.selectedAssignee = selectedFromResults;
      return;
    }

    if (this.selectedAssignee?._id !== selectedUserId) {
      this.selectedAssignee = null;
    }
  }
}
