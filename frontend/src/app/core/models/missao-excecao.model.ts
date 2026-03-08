export type StatusExcecaoMissao =
  | 'EXCECAO_ABERTA'
  | 'ATRASADA'
  | 'REGULARIZADA_POR_CHECKLIST'
  | 'REGULARIZADA_SEM_CHECKLIST'
  | 'ENCERRADA_ADMIN';

export type MotivoExcecaoMissao =
  | 'TROCA_RAPIDA_VEICULO'
  | 'CHUVA_FORTE'
  | 'URGENCIA_OPERACIONAL'
  | 'SEM_TEMPO_OPERACIONAL'
  | 'FALHA_CAMERA'
  | 'OUTROS';

export interface MissaoExcecaoResponse {
  id: number;
  status: StatusExcecaoMissao;
  statusRegularizacao: 'PENDENTE' | 'ATRASADA' | 'REGULARIZADA';
  dataHoraAbertura: string;
  prazoRegularizacao: string;
  dataHoraRegularizacao: string | null;
  atrasada: boolean;
  minutosEmAberto: number;
  motoristaId: number;
  motoristaNome: string;
  veiculoId: number;
  veiculoPlaca: string;
  motivo: MotivoExcecaoMissao;
  justificativa: string | null;
  justificativaEncerramentoAdmin: string | null;
  administradorId: number | null;
  administradorNome: string | null;
  checklistRegularizacaoId: number | null;
  ipOrigem: string | null;
  dispositivo: string | null;
  localizacao: string | null;
}
