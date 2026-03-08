import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
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
      senha: ['', [Validators.required]]
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;

    this.authService.login(this.form.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          if (res.perfil !== 'MOTORISTA') {
            this.authService.logout();
            this.snackBar.open('Este login nao e de motorista. Use a area administrativa.', 'Fechar', { duration: 3500 });
            return;
          }
          this.router.navigate(['/inicio']);
        },
        error: (err: HttpErrorResponse) => {
          const message = err.error?.message || 'Falha no login. Verifique suas credenciais.';
          this.snackBar.open(message, 'Fechar', { duration: 3000 });
        }
      });
  }
}
