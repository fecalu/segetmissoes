import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ChecklistResponse, TipoOperacao } from '../models/checklist.model';
import { EstatisticasMissoesResponse } from '../models/estatisticas-missoes.model';
import { Motorista, MotoristaAdminPayload } from '../models/motorista.model';
import { StatusVeiculo, Veiculo } from '../models/veiculo.model';
import { environment } from '../../../environments/environment';

export interface ChecklistFiltro {
  busca?: string;
  motoristaId?: number;
  veiculoId?: number;
  tipoOperacao?: TipoOperacao;
  dataInicio?: string;
  dataFim?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly motoristaUrl = `${environment.apiBaseUrl}/admin/motoristas`;
  private readonly checklistUrl = `${environment.apiBaseUrl}/admin/checklists`;
  private readonly veiculoUrl = `${environment.apiBaseUrl}/admin/veiculos`;
  private readonly relatorioChecklistUrl = `${environment.apiBaseUrl}/admin/relatorios/checklists/pdf`;
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

  gerarRelatorioChecklistPdf(dataInicial: string, dataFinal: string): Observable<Blob> {
    const params = new HttpParams()
      .set('dataInicial', dataInicial)
      .set('dataFinal', dataFinal);

    return this.http.get(this.relatorioChecklistUrl, {
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

  criarVeiculo(payload: { placa: string; modelo: string; marca: string; status: StatusVeiculo }): Observable<Veiculo> {
    return this.http.post<Veiculo>(this.veiculoUrl, payload);
  }

  editarVeiculo(id: number, payload: { placa: string; modelo: string; marca: string; status: StatusVeiculo }): Observable<Veiculo> {
    return this.http.put<Veiculo>(`${this.veiculoUrl}/${id}`, payload);
  }

  excluirVeiculo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.veiculoUrl}/${id}`);
  }
}
