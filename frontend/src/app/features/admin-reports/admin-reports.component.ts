import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminService } from '../../core/services/admin.service';
import { AppIconComponent } from '../../shared/ui/app-icon.component';

@Component({
  selector: 'app-admin-reports',
  imports: [CommonModule, FormsModule, RouterLink, AppIconComponent],
  templateUrl: './admin-reports.component.html',
  styleUrl: './admin-reports.component.css'
})
export class AdminReportsComponent {
  readonly auth = inject(AuthService);
  private readonly adminService = inject(AdminService);
  date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  loading = false;
  error = '';
  success = '';

  download(): void {
    if (this.loading || !this.date) return;
    const date = this.date;
    this.loading = true;
    this.error = '';
    this.success = '';
    this.adminService.gerarRelatorioMissoesPdf(date).pipe(finalize(() => this.loading = false)).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-missoes-${date.replaceAll('-', '')}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.success = 'Relatório gerado. O download foi iniciado.';
      },
      error: () => this.error = 'Não foi possível gerar o relatório. Confira a conexão e tente novamente.'
    });
  }
}
