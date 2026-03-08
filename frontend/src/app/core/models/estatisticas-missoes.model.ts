export interface MissaoMotoristaStats {
  motoristaId: number;
  motoristaNome: string;
  quantidadeMissoes: number;
  tempoTotalSegundos: number;
  tempoTotalHoras: number;
}

export interface EstatisticasMissoesResponse {
  dataInicial: string;
  dataFinal: string;
  totalMissoes: number;
  totalHorasMissao: number;
  rankingPorMissoes: MissaoMotoristaStats[];
  rankingPorTempo: MissaoMotoristaStats[];
}
