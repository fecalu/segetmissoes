import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface AdminCredentialConfirmDialogData {
  title: string;
  message: string;
  passwordLabel?: string;
  justificationLabel?: string;
  justificationMinLength?: number;
  confirmText?: string;
}

export interface AdminCredentialConfirmDialogResult {
  senhaAdmin: string;
  justificativa: string;
}

@Component({
  selector: 'app-admin-credential-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="dialog-message">{{ data.message }}</p>

      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ data.passwordLabel || 'Senha de administrador' }}</mat-label>
          <input matInput type="password" formControlName="senhaAdmin">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ data.justificationLabel || 'Justificativa' }}</mat-label>
          <textarea matInput rows="4" formControlName="justificativa"></textarea>
          <mat-hint align="end">
            {{ form.controls.justificativa.value.length }}/700
          </mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="close()">Cancelar</button>
      <button mat-flat-button color="warn" type="button" [disabled]="form.invalid" (click)="confirm()">
        {{ data.confirmText || 'Confirmar exclusao' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-message {
      margin: 0 0 12px;
      white-space: pre-line;
      color: #334155;
    }

    .dialog-form {
      display: grid;
      gap: 8px;
    }

    .full-width {
      width: 100%;
    }
  `]
})
export class AdminCredentialConfirmDialogComponent {
  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<AdminCredentialConfirmDialogComponent, AdminCredentialConfirmDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: AdminCredentialConfirmDialogData
  ) {
    const minLength = data.justificationMinLength ?? 10;
    this.form = this.fb.nonNullable.group({
      senhaAdmin: ['', [Validators.required]],
      justificativa: ['', [Validators.required, Validators.minLength(minLength), Validators.maxLength(700)]]
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      senhaAdmin: raw.senhaAdmin.trim(),
      justificativa: raw.justificativa.trim()
    });
  }
}

