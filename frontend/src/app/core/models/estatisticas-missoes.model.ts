export type TipoDeslocamentoEstatistica = 'NA_CIDADE' | 'VIAGEM';

export interface MissaoMotoristaStats {
  motoristaId: number;
  motoristaNome: string;
  quantidadeMissoes: number;
  tempoTotalSegundos: number;
  tempoTotalHoras: number;
}

export interface EstatisticasGrupoMissoes {
  tipoDeslocamento: TipoDeslocamentoEstatistica | null;
  titulo: string;
  totalMissoes: number;
  totalHorasMissao: number;
  rankingPorMissoes: MissaoMotoristaStats[];
  rankingPorTempo: MissaoMotoristaStats[];
}

export interface EstatisticasMissoesResponse {
  dataInicial: string;
  dataFinal: string;
  totalMissoes: number;
  totalHorasMissao: number;
  totalMissoesUrbanas: number;
  totalHorasMissaoUrbana: number;
  totalViagens: number;
  totalHorasViagem: number;
  rankingPorMissoes: MissaoMotoristaStats[];
  rankingPorTempo: MissaoMotoristaStats[];
  missoesUrbanas: EstatisticasGrupoMissoes;
  viagens: EstatisticasGrupoMissoes;
}
