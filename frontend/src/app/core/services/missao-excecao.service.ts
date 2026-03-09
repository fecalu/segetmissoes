import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MissaoExcecaoResponse, MotivoExcecaoMissao, StatusExcecaoMissao } from '../models/missao-excecao.model';

export interface IniciarMissaoExcecaoPayload {
  veiculoId: number;
  motivo: MotivoExcecaoMissao;
  aceiteResponsabilidade: boolean;
}

export interface FinalizarMissaoSemChecklistPayload {
  veiculoId: number;
  motivo: MotivoExcecaoMissao;
  aceiteResponsabilidade: boolean;
}

export interface FiltroExcecaoAdmin {
  status?: StatusExcecaoMissao;
  motoristaId?: number;
  veiculoId?: number;
  dataInicio?: string;
  dataFim?: string;
  busca?: string;
}

@Injectable({ providedIn: 'root' })
export class MissaoExcecaoService {
  private readonly motoristaUrl = `${environment.apiBaseUrl}/missoes/excecoes`;
  private readonly adminUrl = `${environment.apiBaseUrl}/admin/missoes/excecoes`;

  constructor(private readonly http: HttpClient) {}

  iniciar(payload: IniciarMissaoExcecaoPayload): Observable<MissaoExcecaoResponse> {
    return this.http.post<MissaoExcecaoResponse>(this.motoristaUrl, payload);
  }

  finalizarSemChecklist(payload: FinalizarMissaoSemChecklistPayload): Observable<MissaoExcecaoResponse> {
    return this.http.post<MissaoExcecaoResponse>(`${this.motoristaUrl}/finalizar-sem-checklist`, payload);
  }

  listarAdmin(filtro: FiltroExcecaoAdmin): Observable<MissaoExcecaoResponse[]> {
    let params = new HttpParams();
    Object.entries(filtro).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<MissaoExcecaoResponse[]>(this.adminUrl, { params });
  }

  encerrarAdmin(id: number, justificativaEncerramento: string): Observable<MissaoExcecaoResponse> {
    return this.http.patch<MissaoExcecaoResponse>(`${this.adminUrl}/${id}/encerrar`, { justificativaEncerramento });
  }
}
