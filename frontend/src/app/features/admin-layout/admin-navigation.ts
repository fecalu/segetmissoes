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
  section: 'OPERACAO' | 'CONTROLE' | 'ALOCACOES' | 'CADASTROS' | 'ANALISE' | 'SISTEMA';
  children?: AdminNavLink[];
}

export const ADMIN_NAVIGATION: AdminNavItem[] = [
  { id: 'operacao', label: 'Operação da frota', icon: 'fleet', path: '/admin', menu: 'operacao', section: 'OPERACAO' },
  { id: 'missoes', label: 'Missões e deslocamentos', icon: 'mission', path: '/admin', menu: 'missoes', section: 'CONTROLE' },
  { id: 'vistorias', label: 'Checklists e vistorias', icon: 'inspection', path: '/admin', menu: 'checklists', section: 'CONTROLE', permission: 'VISTORIA_CONSULTAR', children: [
    { label: 'Registros de checklist', path: '/admin', menu: 'checklists' },
    { label: 'Vistorias de entrega/recebimento', path: '/admin', menu: 'vistorias-completas' }
  ] },
  { id: 'alocacoes', permission: 'ALOCACAO_CONSULTAR', label: 'Alocações administrativas', icon: 'register', path: '/admin/alocacoes', section: 'ALOCACOES' },
  { id: 'cadastros', label: 'Cadastros', icon: 'register', path: '/admin', menu: 'veiculos', section: 'CADASTROS', children: [
    { permission: 'VEICULO_GERIR', label: 'Veículos', path: '/admin', menu: 'veiculos' },
    { permission: 'MOTORISTA_GERIR', label: 'Motoristas', path: '/admin', menu: 'motoristas' }
  ] },
  { id: 'relatorios', permission: 'RELATORIO_EXPORTAR', label: 'Relatórios', icon: 'report', path: '/admin/relatorios', section: 'ANALISE' },
  { id: 'estatisticas', permission: 'ESTATISTICA_CONSULTAR', label: 'Estatísticas', icon: 'report', path: '/admin/estatisticas/missoes', section: 'ANALISE' },
  { id: 'configuracoes', permission: 'CONFIGURACAO_GERIR', label: 'Configurações', icon: 'settings', path: '/admin', menu: 'rotulos-status', section: 'SISTEMA' },
  { id: 'usuarios', label: 'Usuários e acessos', icon: 'register', path: '/admin/usuarios', section: 'SISTEMA', permission: 'ACESSO_GERIR' },
  { id: 'auditoria-acessos', label: 'Auditoria de acessos', icon: 'report', path: '/admin/auditoria-acessos', section: 'SISTEMA', permission: 'ACESSO_GERIR' }
];
