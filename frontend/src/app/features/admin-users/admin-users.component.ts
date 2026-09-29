import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { Perfil, PERFIL_LABELS } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

interface Usuario {
  id: number;
  nome: string;
  login: string;
  cpf: string | null;
  perfil: Perfil;
  acessoHabilitado: boolean;
  deveAlterarSenha: boolean;
  cadastroCompleto: boolean;
  motoristaOperacional: boolean;
}
interface EventoAcesso {
  id: number; autorNome: string; autorPerfil: Perfil; entidade: string; registroId: number;
  acao: string; campo: string | null; valorAnterior: string | null; valorNovo: string | null;
  justificativa: string | null; dataHora: string;
}

@Component({
  selector: 'app-admin-users',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent {
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly url = environment.apiBaseUrl + '/admin/usuarios';
  readonly auditOnly = inject(ActivatedRoute).snapshot.data['auditOnly'] === true;
  readonly labels = PERFIL_LABELS;
  readonly perfis: Perfil[] = ['ADMIN', 'GESTOR', 'OPERADOR', 'VISUALIZADOR', 'MOTORISTA'];
  readonly descriptions: Record<Perfil, string> = {
    ADMIN: 'Acesso completo, incluindo configurações e gestão de usuários.',
    GESTOR: 'Supervisão, correções, liberações e cadastros operacionais.',
    OPERADOR: 'Saídas, retornos e consultas da rotina. Sem poderes de correção ou liberação.',
    VISUALIZADOR: 'Consulta painéis, relatórios e históricos. Não altera dados.',
    MOTORISTA: 'Missões e checklists pelo aplicativo do motorista.'
  };
  usuarios: Usuario[] = [];
  eventos: EventoAcesso[] = [];
  busca = '';
  loading = false;
  saving = false;
  error = '';
  success = '';
  editorError = '';
  editing: Usuario | null = null;
  acessoAlvo: Usuario | null = null;
  motivoAcesso = '';
  @ViewChild('editor') editor?: ElementRef<HTMLDialogElement>;
  @ViewChild('accessDialog') accessDialog?: ElementRef<HTMLDialogElement>;
  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(160)]],
    login: ['', [Validators.required, Validators.maxLength(100)]],
    cpf: ['', [Validators.pattern(/^\d{11}$/)]],
    senha: [''],
    perfil: ['OPERADOR' as Perfil, Validators.required],
    motoristaOperacional: [false]
  });

  constructor() { this.carregar(); }
  get filtrados(): Usuario[] {
    const busca = this.busca.trim().toLocaleLowerCase('pt-BR');
    return this.usuarios.filter(u => `${u.nome} ${u.login} ${this.labels[u.perfil]} ${u.motoristaOperacional ? 'motorista' : ''}`.toLocaleLowerCase('pt-BR').includes(busca));
  }

  carregar(): void {
    this.loading = true; this.error = '';
    if (this.auditOnly) {
      this.http.get<EventoAcesso[]>(this.url + '/auditoria').pipe(finalize(() => this.loading = false)).subscribe({
        next: data => this.eventos = data.filter(item => item.entidade === 'USUARIO'), error: err => this.error = this.message(err)
      });
    } else {
      this.http.get<Usuario[]>(this.url).pipe(finalize(() => this.loading = false)).subscribe({
        next: data => this.usuarios = data, error: err => this.error = this.message(err)
      });
    }
  }

  abrir(usuario: Usuario | null = null): void {
    this.editing = usuario; this.editorError = '';
    this.form.reset({
      nome: usuario?.nome || '',
      login: usuario?.login || '',
      cpf: usuario?.cpf || '',
      senha: '',
      perfil: usuario?.perfil || 'OPERADOR',
      motoristaOperacional: usuario?.motoristaOperacional || usuario?.perfil === 'MOTORISTA' || false
    });
    this.editor?.nativeElement.showModal();
  }

  salvar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    if ((!this.editing || raw.senha) && (raw.senha.length < 6 || raw.senha.length > 100)) {
      this.editorError = 'Informe uma senha entre 6 e 100 caracteres.'; return;
    }
    const payload = {
      ...raw,
      nome: raw.nome.trim(),
      login: raw.login.trim(),
      cpf: raw.cpf.trim() || null,
      senha: raw.senha || undefined,
      motoristaOperacional: raw.motoristaOperacional || raw.perfil === 'MOTORISTA'
    };
    this.saving = true; this.editorError = '';
    const request = this.editing ? this.http.put<Usuario>(this.url + '/' + this.editing.id, payload) : this.http.post<Usuario>(this.url, payload);
    request.pipe(finalize(() => this.saving = false)).subscribe({
      next: () => {
        const ownAccount = this.editing?.id === this.auth.loggedMotoristaId();
        this.editor?.nativeElement.close(); this.success = 'Acesso salvo. A alteração foi registrada no histórico.';
        if (ownAccount) this.auth.refreshSession().subscribe({ error: () => {} });
        this.carregar();
      }, error: err => this.editorError = this.message(err)
    });
  }

  abrirAcesso(usuario: Usuario): void {
    this.acessoAlvo = usuario; this.motivoAcesso = ''; this.editorError = '';
    this.accessDialog?.nativeElement.showModal();
  }

  alterarAcesso(): void {
    if (!this.acessoAlvo || this.motivoAcesso.trim().length < 10) return;
    this.saving = true;
    const ownAccount = this.acessoAlvo.id === this.auth.loggedMotoristaId();
    this.http.patch<Usuario>(this.url + '/' + this.acessoAlvo.id + '/acesso', {
      habilitado: !this.acessoAlvo.acessoHabilitado, justificativa: this.motivoAcesso.trim()
    }).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => {
        this.accessDialog?.nativeElement.close();
        if (ownAccount) { this.auth.logout(); return; }
        this.success = 'Situação do acesso atualizada.'; this.carregar();
      }, error: err => this.editorError = this.message(err)
    });
  }

  excluir(usuario: Usuario): void {
    if (usuario.id === this.auth.loggedMotoristaId()) return;
    const confirmado = window.confirm(`Excluir definitivamente a conta de ${usuario.nome}? Use "Suspender acesso" quando quiser manter a pessoa no histórico.`);
    if (!confirmado) return;
    this.saving = true; this.error = ''; this.success = '';
    this.http.delete<void>(this.url + '/' + usuario.id).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => {
        this.success = 'Conta excluída. O evento foi registrado no histórico.';
        this.carregar();
      },
      error: err => this.error = this.message(err)
    });
  }

  acaoLabel(acao: string): string {
    return ({ CONTA_CRIADA: 'Conta criada', CONTA_EDITADA: 'Conta editada', SENHA_REDEFINIDA: 'Senha redefinida',
      ACESSO_ALTERADO: 'Acesso alterado', CONTA_EXCLUIDA: 'Conta excluída' } as Record<string, string>)[acao] || acao;
  }
  valorLabel(campo: string | null, valor: string | null): string {
    if (!valor) return 'Não informado';
    if (campo === 'perfil') return this.labels[valor as Perfil] || valor;
    if (campo === 'acessoHabilitado') return valor === 'true' ? 'Habilitado' : 'Suspenso';
    return valor;
  }
  private message(err: { error?: { message?: string } }): string { return err.error?.message || 'Não foi possível concluir. Tente novamente.'; }
}
