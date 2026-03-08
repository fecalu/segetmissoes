import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const motoristaGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.isAuthenticated() && authService.hasRole('MOTORISTA')) {
    return true;
  }
  router.navigate(['/login']);
  return false;
};
