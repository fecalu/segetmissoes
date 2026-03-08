import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ChecklistResponse, TipoOperacao } from '../models/checklist.model';
import { environment } from '../../../environments/environment';

export interface ChecklistPayload {
  veiculoId: number;
  tipoOperacao: TipoOperacao;
  fotoPainel: File;
  fotoEstepe: File;
  fotoLateralEsq: File;
  fotoLateralDir: File;
}

@Injectable({ providedIn: 'root' })
export class ChecklistService {
  private readonly baseUrl = `${environment.apiBaseUrl}/checklists`;

  constructor(private readonly http: HttpClient) {}

  criar(payload: ChecklistPayload): Observable<ChecklistResponse> {
    const formData = new FormData();
    formData.append('veiculoId', String(payload.veiculoId));
    formData.append('tipoOperacao', payload.tipoOperacao);
    formData.append('fotoPainel', payload.fotoPainel);
    formData.append('fotoEstepe', payload.fotoEstepe);
    formData.append('fotoLateralEsq', payload.fotoLateralEsq);
    formData.append('fotoLateralDir', payload.fotoLateralDir);
    return this.http.post<ChecklistResponse>(this.baseUrl, formData);
  }
}
