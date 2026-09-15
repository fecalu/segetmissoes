import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ChecklistResponse, TipoOperacao } from '../models/checklist.model';
import { EstatisticasMissoesResponse } from '../models/estatisticas-missoes.model';
import { HistoricoVeiculoResponse } from '../models/historico-veiculo.model';
import {
  AuditoriaMissaoResponse,
  MissaoResponse,
  OrigemAberturaMissao,
  StatusDocumentalMissao,
  StatusMissao,
  TipoDeslocamentoMissao
} from '../models/missao.model';
import { SalvarSugestoesCamposMissaoRequest, SugestoesCamposMissaoResponse } from '../models/missao-suggestion.model';
import { Motorista, MotoristaAdminPayload } from '../models/motorista.model';
import { LocalOperacionalResponse, SalvarLocaisOperacionaisRequest } from '../models/operational-location.model';
import { RotuloStatusVeiculoResponse, SalvarRotulosStatusVeiculoRequest } from '../models/status-label.model';
import { HistoricoStatusVeiculo, StatusAdministrativoVeiculo, TipoUsoExternoVeiculo, Veiculo } from '../models/veiculo.model';
import { ResultadoVistoriaCompleta, VistoriaCompletaResponse } from '../models/vistoria-completa.model';
import {
  AlocacaoVeiculo,
  AtualizarVagaAdministrativaPayload,
  AtualizarDadosAlocacaoVeiculoPayload,
  CriarAlocacaoVeiculoPayload,
  CriarVagaAdministrativaPayload,
  HistoricoAlocacaoVeiculo,
  HistoricoVagaAdministrativa,
  VagaAdministrativa
} from '../models/alocacao-veiculo.model';
import { environment } from '../../../environments/environment';

export interface ChecklistFiltro {
  busca?: string;
  motoristaId?: number;
  veiculoId?: number;
  tipoOperacao?: TipoOperacao;
  dataInicio?: string;
  dataFim?: string;
}

export interface MissaoFiltro {
  busca?: string;
  motoristaId?: number;
  veiculoId?: number;
  status?: StatusMissao;
  origemAbertura?: OrigemAberturaMissao;
  statusDocumental?: StatusDocumentalMissao;
  dataInicio?: string;
  dataFim?: string;
}

export interface VistoriaCompletaFiltro {
  busca?: string;
  motoristaId?: number;
  veiculoId?: number;
  tipoOperacao?: TipoOperacao;
  resultado?: ResultadoVistoriaCompleta;
  dataInicio?: string;
  dataFim?: string;
}

export interface AtualizarContraparteVistoriaCompletaPayload {
  nomeContraparte: string | null;
}

export interface RegistrarVeiculoEmViagemPayload {
  motoristaId: number;
  localDestino: string;
  setorSolicitante: string | null;
  solicitanteNome: string | null;
  dataHoraSaida: string;
  observacao: string | null;
}

export interface RegistrarRetornoViagemPayload {
  dataHoraRetorno: string;
  observacao: string | null;
  justificativaSemChecklist: string;
  statusAdministrativoDestino?: StatusAdministrativoVeiculo | 'BASE_JOAO_GOULART';
}

export interface RegistrarVeiculoEmUsoExternoPayload {
  nomeEntreguePara: string;
  tipoUsoExterno: TipoUsoExternoVeiculo;
  dataHoraSaida: string;
  observacao: string | null;
  justificativaSemVistoria: string;
}

export interface RegistrarRetornoUsoExternoPayload {
  statusAdministrativoDestino: StatusAdministrativoVeiculo | null;
  nomeRecebidoDe: string;
  dataHoraRetorno: string;
  observacao: string | null;
  justificativaSemVistoria: string;
}

export interface AtualizarDadosAdministrativosMissaoPayload {
  justificativa?: string;
  localDestino: string | null;
  setorSolicitante: string | null;
  solicitanteNome: string | null;
}

export interface CriarMissaoContingenciaPayload {
  motoristaId: number;
  veiculoId: number;
  dataHoraInicio: string;
  tipoDeslocamento: TipoDeslocamentoMissao;
  justificativaAbertura: string;
  localDestino: string | null;
  setorSolicitante: string | null;
  solicitanteNome: string | null;
}

export interface CriarRegistroAdministrativoMissaoPayload {
  motoristaId: number;
  veiculoId: number;
  dataHoraInicio: string;
  tipoDeslocamento: TipoDeslocamentoMissao;
  localDestino: string;
  setorSolicitante: string | null;
  solicitanteNome: string | null;
}

export interface RegistrarRetornoAdministrativoMissaoPayload {
  dataHoraFim: string;
  statusAdministrativoDestino: StatusAdministrativoVeiculo | null;
}

export interface EncerrarMissaoPendentePayload {
  dataHoraFim: string;
  justificativaEncerramento: string;
  statusAdministrativoDestino: StatusAdministrativoVeiculo | null;
}

export interface AjustarHorarioMissaoPayload {
  dataHoraInicio: string;
  dataHoraFim: string | null;
}

export interface EditarMissaoManualPayload {
  motoristaId: number;
  veiculoId: number;
  dataHoraInicio: string;
  dataHoraFim: string | null;
  justificativaAbertura: string;
  justificativaEncerramento: string | null;
  localDestino: string | null;
  setorSolicitante: string | null;
  solicitanteNome: string | null;
  justificativaEdicao: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly motoristaUrl = `${environment.apiBaseUrl}/admin/motoristas`;
  private readonly checklistUrl = `${environment.apiBaseUrl}/admin/checklists`;
  private readonly missaoUrl = `${environment.apiBaseUrl}/admin/missoes`;
  private readonly veiculoUrl = `${environment.apiBaseUrl}/admin/veiculos`;
  private readonly configuracaoRotuloStatusVeiculoUrl = `${environment.apiBaseUrl}/admin/configuracoes/rotulos-status-veiculo`;
  private readonly configuracaoSugestoesMissaoUrl = `${environment.apiBaseUrl}/admin/configuracoes/sugestoes-missao`;
  private readonly configuracaoLocaisOperacionaisUrl = `${environment.apiBaseUrl}/admin/configuracoes/locais-operacionais`;
  private readonly relatorioChecklistUrl = `${environment.apiBaseUrl}/admin/relatorios/checklists/pdf`;
  private readonly relatorioMissaoUrl = `${environment.apiBaseUrl}/admin/relatorios/missoes/pdf`;
  private readonly estatisticasMissoesUrl = `${environment.apiBaseUrl}/admin/estatisticas/missoes`;
  private readonly vistoriaCompletaUrl = `${environment.apiBaseUrl}/admin/vistorias-completas`;
  private readonly alocacaoUrl = `${environment.apiBaseUrl}/admin/alocacoes`;
  private readonly vagaAdministrativaUrl = `${environment.apiBaseUrl}/admin/alocacoes/vagas`;

  constructor(private readonly http: HttpClient) {}

  listarMotoristas(busca?: string): Observable<Motorista[]> {
    let params = new HttpParams();
    if (busca && busca.trim()) {
      params = params.set('busca', busca.trim());
    }
    return this.http.get<Motorista[]>(this.motoristaUrl, { params });
  }

  listarMotoristasOpcoes(): Observable<Motorista[]> {
    return this.http.get<Array<Pick<Motorista, 'id' | 'nome' | 'perfil'>>>(this.motoristaUrl + '/opcoes').pipe(
      map(opcoes => opcoes.map(opcao => ({
        ...opcao,
        cpf: null,
        login: '',
        acessoHabilitado: true,
        deveAlterarSenha: false,
        cadastroCompleto: true,
        motoristaOperacional: true
      })))
    );
  }

  criarMotorista(payload: MotoristaAdminPayload): Observable<Motorista> {
    return this.http.post<Motorista>(this.motoristaUrl, payload);
  }

  editarMotorista(id: number, payload: MotoristaAdminPayload): Observable<Motorista> {
    return this.http.put<Motorista>(`${this.motoristaUrl}/${id}`, payload);
  }

  listarChecklists(filtro: ChecklistFiltro): Observable<ChecklistResponse[]> {
    let params = new HttpParams();
    Object.entries(filtro).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ChecklistResponse[]>(this.checklistUrl, { params });
  }

  listarMissoes(filtro: MissaoFiltro): Observable<MissaoResponse[]> {
    let params = new HttpParams().set('_ts', Date.now().toString());
    Object.entries(filtro).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<MissaoResponse[]>(this.missaoUrl, { params });
  }

  listarVistoriasCompletas(filtro: VistoriaCompletaFiltro): Observable<VistoriaCompletaResponse[]> {
    let params = new HttpParams();
    Object.entries(filtro).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<VistoriaCompletaResponse[]>(this.vistoriaCompletaUrl, { params });
  }

  atualizarContraparteVistoriaCompleta(
    vistoriaId: number,
    payload: AtualizarContraparteVistoriaCompletaPayload
  ): Observable<VistoriaCompletaResponse> {
    return this.http.patch<VistoriaCompletaResponse>(`${this.vistoriaCompletaUrl}/${vistoriaId}/contraparte`, payload);
  }

  listarAuditoriaMissao(missaoId: number): Observable<AuditoriaMissaoResponse[]> {
    return this.http.get<AuditoriaMissaoResponse[]>(`${this.missaoUrl}/${missaoId}/auditoria`);
  }

  atualizarDadosAdministrativosMissao(
    missaoId: number,
    payload: AtualizarDadosAdministrativosMissaoPayload
  ): Observable<MissaoResponse> {
    return this.http.put<MissaoResponse>(`${this.missaoUrl}/${missaoId}/dados-administrativos`, payload);
  }

  criarMissaoContingencia(payload: CriarMissaoContingenciaPayload): Observable<MissaoResponse> {
    return this.http.post<MissaoResponse>(`${this.missaoUrl}/contingencias`, payload);
  }

  criarRegistroAdministrativoMissao(payload: CriarRegistroAdministrativoMissaoPayload): Observable<MissaoResponse> {
    return this.http.post<MissaoResponse>(`${this.missaoUrl}/registros-administrativos`, payload);
  }

  registrarRetornoAdministrativoMissao(
    missaoId: number,
    payload: RegistrarRetornoAdministrativoMissaoPayload
  ): Observable<MissaoResponse> {
    return this.http.patch<MissaoResponse>(`${this.missaoUrl}/${missaoId}/registrar-retorno`, payload);
  }

  encerrarMissaoPendente(
    missaoId: number,
    payload: EncerrarMissaoPendentePayload
  ): Observable<MissaoResponse> {
    return this.http.patch<MissaoResponse>(`${this.missaoUrl}/${missaoId}/encerrar-pendente`, payload);
  }

  ajustarHorarioMissao(
    missaoId: number,
    payload: AjustarHorarioMissaoPayload
  ): Observable<MissaoResponse> {
    return this.http.patch<MissaoResponse>(`${this.missaoUrl}/${missaoId}/horario`, payload);
  }

  editarMissaoManual(
    missaoId: number,
    payload: EditarMissaoManualPayload
  ): Observable<MissaoResponse> {
    return this.http.put<MissaoResponse>(`${this.missaoUrl}/${missaoId}/edicao-manual`, payload);
  }

  gerarRelatorioChecklistPdf(dataInicial: string, dataFinal: string): Observable<Blob> {
    const params = new HttpParams()
      .set('dataInicial', dataInicial)
      .set('dataFinal', dataFinal);

    return this.http.get(this.relatorioChecklistUrl, {
      params,
      responseType: 'blob'
    });
  }

  gerarRelatorioMissoesPdf(data: string): Observable<Blob> {
    const params = new HttpParams().set('data', data);
    return this.http.get(this.relatorioMissaoUrl, {
      params,
      responseType: 'blob'
    });
  }

  buscarEstatisticasMissoes(dataInicial: string, dataFinal: string): Observable<EstatisticasMissoesResponse> {
    const params = new HttpParams()
      .set('dataInicial', dataInicial)
      .set('dataFinal', dataFinal);
    return this.http.get<EstatisticasMissoesResponse>(this.estatisticasMissoesUrl, { params });
  }

  listarVeiculos(buscaPlaca?: string): Observable<Veiculo[]> {
    let params = new HttpParams().set('_ts', Date.now().toString());
    if (buscaPlaca && buscaPlaca.trim()) {
      params = params.set('buscaPlaca', buscaPlaca.trim());
    }
    return this.http.get<Veiculo[]>(this.veiculoUrl, { params });
  }

  criarVeiculo(payload: { placa: string; modelo: string; marca?: string | null; cnpj?: string | null; renavam?: string | null }): Observable<Veiculo> {
    return this.http.post<Veiculo>(this.veiculoUrl, payload);
  }

  editarVeiculo(id: number, payload: { placa: string; modelo: string; marca?: string | null; cnpj?: string | null; renavam?: string | null }): Observable<Veiculo> {
    return this.http.put<Veiculo>(`${this.veiculoUrl}/${id}`, payload);
  }

  atualizarStatusAdministrativoVeiculo(id: number, statusAdministrativo: StatusAdministrativoVeiculo | null, justificativa?: string): Observable<Veiculo> {
    return this.http.patch<Veiculo>(`${this.veiculoUrl}/${id}/status-administrativo`, { statusAdministrativo, justificativa });
  }

  atualizarLocalizacaoOperacionalVeiculo(id: number, localizacaoOperacional: string | null): Observable<Veiculo> {
    return this.http.patch<Veiculo>(`${this.veiculoUrl}/${id}/localizacao-operacional`, { localizacaoOperacional });
  }

  registrarVeiculoEmViagem(id: number, payload: RegistrarVeiculoEmViagemPayload): Observable<Veiculo> {
    return this.http.post<Veiculo>(`${this.veiculoUrl}/${id}/em-viagem`, payload);
  }

  registrarRetornoViagem(id: number, payload: RegistrarRetornoViagemPayload): Observable<Veiculo> {
    return this.http.post<Veiculo>(`${this.veiculoUrl}/${id}/retorno-viagem`, payload);
  }

  registrarVeiculoEmUsoExterno(id: number, payload: RegistrarVeiculoEmUsoExternoPayload): Observable<Veiculo> {
    return this.http.post<Veiculo>(`${this.veiculoUrl}/${id}/em-uso-externo`, payload);
  }

  registrarRetornoUsoExterno(id: number, payload: RegistrarRetornoUsoExternoPayload): Observable<Veiculo> {
    return this.http.post<Veiculo>(`${this.veiculoUrl}/${id}/retorno-uso-externo`, payload);
  }

  listarHistoricoStatusVeiculo(id: number): Observable<HistoricoStatusVeiculo[]> {
    return this.http.get<HistoricoStatusVeiculo[]>(`${this.veiculoUrl}/${id}/historico-status`);
  }

  buscarHistoricoVeiculo(id: number): Observable<HistoricoVeiculoResponse> {
    return this.http.get<HistoricoVeiculoResponse>(`${this.veiculoUrl}/${id}/historico`);
  }

  desativarVeiculo(id: number, justificativa?: string): Observable<Veiculo> {
    return this.http.patch<Veiculo>(`${this.veiculoUrl}/${id}/desativar`, { justificativa });
  }

  reativarVeiculo(id: number, justificativa?: string): Observable<Veiculo> {
    return this.http.patch<Veiculo>(`${this.veiculoUrl}/${id}/reativar`, { justificativa });
  }

  excluirVeiculo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.veiculoUrl}/${id}`);
  }

  excluirVeiculoDefinitivamente(id: number, senhaAdmin: string, justificativa: string): Observable<void> {
    return this.http.post<void>(`${this.veiculoUrl}/${id}/exclusao-definitiva`, {
      senhaAdmin,
      justificativa
    });
  }

  listarRotulosStatusVeiculo(): Observable<RotuloStatusVeiculoResponse[]> {
    return this.http.get<RotuloStatusVeiculoResponse[]>(this.configuracaoRotuloStatusVeiculoUrl);
  }

  salvarRotulosStatusVeiculo(payload: SalvarRotulosStatusVeiculoRequest): Observable<RotuloStatusVeiculoResponse[]> {
    return this.http.put<RotuloStatusVeiculoResponse[]>(this.configuracaoRotuloStatusVeiculoUrl, payload);
  }

  listarSugestoesCamposMissao(): Observable<SugestoesCamposMissaoResponse> {
    return this.http.get<SugestoesCamposMissaoResponse>(this.configuracaoSugestoesMissaoUrl);
  }

  salvarSugestoesCamposMissao(payload: SalvarSugestoesCamposMissaoRequest): Observable<SugestoesCamposMissaoResponse> {
    return this.http.put<SugestoesCamposMissaoResponse>(this.configuracaoSugestoesMissaoUrl, payload);
  }

  listarLocaisOperacionais(): Observable<LocalOperacionalResponse[]> {
    return this.http.get<LocalOperacionalResponse[]>(this.configuracaoLocaisOperacionaisUrl);
  }

  salvarLocaisOperacionais(payload: SalvarLocaisOperacionaisRequest): Observable<LocalOperacionalResponse[]> {
    return this.http.put<LocalOperacionalResponse[]>(this.configuracaoLocaisOperacionaisUrl, payload);
  }

  listarAlocacoes(busca?: string, incluirEncerradas = false): Observable<AlocacaoVeiculo[]> {
    let params = new HttpParams().set('_ts', Date.now().toString());
    if (busca?.trim()) params = params.set('busca', busca.trim());
    if (incluirEncerradas) params = params.set('incluirEncerradas', 'true');
    return this.http.get<AlocacaoVeiculo[]>(this.alocacaoUrl, { params });
  }

  criarAlocacao(payload: CriarAlocacaoVeiculoPayload): Observable<AlocacaoVeiculo> {
    return this.http.post<AlocacaoVeiculo>(this.alocacaoUrl, payload);
  }

  atualizarDadosAlocacao(id: number, payload: AtualizarDadosAlocacaoVeiculoPayload): Observable<AlocacaoVeiculo> {
    return this.http.put<AlocacaoVeiculo>(`${this.alocacaoUrl}/${id}/dados`, payload);
  }

  trocarVeiculoAlocacao(id: number, placa: string, modelo: string, marca: string | null, motivo: string): Observable<AlocacaoVeiculo> {
    return this.http.patch<AlocacaoVeiculo>(`${this.alocacaoUrl}/${id}/veiculo`, { placa, modelo, marca, motivo });
  }

  trocarResponsavelAlocacao(id: number, responsavelNome: string, motivo: string): Observable<AlocacaoVeiculo> {
    return this.http.patch<AlocacaoVeiculo>(`${this.alocacaoUrl}/${id}/responsavel`, { responsavelNome, motivo });
  }

  encerrarAlocacao(id: number, motivo: string): Observable<AlocacaoVeiculo> {
    return this.http.patch<AlocacaoVeiculo>(`${this.alocacaoUrl}/${id}/encerrar`, null, {
      params: new HttpParams().set('motivo', motivo)
    });
  }

  listarHistoricoAlocacao(id: number): Observable<HistoricoAlocacaoVeiculo[]> {
    return this.http.get<HistoricoAlocacaoVeiculo[]>(`${this.alocacaoUrl}/${id}/historico`);
  }

  listarHistoricoVagaAdministrativa(id: number): Observable<HistoricoVagaAdministrativa[]> {
    return this.http.get<HistoricoVagaAdministrativa[]>(`${this.vagaAdministrativaUrl}/${id}/historico`);
  }

  listarVagasAdministrativas(busca?: string, incluirDesativadas = false): Observable<VagaAdministrativa[]> {
    let params = new HttpParams().set('_ts', Date.now().toString());
    if (busca?.trim()) params = params.set('busca', busca.trim());
    if (incluirDesativadas) params = params.set('incluirDesativadas', 'true');
    return this.http.get<VagaAdministrativa[]>(this.vagaAdministrativaUrl, { params });
  }

  criarVagaAdministrativa(payload: CriarVagaAdministrativaPayload): Observable<VagaAdministrativa> {
    return this.http.post<VagaAdministrativa>(this.vagaAdministrativaUrl, payload);
  }

  atualizarVagaAdministrativa(id: number, payload: AtualizarVagaAdministrativaPayload): Observable<VagaAdministrativa> {
    return this.http.put<VagaAdministrativa>(`${this.vagaAdministrativaUrl}/${id}`, payload);
  }

  desativarVagaAdministrativa(id: number): Observable<VagaAdministrativa> {
    return this.http.patch<VagaAdministrativa>(`${this.vagaAdministrativaUrl}/${id}/desativar`, null);
  }

  reativarVagaAdministrativa(id: number): Observable<VagaAdministrativa> {
    return this.http.patch<VagaAdministrativa>(`${this.vagaAdministrativaUrl}/${id}/reativar`, null);
  }
}
