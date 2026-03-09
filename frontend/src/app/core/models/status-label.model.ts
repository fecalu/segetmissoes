import { StatusVeiculo } from './veiculo.model';

export interface RotuloStatusVeiculoResponse {
  status: StatusVeiculo;
  rotulo: string;
  rotuloPadrao: string;
  personalizado: boolean;
}

export interface SalvarRotulosStatusVeiculoRequest {
  rotulos: Array<{
    status: StatusVeiculo;
    rotulo: string;
  }>;
}
