export type TipoOperacao = 'SAIDA' | 'ENTRADA';
export type TipoFoto = 'PAINEL' | 'ESTEPE' | 'LATERAL_ESQ' | 'LATERAL_DIR';

export interface FotoChecklist {
  id: number;
  tipoFoto: TipoFoto;
  caminhoArquivo: string;
}

export interface ChecklistResponse {
  id: number;
  dataHora: string;
  tipoOperacao: TipoOperacao;
  quilometragem: number | null;
  motoristaId: number;
  motoristaNome: string;
  veiculoId: number;
  veiculoPlaca: string;
  fotos: FotoChecklist[];
}
