import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { MotivoExcecaoMissao } from '../../core/models/missao-excecao.model';
import { StatusVeiculo, Veiculo } from '../../core/models/veiculo.model';
import { AuthService } from '../../core/services/auth.service';
import { MissaoExcecaoService } from '../../core/services/missao-excecao.service';
import { VeiculoService } from '../../core/services/veiculo.service';

@Component({
  selector: 'app-missao-excecao',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './missao-excecao.component.html',
  styleUrl: './missao-excecao.component.css'
})
export class MissaoExcecaoComponent implements OnInit {
  veiculos: Veiculo[] = [];
  loading = false;
  sending = false;
  sucesso = false;
  missaoId: number | null = null;
  operacao: 'SAIDA' | 'ENTRADA' = 'SAIDA';

  readonly motivos: Array<{ value: MotivoExcecaoMissao; label: string }> = [
    { value: 'URGENCIA_OPERACIONAL', label: 'Urgencia operacional' },
    { value: 'CHUVA_FORTE', label: 'Chuva' },
    { value: 'FALHA_CAMERA', label: 'Falha da camera' },
    { value: 'OUTROS', label: 'Outros motivos' }
  ];

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly veiculoService: VeiculoService,
    private readonly missaoExcecaoService: MissaoExcecaoService,
    private readonly authService: AuthService,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router
  ) {
    this.form = this.fb.nonNullable.group({
      veiculoId: [0, [Validators.required, Validators.min(1)]],
      motivo: ['URGENCIA_OPERACIONAL' as MotivoExcecaoMissao, [Validators.required]],
      aceiteResponsabilidade: [false, [Validators.requiredTrue]]
    });
  }

  ngOnInit(): void {
    const operacao = this.route.snapshot.queryParamMap.get('operacao');
    if (operacao === 'SAIDA' || operacao === 'ENTRADA') {
      this.operacao = operacao;
    }

    this.loading = true;
    this.veiculoService.listar()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: data => {
          this.veiculos = data;
          this.garantirVeiculoSelecionadoValido();
        },
        error: () => this.snackBar.open('Nao foi possivel carregar os veiculos.', 'Fechar', { duration: 3000 })
      });
  }

  canSelectVeiculo(veiculo: Veiculo): boolean {
    if (this.operacao === 'SAIDA') {
      return veiculo.statusAtual === 'BASE_JOAO_GOULART';
    }
    return veiculo.statusAutomatico === 'CIRCULANDO' && veiculo.motoristaAtualId === this.authService.loggedMotoristaId();
  }

  selecionarVeiculo(veiculo: Veiculo): void {
    if (!this.canSelectVeiculo(veiculo)) {
      return;
    }
    this.form.controls.veiculoId.setValue(veiculo.id);
  }

  isVeiculoSelecionado(veiculo: Veiculo): boolean {
    return this.form.controls.veiculoId.value === veiculo.id;
  }

  statusLabel(status: StatusVeiculo): string {
    const labels: Record<StatusVeiculo, string> = {
      CIRCULANDO: 'NA RUA (MISSAO)',
      BASE_JOAO_GOULART: 'DISPONIVEL',
      NO_PATIO: 'NO PATIO',
      OFICINA: 'OFICINA',
      EM_VIAGEM: 'EM VIAGEM',
      MANUTENCAO: 'MANUTENCAO',
      BLOQUEADO: 'BLOQUEADO'
    };
    return labels[status];
  }

  statusClass(status: StatusVeiculo): string {
    return `status-${status.toLowerCase()}`;
  }

  veiculosVisiveis(): Veiculo[] {
    if (this.operacao === 'SAIDA') {
      return this.veiculos;
    }
    const motoristaId = this.authService.loggedMotoristaId();
    return this.veiculos.filter(v => v.statusAutomatico === 'CIRCULANDO' && v.motoristaAtualId === motoristaId);
  }

  semVeiculoDisponivel(): boolean {
    return this.veiculosVisiveis().length === 0;
  }

  tituloOperacao(): string {
    return this.operacao === 'SAIDA' ? 'Iniciar missao sem checklist' : 'Finalizar missao sem checklist';
  }

  descricaoResponsabilidade(): string {
    return this.operacao === 'SAIDA'
      ? 'Esta opcao e apenas para emergencia operacional. Ao continuar, voce assume responsabilidade pelo estado do veiculo ate o retorno.'
      : 'Esta opcao encerra a missao sem checklist de chegada. Use somente em emergencia operacional.';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Preencha os campos obrigatorios para continuar.', 'Fechar', { duration: 3000 });
      return;
    }

    const raw = this.form.getRawValue();
    this.sending = true;

    const request$ = this.operacao === 'SAIDA'
      ? this.missaoExcecaoService.iniciar({
          veiculoId: raw.veiculoId,
          motivo: raw.motivo,
          aceiteResponsabilidade: raw.aceiteResponsabilidade
        })
      : this.missaoExcecaoService.finalizarSemChecklist({
          veiculoId: raw.veiculoId,
          motivo: raw.motivo,
          aceiteResponsabilidade: raw.aceiteResponsabilidade
        });

    request$
      .pipe(finalize(() => (this.sending = false)))
      .subscribe({
        next: response => {
          this.missaoId = response.id;
          this.sucesso = true;
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Falha ao processar missao sem checklist.', 'Fechar', { duration: 3200 })
      });
  }

  voltarInicio(): void {
    this.router.navigate(['/inicio']);
  }

  irChecklistChegada(): void {
    this.router.navigate(['/checklist'], { queryParams: { operacao: 'ENTRADA' } });
  }

  private garantirVeiculoSelecionadoValido(): void {
    const selecionado = this.veiculos.find(v => v.id === this.form.controls.veiculoId.value);
    if (!selecionado || !this.canSelectVeiculo(selecionado)) {
      this.form.controls.veiculoId.setValue(0);
    }
  }
}
