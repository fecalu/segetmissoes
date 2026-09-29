import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MissaoResponse } from '../../core/models/missao.model';
import { Motorista } from '../../core/models/motorista.model';
import { Veiculo } from '../../core/models/veiculo.model';

export interface CorrigirSaidaDadosDialogData {
  missao: MissaoResponse;
  motoristas: Motorista[];
  veiculos: Veiculo[];
}

export interface CorrigirSaidaDadosDialogResult {
  motoristaId: number;
  veiculoId: number;
  justificativa: string;
}

@Component({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <section class="correction-data-dialog">
      <header>
        <span>Dados da saída</span>
        <h2 mat-dialog-title>Corrigir motorista ou veículo</h2>
        <p>
          Missão #{{ data.missao.id }} registrada para
          <strong>{{ data.missao.motoristaNome }}</strong> com o veículo
          <strong>{{ data.missao.veiculoPlaca }}</strong>.
        </p>
      </header>

      <mat-dialog-content>
        <form [formGroup]="form" class="correction-form">
          <mat-form-field appearance="outline">
            <mat-label>Motorista correto</mat-label>
            <mat-select formControlName="motoristaId">
              <mat-option *ngFor="let motorista of data.motoristas" [value]="motorista.id">
                {{ motorista.nome }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Veículo correto</mat-label>
            <mat-select formControlName="veiculoId">
              <mat-option *ngFor="let veiculo of data.veiculos" [value]="veiculo.id">
                {{ veiculo.placa }} - {{ veiculo.marca || '' }} {{ veiculo.modelo }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Motivo da correção</mat-label>
            <textarea
              matInput
              rows="3"
              formControlName="justificativa"
              placeholder="Ex.: motorista pegou outro veículo na saída"
            ></textarea>
            <mat-hint>Mínimo de 4 caracteres.</mat-hint>
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="ref.close()">Cancelar</button>
        <button mat-flat-button color="primary" type="button" (click)="confirmar()">Salvar correção</button>
      </mat-dialog-actions>
    </section>
  `,
  styles: [`
    .correction-data-dialog { width: min(94vw, 560px); color: #172a43; font-family: 'Barlow', sans-serif; }
    header { padding: 22px 22px 10px; }
    header span { display: inline-block; margin-bottom: 8px; color: #1c5c7a; font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    h2[mat-dialog-title] { margin: 0; padding: 0; color: #10233f; font-size: 23px; line-height: 1.15; font-weight: 700; }
    header p { margin: 10px 0 0; color: #61718a; font-size: 13px; line-height: 1.45; }
    header strong { color: #203955; font-weight: 800; }
    mat-dialog-content { padding: 10px 22px 0 !important; }
    .correction-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .full { grid-column: 1 / -1; }
    mat-dialog-actions { padding: 12px 22px 22px !important; gap: 8px; }
    mat-dialog-actions button { border-radius: 999px; min-height: 38px; padding: 0 17px; font-family: 'Barlow', sans-serif; font-weight: 700; }

    @media (max-width: 620px) {
      .correction-form { grid-template-columns: 1fr; }
    }
  `]
})
export class CorrigirSaidaDadosDialogComponent {
  readonly data = inject<CorrigirSaidaDadosDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<CorrigirSaidaDadosDialogComponent, CorrigirSaidaDadosDialogResult>);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    motoristaId: [this.data.missao.motoristaId, Validators.required],
    veiculoId: [this.data.missao.veiculoId, Validators.required],
    justificativa: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(700)]]
  });

  confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.ref.close({
      motoristaId: raw.motoristaId,
      veiculoId: raw.veiculoId,
      justificativa: raw.justificativa.trim()
    });
  }
}
