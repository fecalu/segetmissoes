import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { AppIconComponent } from '../../shared/ui/app-icon.component';
import { Veiculo } from '../../core/models/veiculo.model';
import { MissaoResponse } from '../../core/models/missao.model';
import { FleetCard, FleetColumn, PainelCategoria } from './fleet-board.model';

type OperacaoView = 'PAINEL' | 'MAPA';
type DailyPeriod = 'MANHA' | 'TARDE' | 'NOITE';

interface DailyMissionGroup {
  id: DailyPeriod;
  title: string;
  missions: MissaoResponse[];
}

@Component({
  selector: 'app-fleet-board',
  imports: [CommonModule, FormsModule, DragDropModule, AppIconComponent],
  templateUrl: './fleet-board.component.html',
  styleUrl: './fleet-board.component.css'
})
export class FleetBoardComponent {
  @Input({ required: true }) columns: FleetColumn[] = [];
  @Input() loading = false;
  @Input() updatedAt: Date | null = null;
  @Input() vehicleError = false;
  @Input() missionError = false;
  @Input() dailyMissions: MissaoResponse[] = [];
  @Input() dailyMapDate = '';
  @Input() loadingDailyMap = false;
  @Input() dailyMapError = false;
  @Input() operationalLocations: string[] = [];
  @Output() refresh = new EventEmitter<void>();
  @Output() history = new EventEmitter<Veiculo>();
  @Output() move = new EventEmitter<{ event: CdkDragDrop<FleetCard[]>; category: PainelCategoria }>();
  @Output() moveVehicle = new EventEmitter<{ vehicle: Veiculo; category: PainelCategoria }>();
  @Output() locationChange = new EventEmitter<{ vehicle: Veiculo; location: string | null }>();
  @Output() dragging = new EventEmitter<boolean>();
  @Output() missions = new EventEmitter<void>();
  @Output() viewChange = new EventEmitter<OperacaoView>();
  @Output() editMission = new EventEmitter<MissaoResponse>();
  @Output() finishMission = new EventEmitter<MissaoResponse>();
  @Output() createMission = new EventEmitter<void>();
  @Output() exportDailyReport = new EventEmitter<void>();
  search = '';
  movingVehicleId: number | null = null;
  locationVehicleId: number | null = null;
  hiddenDetailsVehicleIds = new Set<number>();
  activeView: OperacaoView = 'PAINEL';

  get ids(): string[] { return this.columns.map(column => column.id); }
  get total(): number { return this.columns.reduce((total, column) => total + column.cards.length, 0); }
  get matches(): number { return this.columns.reduce((total, column) => total + this.visibleCards(column).length, 0); }
  get dailyMissionsSorted(): MissaoResponse[] { return [...this.dailyMissions].sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio)); }
  get dailyMissionGroups(): DailyMissionGroup[] {
    const groups: Record<DailyPeriod, DailyMissionGroup> = {
      MANHA: { id: 'MANHA', title: 'Manhã', missions: [] },
      TARDE: { id: 'TARDE', title: 'Tarde', missions: [] },
      NOITE: { id: 'NOITE', title: 'Noite / fora do expediente', missions: [] }
    };

    for (const mission of this.dailyMissionsSorted) {
      groups[this.dailyPeriod(mission.dataHoraInicio)].missions.push(mission);
    }

    return [groups.MANHA, groups.TARDE, groups.NOITE].filter(group => group.missions.length > 0);
  }
  trackColumn(_: number, column: FleetColumn): string { return column.id; }
  trackCard(_: number, card: FleetCard): number { return card.vehicle.id; }
  trackMission(_: number, mission: MissaoResponse): number { return mission.id; }

  setView(view: OperacaoView): void {
    if (this.activeView === view) return;
    this.activeView = view;
    this.viewChange.emit(view);
  }

  toggleMove(vehicleId: number): void {
    this.movingVehicleId = this.movingVehicleId === vehicleId ? null : vehicleId;
    this.locationVehicleId = null;
  }

  toggleLocation(vehicleId: number): void {
    this.locationVehicleId = this.locationVehicleId === vehicleId ? null : vehicleId;
    this.movingVehicleId = null;
  }

  toggleDetails(vehicleId: number): void {
    const hidden = new Set(this.hiddenDetailsVehicleIds);
    hidden.has(vehicleId) ? hidden.delete(vehicleId) : hidden.add(vehicleId);
    this.hiddenDetailsVehicleIds = hidden;
  }

  moveTo(vehicle: Veiculo, category: PainelCategoria): void {
    this.movingVehicleId = null;
    this.moveVehicle.emit({ vehicle, category });
  }

  setOperationalLocation(vehicle: Veiculo, location: string | null): void {
    this.locationVehicleId = null;
    this.movingVehicleId = null;
    this.locationChange.emit({ vehicle, location });
  }

  locationColorClass(location: string | null): string {
    const normalized = this.normalize(location || 'sem-local');
    return `location-${normalized || 'sem-local'}`;
  }

  moveDestinations(source: PainelCategoria, card: FleetCard): FleetColumn[] {
    if (source === 'MISSAO' || source === 'VIAGEM' || source === 'USO_EXTERNO') {
      const returnDestinations: PainelCategoria[] = ['DISPONIVEL', 'PATIO', 'REALOCACAO', 'BLOQUEADO'];
      return this.columns.filter(column => returnDestinations.includes(column.id) && card.allowedDestinations.includes(column.id));
    }
    return this.columns.filter(column => column.id !== source && card.allowedDestinations.includes(column.id));
  }

  visibleCards(column: FleetColumn): FleetCard[] {
    const query = this.normalize(this.search);
    return !query ? column.cards : column.cards.filter(card => this.normalize(`${card.vehicle.placa} ${card.vehicle.marca} ${card.vehicle.modelo} ${card.driver || ''}`).includes(query));
  }

  missionVehicle(mission: MissaoResponse): string {
    return `${mission.veiculoPlaca} - ${mission.veiculoMarca} ${mission.veiculoModelo}`.trim();
  }

  missionContext(value: string | null): string {
    return value?.trim() || 'Pendente';
  }

  dailyMapDateLabel(): string {
    const [year, month, day] = this.dailyMapDate.split('-');
    return year && month && day ? `${day}/${month}/${year}` : 'Hoje';
  }

  missionTime(value: string | null, reference?: string): string {
    if (!value) return 'Em andamento';
    const date = new Date(value);
    const base = reference ? new Date(reference) : date;
    const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
    if (date.toDateString() === base.toDateString()) return time;
    const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
    return `${day} ${time}`;
  }

  private dailyPeriod(value: string): DailyPeriod {
    const hour = new Date(value).getHours();
    if (hour < 12) return 'MANHA';
    if (hour < 18) return 'TARDE';
    return 'NOITE';
  }

  private normalize(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase(); }
}
