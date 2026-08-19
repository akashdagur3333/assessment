import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : { blank: true };
}

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
    password: ['', [Validators.required, notBlank]]
  });

  readonly registerForm = this.fb.nonNullable.group({
    username: ['', [Validators.required, notBlank, Validators.minLength(3), Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, notBlank, Validators.minLength(6)]]
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
    this.loginForm.controls.email.setValue(this.loginForm.controls.email.value.trim());

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
    this.registerForm.controls.username.setValue(this.registerForm.controls.username.value.trim());
    this.registerForm.controls.email.setValue(this.registerForm.controls.email.value.trim());

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

  loginEmailError(): string {
    const control = this.loginForm.controls.email;

    if (control.hasError('required')) {
      return 'Email is required.';
    }

    if (control.hasError('email')) {
      return 'Enter a valid email.';
    }

    return '';
  }

  loginPasswordError(): string {
    const control = this.loginForm.controls.password;

    if (control.hasError('required') || control.hasError('blank')) {
      return 'Password is required.';
    }

    return '';
  }

  registerUsernameError(): string {
    const control = this.registerForm.controls.username;

    if (control.hasError('required') || control.hasError('blank')) {
      return 'Username is required.';
    }

    if (control.hasError('minlength')) {
      return 'Username must be at least 3 characters.';
    }

    if (control.hasError('maxlength')) {
      return 'Username cannot exceed 60 characters.';
    }

    return '';
  }

  registerEmailError(): string {
    const control = this.registerForm.controls.email;

    if (control.hasError('required')) {
      return 'Email is required.';
    }

    if (control.hasError('email')) {
      return 'Enter a valid email.';
    }

    return '';
  }

  registerPasswordError(): string {
    const control = this.registerForm.controls.password;

    if (control.hasError('required') || control.hasError('blank')) {
      return 'Password is required.';
    }

    if (control.hasError('minlength')) {
      return 'Password must be at least 6 characters.';
    }

    return '';
  }
}
