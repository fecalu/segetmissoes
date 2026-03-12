import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { TipoDeslocamentoMissao } from '../../core/models/missao.model';
import { Veiculo } from '../../core/models/veiculo.model';
import { VeiculoService } from '../../core/services/veiculo.service';

@Component({
  selector: 'app-process-selector',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './process-selector.component.html',
  styleUrl: './process-selector.component.css'
})
export class ProcessSelectorComponent implements OnInit {
  selectedMissaoCidadeFluxo: 'INICIAR' | 'FINALIZAR' | null = null;
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

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.carregarMissaoAtivaMotorista();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.carregarMissaoAtivaMotorista();
    }
  }

  toggleMissaoCidade(fluxo: 'INICIAR' | 'FINALIZAR'): void {
    if (fluxo === 'INICIAR' && this.hasMissaoAtiva()) {
      this.snackBar.open('Finalize o deslocamento atual antes de iniciar uma missao na cidade.', 'Fechar', { duration: 2600 });
      return;
    }
    if (fluxo === 'FINALIZAR' && !this.hasMissaoNaCidadeAtiva()) {
      this.snackBar.open('Nenhuma missao na cidade em andamento para finalizar.', 'Fechar', { duration: 2600 });
      return;
    }
    this.selectedMissaoCidadeFluxo = this.selectedMissaoCidadeFluxo === fluxo ? null : fluxo;
  }

  iniciarMissaoComChecklist(): void {
    if (this.hasMissaoAtiva()) {
      this.snackBar.open('Finalize o deslocamento atual antes de iniciar uma missao na cidade.', 'Fechar', { duration: 2600 });
      return;
    }
    this.irChecklist('SAIDA', 'NA_CIDADE');
  }

  iniciarMissaoSemChecklist(): void {
    if (this.hasMissaoAtiva()) {
      this.snackBar.open('Finalize o deslocamento atual antes de iniciar uma missao na cidade.', 'Fechar', { duration: 2600 });
      return;
    }
    this.router.navigate(['/checklist/excecao'], { queryParams: { operacao: 'SAIDA' } });
  }

  finalizarMissaoComChecklist(): void {
    if (!this.hasMissaoNaCidadeAtiva()) {
      this.snackBar.open('Nenhuma missao na cidade em andamento para finalizar.', 'Fechar', { duration: 2600 });
      return;
    }
    this.irChecklist('ENTRADA', 'NA_CIDADE');
  }

  finalizarMissaoSemChecklist(): void {
    if (!this.hasMissaoNaCidadeAtiva()) {
      this.snackBar.open('Nenhuma missao na cidade em andamento para finalizar.', 'Fechar', { duration: 2600 });
      return;
    }
    this.router.navigate(['/checklist/excecao'], { queryParams: { operacao: 'ENTRADA' } });
  }

  iniciarViagem(): void {
    if (this.hasMissaoAtiva()) {
      this.snackBar.open('Finalize o deslocamento atual antes de iniciar uma viagem.', 'Fechar', { duration: 2600 });
      return;
    }
    this.irChecklist('SAIDA', 'VIAGEM');
  }

  finalizarViagem(): void {
    if (!this.hasViagemAtiva()) {
      this.snackBar.open('Nenhuma viagem em andamento para finalizar.', 'Fechar', { duration: 2600 });
      return;
    }
    this.irChecklist('ENTRADA', 'VIAGEM');
  }

  irVistoriaCompleta(operacao: 'SAIDA' | 'CHEGADA'): void {
    this.router.navigate(['/vistoria-completa'], { queryParams: { operacao } });
  }

  logout(): void {
    this.authService.logout();
  }

  hasMissaoAtiva(): boolean {
    return !!this.missaoAtivaMotorista;
  }

  hasMissaoNaCidadeAtiva(): boolean {
    return this.missaoAtivaMotorista?.statusAtual === 'CIRCULANDO';
  }

  hasViagemAtiva(): boolean {
    return this.missaoAtivaMotorista?.statusAtual === 'EM_VIAGEM';
  }

  alertaTitulo(): string {
    return this.hasViagemAtiva() ? 'Viagem em andamento detectada' : 'Missao em andamento detectada';
  }

  alertaDescricaoPrincipal(): string {
    if (!this.missaoAtivaMotorista) {
      return '';
    }
    return this.hasViagemAtiva()
      ? `Voce ja iniciou uma viagem no veiculo ${this.missaoAtivaMotorista.placa}.`
      : `Voce ja iniciou uma missao no veiculo ${this.missaoAtivaMotorista.placa}.`;
  }

  alertaDescricaoSecundaria(): string {
    return this.hasViagemAtiva()
      ? 'Finalize essa viagem para iniciar outro deslocamento.'
      : 'Finalize essa missao para iniciar outro deslocamento.';
  }

  subtituloFinalizarMissao(): string {
    return this.hasMissaoNaCidadeAtiva()
      ? 'Encerrar a missao urbana em andamento'
      : 'Disponivel quando houver missao na cidade ativa';
  }

  subtituloFinalizarViagem(): string {
    return this.hasViagemAtiva()
      ? 'Encerrar a viagem em andamento'
      : 'Disponivel quando houver viagem ativa';
  }

  private veiculoEmMissaoAtual(veiculo: Veiculo): boolean {
    return veiculo.statusAtual === 'CIRCULANDO' || veiculo.statusAtual === 'EM_VIAGEM';
  }

  private irChecklist(operacao: 'SAIDA' | 'ENTRADA', tipoDeslocamento: TipoDeslocamentoMissao): void {
    this.router.navigate(['/checklist'], { queryParams: { operacao, tipoDeslocamento } });
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
            this.veiculoEmMissaoAtual(v) && v.motoristaAtualId === motoristaId
          ) ?? null;
        },
        error: () => {
          this.snackBar.open('Nao foi possivel validar sua missao em andamento agora.', 'Fechar', { duration: 2600 });
        }
      });
  }
}
