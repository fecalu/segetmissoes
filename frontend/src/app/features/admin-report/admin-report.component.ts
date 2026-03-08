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
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-report',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule
  ],
  templateUrl: './admin-report.component.html',
  styleUrl: './admin-report.component.css'
})
export class AdminReportComponent {
  gerandoRelatorio = false;
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
  }

  voltar(): void {
    this.router.navigate(['/admin'], { queryParams: { menu: 'checklists' } });
  }

  gerarRelatorioPdf(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { dataInicial, dataFinal } = this.form.getRawValue();
    if (dataFinal < dataInicial) {
      this.snackBar.open('Data final deve ser igual ou maior que data inicial.', 'Fechar', { duration: 2800 });
      return;
    }

    this.gerandoRelatorio = true;
    this.adminService.gerarRelatorioChecklistPdf(dataInicial, dataFinal)
      .pipe(finalize(() => (this.gerandoRelatorio = false)))
      .subscribe({
        next: blob => {
          const nome = `relatorio-checklists-${dataInicial.replaceAll('-', '')}-${dataFinal.replaceAll('-', '')}.pdf`;
          this.baixarArquivo(blob, nome);
          this.snackBar.open('Relatorio PDF gerado com sucesso.', 'Fechar', { duration: 2200 });
        },
        error: () => this.snackBar.open('Falha ao gerar relatorio PDF.', 'Fechar', { duration: 3200 })
      });
  }

  private baixarArquivo(blob: Blob, nomeArquivo: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
  }

  private hojeIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
