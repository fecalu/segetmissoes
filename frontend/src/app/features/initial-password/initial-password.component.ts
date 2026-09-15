import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-initial-password',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './initial-password.component.html',
  styleUrl: './initial-password.component.css'
})
export class InitialPasswordComponent {
  loading = false;
  error = '';
  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {
    this.form = this.fb.nonNullable.group({
      novaSenha: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
      confirmarSenha: ['', [Validators.required]]
    });
  }

  salvar(): void {
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { novaSenha, confirmarSenha } = this.form.getRawValue();
    if (novaSenha !== confirmarSenha) {
      this.error = 'As senhas não conferem.';
      return;
    }
    this.loading = true;
    this.auth.alterarSenhaInicial(novaSenha)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          this.snackBar.open('Senha atualizada.', 'Fechar', { duration: 2500 });
          this.router.navigate([this.auth.canActAsDriver() && !this.auth.isAdministrative() ? '/inicio' : '/admin']);
        },
        error: err => this.error = err.error?.message || 'Não foi possível alterar a senha.'
      });
  }
}
