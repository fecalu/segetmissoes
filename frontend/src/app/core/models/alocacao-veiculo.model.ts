export type TipoEventoAlocacaoVeiculo =
  | 'IMPORTACAO_INICIAL'
  | 'CRIACAO'
  | 'TROCA_VEICULO'
  | 'TROCA_RESPONSAVEL'
  | 'ATUALIZACAO_DADOS'
  | 'ENCERRAMENTO';

export interface AlocacaoVeiculo {
  id: number;
  numeroControle: number;
  placa: string;
  modelo: string;
  marca: string | null;
  responsavelNome: string;
  secretariaOrgao: string;
  setor: string;
  limiteAutorizado: string;
  documentoReferencia: string | null;
  linkConsulta: string | null;
  observacao: string | null;
  ativa: boolean;
  criadaEm: string;
  encerradaEm: string | null;
  vagaAdministrativaId: number | null;
  statusVaga: StatusVagaAdministrativa | null;
}

export type StatusVagaAdministrativa = 'LIVRE' | 'OCUPADA' | 'DESATIVADA';

export interface VagaAdministrativa {
  id: number;
  numeroControle: number;
  secretariaOrgao: string;
  setor: string;
  limiteAutorizado: string;
  documentoReferencia: string | null;
  observacao: string | null;
  status: StatusVagaAdministrativa;
  criadaEm: string;
  encerradaEm: string | null;
  alocacaoAtivaId: number | null;
  placaAtual: string | null;
  modeloAtual: string | null;
  responsavelAtual: string | null;
}

export interface HistoricoAlocacaoVeiculo {
  id: number;
  tipo: TipoEventoAlocacaoVeiculo;
  veiculoAnteriorId: number | null;
  veiculoAnteriorPlaca: string | null;
  veiculoNovoId: number | null;
  veiculoNovoPlaca: string | null;
  responsavelAnterior: string | null;
  responsavelNovo: string | null;
  limiteAnterior: string | null;
  limiteNovo: string | null;
  observacao: string | null;
  dataHora: string;
  administradorNome: string;
}

export interface CriarAlocacaoVeiculoPayload {
  placa: string;
  modelo: string;
  marca: string | null;
  responsavelNome: string;
  secretariaOrgao: string;
  setor: string;
  limiteAutorizado: string;
  documentoReferencia: string | null;
  linkConsulta: string | null;
  observacao: string | null;
}

export interface AtualizarDadosAlocacaoVeiculoPayload {
  secretariaOrgao: string;
  setor: string;
  limiteAutorizado: string;
  documentoReferencia: string | null;
  linkConsulta: string | null;
  observacao: string | null;
}

export interface CriarVagaAdministrativaPayload {
  secretariaOrgao: string;
  setor: string;
  limiteAutorizado: string;
  documentoReferencia: string | null;
  observacao: string | null;
}

export type AtualizarVagaAdministrativaPayload = CriarVagaAdministrativaPayload;
