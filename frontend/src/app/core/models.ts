export type TipoProjeto = 'site' | 'erp' | 'automacao' | 'portal';
export type StageProjeto =
  | 'lead'
  | 'orcamento'
  | 'aprovado'
  | 'desenvolvimento'
  | 'entregue';
export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado';
export type StatusRecorrencia = 'ativo' | 'pausado';

export interface Cliente {
  id: number;
  nome: string;
  empresa?: string | null;
  contato?: string | null;
  criado?: string;
}

export interface Projeto {
  id: number;
  cliente_id: number;
  tipo: TipoProjeto;
  valor: number;
  pago: number;
  stage: StageProjeto;
  entrega?: string | null;
  escopo: string;
  criado?: string;
  cliente?: Cliente | null;
}

export interface OrcamentoItem {
  id?: number;
  titulo: string;
  descricao: string;
  valor: number;
  ordem: number;
}

export interface Orcamento {
  id: number;
  numero: string;
  cliente_id: number;
  titulo: string;
  tipo: TipoProjeto;
  desconto: number;
  pagamento: string;
  prazo: string;
  validade_dias: number;
  obs: string;
  status: StatusOrcamento;
  criado?: string;
  cliente?: Cliente | null;
  itens: OrcamentoItem[];
  total: number;
}

export interface Recorrencia {
  id: number;
  cliente_id: number;
  plano: string;
  valor: number;
  status: StatusRecorrencia;
  criado?: string;
  cliente?: Cliente | null;
}

export interface Tarefa {
  id: number;
  texto: string;
  done: boolean;
  criado?: string;
}

export interface FunilItem {
  stage: StageProjeto;
  count: number;
}

export interface ProximaEntrega {
  id: number;
  cliente: string;
  tipo: TipoProjeto;
  entrega: string;
  dias_restantes: number;
}

export interface Pendencia {
  tipo: string;
  titulo: string;
  detalhe: string;
}

export interface Dashboard {
  recorrente_mes: number;
  a_receber: number;
  projetos_ativos: number;
  em_producao: number;
  funil: FunilItem[];
  proximas_entregas: ProximaEntrega[];
  pendencias: Pendencia[];
}

/* Payloads de entrada */
export type ClienteInput = Omit<Cliente, 'id' | 'criado'>;
export type ProjetoInput = Omit<Projeto, 'id' | 'criado' | 'cliente'>;
export type RecorrenciaInput = Omit<Recorrencia, 'id' | 'criado' | 'cliente'>;
export interface OrcamentoInput {
  cliente_id: number;
  titulo: string;
  tipo: TipoProjeto;
  desconto: number;
  pagamento: string;
  prazo: string;
  validade_dias: number;
  obs: string;
  status: StatusOrcamento;
  itens: OrcamentoItem[];
}

/* Documentos por modelo */
export type TipoDocumento = 'contrato' | 'orcamento' | 'recibo';

export interface ModeloDocumento {
  id: number;
  tipo: TipoDocumento;
  titulo: string;
  corpo: string;
  atualizado?: string | null;
}

export interface Documento {
  id: number;
  tipo: TipoDocumento;
  numero: string;
  projeto_id?: number | null;
  orcamento_id?: number | null;
  titulo: string;
  conteudo: string;
  criado: string;
  atualizado?: string | null;
}

export interface DocumentoInput {
  tipo: TipoDocumento;
  numero?: string;
  projeto_id?: number | null;
  orcamento_id?: number | null;
  titulo: string;
  conteudo: string;
}
