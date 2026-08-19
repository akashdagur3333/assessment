import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PaginationMeta, Role, User } from '../../models/api.models';

export interface UserRoleChange {
  user: User;
  role: Role;
}

export interface UserTeamLeadChange {
  user: User;
  teamLead: string | null;
}

@Component({
  selector: 'app-people-panel',
  standalone: true,
  templateUrl: './people-panel.component.html'
})
export class PeoplePanelComponent {
  @Input({ required: true }) currentUser!: User;
  @Input() users: User[] = [];
  @Input() teamLeads: User[] = [];
  @Input() searchTerm = '';
  @Input() teamLeadSearchTerm = '';
  @Input() pagination: PaginationMeta = {
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  };
  @Input() teamLeadPagination: PaginationMeta = {
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  };

  @Output() roleChanged = new EventEmitter<UserRoleChange>();
  @Output() teamLeadChanged = new EventEmitter<UserTeamLeadChange>();
  @Output() searchChanged = new EventEmitter<string>();
  @Output() pageChanged = new EventEmitter<number>();
  @Output() teamLeadSearchChanged = new EventEmitter<string>();
  @Output() teamLeadPageChanged = new EventEmitter<number>();

  readonly roles: Role[] = ['Manager', 'Team Lead', 'Employee'];
  openTeamLeadDropdownUserId: string | null = null;

  changeRole(user: User, event: Event): void {
    const role = (event.target as HTMLSelectElement).value as Role;
    this.roleChanged.emit({ user, role });
  }

  updateSearch(event: Event): void {
    this.searchChanged.emit((event.target as HTMLInputElement).value);
  }

  updateTeamLeadSearch(event: Event): void {
    this.teamLeadSearchChanged.emit((event.target as HTMLInputElement).value);
  }

  toggleTeamLeadDropdown(user: User): void {
    if (user.role !== 'Employee') {
      return;
    }

    this.openTeamLeadDropdownUserId = this.openTeamLeadDropdownUserId === user._id ? null : user._id;
  }

  selectTeamLead(user: User, teamLead: string | null): void {
    this.teamLeadChanged.emit({ user, teamLead });
    this.openTeamLeadDropdownUserId = null;
  }

  getTeamLeadLabel(user: User): string {
    return user.teamLead?.username || 'No lead';
  }

  getTeamLeadOptions(user: User): User[] {
    if (!user.teamLead || this.teamLeads.some((lead) => lead._id === user.teamLead?._id)) {
      return this.teamLeads;
    }

    return [user.teamLead, ...this.teamLeads];
  }

  trackByUserId(_: number, user: User): string {
    return user._id;
  }
}
