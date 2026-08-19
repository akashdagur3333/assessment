import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface RealtimeChange {
  action: 'created' | 'updated' | 'deleted';
  at: string;
  taskId?: string;
  userId?: string;
}

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly authService = inject(AuthService);
  private socket: Socket | null = null;

  readonly tasksChanged$ = new Subject<RealtimeChange>();
  readonly usersChanged$ = new Subject<RealtimeChange>();

  connect(): void {
    const token = this.authService.token;

    if (!token || this.socket?.connected) {
      return;
    }

    this.socket = io(environment.socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('tasks:changed', (change: RealtimeChange) => {
      this.tasksChanged$.next(change);
    });

    this.socket.on('users:changed', (change: RealtimeChange) => {
      this.usersChanged$.next(change);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
