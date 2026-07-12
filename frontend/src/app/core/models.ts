export type TipoProjeto = 'site' | 'erp' | 'automacao' | 'portal';
/** A trilha tem 5 estagios. "recusado" e terminal e fica fora dela. */
export type StageProjeto =
  | 'lead'
  | 'orcamento'
  | 'aprovado'
  | 'desenvolvimento'
  | 'entregue'
  | 'recusado';
export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado';
export type StatusRecorrencia = 'previsto' | 'ativo' | 'pausado';
export type StatusCobranca = 'aberta' | 'paga' | 'cancelada';

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
  stage: StageProjeto;
  entrega?: string | null;
  escopo: string;
  criado?: string;
  cliente?: Cliente | null;
  /* Recebimentos: derivados das parcelas, calculados no backend */
  pago?: number;
  saldo?: number;
  parcelas_total?: number;
  parcelas_pagas?: number;
  tarefas_total?: number;
  tarefas_feitas?: number;
}

/** Parcela de recebimento do projeto (sempre cadastrada a mao). */
export interface ParcelaProjeto {
  id: number;
  projeto_id: number;
  descricao: string;
  valor: number;
  vencimento?: string | null;
  pago: boolean;
  pago_em?: string | null;
  ordem: number;
}

export interface ParcelaInput {
  descricao: string;
  valor: number;
  vencimento?: string | null;
  pago: boolean;
}

/* Quadro de tarefas dentro do projeto */
export type ColunaTarefa = 'afazer' | 'fazendo' | 'validacao' | 'concluido';
export type PrioridadeTarefa = 'baixa' | 'media' | 'alta';
export type AreaTarefa = 'dev' | 'design' | 'produto' | 'cliente';

export interface TarefaProjeto {
  id: number;
  projeto_id: number;
  titulo: string;
  descricao: string;
  coluna: ColunaTarefa;
  prioridade: PrioridadeTarefa;
  area: AreaTarefa;
  responsavel?: string | null;
  prazo?: string | null;
  /** De qual modelo de tarefa ela nasceu (null quando criada a mao). */
  modelo_id?: number | null;
  ordem: number;
  criado?: string;
  atualizado?: string | null;
}

export interface TarefaProjetoInput {
  titulo: string;
  descricao: string;
  coluna: ColunaTarefa;
  prioridade: PrioridadeTarefa;
  area: AreaTarefa;
  responsavel?: string | null;
  prazo?: string | null;
}

/** Modelo de tarefa: nasce sozinha quando o projeto entra no estagio. */
export interface ModeloTarefa {
  id?: number;
  tipo_projeto: TipoProjeto;
  stage_gatilho: 'lead' | 'orcamento' | 'aprovado' | 'desenvolvimento' | 'entregue';
  titulo: string;
  descricao: string;
  area: AreaTarefa;
  prioridade: PrioridadeTarefa;
  responsavel_padrao?: string | null;
  coluna_inicial: ColunaTarefa;
  dias_prazo?: number | null;
  ordem: number;
  ativo: boolean;
}

/** Item do checklist mensal por tipo de projeto (Configuracoes). */
export interface ModeloVerificacao {
  id?: number;
  tipo_projeto: TipoProjeto;
  titulo: string;
  ordem: number;
  ativo: boolean;
}

export interface ItemVerificacao {
  id: number;
  titulo: string;
  ok: boolean;
  observacao: string;
  ordem: number;
}

/** Verificacao mensal de saude de um projeto entregue. */
export interface Verificacao {
  id: number;
  projeto_id: number;
  competencia: string; // AAAA-MM
  status: 'aberta' | 'concluida';
  criado: string;
  concluida_em?: string | null;
  observacoes: string;
  itens: ItemVerificacao[];
  cliente?: string | null;
  tipo_projeto?: string | null;
}

export interface OrcamentoItem {
  id?: number;
  titulo: string;
  descricao: string;
  valor: number;
  ordem: number;
}

/* Parcela do PLANO de pagamento do orcamento (a condicao, nao o recebimento) */
export type TipoValorParcela = 'percentual' | 'fixo';
export type TipoVencimentoParcela = 'marco' | 'dias';
export type MarcoParcela = 'aprovacao' | 'entrega';

export interface ParcelaOrcamento {
  id?: number;
  descricao: string;
  tipo_valor: TipoValorParcela;
  percentual?: number | null;
  valor_fixo?: number | null;
  tipo_vencimento: TipoVencimentoParcela;
  marco?: MarcoParcela | null;
  dias?: number | null;
  ordem: number;
}

/** Situacao do plano de pagamento vista pelo projeto. */
export interface PlanoInfo {
  tem_plano: boolean;
  orcamento_id?: number | null;
  orcamento_numero?: string | null;
  gerado?: boolean;
  plano_mudou?: boolean;
}

export interface Orcamento {
  id: number;
  numero: string;
  cliente_id: number;
  projeto_id?: number | null;
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
  plano?: ParcelaOrcamento[];
  total: number;
  /* Proposta em PDF anexada (quando existe, e o documento padrao) */
  tem_anexo?: boolean;
  anexo_nome?: string | null;
  anexo_tamanho?: number | null;
  anexo_criado?: string | null;
}

export interface AnexoResumo {
  nome: string;
  tamanho: number;
  criado: string;
}

export interface Recorrencia {
  id: number;
  cliente_id: number;
  projeto_id?: number | null;
  plano: string;
  valor: number;
  status: StatusRecorrencia;
  dia_vencimento: number;
  inicio?: string | null;
  contato?: string | null;
  criado?: string;
  cliente?: Cliente | null;
}

/** Cobranca de um mes de uma mensalidade. */
export interface Cobranca {
  id: number;
  recorrencia_id: number;
  competencia: string; // AAAA-MM
  vencimento: string;
  valor: number;
  status: StatusCobranca;
  pago_em?: string | null;
  notificado_em?: string | null;
  cliente?: string | null;
  plano?: string | null;
  contato?: string | null;
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
  stage: StageProjeto;
  entrega: string;
  dias_restantes: number;
}

/** Orcamento enviado aguardando resposta (bloco Propostas do painel). */
export interface PropostaAberta {
  id: number;
  numero: string;
  cliente: string;
  total: number;
  dias: number;
}

export interface Pendencia {
  chave: string;
  tipo: string;
  titulo: string;
  detalhe: string;
  /** Rota para onde o clique no alerta leva. */
  link?: string | null;
}

export interface Dashboard {
  /** MRR: so as mensalidades ativas. */
  recorrente_mes: number;
  /** Mensalidades previstas (comecam a valer quando o projeto for entregue). */
  recorrente_previsto: number;
  /** Propostas em aberto (lead e orcamento): expectativa, nao caixa. */
  em_negociacao: number;
  em_negociacao_qtd: number;
  /** Fechado e nao pago, incluindo os entregues com saldo. */
  a_receber: number;
  ja_recebido: number;
  carteira_total: number;
  projetos_ativos: number;
  em_producao: number;
  recusados_qtd: number;
  taxa_aprovacao: number;
  /** Verificacoes mensais dos entregues, no mes corrente. */
  verificacoes_pendentes: number;
  verificacoes_concluidas: number;
  /** Dinheiro do mes e propostas em aberto (blocos do painel). */
  recebido_mes: number;
  cobrancas_abertas: number;
  propostas: PropostaAberta[];
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
  projeto_id?: number | null;
  titulo: string;
  tipo: TipoProjeto;
  desconto: number;
  pagamento: string;
  prazo: string;
  validade_dias: number;
  obs: string;
  status: StatusOrcamento;
  itens: OrcamentoItem[];
  plano?: ParcelaOrcamento[];
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

export interface NotaProjeto {
  id: number;
  projeto_id: number;
  titulo: string;
  /** HTML simples (negrito, italico, lista), sanitizado no backend. */
  texto: string;
  criado: string;
}
