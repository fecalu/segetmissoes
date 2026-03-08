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
import { finalize } from 'rxjs';
import { ChecklistResponse, TipoOperacao } from '../../core/models/checklist.model';
import { Motorista } from '../../core/models/motorista.model';
import { StatusVeiculo, Veiculo } from '../../core/models/veiculo.model';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

type AdminMenu = 'dashboard' | 'veiculos' | 'motoristas' | 'checklists';

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
  activeMenu: AdminMenu = 'dashboard';
  filtrosAbertos = false;

  motoristas: Motorista[] = [];
  veiculos: Veiculo[] = [];
  checklists: ChecklistResponse[] = [];

  loadingMotoristas = false;
  loadingVeiculos = false;
  loadingChecklists = false;

  editingMotoristaId: number | null = null;
  editingVeiculoId: number | null = null;

  motoristaBusca = '';
  veiculoBusca = '';

  selectedChecklist: ChecklistResponse | null = null;

  readonly motoristaForm;
  readonly veiculoForm;
  readonly filtroForm;

  constructor(
    private readonly fb: FormBuilder,
    private readonly adminService: AdminService,
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
      marca: ['', [Validators.required]],
      status: ['ATIVO' as StatusVeiculo, [Validators.required]]
    });

    this.filtroForm = this.fb.nonNullable.group({
      busca: [''],
      motoristaId: [0],
      veiculoId: [0],
      tipoOperacao: ['' as '' | TipoOperacao],
      dataInicio: [''],
      dataFim: ['']
    });
  }

  ngOnInit(): void {
    const menuParam = this.route.snapshot.queryParamMap.get('menu');
    if (menuParam === 'dashboard' || menuParam === 'veiculos' || menuParam === 'motoristas' || menuParam === 'checklists') {
      this.activeMenu = menuParam;
    }

    this.carregarMotoristas();
    this.carregarVeiculos();
    this.buscarChecklists();
  }

  setMenu(menu: AdminMenu): void {
    this.activeMenu = menu;
  }

  toggleFiltros(): void {
    this.filtrosAbertos = !this.filtrosAbertos;
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
        next: data => (this.veiculos = data),
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
      marca: raw.marca,
      status: raw.status
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
      marca: veiculo.marca,
      status: veiculo.status
    });
  }

  cancelarEdicaoVeiculo(): void {
    this.editingVeiculoId = null;
    this.veiculoForm.reset({ placa: '', modelo: '', marca: '', status: 'ATIVO' });
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

  buscarChecklists(): void {
    this.loadingChecklists = true;
    const raw = this.filtroForm.getRawValue();
    this.adminService.listarChecklists({
      busca: raw.busca || undefined,
      motoristaId: raw.motoristaId > 0 ? raw.motoristaId : undefined,
      veiculoId: raw.veiculoId > 0 ? raw.veiculoId : undefined,
      tipoOperacao: raw.tipoOperacao || undefined,
      dataInicio: raw.dataInicio || undefined,
      dataFim: raw.dataFim || undefined
    })
      .pipe(finalize(() => (this.loadingChecklists = false)))
      .subscribe({
        next: data => (this.checklists = data),
        error: () => this.snackBar.open('Falha ao carregar checklists.', 'Fechar', { duration: 3000 })
      });
  }

  limparFiltros(): void {
    this.filtroForm.reset({
      busca: '',
      motoristaId: 0,
      veiculoId: 0,
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

  totalVeiculosAtivos(): number {
    return this.veiculos.filter(v => v.status === 'ATIVO').length;
  }

  totalVeiculosInativos(): number {
    return this.veiculos.filter(v => v.status === 'INATIVO').length;
  }

  tipoOperacaoLabel(value: string): string {
    return value === 'ENTRADA' ? 'CHEGADA' : 'SAIDA';
  }

  logout(): void {
    this.authService.logout();
  }
}

