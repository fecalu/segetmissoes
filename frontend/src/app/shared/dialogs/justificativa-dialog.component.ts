import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <section class="reason-dialog">
      <header class="reason-header">
        <span class="reason-kicker">Confirmação</span>
        <h2 mat-dialog-title>{{ data.title }}</h2>
        <p>{{ data.message }}</p>
      </header>

      <mat-dialog-content class="reason-content">
        <label class="reason-field">
          <span>Motivo</span>
          <textarea
            #motivoInput
            [(ngModel)]="motivo"
            rows="4"
            maxlength="700"
            placeholder="Ex.: veículo selecionado por engano"
            required
          ></textarea>
        </label>
        <div class="reason-helper">
          <span>Mínimo de {{ minLength }} caracteres</span>
          <span>{{ motivo.trim().length }}/700</span>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="reason-actions">
        <button mat-button type="button" (click)="ref.close()">Cancelar</button>
        <button
          mat-flat-button
          type="button"
          class="confirm-button"
          [disabled]="motivo.trim().length < minLength"
          (click)="ref.close(motivo.trim())"
        >
          Confirmar
        </button>
      </mat-dialog-actions>
    </section>
  `,
  styles: [`
    .reason-dialog { width: min(92vw, 440px); color: #16243a; font-family: 'Barlow', sans-serif; }
    .reason-header { padding: 22px 22px 8px; }
    .reason-kicker { display: inline-block; margin-bottom: 8px; color: #1c5c7a; font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    h2[mat-dialog-title] { margin: 0; padding: 0; color: #10233f; font-size: 22px; line-height: 1.15; font-weight: 700; }
    .reason-header p { margin: 10px 0 0; color: #61718a; font-size: 13px; line-height: 1.45; }
    .reason-content { padding: 10px 22px 0 !important; }
    .reason-field { display: grid; gap: 7px; }
    .reason-field span { color: #344963; font-size: 12px; font-weight: 700; }
    .reason-field textarea { width: 100%; min-height: 92px; resize: vertical; box-sizing: border-box; border: 1px solid #d6dfeb; border-radius: 12px; background: #fff; color: #12233a; caret-color: #1c5c7a; outline: none; padding: 12px 13px; font: 500 14px/1.45 'Barlow', sans-serif; box-shadow: inset 0 1px 2px rgba(18, 35, 58, .04); }
    .reason-field textarea::placeholder { color: #9aa8ba; }
    .reason-field textarea:focus { border-color: #1c5c7a; box-shadow: 0 0 0 3px rgba(28, 92, 122, .14); }
    .reason-helper { display: flex; justify-content: space-between; gap: 12px; margin-top: 7px; color: #728198; font-size: 11px; }
    .reason-actions { padding: 18px 22px 20px !important; gap: 8px; }
    .reason-actions button { border-radius: 999px; min-height: 38px; padding: 0 17px; font-family: 'Barlow', sans-serif; font-weight: 700; }
    .confirm-button { background: #1c5c7a !important; color: #fff !important; }
    .confirm-button:disabled { background: #c8d2df !important; color: #6f7f93 !important; }
  `]
})
export class JustificativaDialogComponent implements AfterViewInit {
  readonly data = inject<{ title: string; message: string; minLength?: number }>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<JustificativaDialogComponent, string>);
  readonly minLength = this.data.minLength ?? 10;
  @ViewChild('motivoInput') private motivoInput?: ElementRef<HTMLTextAreaElement>;
  motivo = '';

  ngAfterViewInit(): void {
    setTimeout(() => this.motivoInput?.nativeElement.focus(), 80);
  }
}
