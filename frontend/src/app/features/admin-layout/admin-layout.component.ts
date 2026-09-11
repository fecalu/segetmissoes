import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
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
  readonly today = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  activeId = 'operacao';
  pageLabel = 'Operação da frota';
  currentMenu = 'operacao';
  expandedGroup = '';
  @ViewChild('mobileMenu') mobileMenu?: ElementRef<HTMLDialogElement>;
  @ViewChild('content') content?: ElementRef<HTMLElement>;

  constructor() {
    this.syncNavigation();
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => { this.syncNavigation(); this.closeMenu(); });
  }

  isCurrent(link: AdminNavLink): boolean {
    return link.menu ? this.currentMenu === link.menu : this.activeId === 'relatorios';
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
    const requestedMenu = url.queryParams['menu'] || 'operacao';
    this.currentMenu = requestedMenu === 'dashboard' ? 'operacao' : requestedMenu === 'tempo-real' ? 'missoes' : requestedMenu === 'excecoes' ? 'checklists' : requestedMenu;
    const reportPage = path !== '/admin';
    const item = reportPage ? this.navigation.find(item => item.id === 'relatorios')! :
      this.navigation.find(item => item.menu === this.currentMenu || item.children?.some(child => child.menu === this.currentMenu)) || this.navigation[0];
    this.activeId = item.id;
    this.expandedGroup = item.children ? item.id : '';
    this.pageLabel = reportPage ? (path.includes('estatisticas') ? 'Estatísticas de missões' : path.includes('checklists/relatorio') ? 'Relatório de checklists' : 'Relatórios') :
      item.children?.find(child => child.menu === this.currentMenu)?.label || item.label;
  }
}
