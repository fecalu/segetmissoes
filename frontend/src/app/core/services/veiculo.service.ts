import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Veiculo } from '../models/veiculo.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VeiculoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/veiculos`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Veiculo[]> {
    return this.http.get<Veiculo[]>(this.baseUrl);
  }
}
