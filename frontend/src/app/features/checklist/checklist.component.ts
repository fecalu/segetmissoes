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
import { StatusVeiculo, Veiculo } from '../../core/models/veiculo.model';
import { ChecklistPayload, ChecklistService } from '../../core/services/checklist.service';
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
  private cameraStream: MediaStream | null = null;
  @ViewChild('cameraVideo') cameraVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('fallbackInput') fallbackInput?: ElementRef<HTMLInputElement>;

  readonly form;
  operacaoBloqueada: 'SAIDA' | 'ENTRADA' | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly veiculoService: VeiculoService,
    private readonly checklistService: ChecklistService,
    private readonly authService: AuthService,
    private readonly snackBar: MatSnackBar
  ) {
    this.form = this.fb.nonNullable.group({
      veiculoId: [0, [Validators.required, Validators.min(1)]],
      tipoOperacao: ['SAIDA', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.supportsCameraApi = !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const operacao = this.route.snapshot.queryParamMap.get('operacao');
    if (operacao === 'SAIDA' || operacao === 'ENTRADA') {
      this.operacaoBloqueada = operacao;
      this.form.controls.tipoOperacao.setValue(operacao);
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
    return veiculo.statusAutomatico === 'CIRCULANDO' && veiculo.motoristaAtualId === this.authService.loggedMotoristaId();
  }

  veiculosVisiveis(): Veiculo[] {
    if (this.form.controls.tipoOperacao.value === 'ENTRADA') {
      return this.veiculos.filter(v => v.statusAutomatico === 'CIRCULANDO' && v.motoristaAtualId === this.authService.loggedMotoristaId());
    }
    return this.veiculos;
  }

  semVeiculoParaChegada(): boolean {
    return this.form.controls.tipoOperacao.value === 'ENTRADA' && this.veiculosVisiveis().length === 0;
  }

  statusLabel(status: StatusVeiculo): string {
    const labels: Record<StatusVeiculo, string> = {
      CIRCULANDO: 'NA RUA (MISSAO)',
      BASE_JOAO_GOULART: 'DISPONIVEL',
      NO_PATIO: 'NO PATIO',
      AGUARDANDO_REALOCACAO: 'AGUARDANDO REALOCACAO',
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

  exibeMotoristaAtual(veiculo: Veiculo): boolean {
    return veiculo.statusAutomatico === 'CIRCULANDO' && !!veiculo.motoristaAtualNome;
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

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.snackBar.open('Falha na captura.', 'Fechar', { duration: 1600 });
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      this.snackBar.open('Falha ao gerar imagem.', 'Fechar', { duration: 1600 });
      return;
    }

    const key = this.activeCameraKey;
    const file = new File([blob], `${key}_${Date.now()}.jpg`, { type: 'image/jpeg' });
    this.applyCapturedFile(key, file);

    this.snackBar.open('Foto capturada com sucesso.', 'Fechar', { duration: 1500 });
    this.closeCamera();
  }

  onFallbackFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const key = this.fallbackCaptureKey;

    if (!file || !key) {
      input.value = '';
      return;
    }

    this.applyCapturedFile(key, file);
    this.fallbackCaptureKey = null;
    this.cameraError = null;
    input.value = '';
    this.snackBar.open('Foto capturada com sucesso.', 'Fechar', { duration: 1500 });
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
    return value === 'SAIDA' ? 'Estou saindo em missao' : 'Estou chegando da missao';
  }

  operationTitle(): string {
    return this.form.controls.tipoOperacao.value === 'SAIDA' ? 'Iniciar Missao' : 'Finalizar Missao';
  }

  step1Title(): string {
    return this.isStep1Externa() ? 'Etapa 1 - Fotos externas' : 'Etapa 1 - Foto do painel';
  }

  step1Helper(): string {
    return this.isStep1Externa()
      ? 'Capture primeiro estepe e laterais do veiculo.'
      : 'Na chegada, comece pelo painel com a quilometragem visivel.';
  }

  step2Title(): string {
    return this.isStep2Externa() ? 'Etapa 2 - Fotos externas finais' : 'Etapa 2 - Foto final do painel';
  }

  step2Helper(): string {
    return this.isStep2Externa()
      ? 'Agora capture estepe e laterais para fechar a vistoria da chegada.'
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
    this.form.patchValue({ veiculoId: 0, tipoOperacao: 'SAIDA' });
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
}
