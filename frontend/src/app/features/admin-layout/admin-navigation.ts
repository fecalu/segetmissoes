import { AppIconName } from '../../shared/ui/app-icon.component';

export interface AdminNavLink {
  label: string;
  path: string;
  menu?: string;
}

export interface AdminNavItem extends AdminNavLink {
  id: string;
  icon: AppIconName;
  children?: AdminNavLink[];
}

export const ADMIN_NAVIGATION: AdminNavItem[] = [
  { id: 'operacao', label: 'Operação da frota', icon: 'fleet', path: '/admin', menu: 'operacao' },
  { id: 'missoes', label: 'Missões', icon: 'mission', path: '/admin', menu: 'missoes' },
  { id: 'vistorias', label: 'Vistorias', icon: 'inspection', path: '/admin', menu: 'checklists', children: [
    { label: 'Checklists de missão', path: '/admin', menu: 'checklists' },
    { label: 'Vistorias completas', path: '/admin', menu: 'vistorias-completas' }
  ] },
  { id: 'cadastros', label: 'Cadastros', icon: 'register', path: '/admin', menu: 'veiculos', children: [
    { label: 'Veículos', path: '/admin', menu: 'veiculos' },
    { label: 'Motoristas e acessos', path: '/admin', menu: 'motoristas' }
  ] },
  { id: 'relatorios', label: 'Relatórios', icon: 'report', path: '/admin/relatorios' },
  { id: 'configuracoes', label: 'Configurações', icon: 'settings', path: '/admin', menu: 'rotulos-status' }
];
