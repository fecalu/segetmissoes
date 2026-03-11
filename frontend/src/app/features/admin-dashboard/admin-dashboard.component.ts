import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription, finalize, forkJoin, interval, of } from 'rxjs';
import { ChecklistResponse, TipoOperacao } from '../../core/models/checklist.model';
import {
  AcaoAuditoriaMissao,
  AuditoriaMissaoResponse,
  MissaoResponse,
  OrigemAberturaMissao,
  OrigemEncerramentoMissao,
  StatusDocumentalMissao,
  StatusMissao
} from '../../core/models/missao.model';
import { MissaoExcecaoResponse, MotivoExcecaoMissao, StatusExcecaoMissao } from '../../core/models/missao-excecao.model';
import { Motorista } from '../../core/models/motorista.model';
import { RotuloStatusVeiculoResponse } from '../../core/models/status-label.model';
import { HistoricoStatusVeiculo, StatusAdministrativoVeiculo, StatusVeiculo, Veiculo } from '../../core/models/veiculo.model';
import {
  AdminService,
  CriarMissaoContingenciaPayload,
  EncerrarMissaoPendentePayload
} from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { MissaoExcecaoService } from '../../core/services/missao-excecao.service';
import { environment } from '../../../environments/environment';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/dialogs/confirm-dialog.component';
import {
  AdminCredentialConfirmDialogData,
  AdminCredentialConfirmDialogComponent,
  AdminCredentialConfirmDialogResult
} from '../../shared/dialogs/admin-credential-confirm-dialog.component';

type AdminMenu = 'operacao' | 'veiculos' | 'motoristas' | 'rotulos-status' | 'missoes' | 'tempo-real' | 'checklists' | 'excecoes';
type CadastroMenu = 'veiculos' | 'motoristas' | 'rotulos-status';
type ControleMenu = 'missoes' | 'checklists';
type PainelCategoria = 'DISPONIVEL' | 'MISSAO' | 'VIAGEM' | 'PATIO' | 'REALOCACAO' | 'OFICINA' | 'BLOQUEADO';
type OrigemConsultaChecklist = 'CHECKLIST' | 'SEM_CHECKLIST';
type SituacaoConsultaChecklist = '' | 'REGULARIZADA' | 'PENDENTE' | 'ATRASADA';

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
  quantidadeFotos: number;
  statusRegularizacao?: string;
  checklist?: ChecklistResponse;
  excecao?: MissaoExcecaoResponse;
}

interface GlossarioItem {
  termo: string;
  descricao: string;
}

interface GlossarioBadgeItem extends GlossarioItem {
  classe: string;
  exemplo?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  activeMenu: AdminMenu = 'operacao';
  cadastrosMenuAtivo: CadastroMenu = 'veiculos';
  controleMenuAtivo: ControleMenu = 'missoes';
  filtrosAbertos = false;
  filtrosVeiculoAbertos = false;
  filtrosMotoristaAbertos = false;
  filtrosMissoesAbertos = false;

  motoristas: Motorista[] = [];
  veiculos: Veiculo[] = [];
  checklists: ChecklistResponse[] = [];
  missoes: MissaoResponse[] = [];
  consultaChecklist: ConsultaChecklistItem[] = [];
  painelVeiculos = this.criarPainelVazio();

  loadingMotoristas = false;
  loadingVeiculos = false;
  loadingChecklists = false;
  loadingMissoes = false;
  loadingTempoReal = false;
  loadingAuditoriaMissao = false;
  loadingHistoricoStatus = false;
  loadingRotulosStatus = false;
  gerandoRelatorioMissoes = false;
  salvandoRotulosStatus = false;

  editingMotoristaId: number | null = null;
  editingVeiculoId: number | null = null;

  motoristaBusca = '';
  veiculoBusca = '';

  selectedChecklist: ChecklistResponse | null = null;
  selectedMissaoAuditoria: MissaoResponse | null = null;
  selectedMissaoDadosAdmin: MissaoResponse | null = null;
  selectedVeiculoHistorico: Veiculo | null = null;
  selectedCategoriaInclusao: PainelCategoria | null = null;
  veiculoInclusaoSelecionadoId: number | null = null;
  buscaInclusaoVeiculo = '';
  processandoInclusao = false;
  agoraEpochMs = Date.now();
  missoesTempoReal: MissaoResponse[] = [];
  auditoriaMissao: AuditoriaMissaoResponse[] = [];
  historicoStatus: HistoricoStatusVeiculo[] = [];
  rotulosStatusEditor: RotuloStatusVeiculoResponse[] = [];
  dataRelatorioMissoes = this.hojeIso();
  showNovaMissaoModal = false;
  novaMissaoModo: 'CONTINGENCIA' | 'PENDENTE' = 'CONTINGENCIA';
  salvandoNovaMissaoContingencia = false;
  encerrandoMissaoPendente = false;
  glossarioMissoesAberto = false;
  glossarioChecklistsAberto = false;
  private relogioSub?: Subscription;
  private refreshTempoRealSub?: Subscription;

  readonly categoriasPainel: Array<{ id: PainelCategoria; titulo: string; descricao: string }> = [
    { id: 'DISPONIVEL', titulo: 'Disponiveis', descricao: 'Prontos para nova missao' },
    { id: 'MISSAO', titulo: 'Em missao', descricao: 'Veiculos com missao em andamento' },
    { id: 'VIAGEM', titulo: 'Em viagem', descricao: 'Viagem definida administrativamente' },
    { id: 'PATIO', titulo: 'No patio', descricao: 'Parados no patio' },
    { id: 'REALOCACAO', titulo: 'Aguardando realocacao', descricao: 'Recebidos e aguardando definicao' },
    { id: 'OFICINA', titulo: 'Oficina', descricao: 'Oficina ou manutencao' },
    { id: 'BLOQUEADO', titulo: 'Bloqueados', descricao: 'Sem liberacao para uso' }
  ];
  readonly categoriasPainelIds: PainelCategoria[] = this.categoriasPainel.map(c => c.id);
  private readonly statusLabelsPadrao: Record<StatusVeiculo, string> = {
    CIRCULANDO: 'NA RUA (MISSAO)',
    BASE_JOAO_GOULART: 'DISPONIVEL',
    NO_PATIO: 'NO PATIO',
    AGUARDANDO_REALOCACAO: 'AGUARDANDO REALOCACAO',
    OFICINA: 'OFICINA',
    EM_VIAGEM: 'EM VIAGEM',
    MANUTENCAO: 'MANUTENCAO',
    BLOQUEADO: 'BLOQUEADO'
  };
  private readonly statusLabelsCustomizados: Partial<Record<StatusVeiculo, string>> = {};
  private readonly statusMissaoLabels: Record<StatusMissao, string> = {
    ATIVA: 'EM ANDAMENTO',
    FINALIZADA: 'FINALIZADA'
  };
  private readonly statusDocumentalMissaoLabels: Record<StatusDocumentalMissao, string> = {
    PENDENTE_DADOS_ADMIN: 'DADOS PENDENTES',
    DADOS_ADMIN_COMPLETOS: 'DADOS COMPLETOS'
  };
  private readonly origemAberturaMissaoLabels: Record<OrigemAberturaMissao, string> = {
    CHECKLIST: 'INICIO: COM CHECKLIST',
    SEM_CHECKLIST: 'INICIO: SEM CHECKLIST',
    CONTINGENCIA_ADMIN: 'INICIO: PELO ADMIN'
  };
  private readonly origemEncerramentoMissaoLabels: Record<OrigemEncerramentoMissao, string> = {
    CHECKLIST: 'FIM: COM CHECKLIST',
    SEM_CHECKLIST: 'FIM: SEM CHECKLIST',
    ADMINISTRATIVO: 'FIM: PELO ADMIN'
  };
  private readonly tipoMissaoLabels = {
    MANUAL: 'REGISTRO MANUAL'
  } as const;
  readonly glossarioMissoesBadges: GlossarioBadgeItem[] = [
    { termo: this.statusMissaoLabels.ATIVA, descricao: 'Missao em andamento, ainda sem finalizacao.', exemplo: 'Ex.: motorista saiu 13:12 e ainda nao registrou o fim.', classe: 'status-circulando' },
    { termo: this.statusMissaoLabels.FINALIZADA, descricao: 'Missao ja finalizada.', exemplo: 'Ex.: inicio 08:00 e fim 09:15 ja registrados.', classe: 'status-finalizada' },
    { termo: this.statusDocumentalMissaoLabels.PENDENTE_DADOS_ADMIN, descricao: 'Ainda faltam destino, setor ou solicitante.', exemplo: 'Ex.: destino foi informado, mas setor e solicitante ainda faltam.', classe: 'status-documental-pendente' },
    { termo: this.statusDocumentalMissaoLabels.DADOS_ADMIN_COMPLETOS, descricao: 'Destino, setor e solicitante ja foram preenchidos.', exemplo: 'Ex.: destino SEGET, setor ATOS e solicitante VAL ja informados.', classe: 'status-documental-ok' },
    { termo: this.tipoMissaoLabels.MANUAL, descricao: 'Missao registrada manualmente pela administracao.', exemplo: 'Ex.: administrador registrou a missao porque o celular descarregou.', classe: 'status-bloqueado' },
    { termo: this.origemAberturaMissaoLabels.CHECKLIST, descricao: 'Inicio registrado pelo checklist de saida.', exemplo: 'Ex.: a missao foi aberta logo apos o checklist de saida.', classe: 'status-base_joao_goulart' },
    { termo: this.origemAberturaMissaoLabels.SEM_CHECKLIST, descricao: 'Inicio registrado sem checklist.', exemplo: 'Ex.: o motorista iniciou a missao sem checklist por excecao operacional.', classe: 'status-base_joao_goulart' },
    { termo: this.origemAberturaMissaoLabels.CONTINGENCIA_ADMIN, descricao: 'Inicio registrado diretamente pela administracao.', exemplo: 'Ex.: a administracao abriu a missao manualmente para o motorista.', classe: 'status-base_joao_goulart' },
    { termo: this.origemEncerramentoMissaoLabels.CHECKLIST, descricao: 'Fim registrado pelo checklist de chegada.', exemplo: 'Ex.: a missao foi finalizada quando o checklist de chegada foi enviado.', classe: 'status-no_patio' },
    { termo: this.origemEncerramentoMissaoLabels.SEM_CHECKLIST, descricao: 'Fim registrado sem checklist.', exemplo: 'Ex.: o motorista registrou o fim sem checklist.', classe: 'status-no_patio' },
    { termo: this.origemEncerramentoMissaoLabels.ADMINISTRATIVO, descricao: 'Fim registrado manualmente pela administracao.', exemplo: 'Ex.: a administracao finalizou a missao porque o motorista nao conseguiu encerrar pelo app.', classe: 'status-no_patio' },
    { termo: 'DURACAO: 16 s', descricao: 'Tempo total entre o inicio e o fim da missao.', exemplo: 'Ex.: inicio 13:12:00 e fim 13:12:16.', classe: 'status-oficina' }
  ];
  readonly glossarioMissoesCampos: GlossarioItem[] = [
    { termo: 'Destino | Setor | Solicitante', descricao: 'Dados da missao usados nos relatorios e no acompanhamento operacional.' },
    { termo: 'Justificativa do registro manual', descricao: 'Texto explicando por que a missao foi registrada manualmente pela administracao.' },
    { termo: 'Justificativa do encerramento manual', descricao: 'Texto explicando por que o encerramento precisou ser feito manualmente, e nao pelo motorista.' },
    { termo: 'Registrada por', descricao: 'Quem registrou o inicio da missao, motorista ou administrador.' },
    { termo: 'Finalizada por', descricao: 'Quem registrou o fim da missao. Enquanto a missao estiver em andamento, fica como "-".' },
    { termo: 'Inicio | Fim', descricao: 'Horarios oficiais de inicio e fim da missao.' },
    { termo: '-', descricao: 'Campo ainda nao informado ou nao aplicavel para aquela missao.' }
  ];
  readonly glossarioChecklistsBadges: GlossarioBadgeItem[] = [
    { termo: 'COM CHECKLIST', descricao: 'Registro com checklist fotografico enviado pelo motorista.', exemplo: 'Ex.: saida ou chegada com fotos anexadas.', classe: 'status-circulando' },
    { termo: 'SEM CHECKLIST', descricao: 'Registro sem checklist fotografico. Pode ser saida ou chegada regularizada sem fotos.', exemplo: 'Ex.: saida sem checklist por excecao operacional.', classe: 'status-oficina' },
    { termo: 'REGULARIZADA', descricao: 'Registro concluido normalmente ou ja regularizado.', exemplo: 'Ex.: checklist enviado ou excecao ja fechada.', classe: 'status-base_joao_goulart' },
    { termo: 'PENDENTE', descricao: 'Registro sem checklist ainda aguardando regularizacao.', exemplo: 'Ex.: saida sem checklist ainda em aberto.', classe: 'status-documental-pendente' },
    { termo: 'ATRASADA', descricao: 'Registro sem checklist passou do prazo esperado de regularizacao.', exemplo: 'Ex.: saida sem checklist ainda aberta apos o prazo.', classe: 'status-bloqueado' },
    { termo: 'SEM FOTOS', descricao: 'Registro nao possui fotos anexadas.', exemplo: 'Ex.: evento sem checklist ou checklist salvo sem imagens.', classe: 'status-no_patio' }
  ];
  readonly glossarioChecklistsCampos: GlossarioItem[] = [
    { termo: 'SAIDA | CHEGADA', descricao: 'Tipo do registro operacional.' },
    { termo: 'Resumo', descricao: 'Explica rapidamente o que aconteceu naquele registro.' },
    { termo: 'Fotos', descricao: 'Abre as imagens quando o registro possui checklist fotografico.' },
    { termo: 'Sem fotos', descricao: 'Aparece quando o registro nao tem nenhuma imagem vinculada.' }
  ];

  readonly motoristaForm;
  readonly veiculoForm;
  readonly filtroForm;
  readonly missaoFiltroForm;
  readonly missaoDadosForm;
  readonly missaoContingenciaForm;
  readonly missaoPendenteForm;

  constructor(
    private readonly fb: FormBuilder,
    private readonly adminService: AdminService,
    private readonly missaoExcecaoService: MissaoExcecaoService,
    private readonly authService: AuthService,
    private readonly dialog: MatDialog,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar
  ) {
    const hoje = this.hojeIso();

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
      situacaoRegistro: ['' as SituacaoConsultaChecklist],
      tipoOperacao: ['' as '' | TipoOperacao],
      dataInicio: [''],
      dataFim: ['']
    });

    this.missaoFiltroForm = this.fb.nonNullable.group({
      busca: [''],
      motoristaId: [0],
      veiculoId: [0],
      status: ['' as '' | StatusMissao],
      origemAbertura: ['' as '' | OrigemAberturaMissao],
      statusDocumental: ['' as '' | StatusDocumentalMissao],
      dataInicio: [hoje],
      dataFim: [hoje]
    });

    this.missaoDadosForm = this.fb.nonNullable.group({
      localDestino: [''],
      setorSolicitante: [''],
      solicitanteNome: ['']
    });

    this.missaoContingenciaForm = this.fb.nonNullable.group({
      motoristaId: [0, [Validators.min(1)]],
      veiculoId: [0, [Validators.min(1)]],
      dataHoraInicio: [this.agoraDateTimeLocal(), [Validators.required]],
      justificativaAbertura: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(700)]],
      localDestino: [''],
      setorSolicitante: [''],
      solicitanteNome: ['']
    });

    this.missaoPendenteForm = this.fb.nonNullable.group({
      missaoId: [0, [Validators.min(1)]],
      dataHoraFim: [this.agoraDateTimeLocal(), [Validators.required]],
      justificativaEncerramento: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(700)]]
    });
  }

  ngOnInit(): void {
    const menuParam = this.route.snapshot.queryParamMap.get('menu');
    if (menuParam === 'dashboard') {
      this.activeMenu = 'operacao';
    } else if (this.isAdminMenu(menuParam)) {
      this.activeMenu = this.normalizarMenu(menuParam);
    }
    this.sincronizarMenusAgrupados(this.activeMenu);
    this.carregarRotulosStatus(false);

    this.garantirDadosBasicos(this.activeMenu);
    if (this.activeMenu !== 'tempo-real') {
      this.carregarDadosDoMenu(this.activeMenu, false);
    }
    this.iniciarRelogioTempoReal();
    if (this.activeMenu === 'tempo-real') {
      this.iniciarAtualizacaoTempoReal();
    }
  }

  ngOnDestroy(): void {
    this.pararAtualizacaoTempoReal();
    this.relogioSub?.unsubscribe();
  }

  setMenu(menu: AdminMenu): void {
    menu = this.normalizarMenu(menu);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { menu },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.activeMenu = menu;
    this.sincronizarMenusAgrupados(menu);
    if (menu !== 'veiculos') {
      this.filtrosVeiculoAbertos = false;
    }
    if (menu !== 'motoristas') {
      this.filtrosMotoristaAbertos = false;
    }
    if (menu !== 'missoes') {
      this.filtrosMissoesAbertos = false;
      this.fecharEdicaoDadosMissao();
      if (this.showNovaMissaoModal) {
        this.fecharNovaMissao();
      }
    }
    if (menu !== 'checklists') {
      this.filtrosAbertos = false;
    }

    this.garantirDadosBasicos(menu);
    if (menu !== 'tempo-real') {
      this.carregarDadosDoMenu(menu, false);
    }
    if (menu === 'operacao') {
      this.carregarMissoesTempoReal(false);
    }

    if (menu === 'tempo-real') {
      this.iniciarAtualizacaoTempoReal();
    } else {
      this.pararAtualizacaoTempoReal();
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

  toggleFiltrosMissoes(): void {
    this.filtrosMissoesAbertos = !this.filtrosMissoesAbertos;
  }

  atualizarPainelOperacional(): void {
    this.carregarVeiculos(this.veiculoBusca);
    this.carregarMissoesTempoReal(false);
  }

  abrirCadastros(): void {
    this.setMenu(this.cadastrosMenuAtivo);
  }

  abrirControle(): void {
    this.setMenu(this.controleMenuAtivo);
  }

  setCadastroMenu(menu: CadastroMenu): void {
    this.cadastrosMenuAtivo = menu;
    this.setMenu(menu);
  }

  setControleMenu(menu: ControleMenu): void {
    this.controleMenuAtivo = menu;
    this.setMenu(menu);
  }

  isCadastrosAtivo(): boolean {
    return this.activeMenu === 'veiculos'
      || this.activeMenu === 'motoristas'
      || this.activeMenu === 'rotulos-status';
  }

  isControleAtivo(): boolean {
    return this.activeMenu === 'missoes'
      || this.activeMenu === 'checklists';
  }

  abrirTelaRelatorio(): void {
    this.router.navigate(['/admin/checklists/relatorio']);
  }

  exportarRelatorioMissoesPdf(): void {
    if (!this.dataRelatorioMissoes) {
      this.snackBar.open('Selecione a data do relatorio.', 'Fechar', { duration: 2500 });
      return;
    }

    this.gerandoRelatorioMissoes = true;
    this.adminService.gerarRelatorioMissoesPdf(this.dataRelatorioMissoes)
      .pipe(finalize(() => (this.gerandoRelatorioMissoes = false)))
      .subscribe({
        next: blob => {
          const nome = `relatorio-missoes-${this.dataRelatorioMissoes.replaceAll('-', '')}.pdf`;
          this.baixarArquivo(blob, nome);
          this.snackBar.open('Relatorio de missoes gerado com sucesso.', 'Fechar', { duration: 2200 });
        },
        error: () => this.snackBar.open('Falha ao gerar relatorio de missoes.', 'Fechar', { duration: 3200 })
      });
  }

  abrirNovaMissao(modo: 'CONTINGENCIA' | 'PENDENTE' = 'CONTINGENCIA'): void {
    this.showNovaMissaoModal = true;
    this.novaMissaoModo = modo;
    if (modo === 'CONTINGENCIA') {
      this.missaoContingenciaForm.patchValue({ dataHoraInicio: this.agoraDateTimeLocal() });
      return;
    }
    const primeiraMissaoAtiva = this.missoesPendentesEncerramento()[0];
    this.missaoPendenteForm.patchValue({
      missaoId: primeiraMissaoAtiva ? primeiraMissaoAtiva.id : 0,
      dataHoraFim: this.agoraDateTimeLocal()
    });
  }

  abrirEncerramentoPendente(missaoId?: number): void {
    this.abrirNovaMissao('PENDENTE');
    this.missaoPendenteForm.patchValue({
      missaoId: missaoId && missaoId > 0 ? missaoId : 0,
      dataHoraFim: this.agoraDateTimeLocal()
    });
  }

  fecharNovaMissao(): void {
    this.showNovaMissaoModal = false;
    this.novaMissaoModo = 'CONTINGENCIA';
    this.missaoContingenciaForm.reset({
      motoristaId: 0,
      veiculoId: 0,
      dataHoraInicio: this.agoraDateTimeLocal(),
      justificativaAbertura: '',
      localDestino: '',
      setorSolicitante: '',
      solicitanteNome: ''
    });
    this.missaoPendenteForm.reset({
      missaoId: 0,
      dataHoraFim: this.agoraDateTimeLocal(),
      justificativaEncerramento: ''
    });
  }

  salvarMissaoContingencia(): void {
    if (this.missaoContingenciaForm.invalid) {
      this.missaoContingenciaForm.markAllAsTouched();
      return;
    }

    const raw = this.missaoContingenciaForm.getRawValue();
    if (raw.motoristaId <= 0 || raw.veiculoId <= 0) {
      this.snackBar.open('Selecione motorista e veiculo para registrar a missao manual.', 'Fechar', { duration: 2600 });
      return;
    }

    const payload: CriarMissaoContingenciaPayload = {
      motoristaId: raw.motoristaId,
      veiculoId: raw.veiculoId,
      dataHoraInicio: raw.dataHoraInicio,
      justificativaAbertura: raw.justificativaAbertura.trim(),
      localDestino: this.toNullIfBlank(raw.localDestino),
      setorSolicitante: this.toNullIfBlank(raw.setorSolicitante),
      solicitanteNome: this.toNullIfBlank(raw.solicitanteNome)
    };

    this.salvandoNovaMissaoContingencia = true;
    this.adminService.criarMissaoContingencia(payload)
      .pipe(finalize(() => (this.salvandoNovaMissaoContingencia = false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Missao manual registrada com sucesso.', 'Fechar', { duration: 2400 });
          this.fecharNovaMissao();
          this.buscarMissoes();
          this.carregarMissoesTempoReal(false);
          this.carregarVeiculos(this.veiculoBusca);
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Falha ao registrar a missao manual.', 'Fechar', { duration: 3200 })
      });
  }

  encerrarMissaoPendente(): void {
    if (this.missaoPendenteForm.invalid) {
      this.missaoPendenteForm.markAllAsTouched();
      return;
    }

    const raw = this.missaoPendenteForm.getRawValue();
    if (raw.missaoId <= 0) {
      this.snackBar.open('Selecione a missao em aberto para finalizar.', 'Fechar', { duration: 2400 });
      return;
    }

    const payload: EncerrarMissaoPendentePayload = {
      dataHoraFim: raw.dataHoraFim,
      justificativaEncerramento: raw.justificativaEncerramento.trim()
    };

    this.encerrandoMissaoPendente = true;
    this.adminService.encerrarMissaoPendente(raw.missaoId, payload)
      .pipe(finalize(() => (this.encerrandoMissaoPendente = false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Missao em aberto finalizada com sucesso.', 'Fechar', { duration: 2400 });
          this.fecharNovaMissao();
          this.buscarMissoes();
          this.carregarMissoesTempoReal(false);
          this.carregarVeiculos(this.veiculoBusca);
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Falha ao finalizar a missao em aberto.', 'Fechar', { duration: 3200 })
      });
  }

  abrirTelaEstatisticas(): void {
    this.router.navigate(['/admin/estatisticas/missoes']);
  }

  carregarRotulosStatus(showError = true): void {
    this.loadingRotulosStatus = true;
    this.adminService.listarRotulosStatusVeiculo()
      .pipe(finalize(() => (this.loadingRotulosStatus = false)))
      .subscribe({
        next: data => this.aplicarRotulosStatus(data),
        error: () => {
          if (showError) {
            this.snackBar.open('Falha ao carregar rotulos de status.', 'Fechar', { duration: 2800 });
          }
        }
      });
  }

  salvarRotulosStatus(): void {
    if (this.rotulosStatusEditor.length === 0) {
      return;
    }

    const payload = {
      rotulos: this.rotulosStatusEditor.map(item => ({
        status: item.status,
        rotulo: (item.rotulo || '').trim()
      }))
    };

    if (payload.rotulos.some(item => !item.rotulo)) {
      this.snackBar.open('Todos os rotulos devem ser preenchidos.', 'Fechar', { duration: 2600 });
      return;
    }

    this.salvandoRotulosStatus = true;
    this.adminService.salvarRotulosStatusVeiculo(payload)
      .pipe(finalize(() => (this.salvandoRotulosStatus = false)))
      .subscribe({
        next: data => {
          this.aplicarRotulosStatus(data);
          this.snackBar.open('Rotulos de status atualizados.', 'Fechar', { duration: 2200 });
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Falha ao salvar rotulos de status.', 'Fechar', { duration: 3200 })
      });
  }

  restaurarRotuloPadrao(item: RotuloStatusVeiculoResponse): void {
    item.rotulo = item.rotuloPadrao;
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
    this.abrirConfirmacao({
      title: 'Excluir motorista',
      message: 'Deseja excluir este motorista?',
      confirmText: 'Excluir',
      confirmColor: 'warn'
    }, () => {
      this.adminService.excluirMotorista(id).subscribe({
        next: () => {
          this.snackBar.open('Motorista excluido.', 'Fechar', { duration: 2000 });
          this.carregarMotoristas(this.motoristaBusca);
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Erro ao excluir motorista.', 'Fechar', { duration: 2800 })
      });
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

  categoriaPermiteInclusao(categoria: PainelCategoria): boolean {
    return categoria !== 'MISSAO';
  }

  onDropCategoria(event: CdkDragDrop<Veiculo[]>, categoriaDestino: PainelCategoria): void {
    if (event.previousContainer === event.container) {
      return;
    }

    const veiculo = event.item.data as Veiculo | undefined;
    if (!veiculo) {
      return;
    }

    if (!this.categoriaPermiteInclusao(categoriaDestino)) {
      this.snackBar.open('A coluna selecionada e controlada automaticamente e nao aceita alteracao manual.', 'Fechar', { duration: 3000 });
      return;
    }

    const categoriaOrigem = this.isPainelCategoria(event.previousContainer.id)
      ? event.previousContainer.id
      : this.categoriaDoVeiculo(veiculo);

    if (categoriaOrigem === categoriaDestino) {
      return;
    }

    if (veiculo.statusAutomatico === 'CIRCULANDO') {
      this.snackBar.open('Veiculo com missao em andamento nao pode ser movido manualmente de coluna.', 'Fechar', { duration: 3200 });
      return;
    }

    const novoStatus = this.statusAdministrativoAlvoPorCategoria(categoriaDestino);
    if (novoStatus === undefined) {
      this.snackBar.open('Nao foi possivel aplicar a movimentacao para esta coluna.', 'Fechar', { duration: 2800 });
      return;
    }

    if (categoriaDestino === 'DISPONIVEL' && veiculo.statusAdministrativo === null) {
      return;
    }
    if (categoriaDestino !== 'DISPONIVEL' && veiculo.statusAdministrativo === novoStatus) {
      return;
    }

    const origemLabel = this.categoriaTitulo(categoriaOrigem);
    const destinoLabel = this.categoriaTitulo(categoriaDestino);
    const statusDestinoLabel = novoStatus ? this.statusLabel(novoStatus) : 'DISPONIVEL (AUTOMATICO)';

    this.abrirConfirmacao({
      title: `Movimentar ${veiculo.placa}`,
      message: `${origemLabel} -> ${destinoLabel}\nNovo status: ${statusDestinoLabel}`,
      confirmText: 'Confirmar movimentacao'
    }, () => {
      this.adminService.atualizarStatusAdministrativoVeiculo(veiculo.id, novoStatus).subscribe({
        next: () => {
          this.snackBar.open('Movimentacao aplicada com sucesso.', 'Fechar', { duration: 2200 });
          this.carregarVeiculos(this.veiculoBusca);
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Falha ao movimentar veiculo.', 'Fechar', { duration: 3000 })
      });
    });
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
    this.abrirConfirmacao({
      title: `Alterar status de ${veiculo.placa}`,
      message: `${atualLabel} -> ${destinoLabel}`,
      confirmText: 'Confirmar'
    }, () => {
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

  desativarVeiculo(veiculo: Veiculo): void {
    if (veiculo.desativado) {
      return;
    }
    this.abrirConfirmacao({
      title: 'Baixar/desativar veiculo',
      message: `Deseja baixar/desativar o veiculo ${veiculo.placa}?`,
      confirmText: 'Baixar',
      confirmColor: 'warn'
    }, () => {
      this.adminService.desativarVeiculo(veiculo.id).subscribe({
        next: () => {
          this.snackBar.open('Veiculo baixado/desativado.', 'Fechar', { duration: 2200 });
          this.carregarVeiculos(this.veiculoBusca);
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Erro ao baixar veiculo.', 'Fechar', { duration: 3000 })
      });
    });
  }

  reativarVeiculo(veiculo: Veiculo): void {
    if (!veiculo.desativado) {
      return;
    }
    this.abrirConfirmacao({
      title: 'Reativar veiculo',
      message: `Deseja reativar o veiculo ${veiculo.placa}?`,
      confirmText: 'Reativar'
    }, () => {
      this.adminService.reativarVeiculo(veiculo.id).subscribe({
        next: () => {
          this.snackBar.open('Veiculo reativado.', 'Fechar', { duration: 2200 });
          this.carregarVeiculos(this.veiculoBusca);
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Erro ao reativar veiculo.', 'Fechar', { duration: 3000 })
      });
    });
  }

  excluirVeiculoDefinitivamente(veiculo: Veiculo): void {
    if (!veiculo.desativado) {
      this.snackBar.open('Desative o veiculo antes da exclusao definitiva.', 'Fechar', { duration: 2800 });
      return;
    }

    const dialogRef = this.dialog.open<AdminCredentialConfirmDialogComponent, AdminCredentialConfirmDialogData, AdminCredentialConfirmDialogResult | null>(
      AdminCredentialConfirmDialogComponent,
      {
        width: 'min(92vw, 560px)',
        data: {
          title: `Exclusao definitiva de ${veiculo.placa}`,
          message: 'Esta acao remove o veiculo e seus vinculos da base operacional.\nConfirme com sua senha e justificativa.',
          passwordLabel: 'Senha de administrador',
          justificationLabel: 'Justificativa da exclusao',
          justificationMinLength: 10,
          confirmText: 'Excluir definitivamente'
        }
      }
    );

    dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }
      this.adminService.excluirVeiculoDefinitivamente(veiculo.id, result.senhaAdmin, result.justificativa).subscribe({
        next: () => {
          this.snackBar.open('Veiculo excluido definitivamente.', 'Fechar', { duration: 2400 });
          this.carregarVeiculos(this.veiculoBusca);
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Falha na exclusao definitiva.', 'Fechar', { duration: 3200 })
      });
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
          this.consultaChecklist = this.filtrarConsultaChecklist(
            this.montarConsultaChecklist(checklists, excecoes, raw.tipoOperacao || ''),
            raw.situacaoRegistro
          );
        },
        error: () => this.snackBar.open('Falha ao carregar checklists.', 'Fechar', { duration: 3000 })
      });
  }

  buscarMissoes(): void {
    this.loadingMissoes = true;
    const raw = this.missaoFiltroForm.getRawValue();
    this.adminService.listarMissoes({
      busca: raw.busca || undefined,
      motoristaId: raw.motoristaId > 0 ? raw.motoristaId : undefined,
      veiculoId: raw.veiculoId > 0 ? raw.veiculoId : undefined,
      status: raw.status || undefined,
      origemAbertura: raw.origemAbertura || undefined,
      statusDocumental: raw.statusDocumental || undefined,
      dataInicio: raw.dataInicio || undefined,
      dataFim: raw.dataFim || undefined
    })
      .pipe(finalize(() => (this.loadingMissoes = false)))
      .subscribe({
        next: data => (this.missoes = data),
        error: () => this.snackBar.open('Falha ao carregar missoes.', 'Fechar', { duration: 3000 })
      });
  }

  carregarMissoesTempoReal(showError = true): void {
    this.loadingTempoReal = true;
    this.adminService.listarMissoes({ status: 'ATIVA' })
      .pipe(finalize(() => (this.loadingTempoReal = false)))
      .subscribe({
        next: data => (this.missoesTempoReal = data),
        error: () => {
          if (showError) {
            this.snackBar.open('Falha ao carregar missoes em andamento.', 'Fechar', { duration: 2800 });
          }
        }
      });
  }

  limparFiltrosMissoes(): void {
    const hoje = this.hojeIso();
    this.missaoFiltroForm.reset({
      busca: '',
      motoristaId: 0,
      veiculoId: 0,
      status: '',
      origemAbertura: '',
      statusDocumental: '',
      dataInicio: hoje,
      dataFim: hoje
    });
    this.buscarMissoes();
  }

  limparFiltros(): void {
    this.filtroForm.reset({
      busca: '',
      motoristaId: 0,
      veiculoId: 0,
      origemRegistro: '',
      situacaoRegistro: '',
      tipoOperacao: '',
      dataInicio: '',
      dataFim: ''
    });
    this.buscarChecklists();
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

  totalVeiculosAguardandoRealocacao(): number {
    return this.veiculosDaCategoria('REALOCACAO').length;
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

  motoristasElegiveisMissao(): Motorista[] {
    return this.motoristas.filter(m => m.perfil === 'MOTORISTA');
  }

  veiculosElegiveisContingencia(): Veiculo[] {
    return this.veiculosAtivos().filter(v => v.statusAutomatico !== 'CIRCULANDO');
  }

  tipoOperacaoLabel(value: string): string {
    return value === 'ENTRADA' ? 'CHEGADA' : 'SAIDA';
  }

  origemConsultaLabel(origem: OrigemConsultaChecklist): string {
    return origem === 'CHECKLIST' ? 'COM CHECKLIST' : 'SEM CHECKLIST';
  }

  consultaChecklistOrdenada(): ConsultaChecklistItem[] {
    return [...this.consultaChecklist].sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  }

  missoesAtivas(): MissaoResponse[] {
    return this.missoes.filter(m => m.status === 'ATIVA');
  }

  missoesPendentesEncerramento(): MissaoResponse[] {
    return this.missoesAtivas();
  }

  missoesFinalizadas(): MissaoResponse[] {
    return this.missoes.filter(m => m.status === 'FINALIZADA');
  }

  missoesPendentesDadosAdmin(): MissaoResponse[] {
    return this.missoes.filter(m => m.statusDocumental === 'PENDENTE_DADOS_ADMIN');
  }

  missoesContingencia(): MissaoResponse[] {
    return this.missoes.filter(m => m.origemAbertura === 'CONTINGENCIA_ADMIN');
  }

  missoesOrdenadasPorInicio(): MissaoResponse[] {
    return [...this.missoes].sort((a, b) => b.dataHoraInicio.localeCompare(a.dataHoraInicio));
  }

  statusMissaoLabel(status: StatusMissao): string {
    return this.statusMissaoLabels[status];
  }

  classeLinhaMissao(missao: MissaoResponse): string {
    if (missao.statusDocumental === 'PENDENTE_DADOS_ADMIN') {
      return 'missao-row-pendente';
    }
    if (missao.status === 'ATIVA') {
      return 'missao-row-ativa';
    }
    return 'missao-row-finalizada';
  }

  statusDocumentalMissaoLabel(status: StatusDocumentalMissao): string {
    return this.statusDocumentalMissaoLabels[status];
  }

  classeStatusDocumentalMissao(status: StatusDocumentalMissao): string {
    return status === 'DADOS_ADMIN_COMPLETOS'
      ? 'status-documental-ok'
      : 'status-documental-pendente';
  }

  resumoDadosAdministrativos(missao: MissaoResponse): string {
    const destino = missao.localDestino || '-';
    const setor = missao.setorSolicitante || '-';
    const solicitante = missao.solicitanteNome || '-';
    return `Destino: ${destino} | Setor: ${setor} | Solicitante: ${solicitante}`;
  }

  origemAberturaMissaoLabel(origem: OrigemAberturaMissao): string {
    return this.origemAberturaMissaoLabels[origem];
  }

  tipoMissaoLabel(missao: MissaoResponse): string {
    return missao.origemAbertura === 'CONTINGENCIA_ADMIN'
      ? this.tipoMissaoLabels.MANUAL
      : '';
  }

  abertaPorMissaoLabel(missao: MissaoResponse): string {
    return missao.administradorAberturaNome || missao.motoristaNome;
  }

  encerradaPorMissaoLabel(missao: MissaoResponse): string {
    if (missao.status === 'ATIVA') {
      return '-';
    }
    return missao.administradorEncerramentoNome || missao.motoristaNome;
  }

  origemEncerramentoMissaoLabel(origem: OrigemEncerramentoMissao | null): string {
    if (!origem) {
      return '-';
    }
    return this.origemEncerramentoMissaoLabels[origem];
  }

  abrirAuditoriaMissao(missao: MissaoResponse): void {
    this.selectedMissaoAuditoria = missao;
    this.auditoriaMissao = [];
    this.loadingAuditoriaMissao = true;
    this.adminService.listarAuditoriaMissao(missao.id)
      .pipe(finalize(() => (this.loadingAuditoriaMissao = false)))
      .subscribe({
        next: data => (this.auditoriaMissao = data),
        error: () => this.snackBar.open('Falha ao carregar o historico da missao.', 'Fechar', { duration: 2800 })
      });
  }

  fecharAuditoriaMissao(): void {
    this.selectedMissaoAuditoria = null;
    this.auditoriaMissao = [];
  }

  abrirEdicaoDadosMissao(missao: MissaoResponse): void {
    this.selectedMissaoDadosAdmin = missao;
    this.missaoDadosForm.reset({
      localDestino: missao.localDestino || '',
      setorSolicitante: missao.setorSolicitante || '',
      solicitanteNome: missao.solicitanteNome || ''
    });
  }

  fecharEdicaoDadosMissao(): void {
    this.selectedMissaoDadosAdmin = null;
    this.missaoDadosForm.reset({
      localDestino: '',
      setorSolicitante: '',
      solicitanteNome: ''
    });
  }

  salvarDadosAdministrativosMissao(): void {
    const missao = this.selectedMissaoDadosAdmin;
    if (!missao) {
      return;
    }

    const raw = this.missaoDadosForm.getRawValue();
    this.adminService.atualizarDadosAdministrativosMissao(missao.id, {
      localDestino: this.toNullIfBlank(raw.localDestino),
      setorSolicitante: this.toNullIfBlank(raw.setorSolicitante),
      solicitanteNome: this.toNullIfBlank(raw.solicitanteNome)
    }).subscribe({
      next: (updated) => {
        this.missoes = this.missoes.map(item => item.id === updated.id ? updated : item);
        const idxTempoReal = this.missoesTempoReal.findIndex(item => item.id === updated.id);
        if (idxTempoReal >= 0) {
          this.missoesTempoReal = this.missoesTempoReal.map(item => item.id === updated.id ? updated : item);
        } else if (updated.status === 'ATIVA') {
          this.missoesTempoReal = [updated, ...this.missoesTempoReal];
        }
        if (this.selectedMissaoAuditoria?.id === updated.id) {
          this.selectedMissaoAuditoria = updated;
          this.abrirAuditoriaMissao(updated);
        }
        this.snackBar.open('Dados da missao atualizados.', 'Fechar', { duration: 2200 });
        this.fecharEdicaoDadosMissao();
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Falha ao atualizar os dados da missao.', 'Fechar', { duration: 3000 })
    });
  }

  acaoAuditoriaMissaoLabel(acao: AcaoAuditoriaMissao): string {
    const labels: Record<AcaoAuditoriaMissao, string> = {
      ABERTURA_CHECKLIST: 'INICIO: COM CHECKLIST',
      ABERTURA_SEM_CHECKLIST: 'INICIO: SEM CHECKLIST',
      ABERTURA_CONTINGENCIA_ADMIN: 'INICIO: PELO ADMIN',
      ABERTURA_LEGADO_RECONSTRUIDA: 'REGISTRO RECONSTRUIDO',
      ENCERRAMENTO_CHECKLIST: 'FIM: COM CHECKLIST',
      ENCERRAMENTO_SEM_CHECKLIST: 'FIM: SEM CHECKLIST',
      ENCERRAMENTO_PENDENTE_ADMIN: 'FIM: PELO ADMIN (MISSAO EM ABERTO)',
      ENCERRAMENTO_ADMINISTRATIVO: 'FIM: PELO ADMIN',
      ATUALIZACAO_DADOS_ADMINISTRATIVOS: 'DADOS DA MISSAO ATUALIZADOS'
    };
    return labels[acao];
  }

  duracaoTempoRealLabel(missao: MissaoResponse): string {
    if (missao.status !== 'ATIVA') {
      return this.formatarDuracaoMissao(missao.duracaoSegundos);
    }
    const inicioMs = new Date(missao.dataHoraInicio).getTime();
    if (Number.isNaN(inicioMs)) {
      return this.formatarDuracaoMissao(missao.duracaoSegundos);
    }
    const segundos = Math.max(0, Math.floor((this.agoraEpochMs - inicioMs) / 1000));
    return this.formatarDuracaoMissao(segundos);
  }

  formatarDuracaoMissao(segundos: number): string {
    if (!segundos || segundos < 60) {
      return `${Math.max(0, Math.floor(segundos || 0))} s`;
    }
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    if (horas > 0) {
      return `${horas} h ${minutos} min`;
    }
    return `${minutos} min`;
  }

  registrosComChecklist(): ConsultaChecklistItem[] {
    return this.consultaChecklist.filter(item => item.origem === 'CHECKLIST');
  }

  registrosSemChecklist(): ConsultaChecklistItem[] {
    return this.consultaChecklist.filter(item => item.origem === 'SEM_CHECKLIST');
  }

  classeLinhaConsultaChecklist(item: ConsultaChecklistItem): string {
    if (item.statusRegularizacao === 'ATRASADA') {
      return 'checklist-consulta-atrasada';
    }
    if (item.origem === 'SEM_CHECKLIST') {
      return 'checklist-consulta-sem-checklist';
    }
    if (!item.possuiFotos) {
      return 'checklist-consulta-sem-fotos';
    }
    return 'checklist-consulta-com-checklist';
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
      SEM_INTERNET: 'Sem internet',
      SEM_CELULAR: 'Sem celular',
      BATERIA_DESCARREGADA: 'Bateria descarregada',
      APP_INDISPONIVEL: 'App indisponivel',
      OUTROS: 'Outros'
    };
    return labels[motivo];
  }

  statusLabel(status: StatusVeiculo): string {
    return this.statusLabelsCustomizados[status]
      || this.statusLabelsPadrao[status]
      || status;
  }

  statusClass(status: StatusVeiculo): string {
    return `status-${status.toLowerCase()}`;
  }

  missaoAtivaPorVeiculo(veiculoId: number): MissaoResponse | null {
    return this.missoesTempoReal.find(m => m.veiculoId === veiculoId) || null;
  }

  missaoAtivaContingencia(veiculoId: number): boolean {
    return this.missaoAtivaPorVeiculo(veiculoId)?.origemAbertura === 'CONTINGENCIA_ADMIN';
  }

  motoristaEmMissao(veiculo: Veiculo): string {
    const missao = this.missaoAtivaPorVeiculo(veiculo.id);
    return missao?.motoristaNome || veiculo.motoristaAtualNome || '-';
  }

  inicioMissaoPainelLabel(veiculoId: number): string {
    const missao = this.missaoAtivaPorVeiculo(veiculoId);
    return missao ? this.formatarDataHora(missao.dataHoraInicio) : '-';
  }

  duracaoMissaoPainelLabel(veiculoId: number): string {
    const missao = this.missaoAtivaPorVeiculo(veiculoId);
    return missao ? this.duracaoTempoRealLabel(missao) : '-';
  }

  resumoDadosAdministrativosPainel(veiculoId: number): string {
    const missao = this.missaoAtivaPorVeiculo(veiculoId);
    const destino = this.valorPainelOuPendente(missao?.localDestino);
    const setor = this.valorPainelOuPendente(missao?.setorSolicitante);
    const solicitante = this.valorPainelOuPendente(missao?.solicitanteNome);
    return `Destino: ${destino} | Setor: ${setor} | Solicitante: ${solicitante}`;
  }

  logout(): void {
    this.authService.logout();
  }

  private toNullIfBlank(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private valorPainelOuPendente(value: string | null | undefined): string {
    const normalized = (value || '').trim();
    return normalized ? normalized : 'PENDENTE';
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
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private agoraDateTimeLocal(): string {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    const hora = String(agora.getHours()).padStart(2, '0');
    const minuto = String(agora.getMinutes()).padStart(2, '0');
    return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
  }

  private isAdminMenu(value: string | null): value is AdminMenu {
    return value === 'operacao'
      || value === 'veiculos'
      || value === 'motoristas'
      || value === 'rotulos-status'
      || value === 'missoes'
      || value === 'tempo-real'
      || value === 'checklists'
      || value === 'excecoes';
  }

  private isPainelCategoria(value: string | null): value is PainelCategoria {
    return value === 'DISPONIVEL'
      || value === 'MISSAO'
      || value === 'VIAGEM'
      || value === 'PATIO'
      || value === 'REALOCACAO'
      || value === 'OFICINA'
      || value === 'BLOQUEADO';
  }

  private sincronizarMenusAgrupados(menu: AdminMenu): void {
    if (menu === 'veiculos' || menu === 'motoristas' || menu === 'rotulos-status') {
      this.cadastrosMenuAtivo = menu;
      return;
    }
    if (menu === 'missoes' || menu === 'checklists') {
      this.controleMenuAtivo = menu;
    }
  }

  private garantirDadosBasicos(menu: AdminMenu): void {
    const precisaMotoristas = menu === 'motoristas'
      || menu === 'missoes'
      || menu === 'checklists';
    const precisaVeiculos = menu !== 'motoristas';

    if (precisaMotoristas && this.motoristas.length === 0 && !this.loadingMotoristas) {
      this.carregarMotoristas();
    }
    if (precisaVeiculos && this.veiculos.length === 0 && !this.loadingVeiculos) {
      this.carregarVeiculos();
    }
  }

  private carregarDadosDoMenu(menu: AdminMenu, force: boolean): void {
    if (menu === 'missoes' && (force || this.missoes.length === 0) && !this.loadingMissoes) {
      this.buscarMissoes();
      return;
    }
    if (menu === 'checklists' && (force || this.consultaChecklist.length === 0) && !this.loadingChecklists) {
      this.buscarChecklists();
      return;
    }
    if (menu === 'rotulos-status' && (force || this.rotulosStatusEditor.length === 0) && !this.loadingRotulosStatus) {
      this.carregarRotulosStatus();
      return;
    }
    if (menu === 'operacao' && (force || this.veiculos.length === 0) && !this.loadingVeiculos) {
      this.carregarVeiculos(this.veiculoBusca);
      this.carregarMissoesTempoReal(false);
      return;
    }
    if (menu === 'tempo-real' && (force || this.missoesTempoReal.length === 0) && !this.loadingTempoReal) {
      this.carregarMissoesTempoReal();
    }
  }

  private normalizarMenu(menu: AdminMenu): AdminMenu {
    if (menu === 'tempo-real') {
      return 'missoes';
    }
    if (menu === 'excecoes') {
      return 'checklists';
    }
    return menu;
  }

  private criarPainelVazio(): Record<PainelCategoria, Veiculo[]> {
    return {
      DISPONIVEL: [],
      MISSAO: [],
      VIAGEM: [],
      PATIO: [],
      REALOCACAO: [],
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
    // Em caso de conflito com status administrativo, missao ativa sempre prevalece no painel.
    if (veiculo.statusAutomatico === 'CIRCULANDO') {
      return 'MISSAO';
    }
    if (veiculo.statusAtual === 'BASE_JOAO_GOULART') {
      return 'DISPONIVEL';
    }
    if (veiculo.statusAtual === 'EM_VIAGEM') {
      return 'VIAGEM';
    }
    if (veiculo.statusAtual === 'NO_PATIO') {
      return 'PATIO';
    }
    if (veiculo.statusAtual === 'AGUARDANDO_REALOCACAO') {
      return 'REALOCACAO';
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
    if (categoria === 'REALOCACAO') {
      return 'AGUARDANDO_REALOCACAO';
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
      quantidadeFotos: c.fotos.length,
      statusRegularizacao: 'REGULARIZADA',
      checklist: c
    }));

    const registrosExcecao = excecoes.flatMap(excecao => this.mapearEventosExcecao(excecao))
      .filter(item => !tipoOperacaoFiltro || item.tipoOperacao === tipoOperacaoFiltro);

    return [...registrosChecklist, ...registrosExcecao]
      // Ordenacao lexical de ISO local evita interpretacao de fuso pelo browser.
      .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  }

  private filtrarConsultaChecklist(
    registros: ConsultaChecklistItem[],
    situacaoRegistro: SituacaoConsultaChecklist
  ): ConsultaChecklistItem[] {
    if (!situacaoRegistro) {
      return registros;
    }
    return registros.filter(item => item.statusRegularizacao === situacaoRegistro);
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
      quantidadeFotos: 0,
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
        quantidadeFotos: 0,
        statusRegularizacao: excecao.statusRegularizacao,
        excecao
      });
    }

    return eventos;
  }

  private iniciarRelogioTempoReal(): void {
    this.relogioSub?.unsubscribe();
    this.relogioSub = interval(1000).subscribe(() => {
      this.agoraEpochMs = Date.now();
    });
  }

  private iniciarAtualizacaoTempoReal(): void {
    this.pararAtualizacaoTempoReal();
    this.carregarMissoesTempoReal();
    this.refreshTempoRealSub = interval(15000).subscribe(() => this.carregarMissoesTempoReal());
  }

  private pararAtualizacaoTempoReal(): void {
    this.refreshTempoRealSub?.unsubscribe();
    this.refreshTempoRealSub = undefined;
  }

  private abrirConfirmacao(data: ConfirmDialogData, onConfirm: () => void): void {
    this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      width: 'min(92vw, 460px)',
      data
    })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          onConfirm();
        }
      });
  }

  private aplicarRotulosStatus(rotulos: RotuloStatusVeiculoResponse[]): void {
    this.rotulosStatusEditor = rotulos.map(item => ({ ...item }));
    for (const status of Object.keys(this.statusLabelsPadrao) as StatusVeiculo[]) {
      const item = rotulos.find(i => i.status === status);
      this.statusLabelsCustomizados[status] = item?.rotulo || this.statusLabelsPadrao[status];
    }
  }
}
