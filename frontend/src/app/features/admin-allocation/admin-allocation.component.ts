import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, forkJoin } from 'rxjs';
import {
  AlocacaoVeiculo,
  AtualizarDadosAlocacaoVeiculoPayload,
  CriarAlocacaoVeiculoPayload,
  CriarVagaAdministrativaPayload,
  HistoricoAlocacaoVeiculo,
  HistoricoVagaAdministrativa,
  TipoEventoAlocacaoVeiculo,
  TipoEventoVagaAdministrativa,
  VagaAdministrativa
} from '../../core/models/alocacao-veiculo.model';
import { AdminService } from '../../core/services/admin.service';
import { AppIconComponent } from '../../shared/ui/app-icon.component';

type EditorMode = 'CRIAR_VAGA' | 'EDITAR_VAGA' | 'OCUPAR_VAGA' | 'DADOS' | 'VEICULO' | 'RESPONSAVEL' | 'ENCERRAR' | 'HISTORICO' | 'HISTORICO_VAGA' | null;

interface GrupoVaga {
  orgao: string;
  setor: string;
  vagas: VagaAdministrativa[];
}

@Component({
  selector: 'app-admin-allocation',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatSnackBarModule, AppIconComponent],
  templateUrl: './admin-allocation.component.html',
  styleUrl: './admin-allocation.component.css'
})
export class AdminAllocationComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  alocacoes: AlocacaoVeiculo[] = [];
  vagas: VagaAdministrativa[] = [];
  historico: HistoricoAlocacaoVeiculo[] = [];
  historicoVaga: HistoricoVagaAdministrativa[] = [];
  busca = '';
  mostrarDesativadas = false;
  carregando = false;
  salvando = false;
  editorMode: EditorMode = null;
  selected: AlocacaoVeiculo | null = null;
  selectedVaga: VagaAdministrativa | null = null;

  readonly vagaForm = this.fb.group({
    secretariaOrgao: ['', [Validators.required, Validators.maxLength(160)]],
    setor: ['', [Validators.required, Validators.maxLength(160)]],
    limiteAutorizado: ['', [Validators.required, Validators.maxLength(60)]],
    documentoReferencia: ['', Validators.maxLength(180)],
    observacao: ['', Validators.maxLength(500)]
  });

  readonly alocacaoForm = this.fb.group({
    placa: ['', [Validators.required, Validators.maxLength(10)]],
    modelo: ['', [Validators.required, Validators.maxLength(180)]],
    marca: ['', Validators.maxLength(120)],
    responsavelNome: ['', [Validators.required, Validators.maxLength(160)]],
    secretariaOrgao: ['', [Validators.required, Validators.maxLength(160)]],
    setor: ['', [Validators.required, Validators.maxLength(160)]],
    limiteAutorizado: ['', [Validators.required, Validators.maxLength(60)]],
    documentoReferencia: ['', Validators.maxLength(180)],
    linkConsulta: ['', Validators.maxLength(500)],
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

  get totalVagas(): number { return this.vagas.length; }
  get totalOcupadas(): number { return this.vagas.filter(item => item.status === 'OCUPADA').length; }
  get totalLivres(): number { return this.vagas.filter(item => item.status === 'LIVRE').length; }
  get totalDesativadas(): number { return this.vagas.filter(item => item.status === 'DESATIVADA').length; }
  get totalGrupos(): number { return this.gruposVagas.length; }

  get gruposVagas(): GrupoVaga[] {
    const grupos = new Map<string, GrupoVaga>();
    for (const vaga of this.vagas) {
      const orgao = vaga.secretariaOrgao.trim();
      const setor = vaga.setor.trim();
      const chave = `${orgao}\u0000${setor}`.toLocaleLowerCase('pt-BR');
      const grupo = grupos.get(chave) ?? { orgao, setor, vagas: [] };
      grupo.vagas.push(vaga);
      grupos.set(chave, grupo);
    }
    return [...grupos.values()]
      .sort((a, b) => a.orgao.localeCompare(b.orgao, 'pt-BR') || a.setor.localeCompare(b.setor, 'pt-BR'))
      .map(grupo => ({ ...grupo, vagas: [...grupo.vagas].sort((a, b) => a.numeroControle - b.numeroControle) }));
  }

  orgaosAdministrativos(): string[] {
    return this.valoresUnicos([
      ...this.vagas.map(vaga => vaga.secretariaOrgao),
      ...this.alocacoes.map(alocacao => alocacao.secretariaOrgao)
    ]);
  }

  setoresAdministrativos(form: 'vaga' | 'alocacao'): string[] {
    const orgaoSelecionado = this.normalizarComparacao(
      form === 'vaga'
        ? this.vagaForm.controls.secretariaOrgao.value
        : this.alocacaoForm.controls.secretariaOrgao.value
    );
    const pares = [
      ...this.vagas.map(vaga => ({ orgao: vaga.secretariaOrgao, setor: vaga.setor })),
      ...this.alocacoes.map(alocacao => ({ orgao: alocacao.secretariaOrgao, setor: alocacao.setor }))
    ];
    const setores = orgaoSelecionado
      ? pares.filter(item => this.normalizarComparacao(item.orgao) === orgaoSelecionado).map(item => item.setor)
      : pares.map(item => item.setor);
    return this.valoresUnicos(setores);
  }

  orgaoNovo(form: 'vaga' | 'alocacao'): boolean {
    const valor = form === 'vaga'
      ? this.vagaForm.controls.secretariaOrgao.value
      : this.alocacaoForm.controls.secretariaOrgao.value;
    return this.valorNovo(valor, this.orgaosAdministrativos());
  }

  setorNovo(form: 'vaga' | 'alocacao'): boolean {
    const valor = form === 'vaga'
      ? this.vagaForm.controls.setor.value
      : this.alocacaoForm.controls.setor.value;
    return this.valorNovo(valor, this.setoresAdministrativos(form));
  }

  carregar(): void {
    this.carregando = true;
    forkJoin({
      vagas: this.adminService.listarVagasAdministrativas(this.busca, this.mostrarDesativadas),
      alocacoes: this.adminService.listarAlocacoes(this.busca, true)
    })
      .pipe(finalize(() => this.carregando = false))
      .subscribe({
        next: ({ vagas, alocacoes }) => { this.vagas = vagas; this.alocacoes = alocacoes; },
        error: () => this.mensagem('Não foi possível carregar as vagas administrativas.')
      });
  }

  abrirCriacaoVaga(): void {
    this.selected = null;
    this.selectedVaga = null;
    this.vagaForm.reset({ secretariaOrgao: '', setor: '', limiteAutorizado: '', documentoReferencia: '', observacao: '' });
    this.editorMode = 'CRIAR_VAGA';
  }

  abrirEdicaoVaga(vaga: VagaAdministrativa): void {
    this.selected = this.alocacaoDaVaga(vaga);
    this.selectedVaga = vaga;
    this.vagaForm.reset({
      secretariaOrgao: vaga.secretariaOrgao,
      setor: vaga.setor,
      limiteAutorizado: vaga.limiteAutorizado,
      documentoReferencia: vaga.documentoReferencia || '',
      observacao: vaga.observacao || ''
    });
    this.editorMode = 'EDITAR_VAGA';
  }

  abrirOcupacaoVaga(vaga: VagaAdministrativa): void {
    this.selected = null;
    this.selectedVaga = vaga;
    this.alocacaoForm.reset({
      placa: '', modelo: '', marca: '', responsavelNome: '',
      secretariaOrgao: vaga.secretariaOrgao,
      setor: vaga.setor,
      limiteAutorizado: vaga.limiteAutorizado,
      documentoReferencia: vaga.documentoReferencia || '',
      linkConsulta: '',
      observacao: vaga.observacao || ''
    });
    this.editorMode = 'OCUPAR_VAGA';
  }

  abrirCriacao(): void {
    this.selected = null;
    this.selectedVaga = null;
    this.alocacaoForm.reset({
      placa: '', modelo: '', marca: '', responsavelNome: '', secretariaOrgao: '', setor: '', limiteAutorizado: '',
      documentoReferencia: '', linkConsulta: '', observacao: ''
    });
    this.editorMode = 'OCUPAR_VAGA';
  }

  abrirDados(alocacao: AlocacaoVeiculo): void {
    this.selected = alocacao;
    this.selectedVaga = this.vagas.find(vaga => vaga.id === alocacao.vagaAdministrativaId) || null;
    this.alocacaoForm.reset({
      placa: alocacao.placa,
      modelo: alocacao.modelo,
      marca: alocacao.marca || '',
      responsavelNome: alocacao.responsavelNome,
      secretariaOrgao: alocacao.secretariaOrgao,
      setor: alocacao.setor,
      limiteAutorizado: alocacao.limiteAutorizado,
      documentoReferencia: alocacao.documentoReferencia || '',
      linkConsulta: alocacao.linkConsulta || '',
      observacao: alocacao.observacao || ''
    });
    this.editorMode = 'DADOS';
  }

  abrirTrocaVeiculo(alocacao: AlocacaoVeiculo): void {
    this.selected = alocacao;
    this.selectedVaga = this.vagas.find(vaga => vaga.id === alocacao.vagaAdministrativaId) || null;
    this.veiculoForm.reset({ placa: '', modelo: '', marca: '', motivo: '' });
    this.editorMode = 'VEICULO';
  }

  abrirTrocaResponsavel(alocacao: AlocacaoVeiculo): void {
    this.selected = alocacao;
    this.selectedVaga = this.vagas.find(vaga => vaga.id === alocacao.vagaAdministrativaId) || null;
    this.responsavelForm.reset({ responsavelNome: '', motivo: '' });
    this.editorMode = 'RESPONSAVEL';
  }

  abrirEncerramento(alocacao: AlocacaoVeiculo): void {
    this.selected = alocacao;
    this.selectedVaga = this.vagas.find(vaga => vaga.id === alocacao.vagaAdministrativaId) || null;
    this.encerramentoForm.reset({ motivo: '' });
    this.editorMode = 'ENCERRAR';
  }

  abrirHistorico(alocacao: AlocacaoVeiculo): void {
    this.selected = alocacao;
    this.selectedVaga = this.vagas.find(vaga => vaga.id === alocacao.vagaAdministrativaId) || null;
    this.historico = [];
    this.editorMode = 'HISTORICO';
    this.adminService.listarHistoricoAlocacao(alocacao.id).subscribe({
      next: historico => this.historico = historico,
      error: () => this.mensagem('Não foi possível carregar o histórico desta alocação.')
    });
  }

  abrirHistoricoVaga(vaga: VagaAdministrativa): void {
    this.selected = this.alocacaoDaVaga(vaga);
    this.selectedVaga = vaga;
    this.historicoVaga = [];
    this.editorMode = 'HISTORICO_VAGA';
    this.adminService.listarHistoricoVagaAdministrativa(vaga.id).subscribe({
      next: historico => this.historicoVaga = historico,
      error: () => this.mensagem('Não foi possível carregar o histórico desta vaga.')
    });
  }

  abrirLinkConsulta(link: string): void {
    window.open(link, '_blank', 'noopener');
  }

  salvarVaga(): void {
    if (this.vagaForm.invalid) {
      this.vagaForm.markAllAsTouched();
      return;
    }
    const value = this.vagaForm.getRawValue();
    const payload: CriarVagaAdministrativaPayload = {
      secretariaOrgao: value.secretariaOrgao!,
      setor: value.setor!,
      limiteAutorizado: value.limiteAutorizado!,
      documentoReferencia: this.nulo(value.documentoReferencia),
      observacao: this.nulo(value.observacao)
    };
    this.salvando = true;
    const requisicao = this.editorMode === 'CRIAR_VAGA'
      ? this.adminService.criarVagaAdministrativa(payload)
      : this.adminService.atualizarVagaAdministrativa(this.selectedVaga!.id, payload);
    requisicao.pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => { this.mensagem(this.editorMode === 'CRIAR_VAGA' ? 'Vaga criada.' : 'Vaga atualizada.'); this.fecharEditor(); this.carregar(); },
      error: error => this.mensagem(this.erroApi(error, 'Não foi possível salvar a vaga.'))
    });
  }

  salvarAlocacao(): void {
    if (this.alocacaoForm.invalid) {
      this.alocacaoForm.markAllAsTouched();
      return;
    }
    const value = this.alocacaoForm.getRawValue();
    this.salvando = true;
    if (this.editorMode === 'OCUPAR_VAGA') {
      const payload: CriarAlocacaoVeiculoPayload = {
        placa: value.placa!, modelo: value.modelo!, marca: this.nulo(value.marca), responsavelNome: value.responsavelNome!, secretariaOrgao: value.secretariaOrgao!,
        setor: value.setor!, limiteAutorizado: value.limiteAutorizado!, documentoReferencia: this.nulo(value.documentoReferencia), linkConsulta: this.linkConsulta(value.linkConsulta),
        observacao: this.nulo(value.observacao), vagaAdministrativaId: this.selectedVaga?.id || null
      };
      this.adminService.criarAlocacao(payload).pipe(finalize(() => this.salvando = false)).subscribe({
        next: () => { this.mensagem(this.selectedVaga ? 'Vaga ocupada e histórico iniciado.' : 'Vaga e alocação criadas.'); this.fecharEditor(); this.carregar(); },
        error: error => this.mensagem(this.erroApi(error, 'Não foi possível criar a alocação.'))
      });
      return;
    }

    const payload: AtualizarDadosAlocacaoVeiculoPayload = {
      secretariaOrgao: value.secretariaOrgao!, setor: value.setor!, limiteAutorizado: value.limiteAutorizado!,
      documentoReferencia: this.nulo(value.documentoReferencia), linkConsulta: this.linkConsulta(value.linkConsulta), observacao: this.nulo(value.observacao)
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
    this.executar(() => this.adminService.encerrarAlocacao(this.selected!.id, this.encerramentoForm.value.motivo!), 'Alocação encerrada. A vaga ficou livre.');
  }

  desativarVaga(vaga: VagaAdministrativa): void {
    if (!confirm(`Desativar a vaga ${vaga.numeroControle}? Ela sairá da consulta principal.`)) return;
    this.salvando = true;
    this.adminService.desativarVagaAdministrativa(vaga.id).pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => { this.mensagem('Vaga desativada.'); this.carregar(); },
      error: error => this.mensagem(this.erroApi(error, 'Não foi possível desativar a vaga.'))
    });
  }

  reativarVaga(vaga: VagaAdministrativa): void {
    this.salvando = true;
    this.adminService.reativarVagaAdministrativa(vaga.id).pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => { this.mensagem('Vaga reativada.'); this.carregar(); },
      error: error => this.mensagem(this.erroApi(error, 'Não foi possível reativar a vaga.'))
    });
  }

  alocacaoDaVaga(vaga: VagaAdministrativa): AlocacaoVeiculo | null {
    return vaga.alocacaoAtivaId ? this.alocacoes.find(alocacao => alocacao.id === vaga.alocacaoAtivaId) || null : null;
  }

  statusVagaLabel(vaga: VagaAdministrativa): string {
    return { LIVRE: 'LIVRE', OCUPADA: 'OCUPADA', DESATIVADA: 'DESATIVADA' }[vaga.status];
  }

  fecharEditor(): void { this.editorMode = null; this.selected = null; this.selectedVaga = null; }

  private linkConsulta(valor: string | null | undefined): string | null {
    const link = this.nulo(valor);
    return link && !/^https?:\/\//i.test(link) ? `https://${link}` : link;
  }
  labelEvento(tipo: TipoEventoAlocacaoVeiculo): string {
    return { IMPORTACAO_INICIAL: 'Importação inicial', CRIACAO: 'Alocação criada', TROCA_VEICULO: 'Veículo trocado', TROCA_RESPONSAVEL: 'Responsável trocado', ATUALIZACAO_DADOS: 'Dados atualizados', ENCERRAMENTO: 'Alocação encerrada' }[tipo];
  }
  labelEventoVaga(tipo: TipoEventoVagaAdministrativa): string {
    return { CRIACAO: 'Vaga criada', ATUALIZACAO_DADOS: 'Dados da vaga atualizados', OCUPACAO: 'Vaga ocupada', LIBERACAO: 'Vaga liberada', DESATIVACAO: 'Vaga desativada', REATIVACAO: 'Vaga reativada' }[tipo];
  }
  formatarData(value: string): string { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
  resumoAntes(evento: HistoricoAlocacaoVeiculo): string { return this.resumoEvento(evento, 'ANTES'); }
  resumoDepois(evento: HistoricoAlocacaoVeiculo): string { return this.resumoEvento(evento, 'DEPOIS'); }
  observacaoEvento(evento: HistoricoAlocacaoVeiculo): string {
    return this.dadosAdministrativosEvento(evento) ? 'Dados administrativos atualizados.' : evento.observacao || '—';
  }
  resumoVagaAntes(evento: HistoricoVagaAdministrativa): string { return this.resumoEventoVaga(evento, 'ANTES'); }
  resumoVagaDepois(evento: HistoricoVagaAdministrativa): string { return this.resumoEventoVaga(evento, 'DEPOIS'); }

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
  private valoresUnicos(valores: Array<string | null | undefined>): string[] {
    const mapa = new Map<string, string>();
    for (const valor of valores) {
      const normalizado = this.normalizarComparacao(valor);
      if (normalizado && !mapa.has(normalizado)) {
        mapa.set(normalizado, (valor || '').trim());
      }
    }
    return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }
  private valorNovo(valor: string | null | undefined, opcoes: string[]): boolean {
    const normalizado = this.normalizarComparacao(valor);
    if (!normalizado) return false;
    return !opcoes.some(opcao => this.normalizarComparacao(opcao) === normalizado);
  }
  private normalizarComparacao(valor: string | null | undefined): string {
    return (valor || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('pt-BR');
  }
  private resumoEvento(evento: HistoricoAlocacaoVeiculo, lado: 'ANTES' | 'DEPOIS'): string {
    const dadosAdministrativos = this.dadosAdministrativosEvento(evento);
    if (dadosAdministrativos) {
      const dados = lado === 'ANTES' ? dadosAdministrativos.antes : dadosAdministrativos.depois;
      const outroLado = lado === 'ANTES' ? dadosAdministrativos.depois : dadosAdministrativos.antes;
      const alteracoes = dados
        .map((valor, indice) => valor !== outroLado[indice] ? `${dadosAdministrativos.rotulos[indice]}: ${valor}` : '')
        .filter(Boolean);
      return alteracoes.join('\n') || 'Sem alteração identificada';
    }
    const placa = lado === 'ANTES' ? evento.veiculoAnteriorPlaca : evento.veiculoNovoPlaca;
    const responsavel = lado === 'ANTES' ? evento.responsavelAnterior : evento.responsavelNovo;
    const limite = lado === 'ANTES' ? evento.limiteAnterior : evento.limiteNovo;
    const dados = [
      placa ? `Veículo: ${placa}` : '',
      responsavel ? `Responsável: ${responsavel}` : '',
      limite ? `Limite: ${limite}` : ''
    ].filter(Boolean);
    return dados.join('\n') || '—';
  }
  private dadosAdministrativosEvento(evento: HistoricoAlocacaoVeiculo): { antes: string[]; depois: string[]; rotulos: string[] } | null {
    if (evento.tipo !== 'ATUALIZACAO_DADOS' || !evento.observacao?.includes('->')) return null;
    const versao2 = /^Dados atualizados v2:/i.test(evento.observacao);
    const conteudo = evento.observacao.replace(/^Dados atualizados(?: v2)?:\s*/i, '');
    const [antes, depois, ...restante] = conteudo.split(/\s*->\s*/);
    if (!antes || !depois || restante.length) return null;
    const rotulos = versao2
      ? ['Órgão', 'Setor', 'Limite autorizado', 'Documento', 'Link de consulta', 'Observação']
      : ['Órgão', 'Setor', 'Limite autorizado', 'Documento', 'Observação'];
    return { antes: this.camposAdministrativos(antes, rotulos.length), depois: this.camposAdministrativos(depois, rotulos.length), rotulos };
  }
  private camposAdministrativos(valor: string, quantidade: number): string[] {
    const campos = valor.split('|');
    return Array.from({ length: quantidade }, (_, indice) => {
      const campo = campos[indice]?.trim();
      return !campo || campo.toLowerCase() === 'null' ? 'Não informado' : campo;
    });
  }

  private resumoEventoVaga(evento: HistoricoVagaAdministrativa, lado: 'ANTES' | 'DEPOIS'): string {
    const dados = lado === 'ANTES' ? evento.dadosAnteriores : evento.dadosNovos;
    const placa = lado === 'ANTES' ? evento.placaAnterior : evento.placaNova;
    const responsavel = lado === 'ANTES' ? evento.responsavelAnterior : evento.responsavelNovo;
    const linhas = [
      placa ? `Veículo: ${placa}` : '',
      responsavel ? `Responsável: ${responsavel}` : '',
      dados ? this.formatarDadosVaga(dados) : ''
    ].filter(Boolean);
    return linhas.join('\n') || '—';
  }

  private formatarDadosVaga(valor: string): string {
    const campos = this.camposAdministrativos(valor, 6);
    const rotulos = ['Órgão', 'Setor', 'Limite', 'Documento', 'Observação', 'Status'];
    return campos
      .map((campo, indice) => `${rotulos[indice]}: ${campo}`)
      .join('\n');
  }
}
