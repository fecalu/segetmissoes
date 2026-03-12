import { TipoOperacao } from './checklist.model';

export type ResultadoVistoriaCompleta = 'APROVADO' | 'RESSALVA' | 'REPROVADO';
export type StatusItemVistoriaCompleta = 'OK' | 'FALTANDO' | 'NAO_SE_APLICA';
export type TipoItemObrigatorioVistoriaCompleta =
  | 'CHAVE_VEICULO'
  | 'DOCUMENTO_VEICULO'
  | 'MACACO'
  | 'CHAVE_DE_RODA'
  | 'TRIANGULO'
  | 'ESTEPE';
export type TipoFotoVistoriaCompleta =
  | 'FRENTE'
  | 'LATERAL_ESQ'
  | 'LATERAL_DIR'
  | 'TRASEIRA'
  | 'PAINEL'
  | 'ESTEPE';
export type TipoAvariaVistoriaCompleta =
  | 'AMASSADO'
  | 'RISCADO'
  | 'QUEBRADO'
  | 'TRINCADO'
  | 'FALTANDO'
  | 'OUTRO';

export interface ItemVistoriaCompletaResponse {
  id: number;
  tipoItem: TipoItemObrigatorioVistoriaCompleta;
  status: StatusItemVistoriaCompleta;
  observacao: string | null;
}

export interface FotoVistoriaCompletaResponse {
  id: number;
  tipoFoto: TipoFotoVistoriaCompleta;
  caminhoArquivo: string;
}

export interface AvariaVistoriaCompletaResponse {
  id: number;
  local: string;
  tipoAvaria: TipoAvariaVistoriaCompleta;
  descricao: string;
  jaExistia: boolean;
  caminhoArquivoFoto: string;
}

export interface VistoriaCompletaResponse {
  id: number;
  dataHora: string;
  tipoOperacao: TipoOperacao;
  quilometragem: number;
  localizacao: string | null;
  observacaoGeral: string | null;
  nomeContraparte: string | null;
  resultado: ResultadoVistoriaCompleta;
  motoristaId: number;
  motoristaNome: string;
  veiculoId: number;
  veiculoPlaca: string;
  veiculoMarca: string;
  veiculoModelo: string;
  itens: ItemVistoriaCompletaResponse[];
  fotos: FotoVistoriaCompletaResponse[];
  avarias: AvariaVistoriaCompletaResponse[];
}
