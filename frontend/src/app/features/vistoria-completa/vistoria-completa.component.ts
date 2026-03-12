import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { RotuloStatusVeiculoResponse } from '../../core/models/status-label.model';
import { StatusVeiculo, Veiculo } from '../../core/models/veiculo.model';
import { AuthService } from '../../core/services/auth.service';
import { StatusLabelService } from '../../core/services/status-label.service';
import { VeiculoService } from '../../core/services/veiculo.service';
import {
  ResultadoVistoriaCompleta,
  TipoItemObrigatorioVistoriaCompleta,
  TipoAvariaVistoriaCompleta,
  VistoriaCompletaResponse
} from '../../core/models/vistoria-completa.model';
import { CriarVistoriaCompletaPayload, VistoriaCompletaService } from '../../core/services/vistoria-completa.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/dialogs/confirm-dialog.component';

type VistoriaOperacao = 'SAIDA' | 'CHEGADA';
type FotoPontoKey = 'frente' | 'lateralEsq' | 'lateralDir' | 'traseira' | 'painel' | 'estepe';
type ItemObrigatorioStatus = '' | 'OK' | 'FALTANDO' | 'NAO_SE_APLICA';
type ResultadoVistoria = '' | ResultadoVistoriaCompleta;
type TipoAvaria = '' | TipoAvariaVistoriaCompleta;

interface ItemObrigatorio {
  key: string;
  label: string;
  status: ItemObrigatorioStatus;
  observacao: string;
}

interface FotoPonto {
  key: FotoPontoKey;
  label: string;
  hint: string;
}

interface AvariaDraft {
  id: number;
  local: string;
  tipo: TipoAvaria;
  descricao: string;
  jaExistia: boolean;
  fotoUrl: string | null;
  fotoArquivo?: File;
}

@Component({
  selector: 'app-vistoria-completa',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './vistoria-completa.component.html',
  styleUrl: './vistoria-completa.component.css'
})
export class VistoriaCompletaComponent implements OnInit, AfterViewChecked, OnDestroy {
  readonly totalEtapas = 5;
  private readonly maxPhotoDimension = 1600;
  private readonly jpegQuality = 0.78;
  readonly pontosFoto: FotoPonto[] = [
    { key: 'frente', label: 'Frente', hint: 'Pegue a parte frontal inteira do veiculo.' },
    { key: 'lateralEsq', label: 'Lateral esquerda', hint: 'Pegue a lateral inteira do lado esquerdo.' },
    { key: 'lateralDir', label: 'Lateral direita', hint: 'Pegue a lateral inteira do lado direito.' },
    { key: 'traseira', label: 'Traseira', hint: 'Pegue a parte traseira inteira do veiculo.' },
    { key: 'painel', label: 'Painel', hint: 'Mostre o painel com a quilometragem visivel.' },
    { key: 'estepe', label: 'Estepe', hint: 'Fotografe o estepe completo.' }
  ];
  readonly tiposAvaria: Array<{ value: TipoAvaria; label: string }> = [
    { value: 'AMASSADO', label: 'Amassado' },
    { value: 'RISCADO', label: 'Riscado' },
    { value: 'QUEBRADO', label: 'Quebrado' },
    { value: 'TRINCADO', label: 'Trincado' },
    { value: 'FALTANDO', label: 'Faltando' },
    { value: 'OUTRO', label: 'Outro' }
  ];

  veiculos: Veiculo[] = [];
  loading = false;
  sending = false;
  etapaAtual = 1;
  showSuccess = false;
  supportsCameraApi = false;
  activeCameraKey: FotoPontoKey | null = null;
  fallbackCaptureKey: FotoPontoKey | null = null;
  cameraError: string | null = null;
  lanternaDisponivel = false;
  lanternaAtiva = false;
  alternandoLanterna = false;
  localizacaoTexto = 'Capturando localizacao...';
  localizacaoErro: string | null = null;
  capturandoLocalizacao = false;
  operacao: VistoriaOperacao = 'SAIDA';
  dataHoraVistoria = new Date();
  resultado: ResultadoVistoria = '';
  observacaoGeral = '';
  possuiAvarias = false;
  avarias: AvariaDraft[] = [];
  numeroVistoriaLocal = '';
  ultimaVistoria: VistoriaCompletaResponse | null = null;
  veiculoIdConfirmadoParaEncerrarMissao: number | null = null;

  previews: Record<FotoPontoKey, string | null> = {
    frente: null,
    lateralEsq: null,
    lateralDir: null,
    traseira: null,
    painel: null,
    estepe: null
  };

  files: Partial<Record<FotoPontoKey, File>> = {};

  itensObrigatorios: ItemObrigatorio[] = [
    { key: 'chave', label: 'Chave do veiculo', status: '', observacao: '' },
    { key: 'documento', label: 'Documento do veiculo', status: '', observacao: '' },
    { key: 'macaco', label: 'Macaco', status: '', observacao: '' },
    { key: 'chaveRoda', label: 'Chave de roda', status: '', observacao: '' },
    { key: 'triangulo', label: 'Triangulo', status: '', observacao: '' },
    { key: 'estepeItem', label: 'Estepe', status: '', observacao: '' }
  ];

  readonly form;

  private nextAvariaId = 1;
  private cameraStream: MediaStream | null = null;
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

  @ViewChild('cameraVideo') cameraVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('fallbackInput') fallbackInput?: ElementRef<HTMLInputElement>;
  @ViewChild('avariaInput') avariaInput?: ElementRef<HTMLInputElement>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly veiculoService: VeiculoService,
    private readonly statusLabelService: StatusLabelService,
    private readonly authService: AuthService,
    private readonly snackBar: MatSnackBar,
    private readonly vistoriaCompletaService: VistoriaCompletaService,
    private readonly dialog: MatDialog
  ) {
    this.form = this.fb.nonNullable.group({
      veiculoId: [0, [Validators.required, Validators.min(1)]],
      quilometragem: ['', [Validators.required, Validators.pattern(/^\d+$/)]]
    });
  }

  ngOnInit(): void {
    this.supportsCameraApi = !!(window.isSecureContext && navigator.mediaDevices?.getUserMedia);
    const operacao = this.route.snapshot.queryParamMap.get('operacao');
    if (operacao === 'CHEGADA') {
      this.operacao = 'CHEGADA';
    }

    this.carregarVeiculos();
    this.carregarRotulosStatus();
    this.atualizarLocalizacao();
  }

  ngAfterViewChecked(): void {
    this.attachStreamToVideo();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.revokeAllUrls();
  }

  getDriverName(): string {
    return this.authService.loggedName() || 'Motorista';
  }

  progressoPercentual(): number {
    return Math.round((this.etapaAtual / this.totalEtapas) * 100);
  }

  tituloEtapaAtual(): string {
    switch (this.etapaAtual) {
      case 1:
        return 'Etapa 1 - Dados gerais';
      case 2:
        return 'Etapa 2 - Itens obrigatorios';
      case 3:
        return 'Etapa 3 - Fotos do veiculo';
      case 4:
        return 'Etapa 4 - Avarias';
      case 5:
        return 'Etapa 5 - Observacoes e resultado';
      default:
        return '';
    }
  }

  descricaoEtapaAtual(): string {
    switch (this.etapaAtual) {
      case 1:
        return 'Selecione o veiculo, confirme a operacao, registre a quilometragem e a localizacao.';
      case 2:
        return 'Marque os itens obrigatorios e explique o que estiver faltando.';
      case 3:
        return 'Capture os 6 pontos fotograficos obrigatorios da vistoria.';
      case 4:
        return 'Registre avarias somente se houver algo fora do padrao.';
      case 5:
        return 'Feche a vistoria com observacoes e o resultado final.';
      default:
        return '';
    }
  }

  operationTitle(): string {
    return this.operacao === 'SAIDA' ? 'Vistoria de saida' : 'Vistoria de chegada';
  }

  operationSubtitle(): string {
    return this.operacao === 'SAIDA'
      ? 'Registro detalhado antes de entregar o veiculo para uso externo.'
      : 'Registro detalhado no retorno do veiculo vindo de uso externo.';
  }

  uploadedPhotosCount(): number {
    return Object.values(this.files).filter(Boolean).length;
  }

  isReadyToSubmit(): boolean {
    return !this.sending;
  }

  veiculosVisiveis(): Veiculo[] {
    return this.veiculos.filter(v => !v.desativado);
  }

  semVeiculoDisponivel(): boolean {
    return this.veiculosVisiveis().length === 0;
  }

  selecionarVeiculo(veiculo: Veiculo): void {
    if (!this.canSelectVeiculo(veiculo)) {
      return;
    }
    if (this.form.controls.veiculoId.value !== veiculo.id) {
      this.veiculoIdConfirmadoParaEncerrarMissao = null;
    }
    this.form.controls.veiculoId.setValue(veiculo.id);
  }

  isVeiculoSelecionado(veiculo: Veiculo): boolean {
    return this.form.controls.veiculoId.value === veiculo.id;
  }

  canSelectVeiculo(veiculo: Veiculo): boolean {
    if (veiculo.desativado) {
      return false;
    }
    if (this.operacao === 'SAIDA' && this.veiculoComDeslocamentoAtivo(veiculo)) {
      return veiculo.motoristaAtualId === this.authService.loggedMotoristaId();
    }
    return true;
  }

  statusLabel(status: StatusVeiculo, statusRotuloServidor?: string | null): string {
    return statusRotuloServidor
      || this.statusLabelsCustomizados[status]
      || this.statusLabelsPadrao[status]
      || status;
  }

  statusClass(status: StatusVeiculo): string {
    return `status-${status.toLowerCase()}`;
  }

  exibeMotoristaAtual(veiculo: Veiculo): boolean {
    return this.veiculoComDeslocamentoAtivo(veiculo) && !!veiculo.motoristaAtualNome;
  }

  goNext(): void {
    if (!this.podeAvancarEtapaAtual()) {
      return;
    }
    if (this.etapaAtual === 1 && this.operacao === 'SAIDA' && this.veiculoSelecionadoRequerConfirmacaoEncerramento()) {
      this.confirmarEncerramentoMissaoAtivaParaVistoria();
      return;
    }
    if (this.etapaAtual < this.totalEtapas) {
      this.etapaAtual += 1;
    }
  }

  goBack(): void {
    if (this.etapaAtual === 1) {
      this.router.navigate(['/inicio']);
      return;
    }
    this.etapaAtual -= 1;
  }

  definirStatusItem(item: ItemObrigatorio, status: ItemObrigatorioStatus): void {
    item.status = status;
    if (status !== 'FALTANDO') {
      item.observacao = '';
    }
  }

  itemStatusLabel(status: ItemObrigatorioStatus): string {
    if (status === 'OK') {
      return 'OK';
    }
    if (status === 'FALTANDO') {
      return 'Faltando';
    }
    if (status === 'NAO_SE_APLICA') {
      return 'Nao se aplica';
    }
    return 'Selecione';
  }

  itemStatusClass(status: ItemObrigatorioStatus): string {
    if (status === 'OK') {
      return 'item-status-ok';
    }
    if (status === 'FALTANDO') {
      return 'item-status-faltando';
    }
    if (status === 'NAO_SE_APLICA') {
      return 'item-status-na';
    }
    return 'item-status-vazio';
  }

  async openCamera(key: FotoPontoKey): Promise<void> {
    if (!this.supportsCameraApi) {
      this.openFallbackCapture(key);
      return;
    }

    this.stopCamera();
    this.cameraError = null;
    this.activeCameraKey = key;

    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      this.atualizarSuporteLanterna();
      this.attachStreamToVideo();
    } catch {
      this.closeCamera();
      this.openFallbackCapture(key);
    }
  }

  closeCamera(): void {
    this.stopCamera();
    this.activeCameraKey = null;
  }

  getActivePhotoLabel(): string {
    return this.pontosFoto.find(item => item.key === this.activeCameraKey)?.label || '';
  }

  async captureFromCamera(): Promise<void> {
    if (!this.activeCameraKey || !this.cameraVideo?.nativeElement) {
      return;
    }

    const video = this.cameraVideo.nativeElement;
    if (!video.videoWidth || !video.videoHeight) {
      this.snackBar.open('Aguarde a camera iniciar.', 'Fechar', { duration: 1600 });
      return;
    }

    const { width, height } = this.calcularDimensoesOtimizadas(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.snackBar.open('Falha na captura.', 'Fechar', { duration: 1600 });
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.desenharCarimboDataHora(ctx, canvas.width, canvas.height);

    const file = await this.gerarArquivoJpeg(canvas, `${this.activeCameraKey}_${Date.now()}`);
    if (!file) {
      this.snackBar.open('Falha ao gerar imagem.', 'Fechar', { duration: 1600 });
      return;
    }

    const key = this.activeCameraKey;
    this.applyCapturedFile(key, file);
    this.snackBar.open('Foto capturada com sucesso.', 'Fechar', { duration: 1500 });
    this.closeCamera();
  }

  async onFallbackFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const key = this.fallbackCaptureKey;

    if (!file || !key) {
      input.value = '';
      return;
    }

    const arquivoCarimbado = await this.carimbarArquivoImagem(file, `${key}_${Date.now()}`);
    if (!arquivoCarimbado) {
      this.snackBar.open('Falha ao preparar imagem.', 'Fechar', { duration: 1800 });
      input.value = '';
      return;
    }

    this.applyCapturedFile(key, arquivoCarimbado);
    this.fallbackCaptureKey = null;
    this.cameraError = null;
    input.value = '';
  }

  clearPhoto(key: FotoPontoKey): void {
    this.files[key] = undefined;
    const oldPreview = this.previews[key];
    if (oldPreview) {
      URL.revokeObjectURL(oldPreview);
    }
    this.previews[key] = null;
  }

  async alternarLanterna(): Promise<void> {
    if (!this.lanternaDisponivel || this.alternandoLanterna || !this.cameraStream) {
      return;
    }

    const trilha = this.cameraStream.getVideoTracks()[0];
    if (!trilha) {
      return;
    }

    this.alternandoLanterna = true;
    const novoEstado = !this.lanternaAtiva;

    try {
      await trilha.applyConstraints({
        advanced: [{ torch: novoEstado } as MediaTrackConstraintSet & { torch: boolean }]
      });
      this.lanternaAtiva = novoEstado;
    } catch {
      this.snackBar.open('Lanterna nao suportada neste aparelho ou navegador.', 'Fechar', { duration: 2200 });
      this.lanternaDisponivel = false;
      this.lanternaAtiva = false;
    } finally {
      this.alternandoLanterna = false;
    }
  }

  adicionarAvaria(): void {
    this.possuiAvarias = true;
    this.avarias = [
      ...this.avarias,
      {
        id: this.nextAvariaId++,
        local: '',
        tipo: '',
        descricao: '',
        jaExistia: true,
        fotoUrl: null
      }
    ];
  }

  removerAvaria(id: number): void {
    const avaria = this.avarias.find(item => item.id === id);
    if (avaria?.fotoUrl) {
      URL.revokeObjectURL(avaria.fotoUrl);
    }
    this.avarias = this.avarias.filter(item => item.id !== id);
    if (this.avarias.length === 0) {
      this.possuiAvarias = false;
    }
  }

  togglePossuiAvarias(value: boolean): void {
    this.possuiAvarias = value;
    if (!value) {
      this.avarias.forEach(item => {
        if (item.fotoUrl) {
          URL.revokeObjectURL(item.fotoUrl);
        }
      });
      this.avarias = [];
      return;
    }

    if (this.avarias.length === 0) {
      this.adicionarAvaria();
    }
  }

  abrirCapturaAvaria(id: number): void {
    const input = this.avariaInput?.nativeElement;
    if (!input) {
      return;
    }

    input.dataset['avariaId'] = String(id);
    input.click();
  }

  async onAvariaFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const rawId = input.dataset['avariaId'];
    const file = input.files?.[0];
    const avariaId = Number(rawId);
    const avaria = this.avarias.find(item => item.id === avariaId);

    if (!file || !avaria) {
      input.value = '';
      return;
    }

    const arquivoCarimbado = await this.carimbarArquivoImagem(file, `avaria_${avariaId}_${Date.now()}`);
    if (!arquivoCarimbado) {
      this.snackBar.open('Falha ao preparar foto da avaria.', 'Fechar', { duration: 1800 });
      input.value = '';
      return;
    }

    if (avaria.fotoUrl) {
      URL.revokeObjectURL(avaria.fotoUrl);
    }

    avaria.fotoArquivo = arquivoCarimbado;
    avaria.fotoUrl = URL.createObjectURL(arquivoCarimbado);
    input.value = '';
  }

  limparFotoAvaria(id: number): void {
    const avaria = this.avarias.find(item => item.id === id);
    if (!avaria) {
      return;
    }

    if (avaria.fotoUrl) {
      URL.revokeObjectURL(avaria.fotoUrl);
    }
    avaria.fotoUrl = null;
    avaria.fotoArquivo = undefined;
  }

  resultadoLabel(resultado: ResultadoVistoria): string {
    if (resultado === 'APROVADO') {
      return 'Aprovado';
    }
    if (resultado === 'RESSALVA') {
      return 'Aprovado com ressalva';
    }
    if (resultado === 'REPROVADO') {
      return 'Reprovado / impede liberacao';
    }
    return 'Selecione o resultado';
  }

  resultadoClass(resultado: ResultadoVistoria): string {
    if (resultado === 'APROVADO') {
      return 'resultado-aprovado';
    }
    if (resultado === 'RESSALVA') {
      return 'resultado-ressalva';
    }
    if (resultado === 'REPROVADO') {
      return 'resultado-reprovado';
    }
    return 'resultado-vazio';
  }

  veiculoSelecionadoLabel(): string {
    const id = this.form.getRawValue().veiculoId;
    const veiculo = this.veiculos.find(item => item.id === id);
    if (!veiculo) {
      return '-';
    }

    return `${veiculo.placa} - ${veiculo.marca} ${veiculo.modelo}`;
  }

  veiculoSelecionadoAtual(): Veiculo | null {
    const id = this.form.getRawValue().veiculoId;
    if (!id) {
      return null;
    }
    return this.veiculos.find(item => item.id === id) ?? null;
  }

  veiculoSelecionadoTemMissaoAtiva(): boolean {
    const veiculo = this.veiculoSelecionadoAtual();
    return !!veiculo && this.operacao === 'SAIDA' && this.veiculoComDeslocamentoAtivo(veiculo);
  }

  veiculoSelecionadoRequerConfirmacaoEncerramento(): boolean {
    const veiculo = this.veiculoSelecionadoAtual();
    return !!veiculo
      && this.operacao === 'SAIDA'
      && this.veiculoComDeslocamentoAtivo(veiculo)
      && veiculo.motoristaAtualId === this.authService.loggedMotoristaId()
      && this.veiculoIdConfirmadoParaEncerrarMissao !== veiculo.id;
  }

  veiculoSelecionadoMissaoOutroMotorista(): boolean {
    const veiculo = this.veiculoSelecionadoAtual();
    return !!veiculo
      && this.operacao === 'SAIDA'
      && this.veiculoComDeslocamentoAtivo(veiculo)
      && veiculo.motoristaAtualId !== this.authService.loggedMotoristaId();
  }

  avisoMissaoAtivaSelecionada(): string | null {
    const veiculo = this.veiculoSelecionadoAtual();
    if (!veiculo || this.operacao !== 'SAIDA' || !this.veiculoComDeslocamentoAtivo(veiculo)) {
      return null;
    }
    if (veiculo.motoristaAtualId !== this.authService.loggedMotoristaId()) {
      return `Este veiculo esta em missao com ${veiculo.motoristaAtualNome || 'outro motorista'}. Finalize essa missao antes de iniciar a vistoria completa.`;
    }
    if (this.veiculoIdConfirmadoParaEncerrarMissao === veiculo.id) {
      return 'Confirmado: ao concluir a vistoria, a missao atual sera encerrada sem checklist e o veiculo ira para aguardando realocacao.';
    }
    return 'Este veiculo ainda esta em missao com voce. Para seguir com a vistoria completa de saida, a missao atual sera encerrada sem checklist no momento da conclusao.';
  }

  avariasPendentesResumo(): number {
    return this.avarias.length;
  }

  itensFaltandoResumo(): number {
    return this.itensObrigatorios.filter(item => item.status === 'FALTANDO').length;
  }

  concluirVistoria(): void {
    if (!this.validarEtapa5()) {
      return;
    }

    const payload = this.montarPayload();
    if (!payload) {
      this.snackBar.open('A vistoria ainda nao esta completa para envio.', 'Fechar', { duration: 2400 });
      return;
    }

    this.sending = true;
    this.vistoriaCompletaService.criar(payload)
      .pipe(finalize(() => (this.sending = false)))
      .subscribe({
        next: response => {
          this.ultimaVistoria = response;
          this.numeroVistoriaLocal = `VC-${response.id}`;
          this.showSuccess = true;
        },
        error: err => this.snackBar.open(err.error?.message || 'Falha ao salvar vistoria completa.', 'Fechar', { duration: 3400 })
      });
  }

  novaVistoria(): void {
    this.form.reset({
      veiculoId: 0,
      quilometragem: ''
    });
    this.etapaAtual = 1;
    this.showSuccess = false;
    this.ultimaVistoria = null;
    this.veiculoIdConfirmadoParaEncerrarMissao = null;
    this.numeroVistoriaLocal = '';
    this.dataHoraVistoria = new Date();
    this.resultado = '';
    this.observacaoGeral = '';
    this.togglePossuiAvarias(false);
    this.itensObrigatorios = this.itensObrigatorios.map(item => ({
      ...item,
      status: '',
      observacao: ''
    }));
    (Object.keys(this.previews) as FotoPontoKey[]).forEach(key => this.clearPhoto(key));
    this.atualizarLocalizacao();
  }

  voltarInicio(): void {
    this.router.navigate(['/inicio']);
  }

  private carregarVeiculos(): void {
    this.loading = true;
    this.veiculoService.listar()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: data => {
          this.veiculos = data;
          this.garantirVeiculoSelecionadoValido();
        },
        error: () => this.snackBar.open('Nao foi possivel carregar veiculos.', 'Fechar', { duration: 2800 })
      });
  }

  private carregarRotulosStatus(): void {
    this.statusLabelService.listar().subscribe({
      next: rotulos => this.aplicarRotulosStatus(rotulos),
      error: () => undefined
    });
  }

  private aplicarRotulosStatus(rotulos: RotuloStatusVeiculoResponse[]): void {
    for (const status of Object.keys(this.statusLabelsPadrao) as StatusVeiculo[]) {
      const item = rotulos.find(r => r.status === status);
      this.statusLabelsCustomizados[status] = item?.rotulo || this.statusLabelsPadrao[status];
    }
  }

  private garantirVeiculoSelecionadoValido(): void {
    const selectedId = this.form.controls.veiculoId.value;
    if (!selectedId) {
      return;
    }

    const selected = this.veiculos.find(v => v.id === selectedId);
    if (!selected || !this.canSelectVeiculo(selected)) {
      this.form.controls.veiculoId.setValue(0);
    }
  }

  private veiculoComDeslocamentoAtivo(veiculo: Veiculo): boolean {
    return veiculo.statusAutomatico === 'CIRCULANDO' || veiculo.statusAutomatico === 'EM_VIAGEM';
  }

  private podeAvancarEtapaAtual(): boolean {
    if (this.etapaAtual === 1) {
      return this.validarEtapa1();
    }
    if (this.etapaAtual === 2) {
      return this.validarEtapa2();
    }
    if (this.etapaAtual === 3) {
      return this.validarEtapa3();
    }
    if (this.etapaAtual === 4) {
      return this.validarEtapa4();
    }
    return true;
  }

  private validarEtapa1(): boolean {
    if (this.semVeiculoDisponivel()) {
      this.snackBar.open('Nao ha veiculo disponivel para esta operacao agora.', 'Fechar', { duration: 2600 });
      return false;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Selecione o veiculo e informe a quilometragem.', 'Fechar', { duration: 2600 });
      return false;
    }

    if (this.veiculoSelecionadoMissaoOutroMotorista()) {
      this.snackBar.open('Este veiculo esta em missao com outro motorista e nao pode seguir para a vistoria completa agora.', 'Fechar', { duration: 3200 });
      return false;
    }

    return true;
  }

  private validarEtapa2(): boolean {
    const itemSemStatus = this.itensObrigatorios.find(item => !item.status);
    if (itemSemStatus) {
      this.snackBar.open('Marque todos os itens obrigatorios antes de continuar.', 'Fechar', { duration: 2600 });
      return false;
    }

    const itemFaltandoSemObs = this.itensObrigatorios.find(item =>
      item.status === 'FALTANDO' && !item.observacao.trim()
    );
    if (itemFaltandoSemObs) {
      this.snackBar.open('Explique o item marcado como faltando.', 'Fechar', { duration: 2600 });
      return false;
    }

    return true;
  }

  private validarEtapa3(): boolean {
    const faltando = this.pontosFoto.find(item => !this.files[item.key]);
    if (faltando) {
      this.snackBar.open(`Capture a foto obrigatoria: ${faltando.label}.`, 'Fechar', { duration: 2600 });
      return false;
    }

    return true;
  }

  private validarEtapa4(): boolean {
    if (!this.possuiAvarias) {
      return true;
    }

    if (this.avarias.length === 0) {
      this.snackBar.open('Adicione ao menos uma avaria ou marque que nao ha avarias.', 'Fechar', { duration: 2600 });
      return false;
    }

    const avariaIncompleta = this.avarias.find(item =>
      !item.local.trim() || !item.tipo || !item.fotoArquivo
    );

    if (avariaIncompleta) {
      this.snackBar.open('Preencha local, tipo e foto de cada avaria.', 'Fechar', { duration: 2800 });
      return false;
    }

    return true;
  }

  private validarEtapa5(): boolean {
    if (!this.resultado) {
      this.snackBar.open('Selecione o resultado final da vistoria.', 'Fechar', { duration: 2600 });
      return false;
    }

    if (this.resultado === 'REPROVADO' && !this.observacaoGeral.trim()) {
      this.snackBar.open('Explique na observacao geral por que a vistoria foi reprovada.', 'Fechar', { duration: 2800 });
      return false;
    }

    return true;
  }

  private montarPayload(): CriarVistoriaCompletaPayload | null {
    const raw = this.form.getRawValue();
    const itemMap: Record<string, TipoItemObrigatorioVistoriaCompleta> = {
      chave: 'CHAVE_VEICULO',
      documento: 'DOCUMENTO_VEICULO',
      macaco: 'MACACO',
      chaveRoda: 'CHAVE_DE_RODA',
      triangulo: 'TRIANGULO',
      estepeItem: 'ESTEPE'
    };

    if (!raw.veiculoId || !raw.quilometragem) {
      return null;
    }

    const fotoFrente = this.files.frente;
    const fotoLateralEsq = this.files.lateralEsq;
    const fotoLateralDir = this.files.lateralDir;
    const fotoTraseira = this.files.traseira;
    const fotoPainel = this.files.painel;
    const fotoEstepe = this.files.estepe;

    if (!fotoFrente || !fotoLateralEsq || !fotoLateralDir || !fotoTraseira || !fotoPainel || !fotoEstepe || !this.resultado) {
      return null;
    }

    const fotosAvarias = this.avarias
      .map(item => item.fotoArquivo)
      .filter((file): file is File => !!file);

    return {
      veiculoId: raw.veiculoId,
      tipoOperacao: this.operacao === 'SAIDA' ? 'SAIDA' : 'ENTRADA',
      quilometragem: Number(raw.quilometragem),
      localizacao: this.localizacaoParaEnvio(),
      observacaoGeral: this.observacaoGeral.trim() || null,
      encerrarMissaoAtivaVeiculo: this.veiculoSelecionadoTemMissaoAtiva() && this.veiculoIdConfirmadoParaEncerrarMissao === raw.veiculoId,
      resultado: this.resultado,
      itens: this.itensObrigatorios.map(item => ({
        tipoItem: itemMap[item.key],
        status: item.status as Exclude<ItemObrigatorioStatus, ''>,
        observacao: item.observacao.trim() || null
      })),
      avarias: this.avarias.map(item => ({
        local: item.local.trim(),
        tipoAvaria: item.tipo as Exclude<TipoAvaria, ''>,
        descricao: item.descricao.trim(),
        jaExistia: item.jaExistia
      })),
      fotoFrente,
      fotoLateralEsq,
      fotoLateralDir,
      fotoTraseira,
      fotoPainel,
      fotoEstepe,
      fotosAvarias
    };
  }

  private localizacaoParaEnvio(): string | null {
    if (this.capturandoLocalizacao || this.localizacaoErro) {
      return null;
    }
    const texto = this.localizacaoTexto.trim();
    return texto.includes(',') ? texto : null;
  }

  private confirmarEncerramentoMissaoAtivaParaVistoria(): void {
    const veiculo = this.veiculoSelecionadoAtual();
    if (!veiculo) {
      return;
    }

    const dialogData: ConfirmDialogData = {
      title: 'Encerrar missao atual?',
      message: `O veiculo ${veiculo.placa} ainda esta em missao com voce.\n\nSe continuar, a missao atual sera encerrada sem checklist no momento da conclusao da vistoria completa, e o veiculo seguira para aguardando realocacao.`,
      confirmText: 'Encerrar e continuar',
      cancelText: 'Cancelar',
      confirmColor: 'primary'
    };

    this.dialog.open(ConfirmDialogComponent, { data: dialogData, width: '420px' })
      .afterClosed()
      .subscribe(confirmed => {
        if (!confirmed) {
          return;
        }
        this.veiculoIdConfirmadoParaEncerrarMissao = veiculo.id;
        if (this.etapaAtual < this.totalEtapas) {
          this.etapaAtual += 1;
        }
      });
  }

  atualizarLocalizacao(): void {
    if (!('geolocation' in navigator)) {
      this.localizacaoTexto = 'Localizacao nao suportada neste aparelho.';
      this.localizacaoErro = 'Sem suporte a geolocalizacao.';
      return;
    }

    this.capturandoLocalizacao = true;
    this.localizacaoErro = null;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude.toFixed(6);
        const lon = pos.coords.longitude.toFixed(6);
        this.localizacaoTexto = `${lat}, ${lon}`;
        this.capturandoLocalizacao = false;
      },
      () => {
        this.localizacaoTexto = 'Nao foi possivel capturar a localizacao automaticamente.';
        this.localizacaoErro = 'Permita a localizacao se quiser registrar a posicao da vistoria.';
        this.capturandoLocalizacao = false;
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  private openFallbackCapture(key: FotoPontoKey): void {
    this.stopCamera();
    this.activeCameraKey = null;
    this.fallbackCaptureKey = key;
    this.cameraError = 'Captura direta indisponivel. Abrindo camera nativa do aparelho.';
    this.fallbackInput?.nativeElement.click();
  }

  private applyCapturedFile(key: FotoPontoKey, file: File): void {
    const oldPreview = this.previews[key];
    if (oldPreview) {
      URL.revokeObjectURL(oldPreview);
    }
    this.files[key] = file;
    this.previews[key] = URL.createObjectURL(file);
  }

  private attachStreamToVideo(): void {
    if (!this.cameraStream || !this.cameraVideo?.nativeElement) {
      return;
    }

    const video = this.cameraVideo.nativeElement;
    if (video.srcObject !== this.cameraStream) {
      video.srcObject = this.cameraStream;
      video.play().catch(() => undefined);
    }
  }

  private stopCamera(): void {
    this.lanternaDisponivel = false;
    this.lanternaAtiva = false;
    this.alternandoLanterna = false;
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    if (this.cameraVideo?.nativeElement) {
      this.cameraVideo.nativeElement.srcObject = null;
    }
  }

  private atualizarSuporteLanterna(): void {
    const trilha = this.cameraStream?.getVideoTracks()[0];
    if (!trilha || typeof trilha.getCapabilities !== 'function') {
      this.lanternaDisponivel = false;
      this.lanternaAtiva = false;
      return;
    }

    const capacidades = trilha.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
    this.lanternaDisponivel = !!capacidades.torch;
    if (!this.lanternaDisponivel) {
      this.lanternaAtiva = false;
    }
  }

  private desenharCarimboDataHora(ctx: CanvasRenderingContext2D, largura: number, altura: number): void {
    const texto = this.dataHoraCarimbo();
    const padding = Math.max(14, Math.round(largura * 0.015));
    const fontSize = Math.max(20, Math.round(largura * 0.024));

    ctx.save();
    ctx.font = `700 ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    const metrics = ctx.measureText(texto);
    const boxWidth = metrics.width + padding * 2;
    const boxHeight = fontSize + padding * 1.4;
    const x = largura - padding;
    const y = altura - padding;

    ctx.fillStyle = 'rgba(8, 17, 11, 0.72)';
    ctx.fillRect(largura - boxWidth - padding / 2, altura - boxHeight - padding / 2, boxWidth, boxHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(texto, x, y);
    ctx.restore();
  }

  private dataHoraCarimbo(): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date());
  }

  private async gerarArquivoJpeg(canvas: HTMLCanvasElement, nomeBase: string): Promise<File | null> {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', this.jpegQuality));
    if (!blob) {
      return null;
    }

    return new File([blob], `${nomeBase}.jpg`, { type: 'image/jpeg' });
  }

  private async carimbarArquivoImagem(file: File, nomeBase: string): Promise<File | null> {
    const imagem = await this.carregarImagem(file);
    if (!imagem) {
      return null;
    }

    const { width, height } = this.calcularDimensoesOtimizadas(
      imagem.naturalWidth || imagem.width,
      imagem.naturalHeight || imagem.height
    );
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    this.desenharCarimboDataHora(ctx, canvas.width, canvas.height);
    return this.gerarArquivoJpeg(canvas, nomeBase);
  }

  private calcularDimensoesOtimizadas(width: number, height: number): { width: number; height: number } {
    if (!width || !height) {
      return { width: this.maxPhotoDimension, height: this.maxPhotoDimension };
    }

    const maiorLado = Math.max(width, height);
    if (maiorLado <= this.maxPhotoDimension) {
      return { width, height };
    }

    const escala = this.maxPhotoDimension / maiorLado;
    return {
      width: Math.max(1, Math.round(width * escala)),
      height: Math.max(1, Math.round(height * escala))
    };
  }

  private carregarImagem(file: File): Promise<HTMLImageElement | null> {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const imagem = new Image();
      imagem.onload = () => {
        URL.revokeObjectURL(url);
        resolve(imagem);
      };
      imagem.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      imagem.src = url;
    });
  }

  private revokeAllUrls(): void {
    (Object.keys(this.previews) as FotoPontoKey[]).forEach(key => {
      const url = this.previews[key];
      if (url) {
        URL.revokeObjectURL(url);
      }
    });

    this.avarias.forEach(item => {
      if (item.fotoUrl) {
        URL.revokeObjectURL(item.fotoUrl);
      }
    });
  }
}
