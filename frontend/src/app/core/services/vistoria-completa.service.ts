import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ResultadoVistoriaCompleta,
  StatusItemVistoriaCompleta,
  TipoAvariaVistoriaCompleta,
  TipoItemObrigatorioVistoriaCompleta,
  VistoriaCompletaResponse
} from '../models/vistoria-completa.model';
import { TipoOperacao } from '../models/checklist.model';
import { TipoUsoExternoVeiculo } from '../models/veiculo.model';
import { environment } from '../../../environments/environment';

export interface CriarVistoriaCompletaPayload {
  veiculoId: number;
  tipoOperacao: TipoOperacao;
  quilometragem: number;
  localizacao: string | null;
  observacaoGeral: string | null;
  nomeContraparte: string;
  tipoUsoExterno: TipoUsoExternoVeiculo;
  encerrarMissaoAtivaVeiculo: boolean;
  resultado: ResultadoVistoriaCompleta;
  itens: Array<{
    tipoItem: TipoItemObrigatorioVistoriaCompleta;
    status: StatusItemVistoriaCompleta;
    observacao: string | null;
  }>;
  avarias: Array<{
    local: string;
    tipoAvaria: TipoAvariaVistoriaCompleta;
    descricao: string;
    jaExistia: boolean;
  }>;
  fotoFrente: File;
  fotoLateralEsq: File;
  fotoLateralDir: File;
  fotoTraseira: File;
  fotoPainel: File;
  fotoEstepe: File;
  fotosAvarias: File[];
}

@Injectable({ providedIn: 'root' })
export class VistoriaCompletaService {
  private readonly baseUrl = `${environment.apiBaseUrl}/vistorias-completas`;

  constructor(private readonly http: HttpClient) {}

  criar(payload: CriarVistoriaCompletaPayload): Observable<VistoriaCompletaResponse> {
    const formData = new FormData();
    formData.append('dados', new Blob([JSON.stringify({
      veiculoId: payload.veiculoId,
      tipoOperacao: payload.tipoOperacao,
      quilometragem: payload.quilometragem,
      localizacao: payload.localizacao,
      observacaoGeral: payload.observacaoGeral,
      nomeContraparte: payload.nomeContraparte,
      tipoUsoExterno: payload.tipoUsoExterno,
      encerrarMissaoAtivaVeiculo: payload.encerrarMissaoAtivaVeiculo,
      resultado: payload.resultado,
      itens: payload.itens,
      avarias: payload.avarias
    })], { type: 'application/json' }));
    formData.append('fotoFrente', payload.fotoFrente);
    formData.append('fotoLateralEsq', payload.fotoLateralEsq);
    formData.append('fotoLateralDir', payload.fotoLateralDir);
    formData.append('fotoTraseira', payload.fotoTraseira);
    formData.append('fotoPainel', payload.fotoPainel);
    formData.append('fotoEstepe', payload.fotoEstepe);
    payload.fotosAvarias.forEach(file => formData.append('fotosAvarias', file));
    return this.http.post<VistoriaCompletaResponse>(this.baseUrl, formData);
  }
}
