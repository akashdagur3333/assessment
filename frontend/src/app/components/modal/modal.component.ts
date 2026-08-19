import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.component.html'
})
export class ModalComponent {
  @Input() title = '';
  @Input() eyebrow = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  @Output() closed = new EventEmitter<void>();
}
