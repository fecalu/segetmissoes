import { Veiculo } from '../../core/models/veiculo.model';
import { MissaoResponse } from '../../core/models/missao.model';

export type PainelCategoria = 'DISPONIVEL' | 'MISSAO' | 'USO_EXTERNO' | 'VIAGEM' | 'PATIO' | 'REALOCACAO' | 'BLOQUEADO';

export interface FleetCard {
  vehicle: Veiculo;
  activeMission: MissaoResponse | null;
  statusLabel: string;
  driver: string | null;
  departure: string | null;
  duration: string | null;
  manual: boolean;
  moving: boolean;
  allowedDestinations: PainelCategoria[];
  canUndoMission: boolean;
  details: Array<{ label: string; value: string | null }>;
}

export interface FleetColumn {
  id: PainelCategoria;
  title: string;
  description: string;
  allowsInclusion: boolean;
  cards: FleetCard[];
}
