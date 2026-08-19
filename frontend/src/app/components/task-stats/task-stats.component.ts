import { Component, Input } from '@angular/core';
import { TaskStats } from '../../models/api.models';

@Component({
  selector: 'app-task-stats',
  standalone: true,
  templateUrl: './task-stats.component.html'
})
export class TaskStatsComponent {
  @Input() stats: TaskStats = {
    total: 0,
    pending: 0,
    completed: 0
  };
}
