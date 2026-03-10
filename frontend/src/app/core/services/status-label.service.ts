import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RotuloStatusVeiculoResponse } from '../models/status-label.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StatusLabelService {
  private readonly baseUrl = `${environment.apiBaseUrl}/configuracoes/rotulos-status-veiculo`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<RotuloStatusVeiculoResponse[]> {
    return this.http.get<RotuloStatusVeiculoResponse[]>(this.baseUrl);
  }
}
