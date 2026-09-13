import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Permissao } from '../models/auth.model';

export const adminGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const messages = inject(MatSnackBar);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/admin/login']);
  return auth.refreshSession().pipe(map(() => {
    if (!auth.isAdministrative()) return router.createUrlTree(['/login']);
    const permission = route.data['permission'] as Permissao | undefined;
    if ((permission && !auth.can(permission)) || !auth.canAccessMenu(route.queryParamMap.get('menu') || 'operacao')) {
      messages.open('Seu perfil não tem acesso a esta área.', 'Fechar', { duration: 3500 });
      return router.createUrlTree(['/admin'], { queryParams: { menu: 'operacao' } });
    }
    return true;
  }), catchError(() => of(router.createUrlTree(['/admin/login']))));
};
