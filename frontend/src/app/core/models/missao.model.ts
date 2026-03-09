export type StatusMissao = 'ATIVA' | 'FINALIZADA';
export type StatusDocumentalMissao = 'PENDENTE_DADOS_ADMIN' | 'DADOS_ADMIN_COMPLETOS';
export type OrigemAberturaMissao = 'CHECKLIST' | 'SEM_CHECKLIST';
export type OrigemEncerramentoMissao = 'CHECKLIST' | 'SEM_CHECKLIST' | 'ADMINISTRATIVO';

export interface MissaoResponse {
  id: number;
  status: StatusMissao;
  statusDocumental: StatusDocumentalMissao;
  dataHoraInicio: string;
  dataHoraFim: string | null;
  duracaoSegundos: number;
  origemAbertura: OrigemAberturaMissao;
  origemEncerramento: OrigemEncerramentoMissao | null;
  motoristaId: number;
  motoristaNome: string;
  veiculoId: number;
  veiculoPlaca: string;
  veiculoMarca: string;
  veiculoModelo: string;
  checklistSaidaId: number | null;
  checklistChegadaId: number | null;
  missaoExcecaoId: number | null;
  administradorEncerramentoId: number | null;
  administradorEncerramentoNome: string | null;
  localDestino: string | null;
  setorSolicitante: string | null;
  solicitanteNome: string | null;
}

export type AcaoAuditoriaMissao =
  | 'ABERTURA_CHECKLIST'
  | 'ABERTURA_SEM_CHECKLIST'
  | 'ABERTURA_LEGADO_RECONSTRUIDA'
  | 'ENCERRAMENTO_CHECKLIST'
  | 'ENCERRAMENTO_SEM_CHECKLIST'
  | 'ENCERRAMENTO_ADMINISTRATIVO'
  | 'ATUALIZACAO_DADOS_ADMINISTRATIVOS';

export interface AuditoriaMissaoResponse {
  id: number;
  missaoId: number;
  acao: AcaoAuditoriaMissao;
  statusAnterior: StatusMissao | null;
  statusNovo: StatusMissao | null;
  usuarioAcaoId: number | null;
  usuarioAcaoNome: string | null;
  dataHora: string;
  detalhe: string | null;
  campoAlterado: string | null;
  valorAnterior: string | null;
  valorNovo: string | null;
}
