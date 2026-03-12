import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { TipoDeslocamentoMissao } from '../../core/models/missao.model';
import { StatusVeiculo, Veiculo } from '../../core/models/veiculo.model';
import { RotuloStatusVeiculoResponse } from '../../core/models/status-label.model';
import { ChecklistPayload, ChecklistService } from '../../core/services/checklist.service';
import { StatusLabelService } from '../../core/services/status-label.service';
import { VeiculoService } from '../../core/services/veiculo.service';
import { AuthService } from '../../core/services/auth.service';

type FotoKey = 'fotoPainel' | 'fotoEstepe' | 'fotoLateralEsq' | 'fotoLateralDir';

@Component({
  selector: 'app-checklist',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './checklist.component.html',
  styleUrl: './checklist.component.css'
})
export class ChecklistComponent implements OnInit, AfterViewChecked, OnDestroy {
  private readonly maxPhotoDimension = 1600;
  private readonly jpegQuality = 0.78;
  veiculos: Veiculo[] = [];
  loading = false;
  sending = false;
  currentStep = 1;
  showSuccess = false;
  lastChecklistId: number | null = null;

  readonly externalPhotos: Array<{ key: FotoKey; label: string; hint: string }> = [
    { key: 'fotoEstepe', label: 'Estepe', hint: 'Fotografe o estepe completo.' },
    { key: 'fotoLateralEsq', label: 'Lateral esquerda', hint: 'Pegue a lateral inteira.' },
    { key: 'fotoLateralDir', label: 'Lateral direita', hint: 'Pegue a lateral inteira.' }
  ];

  readonly panelPhoto = { key: 'fotoPainel' as FotoKey, label: 'Painel', hint: 'Fotografe o painel com quilometragem visivel.' };

  previews: Record<FotoKey, string | null> = {
    fotoPainel: null,
    fotoEstepe: null,
    fotoLateralEsq: null,
    fotoLateralDir: null
  };

  files: Partial<Record<FotoKey, File>> = {};
  supportsCameraApi = false;
  activeCameraKey: FotoKey | null = null;
  fallbackCaptureKey: FotoKey | null = null;
  cameraError: string | null = null;
  lanternaDisponivel = false;
  lanternaAtiva = false;
  alternandoLanterna = false;
  private cameraStream: MediaStream | null = null;
  @ViewChild('cameraVideo') cameraVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('fallbackInput') fallbackInput?: ElementRef<HTMLInputElement>;

  readonly form;
  operacaoBloqueada: 'SAIDA' | 'ENTRADA' | null = null;
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

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly veiculoService: VeiculoService,
    private readonly checklistService: ChecklistService,
    private readonly statusLabelService: StatusLabelService,
    private readonly authService: AuthService,
    private readonly snackBar: MatSnackBar
  ) {
    this.form = this.fb.nonNullable.group({
      veiculoId: [0, [Validators.required, Validators.min(1)]],
      tipoOperacao: ['SAIDA', [Validators.required]],
      tipoDeslocamento: ['NA_CIDADE' as TipoDeslocamentoMissao, [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.supportsCameraApi = !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const operacao = this.route.snapshot.queryParamMap.get('operacao');
    if (operacao === 'SAIDA' || operacao === 'ENTRADA') {
      this.operacaoBloqueada = operacao;
      this.form.controls.tipoOperacao.setValue(operacao);
    }
    const tipoDeslocamento = this.route.snapshot.queryParamMap.get('tipoDeslocamento');
    if (tipoDeslocamento === 'NA_CIDADE' || tipoDeslocamento === 'VIAGEM') {
      this.form.controls.tipoDeslocamento.setValue(tipoDeslocamento);
    }

    this.loading = true;
    this.veiculoService.listar()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: data => {
          this.veiculos = data;
          this.garantirVeiculoSelecionadoValido();
        },
        error: () => this.snackBar.open('Nao foi possivel carregar veiculos.', 'Fechar', { duration: 3000 })
      });

    this.form.controls.tipoOperacao.valueChanges.subscribe(() => this.garantirVeiculoSelecionadoValido());
    this.carregarRotulosStatus();
  }

  ngAfterViewChecked(): void {
    this.attachStreamToVideo();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.revokeAllPreviews();
  }

  getDriverName(): string {
    return this.authService.loggedName() || 'Motorista';
  }

  uploadedPhotosCount(): number {
    return Object.values(this.files).filter(Boolean).length;
  }

  totalSteps(): number {
    return 3;
  }

  stepProgressPercent(): number {
    return Math.round((this.currentStep / this.totalSteps()) * 100);
  }

  canAdvanceFromStep1(): boolean {
    return this.isStep1Externa()
      ? this.externalPhotos.every(photo => !!this.files[photo.key])
      : !!this.files.fotoPainel;
  }

  canAdvanceFromStep2(): boolean {
    return this.isStep2Externa()
      ? this.externalPhotos.every(photo => !!this.files[photo.key])
      : !!this.files.fotoPainel;
  }

  isReadyToSend(): boolean {
    return this.form.valid && this.canAdvanceFromStep1() && this.canAdvanceFromStep2() && !this.sending;
  }

  goNext(): void {
    if (this.currentStep === 1 && !this.canAdvanceFromStep1()) {
      this.snackBar.open(this.isStep1Externa()
        ? 'Capture as 3 fotos externas para continuar.'
        : 'Capture a foto do painel para continuar.', 'Fechar', { duration: 2200 });
      return;
    }
    if (this.currentStep === 2 && !this.canAdvanceFromStep2()) {
      this.snackBar.open(this.isStep2Externa()
        ? 'Capture as 3 fotos externas para continuar.'
        : 'Capture a foto do painel para continuar.', 'Fechar', { duration: 2200 });
      return;
    }
    if (this.currentStep < this.totalSteps()) {
      this.currentStep += 1;
    }
  }

  goBack(): void {
    if (this.currentStep === 1) {
      this.router.navigate(['/inicio']);
      return;
    }
    this.currentStep -= 1;
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

  canSelectVeiculo(veiculo: Veiculo): boolean {
    const tipoOperacao = this.form.controls.tipoOperacao.value;
    if (tipoOperacao === 'SAIDA') {
      return veiculo.statusAtual === 'BASE_JOAO_GOULART' || veiculo.statusAtual === 'NO_PATIO';
    }
    return this.veiculoCorrespondeAoTipoSelecionado(veiculo) && veiculo.motoristaAtualId === this.authService.loggedMotoristaId();
  }

  veiculosVisiveis(): Veiculo[] {
    if (this.form.controls.tipoOperacao.value === 'ENTRADA') {
      return this.veiculos.filter(v => this.veiculoCorrespondeAoTipoSelecionado(v) && v.motoristaAtualId === this.authService.loggedMotoristaId());
    }
    return this.veiculos;
  }

  semVeiculoParaChegada(): boolean {
    return this.form.controls.tipoOperacao.value === 'ENTRADA' && this.veiculosVisiveis().length === 0;
  }

  mensagemSemVeiculoParaChegada(): string {
    return this.isViagemSelecionada()
      ? 'Nenhuma viagem aberta encontrada para voce finalizar com checklist de chegada.'
      : 'Nenhuma missao aberta encontrada para voce finalizar com checklist de chegada.';
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

  async openCamera(key: FotoKey): Promise<void> {
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

    const file = await this.gerarArquivoJpeg(canvas, this.activeCameraKey);
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

    const arquivoCarimbado = await this.carimbarArquivoImagem(file, key);
    if (!arquivoCarimbado) {
      this.snackBar.open('Falha ao preparar imagem.', 'Fechar', { duration: 1800 });
      input.value = '';
      return;
    }

    this.applyCapturedFile(key, arquivoCarimbado);
    this.fallbackCaptureKey = null;
    this.cameraError = null;
    input.value = '';
    this.snackBar.open('Foto capturada com sucesso.', 'Fechar', { duration: 1500 });
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

  clearPhoto(key: FotoKey): void {
    this.files[key] = undefined;
    const oldPreview = this.previews[key];
    if (oldPreview) {
      URL.revokeObjectURL(oldPreview);
    }
    this.previews[key] = null;
  }

  getActivePhotoLabel(): string {
    if (!this.activeCameraKey) {
      return '';
    }
    if (this.activeCameraKey === 'fotoPainel') {
      return this.panelPhoto.label;
    }
    return this.externalPhotos.find(p => p.key === this.activeCameraKey)?.label || '';
  }

  operationLabel(value: string): string {
    if (value === 'SAIDA') {
      return this.isViagemSelecionada() ? 'Estou saindo em viagem' : 'Estou saindo em missao';
    }
    return this.isViagemSelecionada() ? 'Estou retornando da viagem' : 'Estou chegando da missao';
  }

  tipoDeslocamentoLabel(value: TipoDeslocamentoMissao): string {
    return value === 'VIAGEM' ? 'Viagem' : 'Na cidade';
  }

  operationTitle(): string {
    if (this.form.controls.tipoOperacao.value === 'SAIDA') {
      return this.isViagemSelecionada() ? 'Iniciar Viagem' : 'Iniciar Missao';
    }
    return this.isViagemSelecionada() ? 'Finalizar Viagem' : 'Finalizar Missao';
  }

  step1Title(): string {
    return this.isStep1Externa() ? 'Etapa 1 - Fotos externas' : 'Etapa 1 - Foto do painel';
  }

  step1Helper(): string {
    return this.isStep1Externa()
      ? 'Capture primeiro estepe e laterais do veiculo.'
      : this.isViagemSelecionada()
        ? 'No retorno da viagem, comece pelo painel com a quilometragem visivel.'
        : 'Na chegada, comece pelo painel com a quilometragem visivel.';
  }

  step2Title(): string {
    return this.isStep2Externa() ? 'Etapa 2 - Fotos externas finais' : 'Etapa 2 - Foto final do painel';
  }

  step2Helper(): string {
    return this.isStep2Externa()
      ? this.isViagemSelecionada()
        ? 'Agora capture estepe e laterais para fechar a saida da viagem.'
        : 'Agora capture estepe e laterais para fechar a saida da missao.'
      : 'Agora entre no veiculo e fotografe o painel com a quilometragem visivel.';
  }

  submit(): void {
    if (!this.isReadyToSend()) {
      this.snackBar.open('Complete todas as etapas antes do envio.', 'Fechar', { duration: 2200 });
      return;
    }

    const raw = this.form.getRawValue();
    const payload: ChecklistPayload = {
      veiculoId: raw.veiculoId,
      tipoOperacao: raw.tipoOperacao as 'SAIDA' | 'ENTRADA',
      tipoDeslocamento: raw.tipoOperacao === 'SAIDA'
        ? raw.tipoDeslocamento as TipoDeslocamentoMissao
        : 'NA_CIDADE',
      fotoPainel: this.files.fotoPainel!,
      fotoEstepe: this.files.fotoEstepe!,
      fotoLateralEsq: this.files.fotoLateralEsq!,
      fotoLateralDir: this.files.fotoLateralDir!
    };

    this.sending = true;
    this.checklistService.criar(payload)
      .pipe(finalize(() => (this.sending = false)))
      .subscribe({
        next: res => {
          this.lastChecklistId = res.id;
          this.showSuccess = true;
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Falha ao enviar checklist.', 'Fechar', { duration: 3200 })
      });
  }

  novoChecklist(): void {
    this.form.patchValue({ veiculoId: 0, tipoOperacao: 'SAIDA', tipoDeslocamento: 'NA_CIDADE' });
    this.files = {};
    this.revokeAllPreviews();
    this.previews = { fotoPainel: null, fotoEstepe: null, fotoLateralEsq: null, fotoLateralDir: null };
    this.currentStep = 1;
    this.showSuccess = false;
    this.lastChecklistId = null;
  }

  voltarInicio(): void {
    this.router.navigate(['/inicio']);
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

  private revokeAllPreviews(): void {
    Object.values(this.previews).forEach(url => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
  }

  private openFallbackCapture(key: FotoKey): void {
    this.stopCamera();
    this.activeCameraKey = null;
    this.fallbackCaptureKey = key;
    this.cameraError = 'Captura direta indisponivel em HTTP. Abrindo camera nativa do aparelho.';
    this.fallbackInput?.nativeElement.click();
  }

  private applyCapturedFile(key: FotoKey, file: File): void {
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

  isStep1Externa(): boolean {
    return this.form.controls.tipoOperacao.value === 'SAIDA';
  }

  isStep2Externa(): boolean {
    return !this.isStep1Externa();
  }

  private veiculoComDeslocamentoAtivo(veiculo: Veiculo): boolean {
    return veiculo.statusAutomatico === 'CIRCULANDO' || veiculo.statusAutomatico === 'EM_VIAGEM';
  }

  private veiculoCorrespondeAoTipoSelecionado(veiculo: Veiculo): boolean {
    if (!this.veiculoComDeslocamentoAtivo(veiculo)) {
      return false;
    }
    return this.isViagemSelecionada()
      ? veiculo.statusAutomatico === 'EM_VIAGEM'
      : veiculo.statusAutomatico === 'CIRCULANDO';
  }

  private isViagemSelecionada(): boolean {
    return this.form.controls.tipoDeslocamento.value === 'VIAGEM';
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

  private async gerarArquivoJpeg(canvas: HTMLCanvasElement, key: FotoKey): Promise<File | null> {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', this.jpegQuality));
    if (!blob) {
      return null;
    }

    return new File([blob], `${key}_${Date.now()}.jpg`, { type: 'image/jpeg' });
  }

  private async carimbarArquivoImagem(file: File, key: FotoKey): Promise<File | null> {
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
    return this.gerarArquivoJpeg(canvas, key);
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
}
