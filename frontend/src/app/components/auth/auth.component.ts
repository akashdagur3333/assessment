import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth.component.html'
})
export class AuthComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  authMode: 'login' | 'register' = 'login';
  loading = false;

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  readonly registerForm = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.authMode = data['authMode'] === 'register' ? 'register' : 'login';
    });
  }

  switchMode(mode: 'login' | 'register'): void {
    this.router.navigate([mode === 'register' ? '/register' : '/login']);
  }

  login(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.authService
      .login(this.loginForm.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastService.success('Logged in successfully.');
          this.router.navigate(['/tasks']);
        },
        error: (error) => this.handleError(error)
      });
  }

  register(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.authService
      .register(this.registerForm.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastService.success('Account created successfully.');
          this.router.navigate(['/tasks']);
        },
        error: (error) => this.handleError(error)
      });
  }

  private handleError(error: unknown): void {
    const apiError = error as { error?: { message?: string; details?: Record<string, string> } };
    const details = apiError.error?.details ? Object.values(apiError.error.details).join(' ') : '';
    this.toastService.error(details || apiError.error?.message || 'Request failed. Please try again.');
  }
}
