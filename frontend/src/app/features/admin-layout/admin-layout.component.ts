import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, effect, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { catchError, exhaustMap, filter, fromEvent, interval, merge, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { AppIconComponent } from '../../shared/ui/app-icon.component';
import { ADMIN_NAVIGATION, AdminNavItem, AdminNavLink } from './admin-navigation';

@Component({
  selector: 'app-admin-layout',
  imports: [CommonModule, RouterLink, RouterOutlet, AppIconComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly navigation = ADMIN_NAVIGATION;
  get navigationGroups() { return [
    { id: 'OPERACAO', label: 'OPERAÇÃO DIÁRIA', items: ADMIN_NAVIGATION.filter(item => item.section === 'OPERACAO') },
    { id: 'CONTROLE', label: 'CONTROLE ADMINISTRATIVO', items: ADMIN_NAVIGATION.filter(item => item.section === 'CONTROLE') },
    { id: 'ALOCACOES', label: 'ALOCAÇÕES', items: ADMIN_NAVIGATION.filter(item => item.section === 'ALOCACOES') },
    { id: 'CADASTROS', label: 'CADASTROS', items: ADMIN_NAVIGATION.filter(item => item.section === 'CADASTROS') },
    { id: 'ANALISE', label: 'ANÁLISE E RELATÓRIOS', items: ADMIN_NAVIGATION.filter(item => item.section === 'ANALISE') },
    { id: 'SISTEMA', label: 'SISTEMA', items: ADMIN_NAVIGATION.filter(item => item.section === 'SISTEMA') }
  ].map(group => ({
    ...group,
    items: group.items
      .filter(item => !item.permission || this.auth.can(item.permission))
      .map(item => ({
        ...item,
        children: item.children?.filter(child => !child.permission || this.auth.can(child.permission))
      }))
      .filter(item => !item.children || item.children.length > 0)
  }))
    .filter(group => group.items.length > 0); }
  readonly today = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  activeId = 'operacao';
  pageLabel = 'Operação da frota';
  currentMenu = 'operacao';
  currentPath = '/admin';
  expandedGroup = '';
  @ViewChild('mobileMenu') mobileMenu?: ElementRef<HTMLDialogElement>;
  @ViewChild('content') content?: ElementRef<HTMLElement>;

  constructor() {
    this.syncNavigation();
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => { this.syncNavigation(); this.closeMenu(); });
    merge(interval(30000), fromEvent(window, 'focus'))
      .pipe(filter(() => document.visibilityState === 'visible' && this.auth.isAuthenticated()),
        exhaustMap(() => this.auth.refreshSession().pipe(catchError(() => of(null)))),
        takeUntilDestroyed(this.destroyRef))
      .subscribe();
    effect(() => {
      const perfil = this.auth.perfil();
      if (!perfil) return;
      if (!this.auth.isAdministrative()) { void this.router.navigate(['/login']); return; }
      const url = this.router.parseUrl(this.router.url);
      const menu = url.queryParams['menu'] || 'operacao';
      let route = this.router.routerState.snapshot.root;
      while (route.firstChild) route = route.firstChild;
      const permission = route.data['permission'];
      if (!this.auth.canAccessMenu(menu) || (permission && !this.auth.can(permission))) {
        void this.router.navigate(['/admin'], { queryParams: { menu: 'operacao' } });
      }
    });
  }

  isCurrent(link: AdminNavLink): boolean {
    return link.menu ? this.currentMenu === link.menu : link.path === this.currentPath;
  }

  isExpanded(item: AdminNavItem): boolean { return this.expandedGroup === item.id; }
  toggleGroup(item: AdminNavItem): void { this.expandedGroup = this.isExpanded(item) ? '' : item.id; }
  openMenu(): void { this.mobileMenu?.nativeElement.showModal(); }
  closeMenu(): void { this.mobileMenu?.nativeElement.close(); }
  closeBackdrop(event: MouseEvent): void { if (event.target === this.mobileMenu?.nativeElement) this.closeMenu(); }
  skipToContent(event: Event): void { event.preventDefault(); this.content?.nativeElement.focus(); }

  get initials(): string {
    return (this.auth.loggedName() || 'Administrador').split(' ').filter(Boolean).slice(0, 2).map(name => name[0]).join('').toUpperCase();
  }

  private syncNavigation(): void {
    const url = this.router.parseUrl(this.router.url);
    const path = '/' + (url.root.children['primary']?.segments.map(segment => segment.path).join('/') || 'admin');
    this.currentPath = path;
    const requestedMenu = url.queryParams['menu'] || 'operacao';
    this.currentMenu = requestedMenu === 'dashboard' ? 'operacao' : requestedMenu;
    const reportPage = path !== '/admin';
    const item = reportPage ? (this.navigation.find(item => item.path === path || item.children?.some(child => child.path === path))
      ?? this.navigation.find(item => item.id === 'relatorios')!) :
      this.navigation.find(item => item.menu === this.currentMenu || item.children?.some(child => child.menu === this.currentMenu)) || this.navigation[0];
    this.activeId = item.id;
    this.expandedGroup = item.children ? item.id : '';
    this.pageLabel = reportPage ? (path.includes('usuarios') ? 'Usuários e acessos' : path.includes('auditoria-acessos') ? 'Auditoria de acessos' : path.includes('alocacoes') ? 'Controle de alocações' : path.includes('estatisticas') ? 'Estatísticas de missões' : path.includes('checklists/relatorio') ? 'Relatório de checklists' : 'Relatórios') :
      item.children?.find(child => child.menu === this.currentMenu)?.label || item.label;
  }
}
