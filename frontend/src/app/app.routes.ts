import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard, publicOnlyGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'tasks'
  },
  {
    path: 'login',
    component: AuthComponent,
    canActivate: [publicOnlyGuard],
    data: { authMode: 'login' }
  },
  {
    path: 'register',
    component: AuthComponent,
    canActivate: [publicOnlyGuard],
    data: { authMode: 'register' }
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'tasks',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'tasks'
  }
];
