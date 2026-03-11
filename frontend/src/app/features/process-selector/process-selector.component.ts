import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { Veiculo } from '../../core/models/veiculo.model';
import { VeiculoService } from '../../core/services/veiculo.service';

@Component({
  selector: 'app-process-selector',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './process-selector.component.html',
  styleUrl: './process-selector.component.css'
})
export class ProcessSelectorComponent implements OnInit {
  selectedFluxo: 'INICIAR' | 'FINALIZAR' | null = null;
  selectedChecklistCompleto = false;
  showDevModal = false;
  devFeatureName = '';
  missaoAtivaMotorista: Veiculo | null = null;
  validandoMissaoAtiva = false;

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly veiculoService: VeiculoService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregarMissaoAtivaMotorista();
  }

  selecionarFluxo(fluxo: 'INICIAR' | 'FINALIZAR'): void {
    if (fluxo === 'INICIAR' && this.hasMissaoAtiva()) {
      this.snackBar.open('Voce possui missao em andamento. Finalize a missao atual antes de iniciar outra.', 'Fechar', { duration: 2600 });
      return;
    }
    this.selectedFluxo = this.selectedFluxo === fluxo ? null : fluxo;
  }

  irComChecklist(): void {
    if (!this.selectedFluxo) {
      return;
    }
    if (this.selectedFluxo === 'INICIAR' && this.hasMissaoAtiva()) {
      this.snackBar.open('Finalize sua missao em andamento antes de iniciar outra.', 'Fechar', { duration: 2600 });
      return;
    }
    const operacao = this.selectedFluxo === 'INICIAR' ? 'SAIDA' : 'ENTRADA';
    this.router.navigate(['/checklist'], { queryParams: { operacao } });
  }

  irSemChecklist(): void {
    if (!this.selectedFluxo) {
      return;
    }
    if (this.selectedFluxo === 'INICIAR' && this.hasMissaoAtiva()) {
      this.snackBar.open('Finalize sua missao em andamento antes de iniciar outra.', 'Fechar', { duration: 2600 });
      return;
    }
    const operacao = this.selectedFluxo === 'INICIAR' ? 'SAIDA' : 'ENTRADA';
    this.router.navigate(['/checklist/excecao'], { queryParams: { operacao } });
  }

  abrirEmDesenvolvimento(featureName: string): void {
    this.devFeatureName = featureName;
    this.showDevModal = true;
  }

  toggleChecklistCompleto(): void {
    this.selectedChecklistCompleto = !this.selectedChecklistCompleto;
  }

  fecharModal(): void {
    this.showDevModal = false;
    this.devFeatureName = '';
  }

  logout(): void {
    this.authService.logout();
  }

  hasMissaoAtiva(): boolean {
    return !!this.missaoAtivaMotorista;
  }

  private carregarMissaoAtivaMotorista(): void {
    const motoristaId = this.authService.loggedMotoristaId();
    if (!motoristaId) {
      return;
    }

    this.validandoMissaoAtiva = true;
    this.veiculoService.listar()
      .pipe(finalize(() => (this.validandoMissaoAtiva = false)))
      .subscribe({
        next: veiculos => {
          this.missaoAtivaMotorista = veiculos.find(v =>
            v.statusAutomatico === 'CIRCULANDO' && v.motoristaAtualId === motoristaId
          ) ?? null;

          if (this.missaoAtivaMotorista && this.selectedFluxo === 'INICIAR') {
            this.selectedFluxo = 'FINALIZAR';
          }
        },
        error: () => {
          this.snackBar.open('Nao foi possivel validar sua missao em andamento agora.', 'Fechar', { duration: 2600 });
        }
      });
  }
}
