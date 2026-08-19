import { Component, Input } from '@angular/core';
import { Task, TeamLeadSummary } from '../../models/api.models';

@Component({
  selector: 'app-manager-lead-summary',
  standalone: true,
  templateUrl: './manager-lead-summary.component.html'
})
export class ManagerLeadSummaryComponent {
  @Input() summaries: TeamLeadSummary[] = [];

  trackByLeadId(_: number, lead: TeamLeadSummary): string {
    return lead._id;
  }

  trackByTaskId(_: number, task: Task): string {
    return task._id;
  }
}
