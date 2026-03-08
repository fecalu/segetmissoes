import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse, Perfil } from '../models/auth.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  readonly loggedName = signal<string | null>(localStorage.getItem('nomeMotorista'));
  readonly perfil = signal<Perfil | null>((localStorage.getItem('perfil') as Perfil | null));

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, payload).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('nomeMotorista', res.nome);
        localStorage.setItem('perfil', res.perfil);
        this.loggedName.set(res.nome);
        this.perfil.set(res.perfil);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('nomeMotorista');
    localStorage.removeItem('perfil');
    this.loggedName.set(null);
    this.perfil.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  hasRole(role: Perfil): boolean {
    return this.perfil() === role;
  }
}
