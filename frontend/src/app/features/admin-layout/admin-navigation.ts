import { Permissao } from '../../core/models/auth.model';
import { AppIconName } from '../../shared/ui/app-icon.component';

export interface AdminNavLink {
  permission?: Permissao;
  label: string;
  path: string;
  menu?: string;
}

export interface AdminNavItem extends AdminNavLink {
  id: string;
  icon: AppIconName;
  section: 'OPERACAO' | 'ALOCACOES' | 'CONTROLE' | 'SISTEMA';
  children?: AdminNavLink[];
}

export const ADMIN_NAVIGATION: AdminNavItem[] = [
  { id: 'operacao', label: 'Operação da frota', icon: 'fleet', path: '/admin', menu: 'operacao', section: 'OPERACAO' },
  { id: 'missoes', label: 'Missões', icon: 'mission', path: '/admin', menu: 'missoes', section: 'OPERACAO' },
  { id: 'vistorias', label: 'Vistorias', icon: 'inspection', path: '/admin', menu: 'checklists', section: 'OPERACAO', children: [
    { label: 'Checklists de missão', path: '/admin', menu: 'checklists' },
    { label: 'Vistorias completas', path: '/admin', menu: 'vistorias-completas' }
  ] },
  { id: 'alocacoes', label: 'Alocações administrativas', icon: 'register', path: '/admin/alocacoes', section: 'ALOCACOES' },
  { id: 'cadastros', permission: 'VEICULO_GERIR', label: 'Cadastros', icon: 'register', path: '/admin', menu: 'veiculos', section: 'CONTROLE', children: [
    { label: 'Veículos', path: '/admin', menu: 'veiculos' },
    { label: 'Motoristas', path: '/admin', menu: 'motoristas' }
  ] },
  { id: 'relatorios', label: 'Relatórios', icon: 'report', path: '/admin/relatorios', section: 'CONTROLE' },
  { id: 'configuracoes', permission: 'CONFIGURACAO_GERIR', label: 'Configurações', icon: 'settings', path: '/admin', menu: 'rotulos-status', section: 'SISTEMA' },
  { id: 'usuarios', label: 'Usuários e acessos', icon: 'register', path: '/admin/usuarios', section: 'SISTEMA', permission: 'ACESSO_GERIR' },
  { id: 'auditoria-acessos', label: 'Auditoria de acessos', icon: 'report', path: '/admin/auditoria-acessos', section: 'SISTEMA', permission: 'ACESSO_GERIR' }
];
