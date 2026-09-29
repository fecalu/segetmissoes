import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const vistoriaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.canOpenDriverOffline()) {
    return true;
  }

  return auth.refreshSession().pipe(
    map(() => {
      if (auth.deveAlterarSenha()) {
        return router.createUrlTree(['/alterar-senha-inicial']);
      }
      if (auth.canActAsDriver() || auth.can('VISTORIA_REGISTRAR')) {
        return true;
      }
      return router.createUrlTree([auth.isAdministrative() ? '/admin' : '/login'], {
        queryParams: auth.isAdministrative() ? { menu: 'vistorias-completas' } : undefined
      });
    }),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};
