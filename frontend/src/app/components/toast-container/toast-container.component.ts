import { Component, inject } from '@angular/core';
import { ToastMessage, ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  templateUrl: './toast-container.component.html'
})
export class ToastContainerComponent {
  private readonly toastService = inject(ToastService);

  readonly messages = this.toastService.messages;

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  trackByToastId(_: number, toast: ToastMessage): number {
    return toast.id;
  }
}
