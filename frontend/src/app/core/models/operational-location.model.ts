export interface LocalOperacionalResponse {
  id: number | null;
  nome: string;
  cor: string;
  ordemExibicao: number;
  ativo: boolean;
}

export interface SalvarLocaisOperacionaisRequest {
  locais: LocalOperacionalResponse[];
}
