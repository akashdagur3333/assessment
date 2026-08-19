import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.token && authService.currentUser()
    ? true
    : router.createUrlTree(['/login']);
};

export const publicOnlyGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.token && authService.currentUser()
    ? router.createUrlTree(['/tasks'])
    : true;
};
