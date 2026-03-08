import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { EstatisticasMissoesResponse, MissaoMotoristaStats } from '../../core/models/estatisticas-missoes.model';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-mission-stats',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './admin-mission-stats.component.html',
  styleUrl: './admin-mission-stats.component.css'
})
export class AdminMissionStatsComponent {
  loading = false;
  stats: EstatisticasMissoesResponse | null = null;
  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly adminService: AdminService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {
    const hoje = this.hojeIso();
    this.form = this.fb.nonNullable.group({
      dataInicial: [hoje, [Validators.required]],
      dataFinal: [hoje, [Validators.required]]
    });
    this.buscar();
  }

  voltar(): void {
    this.router.navigate(['/admin'], { queryParams: { menu: 'checklists' } });
  }

  buscar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { dataInicial, dataFinal } = this.form.getRawValue();
    if (dataFinal < dataInicial) {
      this.snackBar.open('Data final deve ser igual ou maior que data inicial.', 'Fechar', { duration: 3000 });
      return;
    }

    this.loading = true;
    this.adminService.buscarEstatisticasMissoes(dataInicial, dataFinal)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: data => (this.stats = data),
        error: () => this.snackBar.open('Falha ao carregar estatisticas de missoes.', 'Fechar', { duration: 3200 })
      });
  }

  maxMissoes(): number {
    if (!this.stats?.rankingPorMissoes.length) {
      return 1;
    }
    return Math.max(...this.stats.rankingPorMissoes.map(item => item.quantidadeMissoes), 1);
  }

  maxHoras(): number {
    if (!this.stats?.rankingPorTempo.length) {
      return 1;
    }
    return Math.max(...this.stats.rankingPorTempo.map(item => item.tempoTotalHoras), 1);
  }

  barraMissoes(item: MissaoMotoristaStats): string {
    return `${(item.quantidadeMissoes / this.maxMissoes()) * 100}%`;
  }

  barraHoras(item: MissaoMotoristaStats): string {
    return `${(item.tempoTotalHoras / this.maxHoras()) * 100}%`;
  }

  formatHoras(horas: number): string {
    return `${horas.toFixed(2)} h`;
  }

  private hojeIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
