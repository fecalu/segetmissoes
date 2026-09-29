import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export type CorrigirSaidaOpcao = 'ENGANO' | 'DADOS_ERRADOS';

export interface CorrigirSaidaDialogData {
  placa: string;
  missaoId: number;
}

@Component({
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <section class="correction-dialog">
      <header>
        <span>Correção operacional</span>
        <h2 mat-dialog-title>Corrigir saída</h2>
        <p>Escolha o que aconteceu com a missão #{{ data.missaoId }} do veículo {{ data.placa }}.</p>
      </header>

      <mat-dialog-content class="correction-options">
        <button type="button" class="option-card danger" (click)="select('ENGANO')">
          <strong>Saída registrada por engano</strong>
          <small>Cancela esta saída e devolve o veículo para a situação anterior.</small>
        </button>

        <button type="button" class="option-card" (click)="select('DADOS_ERRADOS')">
          <strong>Motorista ou veículo está errado</strong>
          <small>Ajusta motorista ou veículo sem cancelar o registro.</small>
        </button>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      </mat-dialog-actions>
    </section>
  `,
  styles: [`
    .correction-dialog { width: min(92vw, 460px); color: #16243a; font-family: 'Barlow', sans-serif; }
    header { padding: 22px 22px 8px; }
    header span { display: inline-block; margin-bottom: 8px; color: #1c5c7a; font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    h2[mat-dialog-title] { margin: 0; padding: 0; color: #10233f; font-size: 23px; line-height: 1.15; font-weight: 700; }
    header p { margin: 10px 0 0; color: #61718a; font-size: 13px; line-height: 1.45; }
    .correction-options { display: grid; gap: 10px; padding: 12px 22px 4px !important; }
    .option-card { width: 100%; border: 1px solid #d8e1ed; border-radius: 14px; background: #fff; color: #172a43; text-align: left; padding: 14px 15px; cursor: pointer; transition: border-color .15s, background .15s, transform .15s; }
    .option-card strong { display: block; margin-bottom: 5px; font-size: 14px; font-weight: 800; }
    .option-card small { display: block; color: #677890; font-size: 12px; line-height: 1.35; }
    .option-card:hover { transform: translateY(-1px); border-color: #8fb0d4; background: #f8fbff; }
    .option-card.danger { border-color: #edc9d0; background: #fff8f8; }
    .option-card.danger strong { color: #9b3340; }
    mat-dialog-actions { padding: 10px 22px 20px !important; }
    mat-dialog-actions button { border-radius: 999px; min-height: 38px; padding: 0 17px; font-family: 'Barlow', sans-serif; font-weight: 700; }
  `]
})
export class CorrigirSaidaDialogComponent {
  readonly data = inject<CorrigirSaidaDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<CorrigirSaidaDialogComponent, CorrigirSaidaOpcao>);

  select(opcao: CorrigirSaidaOpcao): void {
    this.ref.close(opcao);
  }
}
