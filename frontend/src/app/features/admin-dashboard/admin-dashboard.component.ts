import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, forkJoin, of } from 'rxjs';
import { ChecklistResponse, TipoOperacao } from '../../core/models/checklist.model';
import { MissaoExcecaoResponse, MotivoExcecaoMissao, StatusExcecaoMissao } from '../../core/models/missao-excecao.model';
import { Motorista } from '../../core/models/motorista.model';
import { HistoricoStatusVeiculo, StatusAdministrativoVeiculo, StatusVeiculo, Veiculo } from '../../core/models/veiculo.model';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { MissaoExcecaoService } from '../../core/services/missao-excecao.service';
import { environment } from '../../../environments/environment';

type AdminMenu = 'dashboard' | 'operacao' | 'veiculos' | 'motoristas' | 'checklists' | 'excecoes';
type PainelCategoria = 'DISPONIVEL' | 'MISSAO' | 'VIAGEM' | 'PATIO' | 'OFICINA' | 'BLOQUEADO';
type OrigemConsultaChecklist = 'CHECKLIST' | 'SEM_CHECKLIST';

interface ConsultaChecklistItem {
  idExibicao: string;
  origem: OrigemConsultaChecklist;
  tipoOperacao: TipoOperacao;
  dataHora: string;
  motoristaId: number;
  motoristaNome: string;
  veiculoId: number;
  veiculoPlaca: string;
  resumo: string;
  possuiFotos: boolean;
  statusRegularizacao?: string;
  checklist?: ChecklistResponse;
  excecao?: MissaoExcecaoResponse;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  activeMenu: AdminMenu = 'operacao';
  filtrosAbertos = false;
  filtrosVeiculoAbertos = false;
  filtrosMotoristaAbertos = false;
  filtrosExcecaoAbertos = false;

  motoristas: Motorista[] = [];
  veiculos: Veiculo[] = [];
  checklists: ChecklistResponse[] = [];
  consultaChecklist: ConsultaChecklistItem[] = [];
  excecoes: MissaoExcecaoResponse[] = [];
  painelVeiculos = this.criarPainelVazio();

  loadingMotoristas = false;
  loadingVeiculos = false;
  loadingChecklists = false;
  loadingExcecoes = false;
  loadingHistoricoStatus = false;

  editingMotoristaId: number | null = null;
  editingVeiculoId: number | null = null;

  motoristaBusca = '';
  veiculoBusca = '';

  selectedChecklist: ChecklistResponse | null = null;
  selectedVeiculoHistorico: Veiculo | null = null;
  selectedExcecaoEncerramento: MissaoExcecaoResponse | null = null;
  selectedCategoriaInclusao: PainelCategoria | null = null;
  veiculoInclusaoSelecionadoId: number | null = null;
  buscaInclusaoVeiculo = '';
  processandoInclusao = false;
  historicoStatus: HistoricoStatusVeiculo[] = [];
  encerramentoJustificativa = '';

  readonly categoriasPainel: Array<{ id: PainelCategoria; titulo: string; descricao: string }> = [
    { id: 'DISPONIVEL', titulo: 'Disponiveis', descricao: 'Prontos para nova missao' },
    { id: 'MISSAO', titulo: 'Na rua em missao', descricao: 'Checklist de saida sem chegada' },
    { id: 'VIAGEM', titulo: 'Em viagem', descricao: 'Viagem definida administrativamente' },
    { id: 'PATIO', titulo: 'No patio', descricao: 'Parados no patio' },
    { id: 'OFICINA', titulo: 'Oficina', descricao: 'Oficina ou manutencao' },
    { id: 'BLOQUEADO', titulo: 'Bloqueados', descricao: 'Sem liberacao para uso' }
  ];

  readonly statusAdministrativoOptions: Array<{ value: StatusAdministrativoVeiculo; label: string }> = [
    { value: 'NO_PATIO', label: 'NO PATIO' },
    { value: 'OFICINA', label: 'OFICINA' },
    { value: 'EM_VIAGEM', label: 'EM VIAGEM' },
    { value: 'BLOQUEADO', label: 'BLOQUEADO' },
    { value: 'MANUTENCAO', label: 'MANUTENCAO (LEGADO)' }
  ];

  readonly motoristaForm;
  readonly veiculoForm;
  readonly filtroForm;
  readonly excecaoFiltroForm;

  constructor(
    private readonly fb: FormBuilder,
    private readonly adminService: AdminService,
    private readonly missaoExcecaoService: MissaoExcecaoService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar
  ) {
    this.motoristaForm = this.fb.nonNullable.group({
      nome: ['', [Validators.required]],
      login: ['', [Validators.required]],
      cpf: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      senha: [''],
      perfil: ['MOTORISTA' as 'ADMIN' | 'MOTORISTA', [Validators.required]]
    });

    this.veiculoForm = this.fb.nonNullable.group({
      placa: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9-]{7,8}$/)]],
      modelo: ['', [Validators.required]],
      marca: ['', [Validators.required]]
    });

    this.filtroForm = this.fb.nonNullable.group({
      busca: [''],
      motoristaId: [0],
      veiculoId: [0],
      origemRegistro: ['' as '' | OrigemConsultaChecklist],
      tipoOperacao: ['' as '' | TipoOperacao],
      dataInicio: [''],
      dataFim: ['']
    });

    this.excecaoFiltroForm = this.fb.nonNullable.group({
      busca: [''],
      motoristaId: [0],
      veiculoId: [0],
      status: ['' as '' | StatusExcecaoMissao],
      dataInicio: [''],
      dataFim: ['']
    });
  }

  ngOnInit(): void {
    const menuParam = this.route.snapshot.queryParamMap.get('menu');
    if (menuParam === 'dashboard' || menuParam === 'operacao' || menuParam === 'veiculos' || menuParam === 'motoristas' || menuParam === 'checklists' || menuParam === 'excecoes') {
      this.activeMenu = menuParam;
    }

    this.carregarMotoristas();
    this.carregarVeiculos();
    this.buscarChecklists();
    this.buscarExcecoes();
  }

  setMenu(menu: AdminMenu): void {
    this.activeMenu = menu;
    if (menu !== 'veiculos') {
      this.filtrosVeiculoAbertos = false;
    }
    if (menu !== 'motoristas') {
      this.filtrosMotoristaAbertos = false;
    }
    if (menu !== 'checklists') {
      this.filtrosAbertos = false;
    }
    if (menu !== 'excecoes') {
      this.filtrosExcecaoAbertos = false;
    }
    if (menu === 'excecoes') {
      this.buscarExcecoes();
    }
  }

  toggleFiltros(): void {
    this.filtrosAbertos = !this.filtrosAbertos;
  }

  toggleFiltrosVeiculo(): void {
    this.filtrosVeiculoAbertos = !this.filtrosVeiculoAbertos;
  }

  toggleFiltrosMotorista(): void {
    this.filtrosMotoristaAbertos = !this.filtrosMotoristaAbertos;
  }

  toggleFiltrosExcecao(): void {
    this.filtrosExcecaoAbertos = !this.filtrosExcecaoAbertos;
  }

  abrirTelaRelatorio(): void {
    this.router.navigate(['/admin/checklists/relatorio']);
  }

  abrirTelaEstatisticas(): void {
    this.router.navigate(['/admin/estatisticas/missoes']);
  }

  carregarMotoristas(busca?: string): void {
    this.loadingMotoristas = true;
    this.adminService.listarMotoristas(busca)
      .pipe(finalize(() => (this.loadingMotoristas = false)))
      .subscribe({
        next: data => (this.motoristas = data),
        error: () => this.snackBar.open('Falha ao carregar motoristas.', 'Fechar', { duration: 3000 })
      });
  }

  buscarMotoristas(): void {
    this.carregarMotoristas(this.motoristaBusca);
  }

  salvarMotorista(): void {
    if (this.motoristaForm.invalid) {
      this.motoristaForm.markAllAsTouched();
      return;
    }

    const payload = this.motoristaForm.getRawValue();
    if (!this.editingMotoristaId && !payload.senha) {
      this.snackBar.open('Senha obrigatoria ao criar motorista.', 'Fechar', { duration: 2500 });
      return;
    }

    const request$ = this.editingMotoristaId
      ? this.adminService.editarMotorista(this.editingMotoristaId, payload)
      : this.adminService.criarMotorista(payload);

    request$.subscribe({
      next: () => {
        this.snackBar.open('Motorista salvo com sucesso.', 'Fechar', { duration: 2200 });
        this.cancelarEdicaoMotorista();
        this.carregarMotoristas(this.motoristaBusca);
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Erro ao salvar motorista.', 'Fechar', { duration: 3000 })
    });
  }

  editarMotorista(motorista: Motorista): void {
    this.activeMenu = 'motoristas';
    this.editingMotoristaId = motorista.id;
    this.motoristaForm.patchValue({
      nome: motorista.nome,
      login: motorista.login,
      cpf: motorista.cpf,
      senha: '',
      perfil: motorista.perfil
    });
  }

  cancelarEdicaoMotorista(): void {
    this.editingMotoristaId = null;
    this.motoristaForm.reset({
      nome: '',
      login: '',
      cpf: '',
      senha: '',
      perfil: 'MOTORISTA'
    });
  }

  excluirMotorista(id: number): void {
    if (!confirm('Deseja excluir este motorista?')) {
      return;
    }
    this.adminService.excluirMotorista(id).subscribe({
      next: () => {
        this.snackBar.open('Motorista excluido.', 'Fechar', { duration: 2000 });
        this.carregarMotoristas(this.motoristaBusca);
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Erro ao excluir motorista.', 'Fechar', { duration: 2800 })
    });
  }

  carregarVeiculos(buscaPlaca?: string): void {
    this.loadingVeiculos = true;
    this.adminService.listarVeiculos(buscaPlaca)
      .pipe(finalize(() => (this.loadingVeiculos = false)))
      .subscribe({
        next: data => {
          this.veiculos = data;
          this.organizarPainelOperacional();
        },
        error: () => this.snackBar.open('Falha ao carregar veiculos.', 'Fechar', { duration: 2800 })
      });
  }

  buscarVeiculos(): void {
    this.carregarVeiculos(this.veiculoBusca);
  }

  salvarVeiculo(): void {
    if (this.veiculoForm.invalid) {
      this.veiculoForm.markAllAsTouched();
      return;
    }

    const raw = this.veiculoForm.getRawValue();
    const payload = {
      placa: raw.placa.toUpperCase(),
      modelo: raw.modelo,
      marca: raw.marca
    };

    const request$ = this.editingVeiculoId
      ? this.adminService.editarVeiculo(this.editingVeiculoId, payload)
      : this.adminService.criarVeiculo(payload);

    request$.subscribe({
      next: () => {
        this.snackBar.open('Veiculo salvo com sucesso.', 'Fechar', { duration: 2200 });
        this.cancelarEdicaoVeiculo();
        this.carregarVeiculos(this.veiculoBusca);
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Erro ao salvar veiculo.', 'Fechar', { duration: 2800 })
    });
  }

  editarVeiculo(veiculo: Veiculo): void {
    this.activeMenu = 'veiculos';
    this.editingVeiculoId = veiculo.id;
    this.veiculoForm.patchValue({
      placa: veiculo.placa,
      modelo: veiculo.modelo,
      marca: veiculo.marca
    });
  }

  cancelarEdicaoVeiculo(): void {
    this.editingVeiculoId = null;
    this.veiculoForm.reset({ placa: '', modelo: '', marca: '' });
  }

  atualizarStatusAdministrativo(veiculo: Veiculo, value: StatusAdministrativoVeiculo | '' | null): void {
    const novoStatus = value ? value : null;
    if (veiculo.statusAdministrativo === novoStatus) {
      return;
    }

    const atualLabel = veiculo.statusAdministrativo ? this.statusLabel(veiculo.statusAdministrativo) : 'AUTOMATICO';
    const novoLabel = novoStatus ? this.statusLabel(novoStatus) : 'AUTOMATICO';
    const confirmar = confirm(`Alterar status de ${veiculo.placa}?\n${atualLabel} -> ${novoLabel}`);
    if (!confirmar) {
      return;
    }

    this.adminService.atualizarStatusAdministrativoVeiculo(veiculo.id, novoStatus).subscribe({
      next: () => {
        this.snackBar.open('Status alterado com sucesso.', 'Fechar', { duration: 2200 });
        this.carregarVeiculos(this.veiculoBusca);
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Erro ao alterar status.', 'Fechar', { duration: 3000 })
    });
  }

  categoriaPermiteInclusao(categoria: PainelCategoria): boolean {
    return categoria !== 'MISSAO';
  }

  abrirInclusaoCategoria(categoria: PainelCategoria): void {
    if (!this.categoriaPermiteInclusao(categoria)) {
      return;
    }

    const elegiveis = this.veiculosElegiveisParaCategoria(categoria);
    if (elegiveis.length === 0) {
      this.snackBar.open('Nenhum veiculo elegivel para essa coluna no momento.', 'Fechar', { duration: 2600 });
      return;
    }

    this.selectedCategoriaInclusao = categoria;
    this.veiculoInclusaoSelecionadoId = null;
    this.buscaInclusaoVeiculo = '';
  }

  fecharInclusaoCategoria(): void {
    this.selectedCategoriaInclusao = null;
    this.veiculoInclusaoSelecionadoId = null;
    this.buscaInclusaoVeiculo = '';
    this.processandoInclusao = false;
  }

  categoriaTitulo(categoria: PainelCategoria): string {
    return this.categoriasPainel.find(item => item.id === categoria)?.titulo || categoria;
  }

  acaoInclusaoLabel(categoria: PainelCategoria): string {
    return categoria === 'DISPONIVEL' ? 'Liberar para disponivel' : `Incluir em ${this.categoriaTitulo(categoria)}`;
  }

  veiculosElegiveisInclusao(): Veiculo[] {
    if (!this.selectedCategoriaInclusao) {
      return [];
    }

    const busca = this.buscaInclusaoVeiculo.trim().toLowerCase();
    const base = this.veiculosElegiveisParaCategoria(this.selectedCategoriaInclusao);
    if (!busca) {
      return base;
    }

    return base.filter(v =>
      v.placa.toLowerCase().includes(busca)
      || v.modelo.toLowerCase().includes(busca)
      || v.marca.toLowerCase().includes(busca)
    );
  }

  confirmarInclusaoCategoria(): void {
    if (!this.selectedCategoriaInclusao || !this.veiculoInclusaoSelecionadoId || this.processandoInclusao) {
      return;
    }

    const veiculo = this.veiculos.find(v => v.id === this.veiculoInclusaoSelecionadoId);
    if (!veiculo) {
      this.snackBar.open('Veiculo nao encontrado.', 'Fechar', { duration: 2400 });
      return;
    }

    const novoStatus = this.statusAdministrativoAlvoPorCategoria(this.selectedCategoriaInclusao);
    if (novoStatus === undefined) {
      this.snackBar.open('Categoria sem alteracao administrativa manual.', 'Fechar', { duration: 2400 });
      return;
    }

    const atualLabel = veiculo.statusAdministrativo ? this.statusLabel(veiculo.statusAdministrativo) : 'AUTOMATICO';
    const destinoLabel = novoStatus ? this.statusLabel(novoStatus) : 'DISPONIVEL (AUTOMATICO)';
    const confirmar = confirm(`Alterar status de ${veiculo.placa}?\n${atualLabel} -> ${destinoLabel}`);
    if (!confirmar) {
      return;
    }

    this.processandoInclusao = true;
    this.adminService.atualizarStatusAdministrativoVeiculo(veiculo.id, novoStatus)
      .pipe(finalize(() => (this.processandoInclusao = false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Veiculo atualizado com sucesso.', 'Fechar', { duration: 2200 });
          this.fecharInclusaoCategoria();
          this.carregarVeiculos(this.veiculoBusca);
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Erro ao atualizar veiculo.', 'Fechar', { duration: 3000 })
      });
  }

  abrirHistoricoStatus(veiculo: Veiculo): void {
    this.selectedVeiculoHistorico = veiculo;
    this.historicoStatus = [];
    this.loadingHistoricoStatus = true;
    this.adminService.listarHistoricoStatusVeiculo(veiculo.id)
      .pipe(finalize(() => (this.loadingHistoricoStatus = false)))
      .subscribe({
        next: data => (this.historicoStatus = data),
        error: () => this.snackBar.open('Falha ao carregar historico.', 'Fechar', { duration: 2800 })
      });
  }

  fecharHistoricoStatus(): void {
    this.selectedVeiculoHistorico = null;
    this.historicoStatus = [];
  }

  excluirVeiculo(id: number): void {
    if (!confirm('Deseja excluir este veiculo?')) {
      return;
    }
    this.adminService.excluirVeiculo(id).subscribe({
      next: () => {
        this.snackBar.open('Veiculo excluido.', 'Fechar', { duration: 2000 });
        this.carregarVeiculos(this.veiculoBusca);
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Erro ao excluir veiculo.', 'Fechar', { duration: 2800 })
    });
  }

  desativarVeiculo(veiculo: Veiculo): void {
    if (veiculo.desativado) {
      return;
    }
    if (!confirm(`Deseja baixar/desativar o veiculo ${veiculo.placa}?`)) {
      return;
    }
    this.adminService.desativarVeiculo(veiculo.id).subscribe({
      next: () => {
        this.snackBar.open('Veiculo baixado/desativado.', 'Fechar', { duration: 2200 });
        this.carregarVeiculos(this.veiculoBusca);
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Erro ao baixar veiculo.', 'Fechar', { duration: 3000 })
    });
  }

  reativarVeiculo(veiculo: Veiculo): void {
    if (!veiculo.desativado) {
      return;
    }
    if (!confirm(`Deseja reativar o veiculo ${veiculo.placa}?`)) {
      return;
    }
    this.adminService.reativarVeiculo(veiculo.id).subscribe({
      next: () => {
        this.snackBar.open('Veiculo reativado.', 'Fechar', { duration: 2200 });
        this.carregarVeiculos(this.veiculoBusca);
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Erro ao reativar veiculo.', 'Fechar', { duration: 3000 })
    });
  }

  excluirVeiculoDefinitivamente(veiculo: Veiculo): void {
    if (!veiculo.desativado) {
      this.snackBar.open('Desative o veiculo antes da exclusao definitiva.', 'Fechar', { duration: 2800 });
      return;
    }

    const confirmar = confirm(
      `Exclusao definitiva de ${veiculo.placa}\n\n` +
      'Esta acao remove o veiculo e seus vinculos da base operacional.\n' +
      'Deseja continuar?'
    );
    if (!confirmar) {
      return;
    }

    const senhaAdmin = prompt('Digite sua senha de administrador para confirmar:');
    if (!senhaAdmin || !senhaAdmin.trim()) {
      return;
    }

    const justificativa = prompt('Informe a justificativa da exclusao (minimo 10 caracteres):');
    if (!justificativa || justificativa.trim().length < 10) {
      this.snackBar.open('Justificativa obrigatoria com pelo menos 10 caracteres.', 'Fechar', { duration: 3000 });
      return;
    }

    this.adminService.excluirVeiculoDefinitivamente(veiculo.id, senhaAdmin.trim(), justificativa.trim()).subscribe({
      next: () => {
        this.snackBar.open('Veiculo excluido definitivamente.', 'Fechar', { duration: 2400 });
        this.carregarVeiculos(this.veiculoBusca);
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Falha na exclusao definitiva.', 'Fechar', { duration: 3200 })
    });
  }

  buscarChecklists(): void {
    this.loadingChecklists = true;
    const raw = this.filtroForm.getRawValue();
    const checklistFiltro = {
      busca: raw.busca || undefined,
      motoristaId: raw.motoristaId > 0 ? raw.motoristaId : undefined,
      veiculoId: raw.veiculoId > 0 ? raw.veiculoId : undefined,
      tipoOperacao: raw.tipoOperacao || undefined,
      dataInicio: raw.dataInicio || undefined,
      dataFim: raw.dataFim || undefined
    };
    const excecaoFiltro = {
      busca: raw.busca || undefined,
      motoristaId: raw.motoristaId > 0 ? raw.motoristaId : undefined,
      veiculoId: raw.veiculoId > 0 ? raw.veiculoId : undefined,
      dataInicio: raw.dataInicio || undefined,
      dataFim: raw.dataFim || undefined
    };

    const carregarChecklists$ = raw.origemRegistro === 'SEM_CHECKLIST'
      ? of([] as ChecklistResponse[])
      : this.adminService.listarChecklists(checklistFiltro);

    const carregarExcecoes$ = raw.origemRegistro === 'CHECKLIST'
      ? of([] as MissaoExcecaoResponse[])
      : this.missaoExcecaoService.listarAdmin(excecaoFiltro);

    forkJoin({
      checklists: carregarChecklists$,
      excecoes: carregarExcecoes$
    })
      .pipe(finalize(() => (this.loadingChecklists = false)))
      .subscribe({
        next: ({ checklists, excecoes }) => {
          this.checklists = checklists;
          this.consultaChecklist = this.montarConsultaChecklist(checklists, excecoes, raw.tipoOperacao || '');
        },
        error: () => this.snackBar.open('Falha ao carregar checklists.', 'Fechar', { duration: 3000 })
      });
  }

  limparFiltros(): void {
    this.filtroForm.reset({
      busca: '',
      motoristaId: 0,
      veiculoId: 0,
      origemRegistro: '',
      tipoOperacao: '',
      dataInicio: '',
      dataFim: ''
    });
    this.buscarChecklists();
  }

  buscarExcecoes(): void {
    this.loadingExcecoes = true;
    const raw = this.excecaoFiltroForm.getRawValue();
    this.missaoExcecaoService.listarAdmin({
      busca: raw.busca || undefined,
      motoristaId: raw.motoristaId > 0 ? raw.motoristaId : undefined,
      veiculoId: raw.veiculoId > 0 ? raw.veiculoId : undefined,
      status: raw.status || undefined,
      dataInicio: raw.dataInicio || undefined,
      dataFim: raw.dataFim || undefined
    })
      .pipe(finalize(() => (this.loadingExcecoes = false)))
      .subscribe({
        next: data => (this.excecoes = data),
        error: () => this.snackBar.open('Falha ao carregar missoes em excecao.', 'Fechar', { duration: 3000 })
      });
  }

  limparFiltrosExcecao(): void {
    this.excecaoFiltroForm.reset({
      busca: '',
      motoristaId: 0,
      veiculoId: 0,
      status: '',
      dataInicio: '',
      dataFim: ''
    });
    this.buscarExcecoes();
  }

  abrirEncerramentoExcecao(excecao: MissaoExcecaoResponse): void {
    this.selectedExcecaoEncerramento = excecao;
    this.encerramentoJustificativa = '';
  }

  cancelarEncerramentoExcecao(): void {
    this.selectedExcecaoEncerramento = null;
    this.encerramentoJustificativa = '';
  }

  confirmarEncerramentoExcecao(): void {
    const excecao = this.selectedExcecaoEncerramento;
    const justificativa = this.encerramentoJustificativa.trim();
    if (!excecao) {
      return;
    }
    if (justificativa.length < 10) {
      this.snackBar.open('Justificativa deve ter pelo menos 10 caracteres.', 'Fechar', { duration: 2600 });
      return;
    }

    this.missaoExcecaoService.encerrarAdmin(excecao.id, justificativa).subscribe({
      next: () => {
        this.snackBar.open('Missao em excecao encerrada.', 'Fechar', { duration: 2400 });
        this.cancelarEncerramentoExcecao();
        this.buscarExcecoes();
        this.carregarVeiculos(this.veiculoBusca);
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Falha ao encerrar excecao.', 'Fechar', { duration: 3000 })
    });
  }

  abrirChecklist(checklist: ChecklistResponse): void {
    this.selectedChecklist = checklist;
  }

  fecharChecklist(): void {
    this.selectedChecklist = null;
  }

  fotoUrl(path: string): string {
    if (!path) {
      return '';
    }
    if (path.startsWith('http')) {
      return path;
    }
    return `${environment.uploadBaseUrl}${path}`;
  }

  totalVeiculosDisponiveis(): number {
    return this.veiculosDaCategoria('DISPONIVEL').length;
  }

  totalVeiculosEmMissao(): number {
    return this.veiculosDaCategoria('MISSAO').length;
  }

  totalVeiculosEmViagem(): number {
    return this.veiculosDaCategoria('VIAGEM').length;
  }

  totalVeiculosNoPatio(): number {
    return this.veiculosDaCategoria('PATIO').length;
  }

  totalVeiculosOficina(): number {
    return this.veiculosDaCategoria('OFICINA').length;
  }

  totalVeiculosBloqueados(): number {
    return this.veiculosDaCategoria('BLOQUEADO').length;
  }

  totalVeiculosDesativados(): number {
    return this.veiculosDesativados().length;
  }

  contarCategoria(categoria: PainelCategoria): number {
    return this.painelVeiculos[categoria].length;
  }

  veiculosDaCategoria(categoria: PainelCategoria): Veiculo[] {
    return this.painelVeiculos[categoria];
  }

  veiculosAtivos(): Veiculo[] {
    return this.veiculos.filter(v => !v.desativado);
  }

  veiculosDesativados(): Veiculo[] {
    return this.veiculos.filter(v => v.desativado);
  }

  tipoOperacaoLabel(value: string): string {
    return value === 'ENTRADA' ? 'CHEGADA' : 'SAIDA';
  }

  origemConsultaLabel(origem: OrigemConsultaChecklist): string {
    return origem === 'CHECKLIST' ? 'COM CHECKLIST' : 'SEM CHECKLIST';
  }

  registrosComChecklist(): ConsultaChecklistItem[] {
    return this.consultaChecklist.filter(item => item.origem === 'CHECKLIST');
  }

  registrosSemChecklist(): ConsultaChecklistItem[] {
    return this.consultaChecklist.filter(item => item.origem === 'SEM_CHECKLIST');
  }

  formatarDataHora(dataHoraIso: string): string {
    if (!dataHoraIso || !dataHoraIso.includes('T')) {
      return '-';
    }

    const [data, horaRaw] = dataHoraIso.split('T');
    const [ano, mes, dia] = data.split('-');
    const [hora, minuto] = (horaRaw || '').split(':');
    if (!ano || !mes || !dia || !hora || !minuto) {
      return dataHoraIso;
    }
    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
  }

  statusExcecaoLabel(status: StatusExcecaoMissao): string {
    const labels: Record<StatusExcecaoMissao, string> = {
      EXCECAO_ABERTA: 'PENDENTE',
      ATRASADA: 'ATRASADA',
      REGULARIZADA_POR_CHECKLIST: 'REGULARIZADA (CHECKLIST)',
      REGULARIZADA_SEM_CHECKLIST: 'REGULARIZADA (SEM CHECKLIST)',
      ENCERRADA_ADMIN: 'REGULARIZADA (ADMIN)'
    };
    return labels[status];
  }

  motivoExcecaoLabel(motivo: MotivoExcecaoMissao): string {
    const labels: Record<MotivoExcecaoMissao, string> = {
      TROCA_RAPIDA_VEICULO: 'Troca rapida de veiculo',
      CHUVA_FORTE: 'Chuva forte',
      URGENCIA_OPERACIONAL: 'Urgencia operacional',
      SEM_TEMPO_OPERACIONAL: 'Sem tempo operacional',
      FALHA_CAMERA: 'Falha da camera',
      OUTROS: 'Outros'
    };
    return labels[motivo];
  }

  isExcecaoAberta(status: StatusExcecaoMissao): boolean {
    return status === 'EXCECAO_ABERTA' || status === 'ATRASADA';
  }

  duracaoExcecaoLabel(minutos: number): string {
    if (minutos < 60) {
      return `${minutos} min`;
    }
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return resto > 0 ? `${horas}h ${resto}min` : `${horas}h`;
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

  isStatusBloqueante(status: StatusVeiculo): boolean {
    return status === 'NO_PATIO'
      || status === 'OFICINA'
      || status === 'EM_VIAGEM'
      || status === 'MANUTENCAO'
      || status === 'BLOQUEADO';
  }

  logout(): void {
    this.authService.logout();
  }

  private criarPainelVazio(): Record<PainelCategoria, Veiculo[]> {
    return {
      DISPONIVEL: [],
      MISSAO: [],
      VIAGEM: [],
      PATIO: [],
      OFICINA: [],
      BLOQUEADO: []
    };
  }

  private organizarPainelOperacional(): void {
    const painel = this.criarPainelVazio();
    for (const veiculo of this.veiculosAtivos()) {
      painel[this.categoriaDoVeiculo(veiculo)].push(veiculo);
    }
    (Object.keys(painel) as PainelCategoria[]).forEach(categoria => {
      painel[categoria] = painel[categoria].sort((a, b) => a.placa.localeCompare(b.placa));
    });
    this.painelVeiculos = painel;
  }

  private categoriaDoVeiculo(veiculo: Veiculo): PainelCategoria {
    if (veiculo.statusAtual === 'BASE_JOAO_GOULART') {
      return 'DISPONIVEL';
    }
    if (veiculo.statusAtual === 'CIRCULANDO') {
      return 'MISSAO';
    }
    if (veiculo.statusAtual === 'EM_VIAGEM') {
      return 'VIAGEM';
    }
    if (veiculo.statusAtual === 'NO_PATIO') {
      return 'PATIO';
    }
    if (veiculo.statusAtual === 'OFICINA' || veiculo.statusAtual === 'MANUTENCAO') {
      return 'OFICINA';
    }
    return 'BLOQUEADO';
  }

  private veiculosElegiveisParaCategoria(categoria: PainelCategoria): Veiculo[] {
    const statusAlvo = this.statusAdministrativoAlvoPorCategoria(categoria);
    if (statusAlvo === undefined) {
      return [];
    }

    return this.veiculosAtivos()
      .filter(v => v.statusAutomatico !== 'CIRCULANDO')
      .filter(v => {
        if (categoria === 'DISPONIVEL') {
          return v.statusAdministrativo !== null;
        }
        return v.statusAdministrativo !== statusAlvo;
      })
      .sort((a, b) => a.placa.localeCompare(b.placa));
  }

  private statusAdministrativoAlvoPorCategoria(categoria: PainelCategoria): StatusAdministrativoVeiculo | null | undefined {
    if (categoria === 'DISPONIVEL') {
      return null;
    }
    if (categoria === 'VIAGEM') {
      return 'EM_VIAGEM';
    }
    if (categoria === 'PATIO') {
      return 'NO_PATIO';
    }
    if (categoria === 'OFICINA') {
      return 'OFICINA';
    }
    if (categoria === 'BLOQUEADO') {
      return 'BLOQUEADO';
    }
    return undefined;
  }

  private montarConsultaChecklist(
    checklists: ChecklistResponse[],
    excecoes: MissaoExcecaoResponse[],
    tipoOperacaoFiltro: '' | TipoOperacao
  ): ConsultaChecklistItem[] {
    const registrosChecklist = checklists.map(c => ({
      idExibicao: `C-${c.id}`,
      origem: 'CHECKLIST' as OrigemConsultaChecklist,
      tipoOperacao: c.tipoOperacao,
      dataHora: c.dataHora,
      motoristaId: c.motoristaId,
      motoristaNome: c.motoristaNome,
      veiculoId: c.veiculoId,
      veiculoPlaca: c.veiculoPlaca,
      resumo: 'Checklist fotografico enviado.',
      possuiFotos: c.fotos.length > 0,
      statusRegularizacao: 'REGULARIZADA',
      checklist: c
    }));

    const registrosExcecao = excecoes.flatMap(excecao => this.mapearEventosExcecao(excecao))
      .filter(item => !tipoOperacaoFiltro || item.tipoOperacao === tipoOperacaoFiltro);

    return [...registrosChecklist, ...registrosExcecao]
      // Ordenacao lexical de ISO local evita interpretacao de fuso pelo browser.
      .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  }

  private mapearEventosExcecao(excecao: MissaoExcecaoResponse): ConsultaChecklistItem[] {
    const eventos: ConsultaChecklistItem[] = [{
      idExibicao: `E-${excecao.id}-S`,
      origem: 'SEM_CHECKLIST',
      tipoOperacao: 'SAIDA',
      dataHora: excecao.dataHoraAbertura,
      motoristaId: excecao.motoristaId,
      motoristaNome: excecao.motoristaNome,
      veiculoId: excecao.veiculoId,
      veiculoPlaca: excecao.veiculoPlaca,
      resumo: `Saida sem checklist. Motivo: ${this.motivoExcecaoLabel(excecao.motivo)}. Status: ${this.statusExcecaoLabel(excecao.status)}.`,
      possuiFotos: false,
      statusRegularizacao: excecao.statusRegularizacao,
      excecao
    }];

    const geraChegadaSemChecklist =
      (excecao.status === 'REGULARIZADA_SEM_CHECKLIST' || excecao.status === 'ENCERRADA_ADMIN')
      && !!excecao.dataHoraRegularizacao;

    if (geraChegadaSemChecklist) {
      const resumoChegada = excecao.status === 'ENCERRADA_ADMIN'
        ? 'Chegada sem checklist regularizada por encerramento administrativo.'
        : 'Chegada sem checklist registrada pelo motorista.';

      eventos.push({
        idExibicao: `E-${excecao.id}-C`,
        origem: 'SEM_CHECKLIST',
        tipoOperacao: 'ENTRADA',
        dataHora: excecao.dataHoraRegularizacao!,
        motoristaId: excecao.motoristaId,
        motoristaNome: excecao.motoristaNome,
        veiculoId: excecao.veiculoId,
        veiculoPlaca: excecao.veiculoPlaca,
        resumo: resumoChegada,
        possuiFotos: false,
        statusRegularizacao: excecao.statusRegularizacao,
        excecao
      });
    }

    return eventos;
  }
}
