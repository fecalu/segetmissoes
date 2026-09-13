import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, map, shareReplay, switchMap, tap } from 'rxjs';
import { LoginRequest, LoginResponse, Perfil, Permissao, PERFIL_LABELS, SessaoResponse } from '../models/auth.model';
import { environment } from '../../../environments/environment';

type AccessScope = 'motorista' | 'admin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = environment.apiBaseUrl + '/auth';
  readonly loggedName = signal<string | null>(localStorage.getItem('nomeMotorista'));
  readonly loggedMotoristaId = signal<number | null>(Number(localStorage.getItem('motoristaId')) || null);
  readonly perfil = signal<Perfil | null>(null);
  readonly permissoes = signal<Permissao[]>([]);
  private sessionRequest?: Observable<SessaoResponse>;

  constructor(private readonly http: HttpClient, private readonly router: Router) {
    // Remove passwords saved by older versions, keeping only the username.
    for (const scope of ['admin', 'motorista'] as const) this.getRememberedAccess(scope);
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.baseUrl + '/login', payload).pipe(
      tap(res => localStorage.setItem('token', res.token)),
      switchMap(res => this.refreshSession().pipe(map(() => res)))
    );
  }

  refreshSession(): Observable<SessaoResponse> {
    if (!this.sessionRequest) {
      const token = this.getToken();
      this.sessionRequest = this.http.get<SessaoResponse>(this.baseUrl + '/me').pipe(
        tap(res => {
          if (token !== this.getToken()) throw new Error('A sessao foi alterada durante a consulta');
          this.loggedName.set(res.nome); this.loggedMotoristaId.set(res.motoristaId);
          this.perfil.set(res.perfil); this.permissoes.set(res.permissoes);
          localStorage.setItem('nomeMotorista', res.nome);
          localStorage.setItem('motoristaId', String(res.motoristaId));
          localStorage.setItem('perfil', res.perfil);
        }),
        finalize(() => this.sessionRequest = undefined),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.sessionRequest;
  }

  logout(): void {
    const admin = this.isAdministrative();
    for (const key of ['token', 'motoristaId', 'nomeMotorista', 'perfil']) localStorage.removeItem(key);
    this.loggedName.set(null); this.loggedMotoristaId.set(null); this.perfil.set(null); this.permissoes.set([]);
    this.router.navigate([admin ? '/admin/login' : '/login']);
  }

  isAuthenticated(): boolean { return !!this.getToken(); }
  canOpenDriverOffline(): boolean {
    if (navigator.onLine || localStorage.getItem('perfil') !== 'MOTORISTA') return false;
    try {
      const payload = JSON.parse(atob((this.getToken() || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      // Cached driver screens only; server authorization remains mandatory when online.
      return payload.exp * 1000 > Date.now();
    } catch { return false; }
  }
  getToken(): string | null { return localStorage.getItem('token'); }
  hasRole(role: Perfil): boolean { return this.perfil() === role; }
  can(permission: Permissao): boolean { return this.permissoes().includes(permission); }
  isAdministrative(): boolean { return this.can('FROTA_CONSULTAR'); }
  get perfilLabel(): string { return this.perfil() ? PERFIL_LABELS[this.perfil()!] : ''; }

  canAccessMenu(menu: string): boolean {
    const permission: Partial<Record<string, Permissao>> = {
      veiculos: 'VEICULO_GERIR',
      motoristas: 'MOTORISTA_GERIR',
      'rotulos-status': 'CONFIGURACAO_GERIR',
      checklists: 'VISTORIA_CONSULTAR',
      'vistorias-completas': 'VISTORIA_CONSULTAR',
      missoes: 'MISSAO_COMPLEMENTAR'
    };
    return this.can(permission[menu] || 'FROTA_CONSULTAR');
  }

  getRememberedAccess(scope: AccessScope): { login: string } | null {
    const key = 'rememberAccess:' + scope;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (typeof saved?.login !== 'string' || !saved.login) { localStorage.removeItem(key); return null; }
      localStorage.setItem(key, JSON.stringify({ login: saved.login }));
      return { login: saved.login };
    } catch { localStorage.removeItem(key); return null; }
  }

  saveRememberedAccess(scope: AccessScope, credentials: { login: string }, remember: boolean): void {
    const key = 'rememberAccess:' + scope;
    if (remember) localStorage.setItem(key, JSON.stringify({ login: credentials.login }));
    else localStorage.removeItem(key);
  }
}
