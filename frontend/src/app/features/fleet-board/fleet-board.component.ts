import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { AppIconComponent } from '../../shared/ui/app-icon.component';
import { Veiculo } from '../../core/models/veiculo.model';
import { FleetCard, FleetColumn, PainelCategoria } from './fleet-board.model';

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
  @Output() refresh = new EventEmitter<void>();
  @Output() history = new EventEmitter<Veiculo>();
  @Output() include = new EventEmitter<PainelCategoria>();
  @Output() move = new EventEmitter<{ event: CdkDragDrop<FleetCard[]>; category: PainelCategoria }>();
  @Output() dragging = new EventEmitter<boolean>();
  @Output() missions = new EventEmitter<void>();
  search = '';

  get ids(): string[] { return this.columns.map(column => column.id); }
  get total(): number { return this.columns.reduce((total, column) => total + column.cards.length, 0); }
  get matches(): number { return this.columns.reduce((total, column) => total + this.visibleCards(column).length, 0); }
  count(...ids: PainelCategoria[]): number { return this.columns.filter(column => ids.includes(column.id)).reduce((total, column) => total + column.cards.length, 0); }
  trackColumn(_: number, column: FleetColumn): string { return column.id; }
  trackCard(_: number, card: FleetCard): number { return card.vehicle.id; }

  visibleCards(column: FleetColumn): FleetCard[] {
    const query = this.normalize(this.search);
    return !query ? column.cards : column.cards.filter(card => this.normalize(`${card.vehicle.placa} ${card.vehicle.marca} ${card.vehicle.modelo} ${card.driver || ''}`).includes(query));
  }

  private normalize(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase(); }
}
