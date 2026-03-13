import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription, finalize, forkJoin, interval, of } from 'rxjs';
import { ChecklistResponse, TipoOperacao } from '../../core/models/checklist.model';
import {
  EventoHistoricoVeiculo,
  HistoricoVeiculoResponse,
  TipoEventoHistoricoVeiculo
} from '../../core/models/historico-veiculo.model';
import {
  AcaoAuditoriaMissao,
  AuditoriaMissaoResponse,
  MissaoResponse,
  OrigemAberturaMissao,
  OrigemEncerramentoMissao,
  StatusDocumentalMissao,
  StatusMissao
} from '../../core/models/missao.model';
import { SugestoesCamposMissaoResponse } from '../../core/models/missao-suggestion.model';
import { MissaoExcecaoResponse, MotivoExcecaoMissao, StatusExcecaoMissao } from '../../core/models/missao-excecao.model';
import { Motorista } from '../../core/models/motorista.model';
import { RotuloStatusVeiculoResponse } from '../../core/models/status-label.model';
import { StatusAdministrativoVeiculo, StatusVeiculo, TipoUsoExternoVeiculo, Veiculo } from '../../core/models/veiculo.model';
import { ResultadoVistoriaCompleta, VistoriaCompletaResponse } from '../../core/models/vistoria-completa.model';
import {
  AdminService,
  AjustarHorarioMissaoPayload,
  AtualizarContraparteVistoriaCompletaPayload,
  CriarMissaoContingenciaPayload,
  EditarMissaoManualPayload,
  EncerrarMissaoPendentePayload,
  RegistrarRetornoUsoExternoPayload,
  RegistrarVeiculoEmUsoExternoPayload,
  RegistrarVeiculoEmViagemPayload
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

type AdminMenu = 'operacao' | 'veiculos' | 'motoristas' | 'rotulos-status' | 'missoes' | 'tempo-real' | 'checklists' | 'vistorias-completas' | 'excecoes';
type CadastroMenu = 'veiculos' | 'motoristas' | 'rotulos-status';
type ControleMenu = 'missoes' | 'checklists' | 'vistorias-completas';
type PainelCategoria = 'DISPONIVEL' | 'MISSAO' | 'USO_EXTERNO' | 'VIAGEM' | 'PATIO' | 'REALOCACAO' | 'BLOQUEADO';
type OrigemConsultaChecklist = 'CHECKLIST' | 'SEM_CHECKLIST';
type SituacaoConsultaChecklist = '' | 'REGULARIZADA' | 'PENDENTE' | 'ATRASADA';
type CampoSugestaoMissaoEditor = 'destinos' | 'setoresSolicitantes' | 'solicitantes' | 'justificativasRegistroManual';
type FiltroHistoricoVeiculo = '' | 'MISSOES' | 'CHECKLISTS' | 'SEM_CHECKLIST' | 'VIAGENS' | 'USO_EXTERNO' | 'VISTORIAS' | 'STATUS';
type ModoHistoricoVeiculo = 'OPERACIONAL' | 'AUDITORIA';

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
    MatAutocompleteModule,
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
  vistoriasCompletas: VistoriaCompletaResponse[] = [];
  consultaChecklist: ConsultaChecklistItem[] = [];
  painelVeiculos = this.criarPainelVazio();

  loadingMotoristas = false;
  loadingVeiculos = false;
  loadingChecklists = false;
  loadingMissoes = false;
  loadingVistoriasCompletas = false;
  loadingTempoReal = false;
  loadingAuditoriaMissao = false;
  loadingHistoricoVeiculo = false;
  loadingRotulosStatus = false;
  loadingSugestoesMissao = false;
  gerandoRelatorioMissoes = false;
  salvandoRotulosStatus = false;
  salvandoContraparteVistoria = false;
  salvandoHorarioMissao = false;
  salvandoEdicaoMissaoManual = false;

  editingMotoristaId: number | null = null;
  editingVeiculoId: number | null = null;

  motoristaBusca = '';
  veiculoBusca = '';

  selectedChecklist: ChecklistResponse | null = null;
  selectedVistoriaCompleta: VistoriaCompletaResponse | null = null;
  selectedMissaoAuditoria: MissaoResponse | null = null;
  selectedMissaoDadosAdmin: MissaoResponse | null = null;
  selectedMissaoEdicaoManual: MissaoResponse | null = null;
  selectedMissaoHorario: MissaoResponse | null = null;
  selectedVeiculoHistorico: Veiculo | null = null;
  selectedCategoriaInclusao: PainelCategoria | null = null;
  veiculoInclusaoSelecionadoId: number | null = null;
  buscaInclusaoVeiculo = '';
  processandoInclusao = false;
  agoraEpochMs = Date.now();
  missoesTempoReal: MissaoResponse[] = [];
  auditoriaMissao: AuditoriaMissaoResponse[] = [];
  historicoVeiculo: HistoricoVeiculoResponse | null = null;
  eventoHistoricoSelecionado: EventoHistoricoVeiculo | null = null;
  rotulosStatusEditor: RotuloStatusVeiculoResponse[] = [];
  sugestoesMissaoEditor: SugestoesCamposMissaoResponse = {
    destinos: [],
    setoresSolicitantes: [],
    solicitantes: [],
    justificativasRegistroManual: []
  };
  novaSugestaoMissao: Record<CampoSugestaoMissaoEditor, string> = {
    destinos: '',
    setoresSolicitantes: '',
    solicitantes: '',
    justificativasRegistroManual: ''
  };
  dataRelatorioMissoes = this.hojeIso();
  showNovaMissaoModal = false;
  novaMissaoModo: 'CONTINGENCIA' | 'PENDENTE' = 'CONTINGENCIA';
  salvandoNovaMissaoContingencia = false;
  encerrandoMissaoPendente = false;
  salvandoRegistroViagem = false;
  salvandoRegistroUsoExterno = false;
  salvandoRetornoUsoExterno = false;
  glossarioMissoesAberto = false;
  glossarioChecklistsAberto = false;
  glossarioVistoriasAberto = false;
  filtrosVistoriasAbertos = false;
  contraparteVistoriaEdicao = '';
  showRegistroViagemModal = false;
  selectedVeiculoViagem: Veiculo | null = null;
  showRegistroUsoExternoModal = false;
  selectedVeiculoUsoExterno: Veiculo | null = null;
  showRetornoUsoExternoModal = false;
  selectedVeiculoRetornoUsoExterno: Veiculo | null = null;
  statusDestinoRetornoUsoExterno: StatusAdministrativoVeiculo | null = null;
  filtroHistoricoVeiculo: FiltroHistoricoVeiculo = '';
  filtroHistoricoSomenteComFotos = false;
  filtroHistoricoSomenteComAvarias = false;
  modoHistoricoVeiculo: ModoHistoricoVeiculo = 'OPERACIONAL';
  private relogioSub?: Subscription;
  private refreshTempoRealSub?: Subscription;

  readonly categoriasPainel: Array<{ id: PainelCategoria; titulo: string; descricao: string }> = [
    { id: 'DISPONIVEL', titulo: 'Disponiveis', descricao: 'Prontos para nova missao' },
    { id: 'MISSAO', titulo: 'Em missao', descricao: 'Veiculos com missao em andamento' },
    { id: 'PATIO', titulo: 'No patio', descricao: 'Parados no patio' },
    { id: 'VIAGEM', titulo: 'Em viagem', descricao: 'Veiculos em viagem pelo app ou pela administracao' },
    { id: 'REALOCACAO', titulo: 'Aguardando realocacao', descricao: 'Recebidos e aguardando definicao' },
    { id: 'USO_EXTERNO', titulo: 'Em uso externo', descricao: 'Entregues para uso fora do setor' },
    { id: 'BLOQUEADO', titulo: 'Bloqueados', descricao: 'Sem liberacao para uso' }
  ];
  readonly tiposUsoExterno: Array<{ value: TipoUsoExternoVeiculo; label: string }> = [
    { value: 'OFICINA', label: 'Oficina' },
    { value: 'LOCADORA', label: 'Locadora' },
    { value: 'LAVA_JATO', label: 'Lava-jato' },
    { value: 'OUTRA_SECRETARIA', label: 'Outra secretaria' },
    { value: 'FORNECEDOR', label: 'Fornecedor' },
    { value: 'OUTROS', label: 'Outros' }
  ];
  readonly filtrosHistoricoVeiculo: Array<{ value: FiltroHistoricoVeiculo; label: string }> = [
    { value: '', label: 'Todos os eventos' },
    { value: 'MISSOES', label: 'Missoes' },
    { value: 'CHECKLISTS', label: 'Checklists' },
    { value: 'SEM_CHECKLIST', label: 'Sem checklist' },
    { value: 'VIAGENS', label: 'Viagens' },
    { value: 'USO_EXTERNO', label: 'Uso externo' },
    { value: 'VISTORIAS', label: 'Vistorias completas' },
    { value: 'STATUS', label: 'Mudancas de status' }
  ];
  readonly filtrosHistoricoOperacional: FiltroHistoricoVeiculo[] = ['', 'MISSOES', 'VIAGENS', 'USO_EXTERNO', 'VISTORIAS', 'SEM_CHECKLIST'];
  readonly filtrosHistoricoAuditoria: FiltroHistoricoVeiculo[] = ['', 'MISSOES', 'CHECKLISTS', 'SEM_CHECKLIST', 'VIAGENS', 'USO_EXTERNO', 'VISTORIAS', 'STATUS'];
  readonly categoriasPainelIds: PainelCategoria[] = this.categoriasPainel.map(c => c.id);
  private readonly statusLabelsPadrao: Record<StatusVeiculo, string> = {
    CIRCULANDO: 'NA RUA (MISSAO)',
    BASE_JOAO_GOULART: 'DISPONIVEL',
    NO_PATIO: 'NO PATIO',
    AGUARDANDO_REALOCACAO: 'AGUARDANDO REALOCACAO',
    EM_USO_EXTERNO: 'EM USO EXTERNO',
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
    MANUAL: 'REGISTRO MANUAL',
    VIAGEM: 'VIAGEM'
  } as const;
  readonly glossarioMissoesBadges: GlossarioBadgeItem[] = [
    { termo: this.statusMissaoLabels.ATIVA, descricao: 'Missao em andamento, ainda sem finalizacao.', exemplo: 'Ex.: motorista saiu 13:12 e ainda nao registrou o fim.', classe: 'status-circulando' },
    { termo: this.statusMissaoLabels.FINALIZADA, descricao: 'Missao ja finalizada.', exemplo: 'Ex.: inicio 08:00 e fim 09:15 ja registrados.', classe: 'status-finalizada' },
    { termo: this.statusDocumentalMissaoLabels.PENDENTE_DADOS_ADMIN, descricao: 'Ainda faltam destino, setor ou solicitante.', exemplo: 'Ex.: destino foi informado, mas setor e solicitante ainda faltam.', classe: 'status-documental-pendente' },
    { termo: this.statusDocumentalMissaoLabels.DADOS_ADMIN_COMPLETOS, descricao: 'Destino, setor e solicitante ja foram preenchidos.', exemplo: 'Ex.: destino SEGET, setor ATOS e solicitante VAL ja informados.', classe: 'status-documental-ok' },
    { termo: this.tipoMissaoLabels.MANUAL, descricao: 'Missao registrada manualmente pela administracao.', exemplo: 'Ex.: administrador registrou a missao porque o celular descarregou.', classe: 'status-bloqueado' },
    { termo: this.tipoMissaoLabels.VIAGEM, descricao: 'Missao aberta como viagem, para deslocamentos fora da rotina urbana.', exemplo: 'Ex.: motorista iniciou uma viagem e o veiculo passou a aparecer em Em viagem.', classe: 'status-em_viagem' },
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
  readonly glossarioVistoriasBadges: GlossarioBadgeItem[] = [
    { termo: 'SAIDA', descricao: 'Vistoria registrada antes da entrega do veiculo para uso externo.', exemplo: 'Ex.: envio para oficina, locadora ou outra secretaria.', classe: 'status-circulando' },
    { termo: 'CHEGADA', descricao: 'Vistoria registrada no retorno do veiculo de uso externo.', exemplo: 'Ex.: veiculo voltou da oficina e foi recebido pelo transporte.', classe: 'status-no_patio' },
    { termo: 'APROVADO', descricao: 'Veiculo retornou ou saiu sem impedimento apontado na vistoria.', exemplo: 'Ex.: fotos e itens sem problema relevante.', classe: 'status-base_joao_goulart' },
    { termo: 'COM RESSALVA', descricao: 'Veiculo pode seguir, mas houve observacao ou avaria registrada.', exemplo: 'Ex.: pequeno risco ja existente, sem impedir o uso.', classe: 'status-oficina' },
    { termo: 'REPROVADO', descricao: 'A vistoria identificou problema que impede a liberacao normal.', exemplo: 'Ex.: item obrigatorio faltando ou avaria relevante.', classe: 'status-bloqueado' },
    { termo: 'EM USO EXTERNO', descricao: 'Depois da vistoria completa de saida, o veiculo fica marcado como entregue para uso fora do setor.', exemplo: 'Ex.: carro entregue para oficina, locadora ou outra secretaria.', classe: 'status-em_uso_externo' },
    { termo: 'AGUARDANDO REALOCACAO', descricao: 'Depois da vistoria completa de chegada, o veiculo volta e aguarda definicao do transporte.', exemplo: 'Ex.: veiculo recebido de volta e aguardando novo destino interno.', classe: 'status-aguardando_realocacao' }
  ];
  readonly glossarioVistoriasCampos: GlossarioItem[] = [
    { termo: 'Quilometragem', descricao: 'Quilometragem informada no momento da vistoria.' },
    { termo: 'Localizacao', descricao: 'Posicao capturada pelo celular, quando disponivel.' },
    { termo: 'Itens faltando', descricao: 'Quantidade de itens obrigatorios marcados como faltando.' },
    { termo: 'Avarias', descricao: 'Quantidade de avarias registradas na vistoria.' },
    { termo: 'Ver detalhes', descricao: 'Abre itens, avarias e fotos completas daquela vistoria.' }
  ];
  readonly camposSugestaoMissao: Array<{ key: CampoSugestaoMissaoEditor; titulo: string; placeholder: string }> = [
    { key: 'destinos', titulo: 'Destino', placeholder: 'Adicionar destino' },
    { key: 'setoresSolicitantes', titulo: 'Setor solicitante', placeholder: 'Adicionar setor' },
    { key: 'solicitantes', titulo: 'Quem solicitou', placeholder: 'Adicionar solicitante' },
    { key: 'justificativasRegistroManual', titulo: 'Justificativas manuais (registro e encerramento)', placeholder: 'Adicionar frase pronta para registro ou encerramento' }
  ];

  readonly motoristaForm;
  readonly veiculoForm;
  readonly filtroForm;
  readonly missaoFiltroForm;
  readonly vistoriaCompletaFiltroForm;
  readonly missaoDadosForm;
  readonly missaoEdicaoManualForm;
  readonly missaoHorarioForm;
  readonly missaoContingenciaForm;
  readonly missaoPendenteForm;
  readonly viagemForm;
  readonly usoExternoForm;
  readonly retornoUsoExternoForm;

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

    this.vistoriaCompletaFiltroForm = this.fb.nonNullable.group({
      busca: [''],
      motoristaId: [0],
      veiculoId: [0],
      tipoOperacao: ['' as '' | TipoOperacao],
      resultado: ['' as '' | ResultadoVistoriaCompleta],
      dataInicio: [hoje],
      dataFim: [hoje]
    });

    this.missaoDadosForm = this.fb.nonNullable.group({
      localDestino: [''],
      setorSolicitante: [''],
      solicitanteNome: ['']
    });

    this.missaoEdicaoManualForm = this.fb.nonNullable.group({
      motoristaId: [0, [Validators.min(1)]],
      veiculoId: [0, [Validators.min(1)]],
      dataHoraInicio: [this.agoraDateTimeLocal(), [Validators.required]],
      dataHoraFim: [this.agoraDateTimeLocal()],
      justificativaAbertura: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(700)]],
      justificativaEncerramento: ['', [Validators.maxLength(700)]],
      localDestino: [''],
      setorSolicitante: [''],
      solicitanteNome: [''],
      justificativaEdicao: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(700)]]
    });

    this.missaoHorarioForm = this.fb.nonNullable.group({
      dataHoraInicio: [this.agoraDateTimeLocal(), [Validators.required]],
      dataHoraFim: [this.agoraDateTimeLocal()],
      justificativa: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(700)]]
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

    this.viagemForm = this.fb.nonNullable.group({
      motoristaId: [0, [Validators.min(1)]],
      localDestino: ['', [Validators.required, Validators.maxLength(180)]],
      dataHoraSaida: [this.agoraDateTimeLocal(), [Validators.required]],
      observacao: ['', [Validators.maxLength(700)]]
    });

    this.usoExternoForm = this.fb.nonNullable.group({
      nomeEntreguePara: ['', [Validators.required, Validators.maxLength(180)]],
      tipoUsoExterno: ['OUTROS' as TipoUsoExternoVeiculo, [Validators.required]],
      dataHoraSaida: [this.agoraDateTimeLocal(), [Validators.required]],
      observacao: ['', [Validators.maxLength(700)]],
      justificativaSemVistoria: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(700)]]
    });

    this.retornoUsoExternoForm = this.fb.nonNullable.group({
      nomeRecebidoDe: ['', [Validators.required, Validators.maxLength(180)]],
      dataHoraRetorno: [this.agoraDateTimeLocal(), [Validators.required]],
      observacao: ['', [Validators.maxLength(700)]],
      justificativaSemVistoria: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(700)]]
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
    if (this.activeMenu === 'tempo-real' || this.activeMenu === 'operacao') {
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
      this.fecharEdicaoManualMissao();
      this.fecharAjusteHorarioMissao();
      if (this.showNovaMissaoModal) {
        this.fecharNovaMissao();
      }
    }
    if (menu !== 'checklists') {
      this.filtrosAbertos = false;
    }
    if (menu !== 'vistorias-completas') {
      this.filtrosVistoriasAbertos = false;
      this.selectedVistoriaCompleta = null;
    }

    this.garantirDadosBasicos(menu);
    if (menu !== 'tempo-real') {
      this.carregarDadosDoMenu(menu, false);
    }
    if (menu === 'operacao') {
      this.carregarMissoesTempoReal(false);
    }

    if (menu === 'tempo-real' || menu === 'operacao') {
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

  toggleFiltrosVistorias(): void {
    this.filtrosVistoriasAbertos = !this.filtrosVistoriasAbertos;
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
      || this.activeMenu === 'checklists'
      || this.activeMenu === 'vistorias-completas';
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
    this.loadingSugestoesMissao = true;
    forkJoin({
      rotulos: this.adminService.listarRotulosStatusVeiculo(),
      sugestoes: this.adminService.listarSugestoesCamposMissao()
    })
      .pipe(finalize(() => {
        this.loadingRotulosStatus = false;
        this.loadingSugestoesMissao = false;
      }))
      .subscribe({
        next: ({ rotulos, sugestoes }) => {
          this.aplicarRotulosStatus(rotulos);
          this.aplicarSugestoesMissao(sugestoes);
        },
        error: () => {
          if (showError) {
            this.snackBar.open('Falha ao carregar rotulos e sugestoes.', 'Fechar', { duration: 2800 });
          }
        }
      });
  }

  salvarRotulosStatus(): void {
    if (this.rotulosStatusEditor.length === 0 && this.totalSugestoesMissao() === 0) {
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
    forkJoin({
      rotulos: this.adminService.salvarRotulosStatusVeiculo(payload),
      sugestoes: this.adminService.salvarSugestoesCamposMissao(this.sugestoesMissaoEditor)
    })
      .pipe(finalize(() => (this.salvandoRotulosStatus = false)))
      .subscribe({
        next: ({ rotulos, sugestoes }) => {
          this.aplicarRotulosStatus(rotulos);
          this.aplicarSugestoesMissao(sugestoes);
          this.snackBar.open('Rotulos e sugestoes atualizados.', 'Fechar', { duration: 2200 });
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Falha ao salvar configuracoes.', 'Fechar', { duration: 3200 })
      });
  }

  restaurarRotuloPadrao(item: RotuloStatusVeiculoResponse): void {
    item.rotulo = item.rotuloPadrao;
  }

  adicionarSugestaoMissao(campo: CampoSugestaoMissaoEditor): void {
    const valor = (this.novaSugestaoMissao[campo] || '').trim();
    if (!valor) {
      return;
    }

    const maximo = this.tamanhoMaximoSugestaoMissao(campo);
    if (valor.length > maximo) {
      this.snackBar.open(`Valor deve ter no maximo ${maximo} caracteres.`, 'Fechar', { duration: 2400 });
      return;
    }

    const jaExiste = this.sugestoesMissaoEditor[campo]
      .some(item => item.toUpperCase() === valor.toUpperCase());
    if (jaExiste) {
      this.snackBar.open('Sugestao ja cadastrada nesta lista.', 'Fechar', { duration: 2200 });
      return;
    }

    this.sugestoesMissaoEditor = {
      ...this.sugestoesMissaoEditor,
      [campo]: [...this.sugestoesMissaoEditor[campo], valor].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
    };
    this.novaSugestaoMissao[campo] = '';
  }

  removerSugestaoMissao(campo: CampoSugestaoMissaoEditor, valor: string): void {
    this.sugestoesMissaoEditor = {
      ...this.sugestoesMissaoEditor,
      [campo]: this.sugestoesMissaoEditor[campo].filter(item => item !== valor)
    };
  }

  sugestoesFiltradasMissao(campo: CampoSugestaoMissaoEditor, termo: string | null | undefined): string[] {
    const valor = (termo || '').trim().toUpperCase();
    return this.sugestoesMissaoEditor[campo].filter(item => item.toUpperCase().includes(valor));
  }

  totalSugestoesMissao(): number {
    return this.sugestoesMissaoEditor.destinos.length
      + this.sugestoesMissaoEditor.setoresSolicitantes.length
      + this.sugestoesMissaoEditor.solicitantes.length
      + this.sugestoesMissaoEditor.justificativasRegistroManual.length;
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

    if (this.veiculoComDeslocamentoAutomatico(veiculo)) {
      this.snackBar.open('Veiculo com missao em andamento nao pode ser movido manualmente de coluna.', 'Fechar', { duration: 3200 });
      return;
    }

    if (categoriaOrigem === 'USO_EXTERNO' && categoriaDestino === 'VIAGEM') {
      this.snackBar.open('Receba o veiculo do uso externo antes de registrar uma nova viagem.', 'Fechar', { duration: 3200 });
      return;
    }

    if (categoriaDestino === 'VIAGEM') {
      this.abrirRegistroViagem(veiculo);
      return;
    }

    if (categoriaDestino === 'USO_EXTERNO') {
      this.abrirRegistroUsoExterno(veiculo);
      return;
    }

    if (categoriaOrigem === 'USO_EXTERNO') {
      this.abrirRetornoUsoExterno(veiculo, categoriaDestino);
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
    const mensagemBase = `${origemLabel} -> ${destinoLabel}\nNovo status: ${statusDestinoLabel}`;
    const mensagem = veiculo.statusAtual === 'EM_VIAGEM'
      ? `${mensagemBase}\nO registro de viagem em aberto sera encerrado automaticamente.`
      : mensagemBase;

    this.abrirConfirmacao({
      title: `Movimentar ${veiculo.placa}`,
      message: mensagem,
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

    if (this.selectedCategoriaInclusao === 'VIAGEM') {
      this.fecharInclusaoCategoria();
      this.abrirRegistroViagem(veiculo);
      return;
    }

    if (this.selectedCategoriaInclusao === 'USO_EXTERNO') {
      this.fecharInclusaoCategoria();
      this.abrirRegistroUsoExterno(veiculo);
      return;
    }

    if (veiculo.statusAtual === 'EM_USO_EXTERNO') {
      const categoriaDestino = this.selectedCategoriaInclusao;
      this.fecharInclusaoCategoria();
      this.abrirRetornoUsoExterno(veiculo, categoriaDestino);
      return;
    }

    const novoStatus = this.statusAdministrativoAlvoPorCategoria(this.selectedCategoriaInclusao);
    if (novoStatus === undefined) {
      this.snackBar.open('Categoria sem alteracao administrativa manual.', 'Fechar', { duration: 2400 });
      return;
    }

    const atualLabel = veiculo.statusAdministrativo ? this.statusLabel(veiculo.statusAdministrativo) : 'AUTOMATICO';
    const destinoLabel = novoStatus ? this.statusLabel(novoStatus) : 'DISPONIVEL (AUTOMATICO)';
    const mensagemBase = `${atualLabel} -> ${destinoLabel}`;
    const mensagem = veiculo.statusAtual === 'EM_VIAGEM'
      ? `${mensagemBase}\nO registro de viagem em aberto sera encerrado automaticamente.`
      : mensagemBase;
    this.abrirConfirmacao({
      title: `Alterar status de ${veiculo.placa}`,
      message: mensagem,
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

  abrirHistoricoVeiculo(veiculo: Veiculo): void {
    this.selectedVeiculoHistorico = veiculo;
    this.historicoVeiculo = null;
    this.eventoHistoricoSelecionado = null;
    this.modoHistoricoVeiculo = 'OPERACIONAL';
    this.filtroHistoricoVeiculo = '';
    this.filtroHistoricoSomenteComFotos = false;
    this.filtroHistoricoSomenteComAvarias = false;
    this.loadingHistoricoVeiculo = true;
    this.adminService.buscarHistoricoVeiculo(veiculo.id)
      .pipe(finalize(() => (this.loadingHistoricoVeiculo = false)))
      .subscribe({
        next: data => {
          this.historicoVeiculo = data;
          this.selecionarPrimeiroEventoHistoricoDisponivel();
        },
        error: () => this.snackBar.open('Falha ao carregar historico.', 'Fechar', { duration: 2800 })
      });
  }

  fecharHistoricoVeiculo(): void {
    this.selectedVeiculoHistorico = null;
    this.historicoVeiculo = null;
    this.eventoHistoricoSelecionado = null;
    this.modoHistoricoVeiculo = 'OPERACIONAL';
  }

  abrirRegistroViagem(veiculo: Veiculo): void {
    this.selectedVeiculoViagem = veiculo;
    this.showRegistroViagemModal = true;
    this.viagemForm.reset({
      motoristaId: veiculo.viagemMotoristaId || veiculo.motoristaAtualId || 0,
      localDestino: veiculo.viagemLocalDestino || '',
      dataHoraSaida: this.agoraDateTimeLocal(),
      observacao: veiculo.viagemObservacao || ''
    });
    if (this.motoristas.length === 0) {
      this.carregarMotoristas();
    }
  }

  fecharRegistroViagem(): void {
    this.showRegistroViagemModal = false;
    this.selectedVeiculoViagem = null;
    this.viagemForm.reset({
      motoristaId: 0,
      localDestino: '',
      dataHoraSaida: this.agoraDateTimeLocal(),
      observacao: ''
    });
  }

  salvarRegistroViagem(): void {
    if (!this.selectedVeiculoViagem) {
      return;
    }
    if (this.viagemForm.invalid) {
      this.viagemForm.markAllAsTouched();
      return;
    }

    const raw = this.viagemForm.getRawValue();
    const payload: RegistrarVeiculoEmViagemPayload = {
      motoristaId: raw.motoristaId,
      localDestino: raw.localDestino.trim(),
      dataHoraSaida: raw.dataHoraSaida,
      observacao: this.toNullIfBlank(raw.observacao)
    };

    this.salvandoRegistroViagem = true;
    this.adminService.registrarVeiculoEmViagem(this.selectedVeiculoViagem.id, payload)
      .pipe(finalize(() => (this.salvandoRegistroViagem = false)))
      .subscribe({
        next: () => {
          const historicoAbertoParaMesmoVeiculo = this.selectedVeiculoHistorico?.id === this.selectedVeiculoViagem?.id;
          this.snackBar.open('Registro de viagem salvo com sucesso.', 'Fechar', { duration: 2400 });
          const veiculoHistorico = this.selectedVeiculoHistorico;
          this.fecharRegistroViagem();
          this.carregarVeiculos(this.veiculoBusca);
          if (historicoAbertoParaMesmoVeiculo && veiculoHistorico) {
            this.abrirHistoricoVeiculo(veiculoHistorico);
          }
        },
        error: err => this.snackBar.open(err.error?.message || 'Falha ao registrar a viagem.', 'Fechar', { duration: 3200 })
      });
  }

  abrirRegistroUsoExterno(veiculo: Veiculo): void {
    this.selectedVeiculoUsoExterno = veiculo;
    this.showRegistroUsoExternoModal = true;
    this.usoExternoForm.reset({
      nomeEntreguePara: veiculo.usoExternoEntreguePara || '',
      tipoUsoExterno: (veiculo.usoExternoTipo || 'OUTROS') as TipoUsoExternoVeiculo,
      dataHoraSaida: this.agoraDateTimeLocal(),
      observacao: veiculo.usoExternoObservacaoSaida || '',
      justificativaSemVistoria: ''
    });
  }

  fecharRegistroUsoExterno(): void {
    this.showRegistroUsoExternoModal = false;
    this.selectedVeiculoUsoExterno = null;
    this.usoExternoForm.reset({
      nomeEntreguePara: '',
      tipoUsoExterno: 'OUTROS' as TipoUsoExternoVeiculo,
      dataHoraSaida: this.agoraDateTimeLocal(),
      observacao: '',
      justificativaSemVistoria: ''
    });
  }

  salvarRegistroUsoExterno(): void {
    if (!this.selectedVeiculoUsoExterno) {
      return;
    }
    if (this.usoExternoForm.invalid) {
      this.usoExternoForm.markAllAsTouched();
      return;
    }

    const raw = this.usoExternoForm.getRawValue();
    const payload: RegistrarVeiculoEmUsoExternoPayload = {
      nomeEntreguePara: raw.nomeEntreguePara.trim(),
      tipoUsoExterno: raw.tipoUsoExterno,
      dataHoraSaida: raw.dataHoraSaida,
      observacao: this.toNullIfBlank(raw.observacao),
      justificativaSemVistoria: raw.justificativaSemVistoria.trim()
    };

    this.salvandoRegistroUsoExterno = true;
    this.adminService.registrarVeiculoEmUsoExterno(this.selectedVeiculoUsoExterno.id, payload)
      .pipe(finalize(() => (this.salvandoRegistroUsoExterno = false)))
      .subscribe({
        next: () => {
          const historicoAbertoParaMesmoVeiculo = this.selectedVeiculoHistorico?.id === this.selectedVeiculoUsoExterno?.id;
          const veiculoHistorico = this.selectedVeiculoHistorico;
          this.snackBar.open('Uso externo registrado com sucesso.', 'Fechar', { duration: 2400 });
          this.fecharRegistroUsoExterno();
          this.carregarVeiculos(this.veiculoBusca);
          if (historicoAbertoParaMesmoVeiculo && veiculoHistorico) {
            this.abrirHistoricoVeiculo(veiculoHistorico);
          }
        },
        error: err => this.snackBar.open(err.error?.message || 'Falha ao registrar o uso externo.', 'Fechar', { duration: 3200 })
      });
  }

  abrirRetornoUsoExterno(veiculo: Veiculo, categoriaDestino: PainelCategoria): void {
    const statusDestino = this.statusAdministrativoAlvoPorCategoria(categoriaDestino);
    if (categoriaDestino === 'VIAGEM') {
      this.snackBar.open('Receba o veiculo do uso externo antes de registrar uma viagem.', 'Fechar', { duration: 3200 });
      return;
    }
    if (statusDestino === undefined) {
      this.snackBar.open('Nao foi possivel definir o status de retorno do uso externo.', 'Fechar', { duration: 2800 });
      return;
    }
    this.selectedVeiculoRetornoUsoExterno = veiculo;
    this.statusDestinoRetornoUsoExterno = statusDestino;
    this.showRetornoUsoExternoModal = true;
    this.retornoUsoExternoForm.reset({
      nomeRecebidoDe: '',
      dataHoraRetorno: this.agoraDateTimeLocal(),
      observacao: '',
      justificativaSemVistoria: ''
    });
  }

  fecharRetornoUsoExterno(): void {
    this.showRetornoUsoExternoModal = false;
    this.selectedVeiculoRetornoUsoExterno = null;
    this.statusDestinoRetornoUsoExterno = null;
    this.retornoUsoExternoForm.reset({
      nomeRecebidoDe: '',
      dataHoraRetorno: this.agoraDateTimeLocal(),
      observacao: '',
      justificativaSemVistoria: ''
    });
  }

  salvarRetornoUsoExterno(): void {
    if (!this.selectedVeiculoRetornoUsoExterno) {
      return;
    }
    if (this.retornoUsoExternoForm.invalid) {
      this.retornoUsoExternoForm.markAllAsTouched();
      return;
    }

    const raw = this.retornoUsoExternoForm.getRawValue();
    const payload: RegistrarRetornoUsoExternoPayload = {
      statusAdministrativoDestino: this.statusDestinoRetornoUsoExterno,
      nomeRecebidoDe: raw.nomeRecebidoDe.trim(),
      dataHoraRetorno: raw.dataHoraRetorno,
      observacao: this.toNullIfBlank(raw.observacao),
      justificativaSemVistoria: raw.justificativaSemVistoria.trim()
    };

    this.salvandoRetornoUsoExterno = true;
    this.adminService.registrarRetornoUsoExterno(this.selectedVeiculoRetornoUsoExterno.id, payload)
      .pipe(finalize(() => (this.salvandoRetornoUsoExterno = false)))
      .subscribe({
        next: () => {
          const historicoAbertoParaMesmoVeiculo = this.selectedVeiculoHistorico?.id === this.selectedVeiculoRetornoUsoExterno?.id;
          const veiculoHistorico = this.selectedVeiculoHistorico;
          this.snackBar.open('Retorno do uso externo registrado com sucesso.', 'Fechar', { duration: 2400 });
          this.fecharRetornoUsoExterno();
          this.carregarVeiculos(this.veiculoBusca);
          if (historicoAbertoParaMesmoVeiculo && veiculoHistorico) {
            this.abrirHistoricoVeiculo(veiculoHistorico);
          }
        },
        error: err => this.snackBar.open(err.error?.message || 'Falha ao registrar o retorno do uso externo.', 'Fechar', { duration: 3200 })
      });
  }

  eventosHistoricoFiltrados(): EventoHistoricoVeiculo[] {
    const eventos = this.eventosHistoricoBase();
    return eventos.filter(evento => {
      if (this.filtroHistoricoVeiculo && !this.eventoHistoricoCorrespondeAoFiltro(evento, this.filtroHistoricoVeiculo)) {
        return false;
      }
      if (this.filtroHistoricoSomenteComFotos && !evento.possuiFotos) {
        return false;
      }
      if (this.filtroHistoricoSomenteComAvarias && !evento.possuiAvarias) {
        return false;
      }
      return true;
    });
  }

  selecionarEventoHistorico(evento: EventoHistoricoVeiculo): void {
    this.eventoHistoricoSelecionado = evento;
  }

  aplicarFiltroHistoricoVeiculo(): void {
    if (!this.filtroHistoricoDisponivel(this.filtroHistoricoVeiculo)) {
      this.filtroHistoricoVeiculo = '';
    }
    const eventos = this.eventosHistoricoFiltrados();
    if (!this.eventoHistoricoSelecionado) {
      this.eventoHistoricoSelecionado = eventos[0] || null;
      return;
    }
    const aindaVisivel = eventos.some(item => item.idExibicao === this.eventoHistoricoSelecionado?.idExibicao);
    if (!aindaVisivel) {
      this.eventoHistoricoSelecionado = eventos[0] || null;
    }
  }

  alternarModoHistoricoVeiculo(modo: ModoHistoricoVeiculo): void {
    if (this.modoHistoricoVeiculo === modo) {
      return;
    }
    this.modoHistoricoVeiculo = modo;
    if (!this.filtroHistoricoDisponivel(this.filtroHistoricoVeiculo)) {
      this.filtroHistoricoVeiculo = '';
    }
    this.aplicarFiltroHistoricoVeiculo();
  }

  filtrosHistoricoDisponiveis(): Array<{ value: FiltroHistoricoVeiculo; label: string }> {
    const permitidos = this.modoHistoricoVeiculo === 'OPERACIONAL'
      ? this.filtrosHistoricoOperacional
      : this.filtrosHistoricoAuditoria;
    return this.filtrosHistoricoVeiculo.filter(item => permitidos.includes(item.value));
  }

  resumoOperacionalEvento(evento: EventoHistoricoVeiculo): string {
    if (evento.tipo === 'MISSAO_INICIADA' || evento.tipo === 'MISSAO_FINALIZADA') {
      const destino = evento.detalhe?.localDestino || '-';
      const setor = evento.detalhe?.setorSolicitante || '-';
      const solicitante = evento.detalhe?.solicitanteNome || '-';
      return `Destino: ${destino} | Setor: ${setor} | Solicitante: ${solicitante}`;
    }
    if (evento.tipo === 'VIAGEM_INICIADA' || evento.tipo === 'VIAGEM_FINALIZADA') {
      return `Destino: ${evento.detalhe?.localDestino || '-'}`;
    }
    if (evento.tipo === 'USO_EXTERNO_INICIADO' || evento.tipo === 'USO_EXTERNO_FINALIZADO') {
      const contraparte = evento.detalhe?.nomeContraparte || '-';
      return evento.tipo === 'USO_EXTERNO_INICIADO' ? `Entregue para: ${contraparte}` : `Recebido de: ${contraparte}`;
    }
    return this.descricaoEventoHistorico(evento) || '-';
  }

  eventoEhUsoExterno(evento: EventoHistoricoVeiculo): boolean {
    return evento.tipo === 'USO_EXTERNO_INICIADO' || evento.tipo === 'USO_EXTERNO_FINALIZADO';
  }

  historicoVeiculoBadgePrincipal(evento: EventoHistoricoVeiculo): string {
    switch (evento.tipo) {
      case 'MISSAO_INICIADA':
      case 'MISSAO_FINALIZADA':
      case 'MISSAO_HORARIO_AJUSTADO':
      case 'MISSAO_EDITADA_ADMIN':
        return 'MISSAO';
      case 'CHECKLIST_SAIDA':
      case 'CHECKLIST_CHEGADA':
        return 'CHECKLIST';
      case 'EXCECAO_ABERTA':
      case 'EXCECAO_REGULARIZADA':
        return 'SEM CHECKLIST';
      case 'VIAGEM_INICIADA':
      case 'VIAGEM_FINALIZADA':
        return 'VIAGEM';
      case 'USO_EXTERNO_INICIADO':
      case 'USO_EXTERNO_FINALIZADO':
        return 'USO EXTERNO';
      case 'VISTORIA_COMPLETA_SAIDA':
      case 'VISTORIA_COMPLETA_CHEGADA':
        return 'VISTORIA COMPLETA';
      case 'STATUS_ALTERADO':
        return 'STATUS';
    }
  }

  historicoVeiculoBadgeSecundaria(evento: EventoHistoricoVeiculo): string | null {
    switch (evento.tipo) {
      case 'MISSAO_INICIADA':
        return evento.detalhe?.origemAberturaMissao ? this.origemAberturaMissaoLabel(evento.detalhe.origemAberturaMissao) : null;
      case 'MISSAO_FINALIZADA':
        return evento.detalhe?.origemEncerramentoMissao ? this.origemEncerramentoMissaoLabel(evento.detalhe.origemEncerramentoMissao) : null;
      case 'MISSAO_HORARIO_AJUSTADO':
        return 'HORARIO AJUSTADO';
      case 'MISSAO_EDITADA_ADMIN':
        return 'DADOS AJUSTADOS';
      case 'CHECKLIST_SAIDA':
      case 'VISTORIA_COMPLETA_SAIDA':
        return 'SAIDA';
      case 'CHECKLIST_CHEGADA':
      case 'VISTORIA_COMPLETA_CHEGADA':
        return 'CHEGADA';
      case 'EXCECAO_ABERTA':
        return 'PENDENTE';
      case 'EXCECAO_REGULARIZADA':
        return 'REGULARIZADA';
      case 'VIAGEM_INICIADA':
        return 'INICIO';
      case 'VIAGEM_FINALIZADA':
        return 'RETORNO';
      case 'USO_EXTERNO_INICIADO':
        return 'SAIDA';
      case 'USO_EXTERNO_FINALIZADO':
        return 'RETORNO';
      case 'STATUS_ALTERADO':
        return evento.detalhe?.statusNovo ? this.statusLabel(evento.detalhe.statusNovo) : null;
    }
  }

  historicoVeiculoBadgeClasse(evento: EventoHistoricoVeiculo): string {
    switch (evento.tipo) {
      case 'MISSAO_INICIADA':
      case 'MISSAO_FINALIZADA':
      case 'MISSAO_HORARIO_AJUSTADO':
      case 'MISSAO_EDITADA_ADMIN':
        return 'status-circulando';
      case 'CHECKLIST_SAIDA':
      case 'CHECKLIST_CHEGADA':
        return 'status-base_joao_goulart';
      case 'EXCECAO_ABERTA':
      case 'EXCECAO_REGULARIZADA':
        return 'status-oficina';
      case 'VIAGEM_INICIADA':
      case 'VIAGEM_FINALIZADA':
        return 'status-em_viagem';
      case 'USO_EXTERNO_INICIADO':
      case 'USO_EXTERNO_FINALIZADO':
        return 'status-em_uso_externo';
      case 'VISTORIA_COMPLETA_SAIDA':
      case 'VISTORIA_COMPLETA_CHEGADA':
        return 'status-em_uso_externo';
      case 'STATUS_ALTERADO':
        return 'status-aguardando_realocacao';
    }
  }

  historicoVeiculoBadgeSecundariaClasse(evento: EventoHistoricoVeiculo): string {
    if (evento.tipo === 'STATUS_ALTERADO' && evento.detalhe?.statusNovo) {
      return this.statusClass(evento.detalhe.statusNovo);
    }
    if (evento.tipo === 'VIAGEM_INICIADA' || evento.tipo === 'VIAGEM_FINALIZADA') {
      return 'status-em_viagem';
    }
    if (evento.tipo === 'USO_EXTERNO_FINALIZADO' && evento.detalhe?.statusNovo) {
      return this.statusClass(evento.detalhe.statusNovo);
    }
    if (evento.tipo === 'USO_EXTERNO_INICIADO' || evento.tipo === 'USO_EXTERNO_FINALIZADO') {
      return 'status-em_uso_externo';
    }
    if (evento.tipo === 'CHECKLIST_CHEGADA' || evento.tipo === 'VISTORIA_COMPLETA_CHEGADA') {
      return 'status-no_patio';
    }
    if (evento.tipo === 'EXCECAO_ABERTA') {
      return 'status-documental-pendente';
    }
    if (evento.tipo === 'EXCECAO_REGULARIZADA') {
      return 'status-documental-ok';
    }
    return 'status-base_joao_goulart';
  }

  descricaoEventoHistorico(evento: EventoHistoricoVeiculo): string {
    if (evento.tipo === 'STATUS_ALTERADO' && evento.detalhe?.statusAnterior && evento.detalhe.statusNovo) {
      return `De: ${this.statusLabel(evento.detalhe.statusAnterior)} | Para: ${this.statusLabel(evento.detalhe.statusNovo)}`;
    }
    return evento.descricao || '-';
  }

  motoristaViagemLabel(veiculo: Veiculo): string {
    return veiculo.viagemMotoristaNome || '-';
  }

  destinoViagemLabel(veiculo: Veiculo): string {
    return veiculo.viagemLocalDestino || '-';
  }

  contraparteUsoExternoLabel(veiculo: Veiculo): string {
    return veiculo.usoExternoEntreguePara || '-';
  }

  tipoUsoExternoLabel(tipo: TipoUsoExternoVeiculo | string | null | undefined): string {
    return this.tiposUsoExterno.find(item => item.value === tipo)?.label || '-';
  }

  destinoRetornoUsoExternoLabel(): string {
    if (this.statusDestinoRetornoUsoExterno === null) {
      return 'DISPONIVEL';
    }
    return this.statusLabel(this.statusDestinoRetornoUsoExterno);
  }

  desativarVeiculo(veiculo: Veiculo): void {
    if (veiculo.desativado) {
      return;
    }
    this.abrirConfirmacao({
      title: 'Dar baixa/desativar veiculo',
      message: `Deseja baixar/desativar o veiculo ${veiculo.placa}?`,
      confirmText: 'Dar baixa',
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

  buscarVistoriasCompletas(): void {
    this.loadingVistoriasCompletas = true;
    const raw = this.vistoriaCompletaFiltroForm.getRawValue();
    this.adminService.listarVistoriasCompletas({
      busca: raw.busca || undefined,
      motoristaId: raw.motoristaId > 0 ? raw.motoristaId : undefined,
      veiculoId: raw.veiculoId > 0 ? raw.veiculoId : undefined,
      tipoOperacao: raw.tipoOperacao || undefined,
      resultado: raw.resultado || undefined,
      dataInicio: raw.dataInicio || undefined,
      dataFim: raw.dataFim || undefined
    })
      .pipe(finalize(() => (this.loadingVistoriasCompletas = false)))
      .subscribe({
        next: data => (this.vistoriasCompletas = data),
        error: () => this.snackBar.open('Falha ao carregar vistorias completas.', 'Fechar', { duration: 3000 })
      });
  }

  carregarMissoesTempoReal(showError = true): void {
    this.loadingTempoReal = true;
    this.adminService.listarMissoes({ status: 'ATIVA' })
      .pipe(finalize(() => (this.loadingTempoReal = false)))
      .subscribe({
        next: data => {
          this.missoesTempoReal = data;
          if (this.activeMenu === 'operacao' && !this.loadingVeiculos) {
            this.carregarVeiculos(this.veiculoBusca);
          }
        },
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

  limparFiltrosVistoriasCompletas(): void {
    const hoje = this.hojeIso();
    this.vistoriaCompletaFiltroForm.reset({
      busca: '',
      motoristaId: 0,
      veiculoId: 0,
      tipoOperacao: '',
      resultado: '',
      dataInicio: hoje,
      dataFim: hoje
    });
    this.buscarVistoriasCompletas();
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

  totalVeiculosEmUsoExterno(): number {
    return this.veiculosDaCategoria('USO_EXTERNO').length;
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

  private veiculoEmMissaoAtual(veiculo: Veiculo): boolean {
    return veiculo.statusAtual === 'CIRCULANDO';
  }

  private veiculoComDeslocamentoAutomatico(veiculo: Veiculo): boolean {
    return veiculo.statusAutomatico === 'CIRCULANDO' || veiculo.statusAutomatico === 'EM_VIAGEM';
  }

  private veiculoDisponivelParaNovaMissao(veiculo: Veiculo): boolean {
    return veiculo.statusAtual === 'BASE_JOAO_GOULART'
      || veiculo.statusAtual === 'NO_PATIO'
      || veiculo.statusAtual === 'AGUARDANDO_REALOCACAO';
  }

  veiculosDesativados(): Veiculo[] {
    return this.veiculos.filter(v => v.desativado);
  }

  motoristasElegiveisMissao(): Motorista[] {
    return this.motoristas.filter(m => m.perfil === 'MOTORISTA');
  }

  veiculosElegiveisContingencia(): Veiculo[] {
    return this.veiculosAtivos().filter(v => this.veiculoDisponivelParaNovaMissao(v));
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

  vistoriasCompletasOrdenadas(): VistoriaCompletaResponse[] {
    return [...this.vistoriasCompletas].sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  }

  vistoriasCompletasSaida(): VistoriaCompletaResponse[] {
    return this.vistoriasCompletas.filter(item => item.tipoOperacao === 'SAIDA');
  }

  vistoriasCompletasChegada(): VistoriaCompletaResponse[] {
    return this.vistoriasCompletas.filter(item => item.tipoOperacao === 'ENTRADA');
  }

  vistoriasCompletasReprovadas(): VistoriaCompletaResponse[] {
    return this.vistoriasCompletas.filter(item => item.resultado === 'REPROVADO');
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

  resultadoVistoriaLabel(resultado: ResultadoVistoriaCompleta): string {
    if (resultado === 'RESSALVA') {
      return 'COM RESSALVA';
    }
    return resultado;
  }

  classeResultadoVistoria(resultado: ResultadoVistoriaCompleta): string {
    if (resultado === 'APROVADO') {
      return 'status-base_joao_goulart';
    }
    if (resultado === 'RESSALVA') {
      return 'status-oficina';
    }
    return 'status-bloqueado';
  }

  classeLinhaVistoria(vistoria: VistoriaCompletaResponse): string {
    if (vistoria.resultado === 'REPROVADO') {
      return 'vistoria-row-reprovada';
    }
    if (vistoria.resultado === 'RESSALVA') {
      return 'vistoria-row-ressalva';
    }
    return 'vistoria-row-aprovada';
  }

  quantidadeItensFaltandoVistoria(vistoria: VistoriaCompletaResponse): number {
    return vistoria.itens.filter(item => item.status === 'FALTANDO').length;
  }

  tipoItemVistoriaLabel(tipo: string): string {
    const labels: Record<string, string> = {
      CHAVE_VEICULO: 'Chave do veiculo',
      DOCUMENTO_VEICULO: 'Documento do veiculo',
      MACACO: 'Macaco',
      CHAVE_DE_RODA: 'Chave de roda',
      TRIANGULO: 'Triangulo',
      ESTEPE: 'Estepe'
    };
    return labels[tipo] || tipo;
  }

  tipoAvariaVistoriaLabel(tipo: string): string {
    const labels: Record<string, string> = {
      AMASSADO: 'Amassado',
      RISCADO: 'Riscado',
      QUEBRADO: 'Quebrado',
      TRINCADO: 'Trincado',
      FALTANDO: 'Faltando',
      OUTRO: 'Outro'
    };
    return labels[tipo] || tipo;
  }

  tipoFotoVistoriaLabel(tipo: string): string {
    const labels: Record<string, string> = {
      FRENTE: 'Frente',
      LATERAL_ESQ: 'Lateral esquerda',
      LATERAL_DIR: 'Lateral direita',
      TRASEIRA: 'Traseira',
      PAINEL: 'Painel',
      ESTEPE: 'Estepe'
    };
    return labels[tipo] || tipo;
  }

  abrirVistoriaCompleta(vistoria: VistoriaCompletaResponse): void {
    this.selectedVistoriaCompleta = vistoria;
    this.contraparteVistoriaEdicao = vistoria.nomeContraparte || '';
  }

  fecharVistoriaCompleta(): void {
    this.selectedVistoriaCompleta = null;
    this.contraparteVistoriaEdicao = '';
  }

  labelContraparteVistoria(tipoOperacao: TipoOperacao): string {
    return tipoOperacao === 'SAIDA' ? 'Entregue para' : 'Recebido de';
  }

  statusPosVistoriaLabel(tipoOperacao: TipoOperacao): string {
    return tipoOperacao === 'SAIDA' ? this.statusLabel('EM_USO_EXTERNO') : this.statusLabel('AGUARDANDO_REALOCACAO');
  }

  statusPosVistoriaClasse(tipoOperacao: TipoOperacao): string {
    return tipoOperacao === 'SAIDA' ? this.statusClass('EM_USO_EXTERNO') : this.statusClass('AGUARDANDO_REALOCACAO');
  }

  salvarContraparteVistoria(): void {
    const vistoria = this.selectedVistoriaCompleta;
    if (!vistoria || this.salvandoContraparteVistoria) {
      return;
    }

    const payload: AtualizarContraparteVistoriaCompletaPayload = {
      nomeContraparte: this.contraparteVistoriaEdicao.trim() || null
    };

    this.salvandoContraparteVistoria = true;
    this.adminService.atualizarContraparteVistoriaCompleta(vistoria.id, payload)
      .pipe(finalize(() => (this.salvandoContraparteVistoria = false)))
      .subscribe({
        next: atualizado => {
          this.selectedVistoriaCompleta = atualizado;
          this.contraparteVistoriaEdicao = atualizado.nomeContraparte || '';
          this.vistoriasCompletas = this.vistoriasCompletas.map(item => item.id === atualizado.id ? atualizado : item);
          this.snackBar.open('Contraparte da vistoria salva.', 'Fechar', { duration: 2200 });
        },
        error: err => {
          this.snackBar.open(err.error?.message || 'Falha ao salvar contraparte da vistoria.', 'Fechar', { duration: 3200 });
        }
      });
  }

  tipoMissaoLabel(missao: MissaoResponse): string {
    if (missao.tipoDeslocamento === 'VIAGEM') {
      return this.tipoMissaoLabels.VIAGEM;
    }
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

  podeEditarMissaoManual(missao: MissaoResponse): boolean {
    return missao.origemAbertura === 'CONTINGENCIA_ADMIN';
  }

  podeReatribuirMissaoManual(missao: MissaoResponse): boolean {
    return this.podeEditarMissaoManual(missao) && missao.status === 'ATIVA';
  }

  podeEditarEncerramentoManual(missao: MissaoResponse): boolean {
    return this.podeEditarMissaoManual(missao)
      && missao.status === 'FINALIZADA'
      && missao.origemEncerramento === 'ADMINISTRATIVO';
  }

  abrirEdicaoManualMissao(missao: MissaoResponse): void {
    this.selectedMissaoEdicaoManual = missao;
    this.missaoEdicaoManualForm.reset({
      motoristaId: missao.motoristaId,
      veiculoId: missao.veiculoId,
      dataHoraInicio: this.toDateTimeLocalValue(missao.dataHoraInicio),
      dataHoraFim: missao.dataHoraFim ? this.toDateTimeLocalValue(missao.dataHoraFim) : this.agoraDateTimeLocal(),
      justificativaAbertura: missao.justificativaContingenciaAbertura || '',
      justificativaEncerramento: missao.justificativaContingenciaEncerramento || '',
      localDestino: missao.localDestino || '',
      setorSolicitante: missao.setorSolicitante || '',
      solicitanteNome: missao.solicitanteNome || '',
      justificativaEdicao: ''
    });

    if (this.podeReatribuirMissaoManual(missao)) {
      this.missaoEdicaoManualForm.controls.motoristaId.enable({ emitEvent: false });
      this.missaoEdicaoManualForm.controls.veiculoId.enable({ emitEvent: false });
    } else {
      this.missaoEdicaoManualForm.controls.motoristaId.disable({ emitEvent: false });
      this.missaoEdicaoManualForm.controls.veiculoId.disable({ emitEvent: false });
    }

    if (this.podeEditarEncerramentoManual(missao)) {
      this.missaoEdicaoManualForm.controls.dataHoraFim.enable({ emitEvent: false });
      this.missaoEdicaoManualForm.controls.justificativaEncerramento.enable({ emitEvent: false });
      this.missaoEdicaoManualForm.controls.justificativaEncerramento.setValidators([Validators.minLength(10), Validators.maxLength(700)]);
    } else {
      this.missaoEdicaoManualForm.controls.dataHoraFim.disable({ emitEvent: false });
      this.missaoEdicaoManualForm.controls.justificativaEncerramento.disable({ emitEvent: false });
      this.missaoEdicaoManualForm.controls.justificativaEncerramento.setValidators([Validators.maxLength(700)]);
    }

    this.missaoEdicaoManualForm.controls.justificativaEncerramento.updateValueAndValidity({ emitEvent: false });
  }

  fecharEdicaoManualMissao(): void {
    this.selectedMissaoEdicaoManual = null;
    this.missaoEdicaoManualForm.reset({
      motoristaId: 0,
      veiculoId: 0,
      dataHoraInicio: this.agoraDateTimeLocal(),
      dataHoraFim: this.agoraDateTimeLocal(),
      justificativaAbertura: '',
      justificativaEncerramento: '',
      localDestino: '',
      setorSolicitante: '',
      solicitanteNome: '',
      justificativaEdicao: ''
    });
    this.missaoEdicaoManualForm.controls.motoristaId.enable({ emitEvent: false });
    this.missaoEdicaoManualForm.controls.veiculoId.enable({ emitEvent: false });
    this.missaoEdicaoManualForm.controls.dataHoraFim.enable({ emitEvent: false });
    this.missaoEdicaoManualForm.controls.justificativaEncerramento.enable({ emitEvent: false });
    this.missaoEdicaoManualForm.controls.justificativaEncerramento.setValidators([Validators.maxLength(700)]);
    this.missaoEdicaoManualForm.controls.justificativaEncerramento.updateValueAndValidity({ emitEvent: false });
  }

  salvarEdicaoManualMissao(): void {
    const missao = this.selectedMissaoEdicaoManual;
    if (!missao) {
      return;
    }
    if (this.missaoEdicaoManualForm.invalid) {
      this.missaoEdicaoManualForm.markAllAsTouched();
      return;
    }

    const raw = this.missaoEdicaoManualForm.getRawValue();
    const payload: EditarMissaoManualPayload = {
      motoristaId: raw.motoristaId,
      veiculoId: raw.veiculoId,
      dataHoraInicio: raw.dataHoraInicio,
      dataHoraFim: this.podeEditarEncerramentoManual(missao) ? raw.dataHoraFim : missao.dataHoraFim,
      justificativaAbertura: raw.justificativaAbertura.trim(),
      justificativaEncerramento: this.podeEditarEncerramentoManual(missao)
        ? this.toNullIfBlank(raw.justificativaEncerramento)
        : missao.justificativaContingenciaEncerramento,
      localDestino: this.toNullIfBlank(raw.localDestino),
      setorSolicitante: this.toNullIfBlank(raw.setorSolicitante),
      solicitanteNome: this.toNullIfBlank(raw.solicitanteNome),
      justificativaEdicao: raw.justificativaEdicao.trim()
    };

    const veiculoHistorico = this.selectedVeiculoHistorico;
    const recarregarHistorico = !!veiculoHistorico
      && (veiculoHistorico.id === missao.veiculoId || veiculoHistorico.id === raw.veiculoId);

    this.salvandoEdicaoMissaoManual = true;
    this.adminService.editarMissaoManual(missao.id, payload)
      .pipe(finalize(() => (this.salvandoEdicaoMissaoManual = false)))
      .subscribe({
        next: updated => {
          if (this.selectedMissaoAuditoria?.id === updated.id) {
            this.selectedMissaoAuditoria = updated;
            this.abrirAuditoriaMissao(updated);
          }
          this.buscarMissoes();
          this.carregarMissoesTempoReal(false);
          this.carregarVeiculos(this.veiculoBusca);
          if (recarregarHistorico && veiculoHistorico) {
            this.abrirHistoricoVeiculo(veiculoHistorico);
          }
          this.snackBar.open('Missao manual atualizada.', 'Fechar', { duration: 2400 });
          this.fecharEdicaoManualMissao();
        },
        error: err => this.snackBar.open(err.error?.message || 'Falha ao atualizar a missao manual.', 'Fechar', { duration: 3200 })
      });
  }

  veiculosElegiveisEdicaoManual(missao: MissaoResponse): Veiculo[] {
    const veiculos = this.veiculosAtivos()
      .filter(veiculo => veiculo.id === missao.veiculoId || this.veiculoDisponivelParaNovaMissao(veiculo))
      .sort((a, b) => a.placa.localeCompare(b.placa));
    return veiculos;
  }

  podeAjustarHorarioMissao(missao: MissaoResponse): boolean {
    return missao.origemAbertura === 'CONTINGENCIA_ADMIN';
  }

  podeEditarFimMissao(missao: MissaoResponse): boolean {
    return missao.status === 'FINALIZADA' && missao.origemEncerramento === 'ADMINISTRATIVO';
  }

  abrirAjusteHorarioMissao(missao: MissaoResponse): void {
    this.selectedMissaoHorario = missao;
    this.missaoHorarioForm.reset({
      dataHoraInicio: this.toDateTimeLocalValue(missao.dataHoraInicio),
      dataHoraFim: missao.dataHoraFim ? this.toDateTimeLocalValue(missao.dataHoraFim) : this.agoraDateTimeLocal(),
      justificativa: ''
    });
  }

  fecharAjusteHorarioMissao(): void {
    this.selectedMissaoHorario = null;
    this.missaoHorarioForm.reset({
      dataHoraInicio: this.agoraDateTimeLocal(),
      dataHoraFim: this.agoraDateTimeLocal(),
      justificativa: ''
    });
  }

  salvarAjusteHorarioMissao(): void {
    const missao = this.selectedMissaoHorario;
    if (!missao) {
      return;
    }
    if (this.missaoHorarioForm.invalid) {
      this.missaoHorarioForm.markAllAsTouched();
      return;
    }

    const raw = this.missaoHorarioForm.getRawValue();
    const dataHoraFim = this.podeEditarFimMissao(missao) ? this.toNullIfBlank(raw.dataHoraFim) : null;
    if (this.podeEditarFimMissao(missao) && !dataHoraFim) {
      this.snackBar.open('Informe a data/hora de fim para concluir o ajuste.', 'Fechar', { duration: 2600 });
      return;
    }
    const payload: AjustarHorarioMissaoPayload = {
      dataHoraInicio: raw.dataHoraInicio,
      dataHoraFim,
      justificativa: raw.justificativa.trim()
    };

    this.salvandoHorarioMissao = true;
    this.adminService.ajustarHorarioMissao(missao.id, payload)
      .pipe(finalize(() => (this.salvandoHorarioMissao = false)))
      .subscribe({
        next: updated => {
          this.missoes = this.missoes.map(item => item.id === updated.id ? updated : item);
          this.missoesTempoReal = this.missoesTempoReal.map(item => item.id === updated.id ? updated : item);
          if (this.selectedMissaoAuditoria?.id === updated.id) {
            this.selectedMissaoAuditoria = updated;
            this.abrirAuditoriaMissao(updated);
          }
          if (this.selectedVeiculoHistorico?.id === updated.veiculoId) {
            const veiculoHistorico = this.selectedVeiculoHistorico;
            this.abrirHistoricoVeiculo(veiculoHistorico);
          }
          this.snackBar.open('Horario da missao ajustado.', 'Fechar', { duration: 2200 });
          this.fecharAjusteHorarioMissao();
        },
        error: err => this.snackBar.open(err.error?.message || 'Falha ao ajustar o horario da missao.', 'Fechar', { duration: 3200 })
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

  tituloAuditoriaMissao(item: AuditoriaMissaoResponse): string {
    if (item.acao === 'ATUALIZACAO_DADOS_ADMINISTRATIVOS'
      && (item.campoAlterado === 'dataHoraInicio' || item.campoAlterado === 'dataHoraFim')) {
      return 'HORARIO DA MISSAO AJUSTADO';
    }
    return this.acaoAuditoriaMissaoLabel(item.acao);
  }

  campoAuditoriaMissaoLabel(campo: string | null): string {
    if (!campo) {
      return '-';
    }
    const labels: Record<string, string> = {
      motorista: 'Motorista',
      veiculo: 'Veiculo',
      localDestino: 'Destino',
      setorSolicitante: 'Setor solicitante',
      solicitanteNome: 'Quem solicitou',
      justificativaContingenciaAbertura: 'Justificativa do registro manual',
      justificativaContingenciaEncerramento: 'Justificativa do encerramento manual',
      statusDocumental: 'Status dos dados da missao',
      dataHoraInicio: 'Data/hora de inicio',
      dataHoraFim: 'Data/hora de fim'
    };
    return labels[campo] || campo;
  }

  valorAuditoriaMissaoLabel(campo: string | null, valor: string | null): string {
    if (!valor) {
      return '(vazio)';
    }
    if (campo === 'dataHoraInicio' || campo === 'dataHoraFim') {
      return valor;
    }
    return valor;
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

  private selecionarPrimeiroEventoHistoricoDisponivel(): void {
    this.eventoHistoricoSelecionado = this.eventosHistoricoFiltrados()[0] || null;
  }

  private eventosHistoricoBase(): EventoHistoricoVeiculo[] {
    const eventos = this.historicoVeiculo?.eventos || [];
    if (this.modoHistoricoVeiculo === 'AUDITORIA') {
      return eventos;
    }
    return eventos.filter(evento => this.eventoEhOperacional(evento));
  }

  private filtroHistoricoDisponivel(filtro: FiltroHistoricoVeiculo): boolean {
    const permitidos = this.modoHistoricoVeiculo === 'OPERACIONAL'
      ? this.filtrosHistoricoOperacional
      : this.filtrosHistoricoAuditoria;
    return permitidos.includes(filtro);
  }

  private eventoEhOperacional(evento: EventoHistoricoVeiculo): boolean {
    if (evento.tipo === 'MISSAO_INICIADA' || evento.tipo === 'MISSAO_FINALIZADA') {
      return true;
    }
    if (evento.tipo === 'VIAGEM_INICIADA' || evento.tipo === 'VIAGEM_FINALIZADA') {
      return true;
    }
    if (evento.tipo === 'USO_EXTERNO_INICIADO' || evento.tipo === 'USO_EXTERNO_FINALIZADO') {
      return true;
    }
    if (evento.tipo === 'VISTORIA_COMPLETA_SAIDA' || evento.tipo === 'VISTORIA_COMPLETA_CHEGADA') {
      return true;
    }
    if (evento.tipo === 'EXCECAO_ABERTA' || evento.tipo === 'EXCECAO_REGULARIZADA') {
      return true;
    }
    if (evento.tipo === 'STATUS_ALTERADO') {
      return evento.detalhe?.statusNovo === 'BLOQUEADO';
    }
    return false;
  }

  private eventoHistoricoCorrespondeAoFiltro(
    evento: EventoHistoricoVeiculo,
    filtro: FiltroHistoricoVeiculo
  ): boolean {
    switch (filtro) {
      case '':
        return true;
      case 'MISSOES':
        return evento.tipo === 'MISSAO_INICIADA'
          || evento.tipo === 'MISSAO_FINALIZADA'
          || evento.tipo === 'MISSAO_HORARIO_AJUSTADO'
          || evento.tipo === 'MISSAO_EDITADA_ADMIN';
      case 'CHECKLISTS':
        return evento.tipo === 'CHECKLIST_SAIDA' || evento.tipo === 'CHECKLIST_CHEGADA';
      case 'SEM_CHECKLIST':
        return evento.tipo === 'EXCECAO_ABERTA' || evento.tipo === 'EXCECAO_REGULARIZADA';
      case 'VIAGENS':
        return evento.tipo === 'VIAGEM_INICIADA' || evento.tipo === 'VIAGEM_FINALIZADA';
      case 'USO_EXTERNO':
        return evento.tipo === 'USO_EXTERNO_INICIADO' || evento.tipo === 'USO_EXTERNO_FINALIZADO';
      case 'VISTORIAS':
        return evento.tipo === 'VISTORIA_COMPLETA_SAIDA' || evento.tipo === 'VISTORIA_COMPLETA_CHEGADA';
      case 'STATUS':
        return evento.tipo === 'STATUS_ALTERADO';
    }
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

  private toDateTimeLocalValue(value: string): string {
    const data = new Date(value);
    if (Number.isNaN(data.getTime())) {
      return this.agoraDateTimeLocal();
    }
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    const hora = String(data.getHours()).padStart(2, '0');
    const minuto = String(data.getMinutes()).padStart(2, '0');
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
      || value === 'vistorias-completas'
      || value === 'excecoes';
  }

  private isPainelCategoria(value: string | null): value is PainelCategoria {
    return value === 'DISPONIVEL'
      || value === 'MISSAO'
      || value === 'USO_EXTERNO'
      || value === 'VIAGEM'
      || value === 'PATIO'
      || value === 'REALOCACAO'
      || value === 'BLOQUEADO';
  }

  private sincronizarMenusAgrupados(menu: AdminMenu): void {
    if (menu === 'veiculos' || menu === 'motoristas' || menu === 'rotulos-status') {
      this.cadastrosMenuAtivo = menu;
      return;
    }
    if (menu === 'missoes' || menu === 'checklists' || menu === 'vistorias-completas') {
      this.controleMenuAtivo = menu;
    }
  }

  private garantirDadosBasicos(menu: AdminMenu): void {
    const precisaMotoristas = menu === 'operacao'
      || menu === 'motoristas'
      || menu === 'missoes'
      || menu === 'checklists'
      || menu === 'vistorias-completas';
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
    if (menu === 'vistorias-completas' && (force || this.vistoriasCompletas.length === 0) && !this.loadingVistoriasCompletas) {
      this.buscarVistoriasCompletas();
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

  private aplicarSugestoesMissao(sugestoes: SugestoesCamposMissaoResponse): void {
    this.sugestoesMissaoEditor = {
      destinos: [...(sugestoes.destinos || [])],
      setoresSolicitantes: [...(sugestoes.setoresSolicitantes || [])],
      solicitantes: [...(sugestoes.solicitantes || [])],
      justificativasRegistroManual: [...(sugestoes.justificativasRegistroManual || [])]
    };
    this.novaSugestaoMissao = {
      destinos: '',
      setoresSolicitantes: '',
      solicitantes: '',
      justificativasRegistroManual: ''
    };
  }

  private tamanhoMaximoSugestaoMissao(campo: CampoSugestaoMissaoEditor): number {
    if (campo === 'destinos') {
      return 180;
    }
    if (campo === 'justificativasRegistroManual') {
      return 700;
    }
    return 160;
  }

  private criarPainelVazio(): Record<PainelCategoria, Veiculo[]> {
    return {
      DISPONIVEL: [],
      MISSAO: [],
      USO_EXTERNO: [],
      VIAGEM: [],
      PATIO: [],
      REALOCACAO: [],
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
    if (this.veiculoEmMissaoAtual(veiculo)) {
      return 'MISSAO';
    }
    if (veiculo.statusAtual === 'BASE_JOAO_GOULART') {
      return 'DISPONIVEL';
    }
    if (veiculo.statusAtual === 'EM_VIAGEM') {
      return 'VIAGEM';
    }
    if (veiculo.statusAtual === 'EM_USO_EXTERNO') {
      return 'USO_EXTERNO';
    }
    if (veiculo.statusAtual === 'NO_PATIO') {
      return 'PATIO';
    }
    if (veiculo.statusAtual === 'AGUARDANDO_REALOCACAO') {
      return 'REALOCACAO';
    }
    if (veiculo.statusAtual === 'OFICINA' || veiculo.statusAtual === 'MANUTENCAO') {
      return 'USO_EXTERNO';
    }
    return 'BLOQUEADO';
  }

  private veiculosElegiveisParaCategoria(categoria: PainelCategoria): Veiculo[] {
    const statusAlvo = this.statusAdministrativoAlvoPorCategoria(categoria);
    if (statusAlvo === undefined) {
      return [];
    }

    return this.veiculosAtivos()
      .filter(v => !this.veiculoComDeslocamentoAutomatico(v))
      .filter(v => categoria !== 'VIAGEM' || v.statusAtual !== 'EM_USO_EXTERNO')
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
    if (categoria === 'USO_EXTERNO') {
      return 'EM_USO_EXTERNO';
    }
    if (categoria === 'PATIO') {
      return 'NO_PATIO';
    }
    if (categoria === 'REALOCACAO') {
      return 'AGUARDANDO_REALOCACAO';
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
    const eventos: ConsultaChecklistItem[] = [];

    if (!excecao.somenteEncerramentoSemChecklist) {
      eventos.push({
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
      });
    }

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
    if (this.activeMenu === 'operacao') {
      this.atualizarPainelOperacional();
      this.refreshTempoRealSub = interval(15000).subscribe(() => this.atualizarPainelOperacional());
      return;
    }

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
