export type StatusVeiculo = 'ATIVO' | 'INATIVO';

export interface Veiculo {
  id: number;
  placa: string;
  modelo: string;
  marca: string;
  status: StatusVeiculo;
}
