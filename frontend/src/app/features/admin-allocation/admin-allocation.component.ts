import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import {
  AlocacaoVeiculo,
  AtualizarDadosAlocacaoVeiculoPayload,
  CriarAlocacaoVeiculoPayload,
  HistoricoAlocacaoVeiculo,
  TipoEventoAlocacaoVeiculo
} from '../../core/models/alocacao-veiculo.model';
import { AdminService } from '../../core/services/admin.service';
import { AppIconComponent } from '../../shared/ui/app-icon.component';

type EditorMode = 'CRIAR' | 'DADOS' | 'VEICULO' | 'RESPONSAVEL' | 'ENCERRAR' | 'HISTORICO' | null;

@Component({
  selector: 'app-admin-allocation',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatSnackBarModule, AppIconComponent],
  templateUrl: './admin-allocation.component.html',
  styleUrl: './admin-allocation.component.css'
})
export class AdminAllocationComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  alocacoes: AlocacaoVeiculo[] = [];
  historico: HistoricoAlocacaoVeiculo[] = [];
  busca = '';
  mostrarEncerradas = false;
  carregando = false;
  salvando = false;
  editorMode: EditorMode = null;
  selected: AlocacaoVeiculo | null = null;

  readonly alocacaoForm = this.fb.group({
    placa: ['', [Validators.required, Validators.maxLength(10)]],
    modelo: ['', [Validators.required, Validators.maxLength(180)]],
    marca: ['', Validators.maxLength(120)],
    responsavelNome: ['', [Validators.required, Validators.maxLength(160)]],
    secretariaOrgao: ['', [Validators.required, Validators.maxLength(160)]],
    setor: ['', [Validators.required, Validators.maxLength(160)]],
    limiteAutorizado: ['', [Validators.required, Validators.maxLength(60)]],
    documentoReferencia: ['', Validators.maxLength(180)],
    observacao: ['', Validators.maxLength(500)]
  });
  readonly veiculoForm = this.fb.group({
    placa: ['', [Validators.required, Validators.maxLength(10)]],
    modelo: ['', [Validators.required, Validators.maxLength(180)]],
    marca: ['', Validators.maxLength(120)],
    motivo: ['', [Validators.required, Validators.maxLength(500)]]
  });
  readonly responsavelForm = this.fb.group({
    responsavelNome: ['', [Validators.required, Validators.maxLength(160)]],
    motivo: ['', [Validators.required, Validators.maxLength(500)]]
  });
  readonly encerramentoForm = this.fb.group({
    motivo: ['', [Validators.required, Validators.maxLength(500)]]
  });

  ngOnInit(): void {
    this.carregar();
  }

  get totalAtivas(): number { return this.alocacoes.filter(item => item.ativa).length; }
  get totalEncerradas(): number { return this.alocacoes.filter(item => !item.ativa).length; }

  carregar(): void {
    this.carregando = true;
    this.adminService.listarAlocacoes(this.busca, this.mostrarEncerradas)
      .pipe(finalize(() => this.carregando = false))
      .subscribe({
        next: alocacoes => this.alocacoes = alocacoes,
        error: () => this.mensagem('Não foi possível carregar as alocações.')
      });
  }

  abrirCriacao(): void {
    this.selected = null;
    this.alocacaoForm.reset({
      placa: '', modelo: '', marca: '', responsavelNome: '', secretariaOrgao: '', setor: '', limiteAutorizado: '',
      documentoReferencia: '', observacao: ''
    });
    this.editorMode = 'CRIAR';
  }

  abrirDados(alocacao: AlocacaoVeiculo): void {
    this.selected = alocacao;
    this.alocacaoForm.reset({
      placa: alocacao.placa,
      modelo: alocacao.modelo,
      marca: alocacao.marca || '',
      responsavelNome: alocacao.responsavelNome,
      secretariaOrgao: alocacao.secretariaOrgao,
      setor: alocacao.setor,
      limiteAutorizado: alocacao.limiteAutorizado,
      documentoReferencia: alocacao.documentoReferencia || '',
      observacao: alocacao.observacao || ''
    });
    this.editorMode = 'DADOS';
  }

  abrirTrocaVeiculo(alocacao: AlocacaoVeiculo): void {
    this.selected = alocacao;
    this.veiculoForm.reset({ placa: '', modelo: '', marca: '', motivo: '' });
    this.editorMode = 'VEICULO';
  }

  abrirTrocaResponsavel(alocacao: AlocacaoVeiculo): void {
    this.selected = alocacao;
    this.responsavelForm.reset({ responsavelNome: '', motivo: '' });
    this.editorMode = 'RESPONSAVEL';
  }

  abrirEncerramento(alocacao: AlocacaoVeiculo): void {
    this.selected = alocacao;
    this.encerramentoForm.reset({ motivo: '' });
    this.editorMode = 'ENCERRAR';
  }

  abrirHistorico(alocacao: AlocacaoVeiculo): void {
    this.selected = alocacao;
    this.historico = [];
    this.editorMode = 'HISTORICO';
    this.adminService.listarHistoricoAlocacao(alocacao.id).subscribe({
      next: historico => this.historico = historico,
      error: () => this.mensagem('Não foi possível carregar o histórico desta alocação.')
    });
  }

  salvarAlocacao(): void {
    if (this.alocacaoForm.invalid) {
      this.alocacaoForm.markAllAsTouched();
      return;
    }
    const value = this.alocacaoForm.getRawValue();
    this.salvando = true;
    if (this.editorMode === 'CRIAR') {
      const payload: CriarAlocacaoVeiculoPayload = {
        placa: value.placa!, modelo: value.modelo!, marca: this.nulo(value.marca), responsavelNome: value.responsavelNome!, secretariaOrgao: value.secretariaOrgao!,
        setor: value.setor!, limiteAutorizado: value.limiteAutorizado!, documentoReferencia: this.nulo(value.documentoReferencia),
        observacao: this.nulo(value.observacao)
      };
      this.adminService.criarAlocacao(payload).pipe(finalize(() => this.salvando = false)).subscribe({
        next: () => { this.mensagem('Alocação criada e registrada no histórico.'); this.fecharEditor(); this.carregar(); },
        error: error => this.mensagem(this.erroApi(error, 'Não foi possível criar a alocação.'))
      });
      return;
    }

    const payload: AtualizarDadosAlocacaoVeiculoPayload = {
      secretariaOrgao: value.secretariaOrgao!, setor: value.setor!, limiteAutorizado: value.limiteAutorizado!,
      documentoReferencia: this.nulo(value.documentoReferencia), observacao: this.nulo(value.observacao)
    };
    this.adminService.atualizarDadosAlocacao(this.selected!.id, payload).pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => { this.mensagem('Dados da alocação atualizados.'); this.fecharEditor(); this.carregar(); },
      error: error => this.mensagem(this.erroApi(error, 'Não foi possível atualizar os dados.'))
    });
  }

  salvarTrocaVeiculo(): void {
    if (this.veiculoForm.invalid) { this.veiculoForm.markAllAsTouched(); return; }
    const value = this.veiculoForm.getRawValue();
    this.executar(() => this.adminService.trocarVeiculoAlocacao(this.selected!.id, value.placa!, value.modelo!, this.nulo(value.marca), value.motivo!), 'Veículo substituído e histórico atualizado.');
  }

  salvarTrocaResponsavel(): void {
    if (this.responsavelForm.invalid) { this.responsavelForm.markAllAsTouched(); return; }
    const value = this.responsavelForm.getRawValue();
    this.executar(() => this.adminService.trocarResponsavelAlocacao(this.selected!.id, value.responsavelNome!, value.motivo!), 'Responsável atualizado e histórico registrado.');
  }

  confirmarEncerramento(): void {
    if (this.encerramentoForm.invalid) { this.encerramentoForm.markAllAsTouched(); return; }
    this.executar(() => this.adminService.encerrarAlocacao(this.selected!.id, this.encerramentoForm.value.motivo!), 'Alocação encerrada. O histórico foi preservado.');
  }

  fecharEditor(): void { this.editorMode = null; this.selected = null; }
  labelEvento(tipo: TipoEventoAlocacaoVeiculo): string {
    return { IMPORTACAO_INICIAL: 'Importação inicial', CRIACAO: 'Alocação criada', TROCA_VEICULO: 'Veículo trocado', TROCA_RESPONSAVEL: 'Responsável trocado', ATUALIZACAO_DADOS: 'Dados atualizados', ENCERRAMENTO: 'Alocação encerrada' }[tipo];
  }
  formatarData(value: string): string { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }

  private executar(requisicao: () => ReturnType<AdminService['encerrarAlocacao']>, sucesso: string): void {
    this.salvando = true;
    requisicao().pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => { this.mensagem(sucesso); this.fecharEditor(); this.carregar(); },
      error: error => this.mensagem(this.erroApi(error, 'Não foi possível concluir a alteração.'))
    });
  }
  private nulo(value: string | null | undefined): string | null { return value?.trim() || null; }
  private mensagem(texto: string): void { this.snackBar.open(texto, 'Fechar', { duration: 4000 }); }
  private erroApi(error: { error?: { message?: string } }, padrao: string): string { return error?.error?.message || padrao; }
}
