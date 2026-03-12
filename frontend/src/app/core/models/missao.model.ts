import { MotivoExcecaoMissao } from './missao-excecao.model';

export type StatusMissao = 'ATIVA' | 'FINALIZADA';
export type StatusDocumentalMissao = 'PENDENTE_DADOS_ADMIN' | 'DADOS_ADMIN_COMPLETOS';
export type OrigemAberturaMissao = 'CHECKLIST' | 'SEM_CHECKLIST' | 'CONTINGENCIA_ADMIN';
export type OrigemEncerramentoMissao = 'CHECKLIST' | 'SEM_CHECKLIST' | 'ADMINISTRATIVO';
export type TipoDeslocamentoMissao = 'NA_CIDADE' | 'VIAGEM';

export interface MissaoResponse {
  id: number;
  status: StatusMissao;
  statusDocumental: StatusDocumentalMissao;
  dataHoraInicio: string;
  dataHoraFim: string | null;
  duracaoSegundos: number;
  origemAbertura: OrigemAberturaMissao;
  origemEncerramento: OrigemEncerramentoMissao | null;
  tipoDeslocamento: TipoDeslocamentoMissao;
  motoristaId: number;
  motoristaNome: string;
  veiculoId: number;
  veiculoPlaca: string;
  veiculoMarca: string;
  veiculoModelo: string;
  checklistSaidaId: number | null;
  checklistChegadaId: number | null;
  missaoExcecaoId: number | null;
  administradorAberturaId: number | null;
  administradorAberturaNome: string | null;
  administradorEncerramentoId: number | null;
  administradorEncerramentoNome: string | null;
  motivoContingencia: MotivoExcecaoMissao | null;
  justificativaContingenciaAbertura: string | null;
  justificativaContingenciaEncerramento: string | null;
  localDestino: string | null;
  setorSolicitante: string | null;
  solicitanteNome: string | null;
}

export type AcaoAuditoriaMissao =
  | 'ABERTURA_CHECKLIST'
  | 'ABERTURA_SEM_CHECKLIST'
  | 'ABERTURA_CONTINGENCIA_ADMIN'
  | 'ABERTURA_LEGADO_RECONSTRUIDA'
  | 'ENCERRAMENTO_CHECKLIST'
  | 'ENCERRAMENTO_SEM_CHECKLIST'
  | 'ENCERRAMENTO_PENDENTE_ADMIN'
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
