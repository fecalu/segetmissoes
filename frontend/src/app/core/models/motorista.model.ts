import { Perfil } from './auth.model';

export interface Motorista {
  id: number;
  nome: string;
  login: string;
  cpf: string | null;
  perfil: Perfil;
  acessoHabilitado: boolean;
  deveAlterarSenha: boolean;
  cadastroCompleto: boolean;
}

export interface MotoristaAdminPayload {
  nome: string;
  login: string;
  cpf?: string | null;
  senha?: string;
  perfil: Perfil;
}
