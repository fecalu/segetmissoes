import { AuthService } from '../../core/services/auth.service';
import { JustificativaDialogComponent } from '../../shared/dialogs/justificativa-dialog.component';
import { ProtectedImageDirective } from '../../shared/ui/protected-image.directive';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription, distinctUntilChanged, finalize, forkJoin, interval, map, of } from 'rxjs';
import { FleetBoardComponent } from '../fleet-board/fleet-board.component';
import { FleetCard, FleetColumn, PainelCategoria } from '../fleet-board/fleet-board.model';
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
  StatusMissao,
  TipoDeslocamentoMissao
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
  CriarRegistroAdministrativoMissaoPayload,
  EditarMissaoManualPayload,
  EncerrarMissaoPendentePayload,
  RegistrarRetornoViagemPayload,
  RegistrarRetornoUsoExternoPayload,
  RegistrarRetornoAdministrativoMissaoPayload,
  RegistrarVeiculoEmUsoExternoPayload,
  RegistrarVeiculoEmViagemPayload
} from '../../core/services/admin.service';
import { MissaoExcecaoService } from '../../core/services/missao-excecao.service';
import { environment } from '../../../environments/environment';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/dialogs/confirm-dialog.component';
import {
  AdminCredentialConfirmDialogData,
  AdminCredentialConfirmDialogComponent,
  AdminCredentialConfirmDialogResult
} from '../../shared/dialogs/admin-credential-confirm-dialog.component';

type AdminMenu = 'operacao' | 'veiculos' | 'motoristas' | 'rotulos-status' | 'missoes' | 'checklists' | 'vistorias-completas';
type OrigemConsultaChecklist = 'CHECKLIST' | 'SEM_CHECKLIST';
type SituacaoConsultaChecklist = '' | 'REGULARIZADA' | 'PENDENTE' | 'ATRASADA';
type CampoSugestaoMissaoEditor = 'destinos' | 'setoresSolicitantes' | 'solicitantes' | 'justificativasRegistroManual';
type FiltroHistoricoVeiculo = '' | 'MISSOES' | 'CHECKLISTS' | 'SEM_CHECKLIST' | 'VIAGENS' | 'USO_EXTERNO' | 'VISTORIAS' | 'STATUS';
type ModoHistoricoVeiculo = 'OPERACIONAL' | 'AUDITORIA';
type ModoOperacaoFrota = 'PAINEL' | 'MAPA';

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
    ProtectedImageDirective,
    FormsModule,
    ReactiveFormsModule,
    FleetBoardComponent,
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
  readonly auth = inject(AuthService);
  activeMenu: AdminMenu = 'operacao';
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
  loadingMapaDiario = false;
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
  selectedVeiculoHistorico: Veiculo | null = null;
  selectedCategoriaInclusao: PainelCategoria | null = null;
  showDecisaoPatio = false;
  veiculoDecisaoPatio: Veiculo | null = null;
  categoriaOrigemDecisaoPatio: 'DISPONIVEL' | 'PATIO' | null = null;
  categoriaDestinoDecisaoPatio: 'DISPONIVEL' | 'PATIO' | null = null;
  veiculoInclusaoSelecionadoId: number | null = null;
  buscaInclusaoVeiculo = '';
  processandoInclusao = false;
  agoraEpochMs = Date.now();
  missoesTempoReal: MissaoResponse[] = [];
  missoesMapaDiario: MissaoResponse[] = [];
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
  dataMapaDiario = this.hojeIso();
  showNovaMissaoModal = false;
  novaMissaoModo: 'OPERACAO' | 'VIAGEM' | 'RETORNO' | 'PENDENTE' = 'OPERACAO';
  novaMissaoModoFixado = false;
  transicaoMissaoParaViagem: { missaoId: number; veiculo: Veiculo; motoristaId: number } | null = null;
  transicaoUsoExternoParaMissao: { veiculo: Veiculo } | null = null;
  salvandoRegistroAdministrativo = false;
  salvandoRetornoAdministrativo = false;
  encerrandoMissaoPendente = false;
  salvandoRegistroViagem = false;
  salvandoRetornoViagem = false;
  salvandoRegistroUsoExterno = false;
  salvandoRetornoUsoExterno = false;
  glossarioMissoesAberto = false;
  glossarioChecklistsAberto = false;
  glossarioVistoriasAberto = false;
  filtrosVistoriasAbertos = false;
  contraparteVistoriaEdicao = '';
  showRegistroViagemModal = false;
  selectedVeiculoViagem: Veiculo | null = null;
  showRetornoViagemModal = false;
  selectedVeiculoRetornoViagem: Veiculo | null = null;
  statusDestinoRetornoViagem: StatusAdministrativoVeiculo | 'BASE_JOAO_GOULART' | undefined = undefined;
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
  private menuSub?: Subscription;
  ultimaAtualizacaoFrota: Date | null = null;
  erroAtualizacaoFrota = false;
  erroAtualizacaoMissoes = false;
  erroMapaDiario = false;
  arrastandoVeiculo = false;

  readonly categoriasPainel: Array<{ id: PainelCategoria; titulo: string; descricao: string }> = [
    { id: 'DISPONIVEL', titulo: 'Disponíveis', descricao: 'Na base para uma nova missão' },
    { id: 'MISSAO', titulo: 'Em missão', descricao: 'Missões na cidade em andamento' },
    { id: 'PATIO', titulo: 'No pátio', descricao: 'Veículos alocados no pátio' },
    { id: 'VIAGEM', titulo: 'Em viagem', descricao: 'Deslocamentos fora da rotina urbana' },
    { id: 'REALOCACAO', titulo: 'Aguardando realocação', descricao: 'Recebidos e aguardando definição' },
    { id: 'USO_EXTERNO', titulo: 'Em uso externo', descricao: 'Oficina, serviços ou uso fora do setor' },
    { id: 'BLOQUEADO', titulo: 'Bloqueados', descricao: 'Sem liberação para uso' }
  ];
  readonly localizacoesOperacionais = ['Ilha', 'Lateral', 'Escadaria', 'Montanha Russa', 'Igreja da Sé', 'Outro'];
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
  readonly filtrosHistoricoAuditoria: FiltroHistoricoVeiculo[] = ['', 'MISSOES', 'SEM_CHECKLIST', 'VIAGENS', 'USO_EXTERNO', 'STATUS'];
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
  private readonly statusDocumentalViagemLabels: Record<StatusDocumentalMissao, string> = {
    PENDENTE_DADOS_ADMIN: 'DADOS PENDENTES',
    DADOS_ADMIN_COMPLETOS: 'DADOS COMPLETOS'
  };
  private readonly origemAberturaMissaoLabels: Record<OrigemAberturaMissao, string> = {
    CHECKLIST: 'INICIO: COM CHECKLIST',
    SEM_CHECKLIST: 'INICIO: SEM CHECKLIST',
    REGISTRO_ADMINISTRATIVO: 'INICIO: REGISTRADO PELO ADMIN',
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
    { termo: this.statusDocumentalViagemLabels.PENDENTE_DADOS_ADMIN, descricao: 'Ainda faltam destino, setor ou solicitante da viagem.', exemplo: 'Ex.: destino informado, mas setor e solicitante ainda faltam.', classe: 'status-documental-pendente' },
    { termo: this.statusDocumentalViagemLabels.DADOS_ADMIN_COMPLETOS, descricao: 'Destino, setor e solicitante da viagem ja foram preenchidos.', exemplo: 'Ex.: viagem registrada com local, setor e solicitante.', classe: 'status-documental-ok' },
    { termo: this.tipoMissaoLabels.MANUAL, descricao: 'Missao registrada pela administracao como parte da operacao diaria.', exemplo: 'Ex.: o administrador registrou a saida antes de o veiculo deixar o setor.', classe: 'status-base_joao_goulart' },
    { termo: this.tipoMissaoLabels.VIAGEM, descricao: 'Missao aberta como viagem, para deslocamentos fora da rotina urbana.', exemplo: 'Ex.: motorista iniciou uma viagem e o veiculo passou a aparecer em Em viagem.', classe: 'status-em_viagem' },
    { termo: this.origemAberturaMissaoLabels.CHECKLIST, descricao: 'Inicio registrado pelo checklist de saida.', exemplo: 'Ex.: a missao foi aberta logo apos o checklist de saida.', classe: 'status-base_joao_goulart' },
    { termo: this.origemAberturaMissaoLabels.SEM_CHECKLIST, descricao: 'Inicio registrado sem checklist.', exemplo: 'Ex.: o motorista iniciou a missao sem checklist por excecao operacional.', classe: 'status-base_joao_goulart' },
    { termo: this.origemAberturaMissaoLabels.REGISTRO_ADMINISTRATIVO, descricao: 'Inicio registrado diretamente pela administracao.', exemplo: 'Ex.: a administracao registrou a saida do motorista e do veiculo.', classe: 'status-base_joao_goulart' },
    { termo: this.origemAberturaMissaoLabels.CONTINGENCIA_ADMIN, descricao: 'Inicio excepcional registrado pela administracao.', exemplo: 'Ex.: uma contingencia operacional precisou ser registrada depois.', classe: 'status-oficina' },
    { termo: this.origemEncerramentoMissaoLabels.CHECKLIST, descricao: 'Fim registrado pelo checklist de chegada.', exemplo: 'Ex.: a missao foi finalizada quando o checklist de chegada foi enviado.', classe: 'status-no_patio' },
    { termo: this.origemEncerramentoMissaoLabels.SEM_CHECKLIST, descricao: 'Fim registrado sem checklist.', exemplo: 'Ex.: o motorista registrou o fim sem checklist.', classe: 'status-no_patio' },
    { termo: this.origemEncerramentoMissaoLabels.ADMINISTRATIVO, descricao: 'Fim registrado manualmente pela administracao.', exemplo: 'Ex.: a administracao finalizou a missao porque o motorista nao conseguiu encerrar pelo app.', classe: 'status-no_patio' },
    { termo: 'DURACAO: 16 s', descricao: 'Tempo total entre o inicio e o fim da missao.', exemplo: 'Ex.: inicio 13:12:00 e fim 13:12:16.', classe: 'status-oficina' }
  ];
  readonly glossarioMissoesCampos: GlossarioItem[] = [
    { termo: 'Destino | Setor | Solicitante', descricao: 'Contexto da missao na cidade, usado nos relatorios e no acompanhamento operacional.' },
    { termo: 'Dados administrativos', descricao: 'Destino, setor e solicitante usados nos relatorios e no acompanhamento operacional.' },
    { termo: 'Registro administrativo', descricao: 'Saida e retorno registrados pelo administrador para manter o controle da operacao, mesmo sem uso do aplicativo pelo motorista.' },
    { termo: 'Justificativa do encerramento manual', descricao: 'Texto explicando por que o encerramento precisou ser feito manualmente, e nao pelo motorista.' },
    { termo: 'Origem', descricao: 'Como a missao foi aberta: pelo motorista com checklist, pelo motorista sem checklist ou via administracao.' },
    { termo: 'Finalizacao', descricao: 'Como a missao foi encerrada. Enquanto estiver aberta, aparece como "em andamento".' },
    { termo: 'Inicio | Fim', descricao: 'Horarios oficiais de inicio e fim da missao.' },
    { termo: '-', descricao: 'Campo ainda nao informado ou nao aplicavel para aquela missao.' }
  ];
  readonly glossarioChecklistsBadges: GlossarioBadgeItem[] = [
    { termo: 'COM CHECKLIST', descricao: 'Registro enviado com checklist fotográfico.', exemplo: 'Ex.: saída ou chegada com fotos anexadas.', classe: 'status-circulando' },
    { termo: 'SEM CHECKLIST', descricao: 'Registro feito sem checklist fotográfico.', exemplo: 'Ex.: saída ou chegada registrada por exceção operacional.', classe: 'status-oficina' },
    { termo: 'REGULARIZADA', descricao: 'Registro concluído normalmente ou exceção já resolvida.', exemplo: 'Ex.: checklist enviado ou exceção fechada.', classe: 'status-base_joao_goulart' },
    { termo: 'PENDENTE', descricao: 'Registro sem checklist ainda aguardando regularização.', exemplo: 'Ex.: saída sem checklist ainda em aberto.', classe: 'status-documental-pendente' },
    { termo: 'ATRASADA', descricao: 'Registro sem checklist passou do prazo esperado de regularização.', exemplo: 'Ex.: saída sem checklist ainda aberta após o prazo.', classe: 'status-bloqueado' },
    { termo: 'SEM FOTOS', descricao: 'Registro não possui fotos anexadas.', exemplo: 'Ex.: exceção sem checklist ou checklist salvo sem imagens.', classe: 'status-no_patio' }
  ];
  readonly glossarioChecklistsCampos: GlossarioItem[] = [
    { termo: 'SAÍDA | CHEGADA', descricao: 'Tipo do registro operacional.' },
    { termo: 'Resumo', descricao: 'Explica rapidamente o que aconteceu naquele registro.' },
    { termo: 'Fotos', descricao: 'Abre as imagens quando o registro possui checklist fotográfico.' },
    { termo: 'Sem fotos', descricao: 'Aparece quando o registro não tem nenhuma imagem vinculada.' }
  ];
  readonly glossarioVistoriasBadges: GlossarioBadgeItem[] = [
    { termo: 'ENTREGA', descricao: 'Vistoria registrada antes de entregar o veículo para uso externo.', exemplo: 'Ex.: envio para oficina, locadora ou outra secretaria.', classe: 'status-circulando' },
    { termo: 'RECEBIMENTO', descricao: 'Vistoria registrada quando o veículo retorna do uso externo.', exemplo: 'Ex.: veículo voltou da oficina e foi recebido pelo transporte.', classe: 'status-no_patio' },
    { termo: 'APROVADO', descricao: 'Veículo retornou ou saiu sem impedimento apontado na vistoria.', exemplo: 'Ex.: fotos e itens sem problema relevante.', classe: 'status-base_joao_goulart' },
    { termo: 'COM RESSALVA', descricao: 'Veículo pode seguir, mas houve observação ou avaria registrada.', exemplo: 'Ex.: pequeno risco já existente, sem impedir o uso.', classe: 'status-oficina' },
    { termo: 'REPROVADO', descricao: 'A vistoria identificou problema que impede a liberação normal.', exemplo: 'Ex.: item obrigatório faltando ou avaria relevante.', classe: 'status-bloqueado' },
    { termo: 'EM USO EXTERNO', descricao: 'Depois da vistoria de entrega, o veículo fica marcado como entregue para uso fora do setor.', exemplo: 'Ex.: carro entregue para oficina, locadora ou outra secretaria.', classe: 'status-em_uso_externo' },
    { termo: 'AGUARDANDO REALOCAÇÃO', descricao: 'Depois da vistoria de recebimento, o veículo volta e aguarda definição do transporte.', exemplo: 'Ex.: veículo recebido de volta e aguardando novo destino interno.', classe: 'status-aguardando_realocacao' }
  ];
  readonly glossarioVistoriasCampos: GlossarioItem[] = [
    { termo: 'Quilometragem', descricao: 'Quilometragem informada no momento da vistoria.' },
    { termo: 'Localização', descricao: 'Posição capturada pelo celular, quando disponível.' },
    { termo: 'Itens faltando', descricao: 'Quantidade de itens obrigatórios marcados como faltando.' },
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
  readonly missaoContingenciaForm;
  readonly missaoRetornoAdministrativoForm;
  readonly missaoPendenteForm;
  readonly viagemForm;
  readonly retornoViagemForm;
  readonly usoExternoForm;
  readonly retornoUsoExternoForm;

  constructor(
    private readonly fb: FormBuilder,
    private readonly adminService: AdminService,
    private readonly missaoExcecaoService: MissaoExcecaoService,
    private readonly dialog: MatDialog,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar
  ) {
    const hoje = this.hojeIso();

    this.motoristaForm = this.fb.nonNullable.group({
      nome: ['', [Validators.required]],
      login: ['', [Validators.required]],
      cpf: ['', [Validators.pattern(/^\d{11}$/)]],
      senha: [''],
      perfil: ['MOTORISTA' as const, [Validators.required]]
    });

    this.veiculoForm = this.fb.nonNullable.group({
      placa: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9-]{7,8}$/)]],
      modelo: ['', [Validators.required]],
      cnpj: ['', [Validators.pattern(/^\d{14}$/)]],
      renavam: ['', [Validators.pattern(/^\d{1,20}$/)]]
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
      solicitanteNome: [''],
      dataHoraInicio: [this.agoraDateTimeLocal(), [Validators.required]],
      dataHoraFim: [this.agoraDateTimeLocal()]
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

    this.missaoContingenciaForm = this.fb.nonNullable.group({
      motoristaId: [0, [Validators.min(1)]],
      veiculoId: [0, [Validators.min(1)]],
      dataHoraInicio: [this.agoraDateTimeLocal(), [Validators.required]],
      localDestino: [''],
      setorSolicitante: [''],
      solicitanteNome: ['']
    });

    this.missaoRetornoAdministrativoForm = this.fb.nonNullable.group({
      missaoId: [0, [Validators.min(1)]],
      dataHoraFim: [this.agoraDateTimeLocal(), [Validators.required]],
      destinoPosRetorno: ['DISPONIVEL' as 'DISPONIVEL' | 'PATIO' | 'REALOCACAO' | 'BLOQUEADO']
    });

    this.missaoPendenteForm = this.fb.nonNullable.group({
      missaoId: [0, [Validators.min(1)]],
      dataHoraFim: [this.agoraDateTimeLocal(), [Validators.required]],
      justificativaEncerramento: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(700)]],
      destinoPosRetorno: ['DISPONIVEL' as 'DISPONIVEL' | 'PATIO' | 'REALOCACAO' | 'BLOQUEADO']
    });

    this.viagemForm = this.fb.nonNullable.group({
      motoristaId: [0, [Validators.min(1)]],
      localDestino: ['', [Validators.required, Validators.maxLength(180)]],
      setorSolicitante: ['', [Validators.required, Validators.maxLength(160)]],
      solicitanteNome: ['', [Validators.required, Validators.maxLength(160)]],
      dataHoraSaida: [this.agoraDateTimeLocal(), [Validators.required]],
      observacao: ['', [Validators.maxLength(700)]]
    });

    this.retornoViagemForm = this.fb.nonNullable.group({
      dataHoraRetorno: [this.agoraDateTimeLocal(), [Validators.required]],
      observacao: ['', [Validators.maxLength(700)]],
      justificativaSemChecklist: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(700)]]
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
    this.carregarRotulosStatus(false);
    this.iniciarRelogioTempoReal();
    this.menuSub = this.route.queryParamMap.pipe(
      map(params => ({
        menu: this.isAdminMenu(params.get('menu')) ? params.get('menu') as AdminMenu : 'operacao' as AdminMenu,
        buscaPlaca: params.get('buscaPlaca') || ''
      })),
      distinctUntilChanged((anterior, atual) => anterior.menu === atual.menu && anterior.buscaPlaca === atual.buscaPlaca)
    ).subscribe(({ menu, buscaPlaca }) => {
      this.veiculoBusca = buscaPlaca;
      this.aplicarMenu(menu);
    });
  }

  ngOnDestroy(): void {
    this.pararAtualizacaoTempoReal();
    this.relogioSub?.unsubscribe();
    this.menuSub?.unsubscribe();
  }

  setMenu(menu: AdminMenu): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { menu },
      queryParamsHandling: 'merge'
    });
  }

  private aplicarMenu(menu: AdminMenu): void {
    if (!this.auth.canAccessMenu(menu)) {
      this.snackBar.open('Seu perfil não tem acesso a esta área.', 'Fechar', { duration: 3000 });
      this.setMenu('operacao'); return;
    }
    this.activeMenu = menu;
    if (menu === 'motoristas') this.motoristas = [];
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
    if (menu === 'veiculos' && !this.loadingVeiculos) {
      this.carregarVeiculos(this.veiculoBusca);
    }
    if (menu !== 'operacao') {
      this.carregarDadosDoMenu(menu, true);
    }

    if (menu === 'operacao') {
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
    if (this.loadingVeiculos || this.loadingTempoReal || this.operadorInteragindoComTela()) return;
    this.carregarVeiculos();
    this.carregarMissoesTempoReal(false);
    if (this.missoesMapaDiario.length > 0) this.carregarMapaDiario(false);
  }

  alterarVisaoOperacao(view: ModoOperacaoFrota): void {
    if (view === 'MAPA') this.carregarMapaDiario(false);
  }

  carregarMapaDiario(showError = true): void {
    const exibeLoading = showError || this.missoesMapaDiario.length === 0;
    if (exibeLoading) {
      this.loadingMapaDiario = true;
    }
    this.adminService.listarMissoes({
      dataInicio: this.dataMapaDiario,
      dataFim: this.dataMapaDiario
    })
      .pipe(finalize(() => {
        if (exibeLoading) {
          this.loadingMapaDiario = false;
        }
      }))
      .subscribe({
        next: data => {
          this.missoesMapaDiario = data;
          this.erroMapaDiario = false;
        },
        error: () => {
          this.erroMapaDiario = true;
          if (showError) this.snackBar.open('Falha ao carregar mapa diario.', 'Fechar', { duration: 2800 });
        }
      });
  }

  private operadorInteragindoComTela(): boolean {
    return this.arrastandoVeiculo
      || !!this.selectedCategoriaInclusao
      || this.algumModalOperacionalAberto()
      || this.focoAtualEmCampoEditavel();
  }

  private algumModalOperacionalAberto(): boolean {
    return this.showNovaMissaoModal
      || this.showRegistroViagemModal
      || this.showRetornoViagemModal
      || this.showRegistroUsoExternoModal
      || this.showRetornoUsoExternoModal
      || !!this.selectedChecklist
      || !!this.selectedVistoriaCompleta
      || !!this.selectedMissaoAuditoria
      || !!this.selectedMissaoDadosAdmin
      || !!this.selectedMissaoEdicaoManual
      || !!this.selectedVeiculoHistorico;
  }

  private focoAtualEmCampoEditavel(): boolean {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || active.getAttribute('contenteditable') === 'true';
  }

  imprimirRelatorioMapaDiario(): void {
    if (!this.dataMapaDiario) {
      this.snackBar.open('Selecione a data do mapa diário.', 'Fechar', { duration: 2500 });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.snackBar.open('O navegador bloqueou a janela de impressão. Libere pop-ups para imprimir o mapa.', 'Fechar', { duration: 4200 });
      return;
    }

    printWindow.document.write('<p style="font-family: Arial, sans-serif;">Gerando mapa diário para impressão...</p>');
    printWindow.document.close();

    this.gerandoRelatorioMissoes = true;
    this.adminService.gerarRelatorioMissoesPdf(this.dataMapaDiario)
      .pipe(finalize(() => (this.gerandoRelatorioMissoes = false)))
      .subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          printWindow.location.href = url;
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          }, 1200);
        },
        error: () => {
          printWindow.close();
          this.snackBar.open('Falha ao gerar mapa diário para impressão.', 'Fechar', { duration: 3200 });
        }
      });
  }

  get colunasOperacao(): FleetColumn[] {
    return this.categoriasPainel.map(categoria => ({
      id: categoria.id,
      title: categoria.titulo,
      description: categoria.descricao,
      allowsInclusion: this.categoriaPermiteInclusao(categoria.id),
      cards: this.painelVeiculos[categoria.id].map(vehicle => {
        const missao = this.missaoAtivaPorVeiculo(vehicle.id);
        const deslocamento = categoria.id === 'MISSAO' || categoria.id === 'VIAGEM';
        const detalhes: FleetCard['details'] = [];
        if (deslocamento) {
          detalhes.push({ label: 'Destino', value: missao?.localDestino?.trim() || vehicle.viagemLocalDestino?.trim() || null });
          detalhes.push(
            { label: 'Setor', value: missao?.setorSolicitante?.trim() || null },
            { label: 'Solicitante', value: missao?.solicitanteNome?.trim() || null }
          );
        } else if (vehicle.statusAtual === 'EM_USO_EXTERNO') {
          detalhes.push({ label: 'Entregue a', value: vehicle.usoExternoEntreguePara || null },
            { label: 'Tipo', value: this.tipoUsoExternoLabel(vehicle.usoExternoTipo) });
        }
        const inicio = missao?.dataHoraInicio || vehicle.viagemDataHoraSaida || vehicle.usoExternoDataHoraSaida;
        return {
          vehicle,
          activeMission: missao || null,
          statusLabel: this.statusLabel(vehicle.statusAtual),
          driver: deslocamento ? missao?.motoristaNome || vehicle.viagemMotoristaNome || vehicle.motoristaAtualNome || 'Motorista não informado' : null,
          departure: inicio ? this.formatarDataHora(inicio) : null,
          duration: missao ? this.duracaoTempoRealLabel(missao) : null,
          manual: missao?.origemAbertura === 'CONTINGENCIA_ADMIN' || missao?.origemAbertura === 'REGISTRO_ADMINISTRATIVO',
          moving: this.veiculoComDeslocamentoAutomatico(vehicle),
          allowedDestinations: this.categoriasPainel.filter(c => this.podeMoverVeiculo(vehicle, c.id)).map(c => c.id),
          details: detalhes
        };
      })
    }));
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

  abrirNovaMissao(
    modo: 'OPERACAO' | 'VIAGEM' | 'RETORNO' | 'PENDENTE' = 'OPERACAO',
    fixarModo = false
  ): void {
    if (modo === 'PENDENTE' && !this.auth.can('MISSAO_ENCERRAR_EXCECAO')) return;
    this.showNovaMissaoModal = true;
    this.novaMissaoModoFixado = fixarModo;
    this.setNovaMissaoModo(modo);
    if (modo === 'OPERACAO' || modo === 'VIAGEM') {
      this.missaoContingenciaForm.patchValue({ dataHoraInicio: this.agoraDateTimeLocal() });
      return;
    }

    if (modo === 'RETORNO') {
      const primeiraMissaoAtiva = this.missoesComRegistroAdministrativoAtivas()[0];
      this.missaoRetornoAdministrativoForm.patchValue({
        missaoId: primeiraMissaoAtiva ? primeiraMissaoAtiva.id : 0,
        dataHoraFim: this.agoraDateTimeLocal(),
        destinoPosRetorno: 'DISPONIVEL'
      });
      return;
    }

    const primeiraMissaoAtiva = this.missoesPendentesEncerramento()[0];
    this.missaoPendenteForm.patchValue({
      missaoId: primeiraMissaoAtiva ? primeiraMissaoAtiva.id : 0,
      dataHoraFim: this.agoraDateTimeLocal()
    });
  }

  abrirEncerramentoPendente(
    missaoId?: number,
    fixarModo = false,
    destinoPosRetorno: 'DISPONIVEL' | 'PATIO' | 'REALOCACAO' | 'BLOQUEADO' = 'DISPONIVEL'
  ): void {
    this.abrirNovaMissao('PENDENTE', fixarModo);
    this.missaoPendenteForm.patchValue({
      missaoId: missaoId && missaoId > 0 ? missaoId : 0,
      dataHoraFim: this.agoraDateTimeLocal(),
      destinoPosRetorno
    });
  }

  fecharNovaMissao(): void {
    this.showNovaMissaoModal = false;
    this.novaMissaoModoFixado = false;
    this.transicaoMissaoParaViagem = null;
    this.setNovaMissaoModo('OPERACAO');
    this.missaoContingenciaForm.reset({
      motoristaId: 0,
      veiculoId: 0,
      dataHoraInicio: this.agoraDateTimeLocal(),
      localDestino: '',
      setorSolicitante: '',
      solicitanteNome: ''
    });
    this.missaoRetornoAdministrativoForm.reset({
      missaoId: 0,
      dataHoraFim: this.agoraDateTimeLocal(),
      destinoPosRetorno: 'DISPONIVEL'
    });
    this.missaoPendenteForm.reset({
      missaoId: 0,
      dataHoraFim: this.agoraDateTimeLocal(),
      justificativaEncerramento: '',
      destinoPosRetorno: 'DISPONIVEL'
    });
  }

  salvarRegistroAdministrativo(): void {
    if (this.missaoContingenciaForm.invalid) {
      this.missaoContingenciaForm.markAllAsTouched();
      return;
    }

    const raw = this.missaoContingenciaForm.getRawValue();
    const ehViagem = this.novaMissaoModo === 'VIAGEM';
    if (raw.motoristaId <= 0 || raw.veiculoId <= 0) {
      this.snackBar.open('Selecione motorista e veiculo para registrar a saida.', 'Fechar', { duration: 2600 });
      return;
    }

    const payload: CriarRegistroAdministrativoMissaoPayload = {
      motoristaId: raw.motoristaId,
      veiculoId: raw.veiculoId,
      dataHoraInicio: raw.dataHoraInicio,
      tipoDeslocamento: ehViagem ? 'VIAGEM' : 'NA_CIDADE',
      localDestino: raw.localDestino.trim(),
      setorSolicitante: this.toNullIfBlank(raw.setorSolicitante),
      solicitanteNome: this.toNullIfBlank(raw.solicitanteNome)
    };

    this.salvandoRegistroAdministrativo = true;
    this.adminService.criarRegistroAdministrativoMissao(payload)
      .pipe(finalize(() => (this.salvandoRegistroAdministrativo = false)))
      .subscribe({
        next: () => {
          this.snackBar.open(ehViagem ? 'Saida para viagem registrada com sucesso.' : 'Saida registrada com sucesso.', 'Fechar', { duration: 2400 });
          this.fecharNovaMissao();
          this.buscarMissoes();
          this.carregarMissoesTempoReal(false);
          this.carregarVeiculos(this.veiculoBusca);
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Falha ao registrar a saida.', 'Fechar', { duration: 3200 })
      });
  }

  registrarRetornoAdministrativo(): void {
    if (this.missaoRetornoAdministrativoForm.invalid) {
      this.missaoRetornoAdministrativoForm.markAllAsTouched();
      return;
    }

    const raw = this.missaoRetornoAdministrativoForm.getRawValue();
    if (raw.missaoId <= 0) {
      this.snackBar.open('Selecione a missao em andamento para registrar o retorno.', 'Fechar', { duration: 2600 });
      return;
    }

    const payload: RegistrarRetornoAdministrativoMissaoPayload = {
      dataHoraFim: raw.dataHoraFim,
      statusAdministrativoDestino: this.statusAdministrativoPorDestinoPosRetorno(raw.destinoPosRetorno)
    };
    this.salvandoRetornoAdministrativo = true;
    this.adminService.registrarRetornoAdministrativoMissao(raw.missaoId, payload)
      .pipe(finalize(() => (this.salvandoRetornoAdministrativo = false)))
      .subscribe({
        next: () => {
          const transicaoViagem = this.consumirTransicaoMissaoParaViagem(raw.missaoId);
          const destinoLabel = this.categoriaTitulo(raw.destinoPosRetorno);
          const mensagem = raw.destinoPosRetorno === 'DISPONIVEL'
            ? 'Retorno registrado com sucesso.'
            : `Retorno registrado e veículo enviado para ${destinoLabel}.`;
          this.snackBar.open(mensagem, 'Fechar', { duration: 2400 });
          this.fecharNovaMissao();
          this.buscarMissoes();
          this.carregarMissoesTempoReal(false);
          this.carregarVeiculos(this.veiculoBusca);
          if (transicaoViagem) {
            this.abrirRegistroViagemAposRetorno(transicaoViagem);
          }
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Falha ao registrar o retorno.', 'Fechar', { duration: 3200 })
      });
  }

  encerrarMissaoPendente(): void {
    if (this.missaoPendenteForm.invalid) {
      this.missaoPendenteForm.markAllAsTouched();
      return;
    }

    const raw = this.missaoPendenteForm.getRawValue();
    if (raw.missaoId <= 0) {
      this.snackBar.open('Selecione a missão pendente para encerrar.', 'Fechar', { duration: 2400 });
      return;
    }

    const payload: EncerrarMissaoPendentePayload = {
      dataHoraFim: raw.dataHoraFim,
      justificativaEncerramento: raw.justificativaEncerramento.trim(),
      statusAdministrativoDestino: this.statusAdministrativoPorDestinoPosRetorno(raw.destinoPosRetorno)
    };

    this.encerrandoMissaoPendente = true;
    this.adminService.encerrarMissaoPendente(raw.missaoId, payload)
      .pipe(finalize(() => (this.encerrandoMissaoPendente = false)))
      .subscribe({
        next: () => {
          const transicaoViagem = this.consumirTransicaoMissaoParaViagem(raw.missaoId);
          this.snackBar.open('Missao em aberto finalizada com sucesso.', 'Fechar', { duration: 2400 });
          this.fecharNovaMissao();
          this.buscarMissoes();
          this.carregarMissoesTempoReal(false);
          this.carregarVeiculos(this.veiculoBusca);
          if (transicaoViagem) {
            this.abrirRegistroViagemAposRetorno(transicaoViagem);
          }
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Falha ao encerrar a pendência da missão.', 'Fechar', { duration: 3200 })
      });
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
    (this.activeMenu === 'motoristas' ? this.adminService.listarMotoristas(busca) : this.adminService.listarMotoristasOpcoes())
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

    const raw = this.motoristaForm.getRawValue();
    const payload = { ...raw, cpf: raw.cpf.trim() || null };
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
      cpf: motorista.cpf || '',
      senha: '',
      perfil: 'MOTORISTA'
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

  carregarVeiculos(buscaPlaca?: string): void {
    if (this.activeMenu === 'operacao') buscaPlaca = undefined;
    this.loadingVeiculos = true;
    this.adminService.listarVeiculos(buscaPlaca)
      .pipe(finalize(() => {
        this.loadingVeiculos = false;
        if (buscaPlaca?.trim() && this.activeMenu === 'operacao') this.atualizarPainelOperacional();
      }))
      .subscribe({
        next: data => {
          this.veiculos = data;
          if (!buscaPlaca?.trim()) {
            this.organizarPainelOperacional();
            this.ultimaAtualizacaoFrota = new Date();
          }
          this.erroAtualizacaoFrota = false;
        },
        error: () => {
          this.erroAtualizacaoFrota = true;
          this.snackBar.open('Falha ao carregar veiculos.', 'Fechar', { duration: 2800 });
        }
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
      cnpj: this.onlyDigitsOrNull(raw.cnpj),
      renavam: this.onlyDigitsOrNull(raw.renavam)
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
      cnpj: veiculo.cnpj ?? '',
      renavam: veiculo.renavam ?? ''
    });
  }

  cancelarEdicaoVeiculo(): void {
    this.editingVeiculoId = null;
    this.veiculoForm.reset({ placa: '', modelo: '', cnpj: '', renavam: '' });
  }

  categoriaPermiteInclusao(categoria: PainelCategoria): boolean {
    return categoria !== 'MISSAO' && categoria !== 'VIAGEM';
  }

  abrirRetornoAdministrativo(
    missaoId?: number,
    destinoPosRetorno: 'DISPONIVEL' | 'PATIO' | 'REALOCACAO' | 'BLOQUEADO' = 'DISPONIVEL'
  ): void {
    this.abrirNovaMissao('RETORNO', true);
    this.missaoRetornoAdministrativoForm.patchValue({
      missaoId: missaoId && missaoId > 0 ? missaoId : 0,
      dataHoraFim: this.agoraDateTimeLocal(),
      destinoPosRetorno
    });
  }

  abrirRegistroSaidaParaVeiculo(veiculo: Veiculo, modo: 'OPERACAO' | 'VIAGEM' = 'OPERACAO'): void {
    if (this.veiculoComDeslocamentoAutomatico(veiculo)) {
      this.snackBar.open('Este veiculo ja possui um deslocamento em andamento.', 'Fechar', { duration: 2800 });
      return;
    }
    if (!this.veiculoDisponivelParaNovaMissao(veiculo)) {
      this.snackBar.open('Este veiculo nao esta disponivel para iniciar uma missao.', 'Fechar', { duration: 2800 });
      return;
    }

    this.abrirNovaMissao(modo, true);
    this.missaoContingenciaForm.patchValue({
      veiculoId: veiculo.id,
      dataHoraInicio: this.agoraDateTimeLocal()
    });
  }

  podeMoverVeiculo(veiculo: Veiculo, destino: PainelCategoria): boolean {
    if (!this.auth.can('FROTA_OPERAR') || veiculo.desativado) return false;
    const origem = this.categoriaDoVeiculo(veiculo);
    if (origem === destino) return false;
    if (this.auth.can('VEICULO_LIBERAR')) return true;
    if (origem === 'BLOQUEADO' || origem === 'REALOCACAO' || destino === 'BLOQUEADO') return false;
    if (origem === 'MISSAO' && destino === 'VIAGEM') {
      const missao = this.missaoAtivaPorVeiculo(veiculo.id);
      return missao?.origemAbertura === 'REGISTRO_ADMINISTRATIVO' || this.auth.can('MISSAO_ENCERRAR_EXCECAO');
    }
    if (origem === 'VIAGEM' && veiculo.viagemId && ['DISPONIVEL', 'PATIO', 'REALOCACAO'].includes(destino)) {
      return true;
    }
    if (origem === 'MISSAO' || origem === 'VIAGEM') {
      return this.missaoAtivaPorVeiculo(veiculo.id)?.origemAbertura === 'REGISTRO_ADMINISTRATIVO'
        && ['DISPONIVEL', 'PATIO', 'REALOCACAO'].includes(destino);
    }
    if (origem === 'USO_EXTERNO') return destino === 'REALOCACAO' || destino === 'MISSAO';
    return ['DISPONIVEL', 'PATIO'].includes(origem) && ['DISPONIVEL', 'PATIO', 'MISSAO', 'VIAGEM', 'USO_EXTERNO'].includes(destino);
  }

  onDropCategoria(event: CdkDragDrop<FleetCard[]>, categoriaDestino: PainelCategoria): void {
    if (event.previousContainer === event.container) {
      return;
    }

    const veiculo = event.item.data as Veiculo | undefined;
    if (!veiculo) {
      return;
    }

    const categoriaOrigem = this.isPainelCategoria(event.previousContainer.id)
      ? event.previousContainer.id
      : this.categoriaDoVeiculo(veiculo);

    this.moverVeiculoParaCategoria(veiculo, categoriaDestino, categoriaOrigem);
  }

  moverVeiculoParaCategoria(
    veiculo: Veiculo,
    categoriaDestino: PainelCategoria,
    categoriaOrigem = this.categoriaDoVeiculo(veiculo)
  ): void {

    if (!this.podeMoverVeiculo(veiculo, categoriaDestino)) {
      this.snackBar.open('Esta operação precisa de um Gestor ou Administrador.', 'Fechar', { duration: 3500 }); return;
    }
    if (categoriaOrigem === categoriaDestino) {
      return;
    }

    if (categoriaOrigem === 'MISSAO' && categoriaDestino === 'VIAGEM') {
      this.abrirTransicaoMissaoParaViagem(veiculo);
      return;
    }

    if (categoriaOrigem === 'MISSAO' || categoriaOrigem === 'VIAGEM') {
      const destinoPosRetorno = this.destinoPosRetornoPorCategoria(categoriaDestino);
      if (!destinoPosRetorno) {
        this.snackBar.open('Para iniciar outra operação, registre primeiro o retorno do deslocamento.', 'Fechar', { duration: 3600 });
        return;
      }

      const missao = this.missaoAtivaPorVeiculo(veiculo.id);
      if (!missao) {
        if (categoriaOrigem === 'VIAGEM' && veiculo.viagemId) {
          this.abrirRetornoViagem(veiculo, this.statusRetornoViagemPorDestino(destinoPosRetorno));
          return;
        }
        this.snackBar.open('Nao foi encontrada uma missao em andamento para este veiculo.', 'Fechar', { duration: 2800 });
        return;
      }

      if (missao.origemAbertura === 'REGISTRO_ADMINISTRATIVO') {
        this.abrirRetornoAdministrativo(missao.id, destinoPosRetorno);
      } else {
        this.abrirEncerramentoPendente(missao.id, true, destinoPosRetorno);
      }
      return;
    }

    if (categoriaOrigem === 'USO_EXTERNO') {
      if (categoriaDestino === 'MISSAO') {
        this.abrirTransicaoUsoExternoParaMissao(veiculo);
        return;
      }
      if (categoriaDestino === 'VIAGEM' || categoriaDestino === 'USO_EXTERNO') {
        this.snackBar.open('Registre primeiro o recebimento do veículo antes de iniciar uma nova operação.', 'Fechar', { duration: 3600 });
        return;
      }
      this.abrirRetornoUsoExterno(veiculo, categoriaDestino);
      return;
    }

    if (this.ehTransicaoEntreDisponivelEPatio(categoriaOrigem, categoriaDestino)) {
      this.abrirDecisaoPatio(veiculo, categoriaOrigem, categoriaDestino as 'DISPONIVEL' | 'PATIO');
      return;
    }

    if (categoriaDestino === 'MISSAO') {
      this.abrirRegistroSaidaParaVeiculo(veiculo);
      return;
    }

    if (categoriaDestino === 'VIAGEM') {
      this.abrirRegistroSaidaParaVeiculo(veiculo, 'VIAGEM');
      return;
    }

    if (!this.categoriaPermiteInclusao(categoriaDestino)) {
      this.snackBar.open('A coluna selecionada e controlada automaticamente e nao aceita alteracao manual.', 'Fechar', { duration: 3000 });
      return;
    }

    if (this.veiculoComDeslocamentoAutomatico(veiculo)) {
      this.snackBar.open('Veiculo com missao em andamento nao pode ser movido manualmente de coluna.', 'Fechar', { duration: 3200 });
      return;
    }

    if (categoriaDestino === 'USO_EXTERNO') {
      this.abrirRegistroUsoExterno(veiculo);
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

  private abrirTransicaoMissaoParaViagem(veiculo: Veiculo): void {
    const missao = this.missaoAtivaPorVeiculo(veiculo.id);
    if (!missao) {
      this.snackBar.open('Nao foi encontrada uma missao em andamento para este veiculo.', 'Fechar', { duration: 2800 });
      return;
    }
    if (missao.origemAbertura !== 'REGISTRO_ADMINISTRATIVO' && !this.auth.can('MISSAO_ENCERRAR_EXCECAO')) {
      this.snackBar.open('Seu perfil nao pode encerrar esta missao para iniciar uma viagem.', 'Fechar', { duration: 3200 });
      return;
    }

    this.abrirConfirmacao({
      title: `Enviar ${veiculo.placa} para viagem`,
      message: 'A missão atual será encerrada primeiro. Depois, o sistema abrirá a viagem para você completar os dados.',
      confirmText: 'Continuar'
    }, () => {
      this.transicaoMissaoParaViagem = {
        missaoId: missao.id,
        veiculo,
        motoristaId: missao.motoristaId
      };

      if (missao.origemAbertura === 'REGISTRO_ADMINISTRATIVO') {
        this.abrirRetornoAdministrativo(missao.id, 'DISPONIVEL');
      } else {
        this.abrirEncerramentoPendente(missao.id, true, 'DISPONIVEL');
      }
    });
  }

  private consumirTransicaoMissaoParaViagem(missaoId: number): { missaoId: number; veiculo: Veiculo; motoristaId: number } | null {
    const transicao = this.transicaoMissaoParaViagem?.missaoId === missaoId
      ? this.transicaoMissaoParaViagem
      : null;
    if (transicao) {
      this.transicaoMissaoParaViagem = null;
      this.missoesTempoReal = this.missoesTempoReal.filter(item => item.id !== missaoId);
    }
    return transicao;
  }

  private abrirTransicaoUsoExternoParaMissao(veiculo: Veiculo): void {
    this.abrirConfirmacao({
      title: `Iniciar missão com ${veiculo.placa}`,
      message: 'Este veículo está em uso externo. Primeiro registre o recebimento; em seguida, o sistema abrirá a missão.',
      confirmText: 'Continuar'
    }, () => {
      this.transicaoUsoExternoParaMissao = { veiculo };
      this.abrirRetornoUsoExternoParaMissao(veiculo);
    });
  }

  private abrirRegistroMissaoAposRetornoUsoExterno(transicao: { veiculo: Veiculo }): void {
    this.abrirNovaMissao('OPERACAO', true);
    this.missaoContingenciaForm.patchValue({
      veiculoId: transicao.veiculo.id,
      dataHoraInicio: this.agoraDateTimeLocal()
    });
    if (this.motoristas.length === 0) {
      this.carregarMotoristas();
    }
  }

  private consumirTransicaoUsoExternoParaMissao(veiculoId: number): { veiculo: Veiculo } | null {
    const transicao = this.transicaoUsoExternoParaMissao?.veiculo.id === veiculoId
      ? this.transicaoUsoExternoParaMissao
      : null;
    if (transicao) {
      this.transicaoUsoExternoParaMissao = null;
    }
    return transicao;
  }

  private abrirRegistroViagemAposRetorno(transicao: { veiculo: Veiculo; motoristaId: number }): void {
    this.abrirNovaMissao('VIAGEM', true);
    this.missaoContingenciaForm.patchValue({
      motoristaId: transicao.motoristaId,
      veiculoId: transicao.veiculo.id,
      dataHoraInicio: this.agoraDateTimeLocal()
    });
    this.snackBar.open('Retorno encerrado. Complete os dados da viagem para iniciar o novo deslocamento.', 'Fechar', { duration: 3600 });
  }

  atualizarLocalizacaoOperacional(veiculo: Veiculo, localizacao: string | null): void {
    if (!this.auth.can('FROTA_OPERAR')) {
      this.snackBar.open('Seu perfil não pode alterar a localização do veículo.', 'Fechar', { duration: 2800 });
      return;
    }

    this.adminService.atualizarLocalizacaoOperacionalVeiculo(veiculo.id, localizacao).subscribe({
      next: () => {
        this.snackBar.open(localizacao ? `Local atualizado para ${localizacao}.` : 'Local do veículo limpo.', 'Fechar', { duration: 2200 });
        this.carregarVeiculos(this.veiculoBusca);
      },
      error: err => this.snackBar.open(err.error?.message || 'Falha ao atualizar o local do veículo.', 'Fechar', { duration: 3200 })
    });
  }

  private pedirMotivo(title: string, message: string, confirmar: (motivo: string) => void): void {
    this.dialog.open(JustificativaDialogComponent, { width: '480px', maxWidth: '95vw', data: { title, message } })
      .afterClosed().subscribe((motivo?: string) => { if (motivo) confirmar(motivo); });
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

  abrirDecisaoPatio(
    veiculo: Veiculo,
    origem: 'DISPONIVEL' | 'PATIO',
    destino: 'DISPONIVEL' | 'PATIO'
  ): void {
    this.veiculoDecisaoPatio = veiculo;
    this.categoriaOrigemDecisaoPatio = origem;
    this.categoriaDestinoDecisaoPatio = destino;
    this.showDecisaoPatio = true;
  }

  fecharDecisaoPatio(): void {
    this.showDecisaoPatio = false;
    this.veiculoDecisaoPatio = null;
    this.categoriaOrigemDecisaoPatio = null;
    this.categoriaDestinoDecisaoPatio = null;
  }

  registrarDeslocamentoEntreBaseEPatio(): void {
    const veiculo = this.veiculoDecisaoPatio;
    const destino = this.categoriaDestinoDecisaoPatio;
    if (!veiculo || !destino) {
      return;
    }

    this.fecharDecisaoPatio();
    this.abrirRegistroSaidaParaVeiculo(veiculo);
    this.missaoContingenciaForm.patchValue({
      localDestino: destino === 'PATIO' ? 'Pátio' : 'Base operacional'
    });
  }

  atualizarSomenteSituacaoEntreBaseEPatio(justificativa?: string): void {
    if (!justificativa) {
      this.pedirMotivo('Corrigir a situação do veículo', 'Esta opção ajusta o local sem registrar deslocamento. Informe o motivo.', valor => this.atualizarSomenteSituacaoEntreBaseEPatio(valor)); return;
    }
    const veiculo = this.veiculoDecisaoPatio;
    const destino = this.categoriaDestinoDecisaoPatio;
    if (!veiculo || !destino) {
      return;
    }

    const statusAdministrativo = destino === 'PATIO' ? 'NO_PATIO' as const : null;
    this.adminService.atualizarStatusAdministrativoVeiculo(veiculo.id, statusAdministrativo, justificativa).subscribe({
      next: () => {
        this.snackBar.open('Situação do veículo atualizada sem criar missão.', 'Fechar', { duration: 2600 });
        this.fecharDecisaoPatio();
        this.carregarVeiculos(this.veiculoBusca);
      },
      error: err => this.snackBar.open(err.error?.message || 'Falha ao atualizar a situação do veículo.', 'Fechar', { duration: 3200 })
    });
  }

  tituloDecisaoPatio(): string {
    return this.categoriaDestinoDecisaoPatio === 'PATIO'
      ? 'Enviar veículo ao pátio'
      : 'Liberar veículo para a base';
  }

  descricaoDecisaoPatio(): string {
    if (!this.categoriaOrigemDecisaoPatio || !this.categoriaDestinoDecisaoPatio) {
      return '';
    }
    return `${this.categoriaTitulo(this.categoriaOrigemDecisaoPatio)} para ${this.categoriaTitulo(this.categoriaDestinoDecisaoPatio)}`;
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
    const base = this.veiculosElegiveisParaCategoria(this.selectedCategoriaInclusao).filter(v => this.podeMoverVeiculo(v, this.selectedCategoriaInclusao!));
    if (!busca) {
      return base;
    }

    return base.filter(v =>
      v.placa.toLowerCase().includes(busca)
      || v.modelo.toLowerCase().includes(busca)
      || (v.marca ?? '').toLowerCase().includes(busca)
    );
  }

  confirmarInclusaoCategoria(): void {
    const destino = this.selectedCategoriaInclusao;
    const veiculo = this.veiculos.find(v => v.id === this.veiculoInclusaoSelecionadoId);
    if (!destino || !veiculo) return;
    this.fecharInclusaoCategoria();
    this.moverVeiculoParaCategoria(veiculo, destino);
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
      setorSolicitante: '',
      solicitanteNome: '',
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
      setorSolicitante: '',
      solicitanteNome: '',
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
      setorSolicitante: this.toNullIfBlank(raw.setorSolicitante),
      solicitanteNome: this.toNullIfBlank(raw.solicitanteNome),
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

  abrirRetornoViagem(veiculo: Veiculo, statusDestino?: StatusAdministrativoVeiculo | 'BASE_JOAO_GOULART'): void {
    if (!veiculo.viagemId) {
      this.snackBar.open('Esta viagem foi aberta pelo app. Use o encerramento da missao para finalizar administrativamente.', 'Fechar', { duration: 3600 });
      return;
    }
    this.selectedVeiculoRetornoViagem = veiculo;
    this.statusDestinoRetornoViagem = statusDestino;
    this.showRetornoViagemModal = true;
    this.retornoViagemForm.reset({
      dataHoraRetorno: this.agoraDateTimeLocal(),
      observacao: '',
      justificativaSemChecklist: ''
    });
  }

  fecharRetornoViagem(): void {
    this.showRetornoViagemModal = false;
    this.selectedVeiculoRetornoViagem = null;
    this.statusDestinoRetornoViagem = undefined;
    this.retornoViagemForm.reset({
      dataHoraRetorno: this.agoraDateTimeLocal(),
      observacao: '',
      justificativaSemChecklist: ''
    });
  }

  salvarRetornoViagem(): void {
    if (!this.selectedVeiculoRetornoViagem) {
      return;
    }
    if (this.retornoViagemForm.invalid) {
      this.retornoViagemForm.markAllAsTouched();
      return;
    }

    const raw = this.retornoViagemForm.getRawValue();
    const payload: RegistrarRetornoViagemPayload = {
      dataHoraRetorno: raw.dataHoraRetorno,
      observacao: this.toNullIfBlank(raw.observacao),
      justificativaSemChecklist: raw.justificativaSemChecklist.trim(),
      statusAdministrativoDestino: this.statusDestinoRetornoViagem
    };

    this.salvandoRetornoViagem = true;
    this.adminService.registrarRetornoViagem(this.selectedVeiculoRetornoViagem.id, payload)
      .pipe(finalize(() => (this.salvandoRetornoViagem = false)))
      .subscribe({
        next: () => {
          const historicoAbertoParaMesmoVeiculo = this.selectedVeiculoHistorico?.id === this.selectedVeiculoRetornoViagem?.id;
          const veiculoHistorico = this.selectedVeiculoHistorico;
          this.snackBar.open('Retorno da viagem registrado com sucesso.', 'Fechar', { duration: 2400 });
          this.fecharRetornoViagem();
          this.carregarVeiculos(this.veiculoBusca);
          if (historicoAbertoParaMesmoVeiculo && veiculoHistorico) {
            this.abrirHistoricoVeiculo(veiculoHistorico);
          }
        },
        error: err => this.snackBar.open(err.error?.message || 'Falha ao registrar o retorno da viagem.', 'Fechar', { duration: 3200 })
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

  private abrirRetornoUsoExternoParaMissao(veiculo: Veiculo): void {
    this.selectedVeiculoRetornoUsoExterno = veiculo;
    this.statusDestinoRetornoUsoExterno = null;
    this.showRetornoUsoExternoModal = true;
    this.retornoUsoExternoForm.reset({
      nomeRecebidoDe: veiculo.usoExternoEntreguePara || '',
      dataHoraRetorno: this.agoraDateTimeLocal(),
      observacao: '',
      justificativaSemVistoria: ''
    });
  }

  fecharRetornoUsoExterno(): void {
    this.showRetornoUsoExternoModal = false;
    this.selectedVeiculoRetornoUsoExterno = null;
    this.statusDestinoRetornoUsoExterno = null;
    this.transicaoUsoExternoParaMissao = null;
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
          const transicaoMissao = this.consumirTransicaoUsoExternoParaMissao(this.selectedVeiculoRetornoUsoExterno!.id);
          const historicoAbertoParaMesmoVeiculo = this.selectedVeiculoHistorico?.id === this.selectedVeiculoRetornoUsoExterno?.id;
          const veiculoHistorico = this.selectedVeiculoHistorico;
          this.snackBar.open(
            transicaoMissao ? 'Recebimento registrado. Complete os dados da missão.' : 'Retorno do uso externo registrado com sucesso.',
            'Fechar',
            { duration: 2400 }
          );
          this.fecharRetornoUsoExterno();
          this.carregarVeiculos(this.veiculoBusca);
          if (historicoAbertoParaMesmoVeiculo && veiculoHistorico) {
            this.abrirHistoricoVeiculo(veiculoHistorico);
          }
          if (transicaoMissao) {
            this.abrirRegistroMissaoAposRetornoUsoExterno(transicaoMissao);
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
      return `Local da viagem: ${evento.detalhe?.localDestino || '-'}`;
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

  eventoEhViagemHistorico(evento: EventoHistoricoVeiculo): boolean {
    return evento.tipo === 'VIAGEM_INICIADA' || evento.tipo === 'VIAGEM_FINALIZADA';
  }

  resumoResponsavelEventoHistorico(evento: EventoHistoricoVeiculo): string | null {
    return this.registroEventoHistoricoLabel(evento);
  }

  registroEventoHistoricoLabel(evento: EventoHistoricoVeiculo): string | null {
    const responsavel = evento.responsavelNome || evento.motoristaNome;
    if (!responsavel) {
      return null;
    }
    return `${this.eventoRegistradoViaAdmin(evento) ? 'via admin' : 'motorista'} · ${responsavel}`;
  }

  private eventoRegistradoViaAdmin(evento: EventoHistoricoVeiculo): boolean {
    if (evento.responsavelNome && evento.motoristaNome && evento.responsavelNome !== evento.motoristaNome) {
      return true;
    }
    if (evento.detalhe?.origemAberturaMissao === 'REGISTRO_ADMINISTRATIVO' || evento.detalhe?.origemAberturaMissao === 'CONTINGENCIA_ADMIN') {
      return true;
    }
    if (evento.detalhe?.origemEncerramentoMissao === 'ADMINISTRATIVO') {
      return true;
    }
    return [
      'MISSAO_HORARIO_AJUSTADO',
      'MISSAO_EDITADA_ADMIN',
      'STATUS_ALTERADO',
      'USO_EXTERNO_INICIADO',
      'USO_EXTERNO_FINALIZADO'
    ].includes(evento.tipo);
  }

  statusDocumentalEventoHistoricoLabel(evento: EventoHistoricoVeiculo): string {
    const status = evento.detalhe?.statusDocumentalMissao;
    if (!status) {
      return '-';
    }
    return this.statusDocumentalMissaoLabel(
      status,
      this.eventoEhViagemHistorico(evento) ? 'VIAGEM' : 'NA_CIDADE'
    );
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

  desativarVeiculo(veiculo: Veiculo, justificativa?: string): void {
    if (this.auth.hasRole('GESTOR') && !justificativa) {
      this.pedirMotivo('Alterar situação do cadastro', 'Informe o motivo desta alteração para ' + veiculo.placa + '.', valor => this.desativarVeiculo(veiculo, valor)); return;
    }
    if (veiculo.desativado) {
      return;
    }
    this.abrirConfirmacao({
      title: 'Dar baixa/desativar veiculo',
      message: `Deseja baixar/desativar o veiculo ${veiculo.placa}?`,
      confirmText: 'Dar baixa',
      confirmColor: 'warn'
    }, () => {
      this.adminService.desativarVeiculo(veiculo.id, justificativa).subscribe({
        next: () => {
          this.snackBar.open('Veiculo baixado/desativado.', 'Fechar', { duration: 2200 });
          this.carregarVeiculos(this.veiculoBusca);
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Erro ao baixar veiculo.', 'Fechar', { duration: 3000 })
      });
    });
  }

  reativarVeiculo(veiculo: Veiculo, justificativa?: string): void {
    if (this.auth.hasRole('GESTOR') && !justificativa) {
      this.pedirMotivo('Alterar situação do cadastro', 'Informe o motivo desta alteração para ' + veiculo.placa + '.', valor => this.reativarVeiculo(veiculo, valor)); return;
    }
    if (!veiculo.desativado) {
      return;
    }
    this.abrirConfirmacao({
      title: 'Reativar veiculo',
      message: `Deseja reativar o veiculo ${veiculo.placa}?`,
      confirmText: 'Reativar'
    }, () => {
      this.adminService.reativarVeiculo(veiculo.id, justificativa).subscribe({
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
          message: 'Use somente para cadastro criado por engano e sem historico operacional. Veiculos com missoes, checklists ou vistorias devem ser desativados/baixados para preservar a auditoria.\nConfirme com sua senha e justificativa.',
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
          this.erroAtualizacaoMissoes = false;
        },
        error: () => {
          this.erroAtualizacaoMissoes = true;
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

  totalVeiculosDesativados(): number {
    return this.veiculosDesativados().length;
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

  novaMissaoEhViagem(): boolean {
    return this.novaMissaoModo === 'VIAGEM';
  }

  setNovaMissaoModo(modo: 'OPERACAO' | 'VIAGEM' | 'RETORNO' | 'PENDENTE'): void {
    this.novaMissaoModo = modo;
    const controleLocalDestino = this.missaoContingenciaForm.controls.localDestino;
    const controleSetor = this.missaoContingenciaForm.controls.setorSolicitante;
    const controleSolicitante = this.missaoContingenciaForm.controls.solicitanteNome;
    if (modo === 'VIAGEM') {
      controleLocalDestino.setValidators([Validators.required, Validators.maxLength(180)]);
      controleSetor.setValidators([Validators.required, Validators.maxLength(160)]);
      controleSolicitante.setValidators([Validators.required, Validators.maxLength(160)]);
    } else if (modo === 'OPERACAO') {
      controleLocalDestino.setValidators([Validators.required, Validators.maxLength(180)]);
      controleSetor.setValidators([Validators.required, Validators.maxLength(160)]);
      controleSolicitante.setValidators([Validators.required, Validators.maxLength(160)]);
    } else {
      controleLocalDestino.clearValidators();
      controleSetor.clearValidators();
      controleSolicitante.clearValidators();
    }
    controleLocalDestino.updateValueAndValidity({ emitEvent: false });
    controleSetor.updateValueAndValidity({ emitEvent: false });
    controleSolicitante.updateValueAndValidity({ emitEvent: false });
  }

  private veiculoDisponivelParaNovaMissao(veiculo: Veiculo): boolean {
    if (!this.auth.can('VEICULO_LIBERAR') && veiculo.statusAtual === 'AGUARDANDO_REALOCACAO') return false;
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

  tipoOperacaoVistoriaLabel(value: string): string {
    return value === 'ENTRADA' ? 'RECEBIMENTO' : 'ENTREGA';
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
    const porId = new Map<number, MissaoResponse>();
    for (const missao of [...this.missoes, ...this.missoesTempoReal, ...this.missoesMapaDiario]) {
      if (missao.status === 'ATIVA') {
        porId.set(missao.id, missao);
      }
    }
    return [...porId.values()].sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio));
  }

  missoesPendentesEncerramento(): MissaoResponse[] {
    return this.missoesAtivas();
  }

  missoesComRegistroAdministrativoAtivas(): MissaoResponse[] {
    return this.missoesAtivas().filter(missao => missao.origemAbertura === 'REGISTRO_ADMINISTRATIVO');
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

  tipoDeslocamentoMissaoLabel(tipo: TipoDeslocamentoMissao): string {
    return tipo === 'VIAGEM' ? 'Viagem' : 'Missao na cidade';
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

  statusDocumentalMissaoLabel(status: StatusDocumentalMissao, tipoDeslocamento: TipoDeslocamentoMissao = 'NA_CIDADE'): string {
    return tipoDeslocamento === 'VIAGEM'
      ? this.statusDocumentalViagemLabels[status]
      : this.statusDocumentalMissaoLabels[status];
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

  labelStatusDocumentalMissao(missao: MissaoResponse | null | undefined): string {
    if (!missao) {
      return this.statusDocumentalMissaoLabels.PENDENTE_DADOS_ADMIN;
    }
    return this.statusDocumentalMissaoLabel(
      missao.statusDocumental,
      missao.tipoDeslocamento || 'NA_CIDADE'
    );
  }

  labelCampoContextoMissao(missao: MissaoResponse | null | undefined): string {
    return missao?.tipoDeslocamento === 'VIAGEM' ? 'Destino / local da viagem' : 'Destino';
  }

  exibeCamposUrbanosMissao(missao: MissaoResponse | null | undefined): boolean {
    return true;
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
    return missao.origemAbertura === 'CONTINGENCIA_ADMIN' || missao.origemAbertura === 'REGISTRO_ADMINISTRATIVO'
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

  origemOperacionalMissaoLabel(missao: MissaoResponse): string {
    if (missao.origemAbertura === 'REGISTRO_ADMINISTRATIVO') {
      return `via admin${missao.administradorAberturaNome ? ' · ' + missao.administradorAberturaNome : ''}`;
    }
    if (missao.origemAbertura === 'CONTINGENCIA_ADMIN') {
      return `via admin · contingencia${missao.administradorAberturaNome ? ' · ' + missao.administradorAberturaNome : ''}`;
    }
    if (missao.origemAbertura === 'SEM_CHECKLIST') {
      return `motorista · sem checklist · ${missao.motoristaNome}`;
    }
    return `motorista · com checklist · ${missao.motoristaNome}`;
  }

  finalizacaoOperacionalMissaoLabel(missao: MissaoResponse): string {
    if (missao.status === 'ATIVA') {
      return 'em andamento';
    }
    if (missao.origemEncerramento === 'ADMINISTRATIVO') {
      return `via admin${missao.administradorEncerramentoNome ? ' · ' + missao.administradorEncerramentoNome : ''}`;
    }
    if (missao.origemEncerramento === 'SEM_CHECKLIST') {
      return `motorista · sem checklist · ${missao.motoristaNome}`;
    }
    if (missao.origemEncerramento === 'CHECKLIST') {
      return `motorista · com checklist · ${missao.motoristaNome}`;
    }
    return 'em andamento';
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
        error: () => this.snackBar.open('Falha ao carregar a auditoria da missão.', 'Fechar', { duration: 2800 })
      });
  }

  fecharAuditoriaMissao(): void {
    this.selectedMissaoAuditoria = null;
    this.auditoriaMissao = [];
  }

  abrirEdicaoMissao(missao: MissaoResponse): void {
    if (this.podeEditarMissaoManual(missao)) {
      this.abrirEdicaoManualMissao(missao);
      return;
    }
    this.abrirEdicaoDadosMissao(missao);
  }

  abrirEdicaoDadosMissao(missao: MissaoResponse): void {
    const exibeCamposUrbanos = this.exibeCamposUrbanosMissao(missao);
    for (const control of Object.values(this.missaoDadosForm.controls)) control.enable();
    this.selectedMissaoDadosAdmin = missao;
    this.missaoDadosForm.reset({
      localDestino: missao.localDestino || '',
      setorSolicitante: missao.setorSolicitante || '',
      solicitanteNome: missao.solicitanteNome || '',
      dataHoraInicio: this.toDateTimeLocalValue(missao.dataHoraInicio),
      dataHoraFim: missao.dataHoraFim ? this.toDateTimeLocalValue(missao.dataHoraFim) : this.agoraDateTimeLocal()
    });
    if (!this.auth.can('MISSAO_CORRIGIR') && missao.status !== 'ATIVA') {
      for (const campo of ['localDestino', 'setorSolicitante', 'solicitanteNome'] as const) {
        if (missao[campo]?.trim()) this.missaoDadosForm.controls[campo].disable();
      }
    }
    if (!this.podeAjustarHorarioMissao(missao)) {
      this.missaoDadosForm.controls.dataHoraInicio.disable({ emitEvent: false });
      this.missaoDadosForm.controls.dataHoraFim.disable({ emitEvent: false });
      return;
    }
    this.missaoDadosForm.controls.dataHoraInicio.enable({ emitEvent: false });
    if (this.podeEditarFimMissao(missao)) {
      this.missaoDadosForm.controls.dataHoraFim.enable({ emitEvent: false });
    } else {
      this.missaoDadosForm.controls.dataHoraFim.disable({ emitEvent: false });
    }
  }

  fecharEdicaoDadosMissao(): void {
    this.selectedMissaoDadosAdmin = null;
    this.missaoDadosForm.reset({
      localDestino: '',
      setorSolicitante: '',
      solicitanteNome: '',
      dataHoraInicio: this.agoraDateTimeLocal(),
      dataHoraFim: this.agoraDateTimeLocal()
    });
    for (const control of Object.values(this.missaoDadosForm.controls)) control.enable({ emitEvent: false });
  }

  salvarDadosAdministrativosMissao(justificativa?: string): void {
    const missao = this.selectedMissaoDadosAdmin;
    if (!missao) {
      return;
    }

    const raw = this.missaoDadosForm.getRawValue();
    const exibeCamposUrbanos = this.exibeCamposUrbanosMissao(missao);
    const deveAjustarHorario = this.horarioMissaoAlterado(missao, raw);
    if (deveAjustarHorario) {
      if (!raw.dataHoraInicio) {
        this.snackBar.open('Informe a data/hora de inicio.', 'Fechar', { duration: 2600 });
        return;
      }
      if (this.podeEditarFimMissao(missao) && !this.toNullIfBlank(raw.dataHoraFim)) {
        this.snackBar.open('Informe a data/hora de fim para concluir o ajuste.', 'Fechar', { duration: 2600 });
        return;
      }
    }
    const corrige = missao.status !== 'ATIVA' && (['localDestino', 'setorSolicitante', 'solicitanteNome'] as const)
      .some(campo => !!missao[campo]?.trim() && missao[campo]?.trim() !== raw[campo].trim());
    if (corrige && !justificativa) {
      this.pedirMotivo('Corrigir dados da missão', 'Explique a correção dos dados já registrados.', valor => this.salvarDadosAdministrativosMissao(valor)); return;
    }
    this.adminService.atualizarDadosAdministrativosMissao(missao.id, {
      justificativa,
      localDestino: this.toNullIfBlank(raw.localDestino),
      setorSolicitante: this.toNullIfBlank(raw.setorSolicitante),
      solicitanteNome: this.toNullIfBlank(raw.solicitanteNome)
    }).subscribe({
      next: (updated) => {
        if (deveAjustarHorario) {
          const payload: AjustarHorarioMissaoPayload = {
            dataHoraInicio: raw.dataHoraInicio,
            dataHoraFim: this.podeEditarFimMissao(missao) ? this.toNullIfBlank(raw.dataHoraFim) : null
          };
          this.salvandoHorarioMissao = true;
          this.adminService.ajustarHorarioMissao(updated.id, payload)
            .pipe(finalize(() => (this.salvandoHorarioMissao = false)))
            .subscribe({
              next: missaoComHorario => {
                this.aplicarMissaoAtualizada(missaoComHorario);
                this.snackBar.open('Missao atualizada.', 'Fechar', { duration: 2200 });
                this.fecharEdicaoDadosMissao();
              },
              error: err => this.snackBar.open(err.error?.message || 'Dados salvos, mas falha ao ajustar o horario.', 'Fechar', { duration: 3600 })
            });
          return;
        }
        this.aplicarMissaoAtualizada(updated);
        this.snackBar.open('Missao atualizada.', 'Fechar', { duration: 2200 });
        this.fecharEdicaoDadosMissao();
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Falha ao atualizar os dados da missao.', 'Fechar', { duration: 3000 })
    });
  }

  private horarioMissaoAlterado(
    missao: MissaoResponse,
    raw: { dataHoraInicio: string; dataHoraFim: string }
  ): boolean {
    if (!this.podeAjustarHorarioMissao(missao)) {
      return false;
    }
    const inicioAtual = this.toDateTimeLocalValue(missao.dataHoraInicio);
    const fimAtual = missao.dataHoraFim ? this.toDateTimeLocalValue(missao.dataHoraFim) : '';
    const inicioNovo = raw.dataHoraInicio || '';
    const fimNovo = this.podeEditarFimMissao(missao) ? (raw.dataHoraFim || '') : fimAtual;
    return inicioAtual !== inicioNovo || fimAtual !== fimNovo;
  }

  private aplicarMissaoAtualizada(updated: MissaoResponse): void {
    this.missoes = this.missoes.map(item => item.id === updated.id ? updated : item);
    const idxTempoReal = this.missoesTempoReal.findIndex(item => item.id === updated.id);
    if (idxTempoReal >= 0) {
      this.missoesTempoReal = this.missoesTempoReal.map(item => item.id === updated.id ? updated : item);
    } else if (updated.status === 'ATIVA') {
      this.missoesTempoReal = [updated, ...this.missoesTempoReal];
    }
    this.missoesMapaDiario = this.missoesMapaDiario.map(item => item.id === updated.id ? updated : item);
    if (this.selectedMissaoAuditoria?.id === updated.id) {
      this.selectedMissaoAuditoria = updated;
      this.abrirAuditoriaMissao(updated);
    }
  }

  podeEditarMissaoManual(missao: MissaoResponse): boolean {
    if (!this.auth.can('MISSAO_CORRIGIR')) return false;
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
    const exibeCamposUrbanos = this.exibeCamposUrbanosMissao(missao);
    this.selectedMissaoEdicaoManual = missao;
    this.missaoEdicaoManualForm.reset({
      motoristaId: missao.motoristaId,
      veiculoId: missao.veiculoId,
      dataHoraInicio: this.toDateTimeLocalValue(missao.dataHoraInicio),
      dataHoraFim: missao.dataHoraFim ? this.toDateTimeLocalValue(missao.dataHoraFim) : this.agoraDateTimeLocal(),
      justificativaAbertura: missao.justificativaContingenciaAbertura || '',
      justificativaEncerramento: missao.justificativaContingenciaEncerramento || '',
      localDestino: missao.localDestino || '',
      setorSolicitante: exibeCamposUrbanos ? (missao.setorSolicitante || '') : '',
      solicitanteNome: exibeCamposUrbanos ? (missao.solicitanteNome || '') : '',
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
    if (!this.auth.can('MISSAO_CORRIGIR')) return false;
    if (!missao.dataHoraInicio?.startsWith(this.hojeIso())) return false;
    return missao.origemAbertura === 'CONTINGENCIA_ADMIN' || missao.origemAbertura === 'REGISTRO_ADMINISTRATIVO';
  }

  podeEditarFimMissao(missao: MissaoResponse): boolean {
    return missao.status === 'FINALIZADA' && missao.origemEncerramento === 'ADMINISTRATIVO';
  }

  acaoAuditoriaMissaoLabel(acao: AcaoAuditoriaMissao): string {
    const labels: Record<AcaoAuditoriaMissao, string> = {
      ABERTURA_CHECKLIST: 'INICIO: COM CHECKLIST',
      ABERTURA_SEM_CHECKLIST: 'INICIO: SEM CHECKLIST',
      ABERTURA_REGISTRO_ADMINISTRATIVO: 'INICIO: REGISTRADO PELO ADMIN',
      ABERTURA_CONTINGENCIA_ADMIN: 'INICIO: PELO ADMIN',
      ABERTURA_LEGADO_RECONSTRUIDA: 'REGISTRO RECONSTRUIDO',
      ENCERRAMENTO_CHECKLIST: 'FIM: COM CHECKLIST',
      ENCERRAMENTO_SEM_CHECKLIST: 'FIM: SEM CHECKLIST',
      ENCERRAMENTO_REGISTRO_ADMINISTRATIVO: 'FIM: REGISTRADO PELO ADMIN',
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
      localDestino: 'Destino / local',
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

  veiculoDescricao(veiculo: Pick<Veiculo, 'marca' | 'modelo'>): string {
    return [veiculo.marca, veiculo.modelo].filter(Boolean).join(' ');
  }

  missaoVeiculoDescricao(missao: Pick<MissaoResponse, 'veiculoMarca' | 'veiculoModelo'>): string {
    return [missao.veiculoMarca, missao.veiculoModelo].filter(Boolean).join(' ');
  }

  statusClass(status: StatusVeiculo): string {
    return `status-${status.toLowerCase()}`;
  }

  missaoAtivaPorVeiculo(veiculoId: number): MissaoResponse | null {
    return this.missoesTempoReal.find(m => m.veiculoId === veiculoId) || null;
  }

  private selecionarPrimeiroEventoHistoricoDisponivel(): void {
    this.eventoHistoricoSelecionado = this.eventosHistoricoFiltrados()[0] || null;
  }

  private eventosHistoricoBase(): EventoHistoricoVeiculo[] {
    const eventos = this.historicoVeiculo?.eventos || [];
    if (this.modoHistoricoVeiculo === 'AUDITORIA') {
      return eventos.filter(evento => this.eventoEhAuditoria(evento));
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

  private eventoEhAuditoria(evento: EventoHistoricoVeiculo): boolean {
    if (evento.tipo === 'MISSAO_HORARIO_AJUSTADO' || evento.tipo === 'MISSAO_EDITADA_ADMIN' || evento.tipo === 'STATUS_ALTERADO') {
      return true;
    }
    if (evento.tipo === 'EXCECAO_ABERTA' || evento.tipo === 'EXCECAO_REGULARIZADA') {
      return true;
    }
    if (evento.tipo === 'MISSAO_INICIADA') {
      return evento.detalhe?.origemAberturaMissao === 'REGISTRO_ADMINISTRATIVO'
        || evento.detalhe?.origemAberturaMissao === 'CONTINGENCIA_ADMIN';
    }
    if (evento.tipo === 'MISSAO_FINALIZADA') {
      return evento.detalhe?.origemEncerramentoMissao === 'ADMINISTRATIVO';
    }
    if (evento.tipo === 'VIAGEM_INICIADA' || evento.tipo === 'VIAGEM_FINALIZADA') {
      return this.eventoRegistradoViaAdmin(evento);
    }
    if (evento.tipo === 'USO_EXTERNO_INICIADO' || evento.tipo === 'USO_EXTERNO_FINALIZADO') {
      return this.eventoRegistradoViaAdmin(evento);
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

  private onlyDigitsOrNull(value: string): string | null {
    const digits = value.replace(/\D/g, '');
    return digits ? digits : null;
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
      || value === 'checklists'
      || value === 'vistorias-completas';
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

  private garantirDadosBasicos(menu: AdminMenu): void {
    const precisaMotoristas = menu === 'operacao'
      || menu === 'motoristas'
      || menu === 'missoes'
      || menu === 'checklists'
      || menu === 'vistorias-completas';
    const precisaVeiculos = menu !== 'motoristas' && menu !== 'operacao';

    if (precisaMotoristas && this.motoristas.length === 0 && !this.loadingMotoristas) {
      this.carregarMotoristas();
    }
    if (precisaVeiculos && this.veiculos.length === 0 && !this.loadingVeiculos) {
      this.carregarVeiculos(menu === 'veiculos' ? this.veiculoBusca : undefined);
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

  private destinoPosRetornoPorCategoria(
    categoria: PainelCategoria
  ): 'DISPONIVEL' | 'PATIO' | 'REALOCACAO' | 'BLOQUEADO' | null {
    if (categoria === 'DISPONIVEL' || categoria === 'PATIO' || categoria === 'REALOCACAO' || categoria === 'BLOQUEADO') {
      return categoria;
    }
    return null;
  }

  private statusRetornoViagemPorDestino(
    destino: 'DISPONIVEL' | 'PATIO' | 'REALOCACAO' | 'BLOQUEADO'
  ): StatusAdministrativoVeiculo | 'BASE_JOAO_GOULART' {
    if (destino === 'DISPONIVEL') {
      return 'BASE_JOAO_GOULART';
    }
    if (destino === 'PATIO') {
      return 'NO_PATIO';
    }
    if (destino === 'REALOCACAO') {
      return 'AGUARDANDO_REALOCACAO';
    }
    return 'BLOQUEADO';
  }

  private ehTransicaoEntreDisponivelEPatio(origem: PainelCategoria, destino: PainelCategoria): origem is 'DISPONIVEL' | 'PATIO' {
    return (origem === 'DISPONIVEL' && destino === 'PATIO')
      || (origem === 'PATIO' && destino === 'DISPONIVEL');
  }

  private statusAdministrativoPorDestinoPosRetorno(
    destino: 'DISPONIVEL' | 'PATIO' | 'REALOCACAO' | 'BLOQUEADO'
  ): StatusAdministrativoVeiculo | null {
    if (destino === 'PATIO') {
      return 'NO_PATIO';
    }
    if (destino === 'REALOCACAO') {
      return 'AGUARDANDO_REALOCACAO';
    }
    if (destino === 'BLOQUEADO') {
      return 'BLOQUEADO';
    }
    return null;
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
      this.refreshTempoRealSub = interval(5000).subscribe(() => this.atualizarPainelOperacional());
      return;
    }

    this.carregarMissoesTempoReal();
    this.refreshTempoRealSub = interval(5000).subscribe(() => this.carregarMissoesTempoReal());
  }

  private pararAtualizacaoTempoReal(): void {
    this.refreshTempoRealSub?.unsubscribe();
    this.refreshTempoRealSub = undefined;
  }

  private abrirConfirmacao(data: ConfirmDialogData, onConfirm: () => void): void {
    this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      width: 'min(92vw, 460px)',
      panelClass: 'admin-confirm-dialog',
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
