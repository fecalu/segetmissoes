import { Perfil } from './auth.model';

export interface Motorista {
  id: number;
  nome: string;
  login: string;
  cpf: string;
  perfil: Perfil;
}

export interface MotoristaAdminPayload {
  nome: string;
  login: string;
  cpf: string;
  senha?: string;
  perfil: Perfil;
}
