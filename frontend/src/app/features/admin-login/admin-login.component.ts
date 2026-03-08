import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSnackBarModule
  ],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent implements OnInit {
  loading = false;
  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {
    this.form = this.fb.nonNullable.group({
      login: ['', [Validators.required]],
      senha: ['', [Validators.required]],
      lembrarAcesso: [false]
    });
  }

  ngOnInit(): void {
    const savedAccess = this.authService.getRememberedAccess('admin');
    if (!savedAccess) {
      return;
    }

    this.form.patchValue({
      login: savedAccess.login,
      senha: savedAccess.senha,
      lembrarAcesso: true
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const { login, senha, lembrarAcesso } = this.form.getRawValue();
    const normalizedLogin = login.trim();
    this.authService.login({ login: normalizedLogin, senha })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          if (res.perfil !== 'ADMIN') {
            this.authService.logout();
            this.snackBar.open('Acesso restrito para administradores.', 'Fechar', { duration: 3200 });
            return;
          }
          this.authService.saveRememberedAccess('admin', { login: normalizedLogin, senha }, lembrarAcesso);
          this.router.navigate(['/admin']);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 401) {
            this.authService.saveRememberedAccess('admin', { login: '', senha: '' }, false);
            this.form.patchValue({ lembrarAcesso: false });
          }
          const message = err.error?.message || 'Falha no login administrativo.';
          this.snackBar.open(message, 'Fechar', { duration: 3200 });
        }
      });
  }
}
