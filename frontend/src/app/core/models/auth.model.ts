export interface LoginRequest {
  login: string;
  senha: string;
}

export type Perfil = 'ADMIN' | 'MOTORISTA';

export interface LoginResponse {
  token: string;
  motoristaId: number;
  nome: string;
  perfil: Perfil;
}
