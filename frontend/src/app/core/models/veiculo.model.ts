export type StatusVeiculo =
  | 'CIRCULANDO'
  | 'BASE_JOAO_GOULART'
  | 'NO_PATIO'
  | 'AGUARDANDO_REALOCACAO'
  | 'EM_USO_EXTERNO'
  | 'OFICINA'
  | 'EM_VIAGEM'
  | 'MANUTENCAO'
  | 'BLOQUEADO';

export type StatusAdministrativoVeiculo =
  | 'NO_PATIO'
  | 'AGUARDANDO_REALOCACAO'
  | 'EM_USO_EXTERNO'
  | 'OFICINA'
  | 'EM_VIAGEM'
  | 'MANUTENCAO'
  | 'BLOQUEADO';

export interface Veiculo {
  id: number;
  placa: string;
  modelo: string;
  marca: string;
  desativado: boolean;
  statusAtual: StatusVeiculo;
  statusAutomatico: StatusVeiculo;
  statusAdministrativo: StatusAdministrativoVeiculo | null;
  motoristaAtualId: number | null;
  motoristaAtualNome: string | null;
  statusAtualRotulo?: string | null;
  statusAutomaticoRotulo?: string | null;
  statusAdministrativoRotulo?: string | null;
  viagemId?: number | null;
  viagemMotoristaId?: number | null;
  viagemMotoristaNome?: string | null;
  viagemLocalDestino?: string | null;
  viagemObservacao?: string | null;
  viagemDataHoraSaida?: string | null;
}

export interface HistoricoStatusVeiculo {
  id: number;
  veiculoId: number;
  veiculoPlaca: string;
  statusAnterior: StatusVeiculo;
  statusNovo: StatusVeiculo;
  administradorId: number;
  administradorNome: string;
  dataHora: string;
}
