import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ChecklistResponse, TipoOperacao } from '../models/checklist.model';
import { EstatisticasMissoesResponse } from '../models/estatisticas-missoes.model';
import { AuditoriaMissaoResponse, MissaoResponse, StatusDocumentalMissao, StatusMissao } from '../models/missao.model';
import { Motorista, MotoristaAdminPayload } from '../models/motorista.model';
import { RotuloStatusVeiculoResponse, SalvarRotulosStatusVeiculoRequest } from '../models/status-label.model';
import { HistoricoStatusVeiculo, StatusAdministrativoVeiculo, Veiculo } from '../models/veiculo.model';
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
  statusDocumental?: StatusDocumentalMissao;
  dataInicio?: string;
  dataFim?: string;
}

export interface AtualizarDadosAdministrativosMissaoPayload {
  localDestino: string | null;
  setorSolicitante: string | null;
  solicitanteNome: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly motoristaUrl = `${environment.apiBaseUrl}/admin/motoristas`;
  private readonly checklistUrl = `${environment.apiBaseUrl}/admin/checklists`;
  private readonly missaoUrl = `${environment.apiBaseUrl}/admin/missoes`;
  private readonly veiculoUrl = `${environment.apiBaseUrl}/admin/veiculos`;
  private readonly configuracaoRotuloStatusVeiculoUrl = `${environment.apiBaseUrl}/admin/configuracoes/rotulos-status-veiculo`;
  private readonly relatorioChecklistUrl = `${environment.apiBaseUrl}/admin/relatorios/checklists/pdf`;
  private readonly relatorioMissaoUrl = `${environment.apiBaseUrl}/admin/relatorios/missoes/pdf`;
  private readonly estatisticasMissoesUrl = `${environment.apiBaseUrl}/admin/estatisticas/missoes`;

  constructor(private readonly http: HttpClient) {}

  listarMotoristas(busca?: string): Observable<Motorista[]> {
    let params = new HttpParams();
    if (busca && busca.trim()) {
      params = params.set('busca', busca.trim());
    }
    return this.http.get<Motorista[]>(this.motoristaUrl, { params });
  }

  criarMotorista(payload: MotoristaAdminPayload): Observable<Motorista> {
    return this.http.post<Motorista>(this.motoristaUrl, payload);
  }

  editarMotorista(id: number, payload: MotoristaAdminPayload): Observable<Motorista> {
    return this.http.put<Motorista>(`${this.motoristaUrl}/${id}`, payload);
  }

  excluirMotorista(id: number): Observable<void> {
    return this.http.delete<void>(`${this.motoristaUrl}/${id}`);
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
    let params = new HttpParams();
    Object.entries(filtro).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<MissaoResponse[]>(this.missaoUrl, { params });
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
    let params = new HttpParams();
    if (buscaPlaca && buscaPlaca.trim()) {
      params = params.set('buscaPlaca', buscaPlaca.trim());
    }
    return this.http.get<Veiculo[]>(this.veiculoUrl, { params });
  }

  criarVeiculo(payload: { placa: string; modelo: string; marca: string }): Observable<Veiculo> {
    return this.http.post<Veiculo>(this.veiculoUrl, payload);
  }

  editarVeiculo(id: number, payload: { placa: string; modelo: string; marca: string }): Observable<Veiculo> {
    return this.http.put<Veiculo>(`${this.veiculoUrl}/${id}`, payload);
  }

  atualizarStatusAdministrativoVeiculo(id: number, statusAdministrativo: StatusAdministrativoVeiculo | null): Observable<Veiculo> {
    return this.http.patch<Veiculo>(`${this.veiculoUrl}/${id}/status-administrativo`, { statusAdministrativo });
  }

  listarHistoricoStatusVeiculo(id: number): Observable<HistoricoStatusVeiculo[]> {
    return this.http.get<HistoricoStatusVeiculo[]>(`${this.veiculoUrl}/${id}/historico-status`);
  }

  desativarVeiculo(id: number): Observable<Veiculo> {
    return this.http.patch<Veiculo>(`${this.veiculoUrl}/${id}/desativar`, {});
  }

  reativarVeiculo(id: number): Observable<Veiculo> {
    return this.http.patch<Veiculo>(`${this.veiculoUrl}/${id}/reativar`, {});
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
}
