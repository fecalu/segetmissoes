import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `<h2 mat-dialog-title>{{ data.title }}</h2><mat-dialog-content><p>{{ data.message }}</p>
    <mat-form-field appearance="outline" style="width:100%"><mat-label>Motivo da alteração</mat-label>
    <textarea matInput [(ngModel)]="motivo" rows="3" maxlength="700" required></textarea>
    <mat-hint>Mínimo de 10 caracteres. O motivo ficará no histórico.</mat-hint></mat-form-field></mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button (click)="ref.close()">Cancelar</button>
    <button mat-flat-button [disabled]="motivo.trim().length < 10" (click)="ref.close(motivo.trim())">Confirmar</button></mat-dialog-actions>`
})
export class JustificativaDialogComponent {
  readonly data = inject<{ title: string; message: string }>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<JustificativaDialogComponent, string>);
  motivo = '';
}
