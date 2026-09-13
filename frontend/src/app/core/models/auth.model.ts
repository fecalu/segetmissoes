export interface LoginRequest {
  login: string;
  senha: string;
}

export type Perfil = 'ADMIN' | 'GESTOR' | 'OPERADOR' | 'MOTORISTA';

export type Permissao = 'FROTA_CONSULTAR' | 'FROTA_OPERAR' | 'VEICULO_GERIR' | 'VEICULO_LIBERAR'
  | 'CADASTRO_EXCLUIR' | 'MISSAO_REGISTRAR' | 'MISSAO_COMPLEMENTAR' | 'MISSAO_CORRIGIR'
  | 'MISSAO_ENCERRAR_EXCECAO' | 'VISTORIA_CONSULTAR' | 'VISTORIA_CORRIGIR' | 'MOTORISTA_GERIR'
  | 'ALOCACAO_CONSULTAR' | 'ALOCACAO_GERIR' | 'RELATORIO_EXPORTAR' | 'ESTATISTICA_CONSULTAR'
  | 'CONFIGURACAO_GERIR' | 'ACESSO_GERIR';

export const PERFIL_LABELS: Record<Perfil, string> = {
  ADMIN: 'Administrador', GESTOR: 'Gestor', OPERADOR: 'Operador', MOTORISTA: 'Motorista'
};

export interface SessaoResponse {
  motoristaId: number;
  nome: string;
  perfil: Perfil;
  permissoes: Permissao[];
}

export interface LoginResponse {
  token: string;
  motoristaId: number;
  nome: string;
  perfil: Perfil;
}
