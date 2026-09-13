import { HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const api = new URL(environment.apiBaseUrl, window.location.origin);
  const target = new URL(req.url, window.location.origin);
  const trusted = target.origin === api.origin &&
    (target.pathname.startsWith(api.pathname.replace(/\/$/, '') + '/') || target.pathname.startsWith('/uploads/'));
  const token = localStorage.getItem('token');
  const request = token && trusted ? req.clone({ setHeaders: { Authorization: 'Bearer ' + token } }) : req;
  return next(request).pipe(catchError(err => {
    if (trusted && token && err.status === 401 && !target.pathname.endsWith('/login')) {
      injector.get(AuthService).logout();
    } else if (trusted && err.status === 403 && !target.pathname.endsWith('/me')) {
      injector.get(AuthService).refreshSession().subscribe({ error: () => {} });
    }
    return throwError(() => err);
  }));
};
