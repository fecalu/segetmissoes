import { TipoOperacao } from './checklist.model';
import { MotivoExcecaoMissao, StatusExcecaoMissao } from './missao-excecao.model';
import { OrigemAberturaMissao, OrigemEncerramentoMissao, StatusDocumentalMissao } from './missao.model';
import { ResultadoVistoriaCompleta } from './vistoria-completa.model';
import { StatusVeiculo } from './veiculo.model';

export type TipoEventoHistoricoVeiculo =
  | 'MISSAO_INICIADA'
  | 'MISSAO_FINALIZADA'
  | 'CHECKLIST_SAIDA'
  | 'CHECKLIST_CHEGADA'
  | 'EXCECAO_ABERTA'
  | 'EXCECAO_REGULARIZADA'
  | 'VIAGEM_INICIADA'
  | 'VIAGEM_FINALIZADA'
  | 'VISTORIA_COMPLETA_SAIDA'
  | 'VISTORIA_COMPLETA_CHEGADA'
  | 'STATUS_ALTERADO';

export interface DetalheHistoricoVeiculo {
  tipoOperacao: TipoOperacao | null;
  origemAberturaMissao: OrigemAberturaMissao | null;
  origemEncerramentoMissao: OrigemEncerramentoMissao | null;
  statusDocumentalMissao: StatusDocumentalMissao | null;
  statusExcecaoMissao: StatusExcecaoMissao | null;
  resultadoVistoria: ResultadoVistoriaCompleta | null;
  motivoExcecao: MotivoExcecaoMissao | null;
  localDestino: string | null;
  setorSolicitante: string | null;
  solicitanteNome: string | null;
  justificativa: string | null;
  justificativaEncerramento: string | null;
  nomeContraparte: string | null;
  quilometragem: number | null;
  localizacao: string | null;
  observacaoGeral: string | null;
  statusAnterior: StatusVeiculo | null;
  statusNovo: StatusVeiculo | null;
}

export interface EventoHistoricoVeiculo {
  idExibicao: string;
  tipo: TipoEventoHistoricoVeiculo;
  dataHora: string;
  titulo: string;
  descricao: string | null;
  motoristaNome: string | null;
  responsavelNome: string | null;
  possuiFotos: boolean;
  quantidadeFotos: number;
  possuiAvarias: boolean;
  quantidadeAvarias: number;
  missaoId: number | null;
  checklistId: number | null;
  missaoExcecaoId: number | null;
  vistoriaCompletaId: number | null;
  historicoStatusId: number | null;
  detalhe: DetalheHistoricoVeiculo | null;
}

export interface ResumoHistoricoVeiculo {
  totalEventos: number;
  totalMissoes: number;
  totalChecklists: number;
  totalExcecoes: number;
  totalVistoriasCompletas: number;
  totalUsosExternos: number;
  totalIdasOficina: number;
  ultimaMissaoEm: string | null;
  ultimaVistoriaEm: string | null;
}

export interface HistoricoVeiculoResponse {
  veiculoId: number;
  placa: string;
  marca: string;
  modelo: string;
  statusAtual: StatusVeiculo;
  statusAtualRotulo: string;
  motoristaAtualNome: string | null;
  ultimaMovimentacaoEm: string | null;
  resumo: ResumoHistoricoVeiculo;
  eventos: EventoHistoricoVeiculo[];
}
