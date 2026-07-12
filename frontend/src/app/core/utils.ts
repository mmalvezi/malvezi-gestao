import {
  AreaTarefa,
  ColunaTarefa,
  PrioridadeTarefa,
  StageProjeto,
  StatusCobranca,
  StatusOrcamento,
  StatusRecorrencia,
  TipoProjeto,
} from './models';

export function moeda(valor: number | null | undefined): string {
  const n = Number(valor || 0);
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export function dataBr(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

export function dataHoraBr(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Tamanho de arquivo legivel (ex.: 1,4 MB). */
export function tamanhoArquivo(bytes: number | null | undefined): string {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Limite do anexo de proposta, igual ao do backend. */
export const LIMITE_ANEXO_MB = 20;

export const TIPOS: { valor: TipoProjeto; rot: string }[] = [
  { valor: 'site', rot: 'Site' },
  { valor: 'erp', rot: 'ERP' },
  { valor: 'automacao', rot: 'Automação' },
  { valor: 'portal', rot: 'Portal' },
];

export const TIPO_LABEL: Record<TipoProjeto, string> = {
  site: 'Site',
  erp: 'ERP',
  automacao: 'Automação',
  portal: 'Portal',
};

export const TIPO_SIGLA: Record<TipoProjeto, string> = {
  site: 'ST',
  erp: 'ER',
  automacao: 'AU',
  portal: 'PO',
};

export const STAGES: { valor: StageProjeto; rot: string }[] = [
  { valor: 'lead', rot: 'Lead' },
  { valor: 'orcamento', rot: 'Orçamento' },
  { valor: 'aprovado', rot: 'Aprovado' },
  { valor: 'desenvolvimento', rot: 'Produção' },
  { valor: 'entregue', rot: 'Entregue' },
];

export const STAGE_LABEL: Record<StageProjeto, string> = {
  lead: 'Lead',
  orcamento: 'Orçamento',
  aprovado: 'Aprovado',
  desenvolvimento: 'Em produção',
  entregue: 'Entregue',
  recusado: 'Recusado',
};

/* ---------- Mensalidades e cobrancas ---------- */

export const STATUS_REC: { valor: StatusRecorrencia; rot: string }[] = [
  { valor: 'previsto', rot: 'Prevista' },
  { valor: 'ativo', rot: 'Ativa' },
  { valor: 'pausado', rot: 'Pausada' },
];

export const STATUS_REC_LABEL: Record<StatusRecorrencia, string> = {
  previsto: 'Prevista',
  ativo: 'Ativa',
  pausado: 'Pausada',
};

export const STATUS_REC_CLASSE: Record<StatusRecorrencia, string> = {
  previsto: 'info',
  ativo: 'ok',
  pausado: 'warn',
};

export const STATUS_COB_LABEL: Record<StatusCobranca, string> = {
  aberta: 'Em aberto',
  paga: 'Paga',
  cancelada: 'Cancelada',
};

/** Dias 1 a 28 (evita problema com meses curtos). */
export const DIAS_VENCIMENTO: { valor: number; rot: string }[] = Array.from(
  { length: 28 },
  (_, i) => ({ valor: i + 1, rot: `Dia ${i + 1}` }),
);

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** "2026-07" vira "julho de 2026". */
export function competenciaBr(competencia: string): string {
  const [ano, mes] = (competencia || '').split('-');
  const i = Number(mes) - 1;
  if (!ano || i < 0 || i > 11) return competencia || '';
  return `${MESES[i]} de ${ano}`;
}

/** Complemento relativo da data: "(há 3 dias)", "(hoje)", "(amanhã)"... */
export function relativo(iso: string | null | undefined): string {
  if (!iso) return '';
  const dias = diasAte(iso);
  if (dias < -1) return `(há ${-dias} dias)`;
  if (dias === -1) return '(ontem)';
  if (dias === 0) return '(hoje)';
  if (dias === 1) return '(amanhã)';
  return `(em ${dias} dias)`;
}

/** Dias entre hoje e a data (negativo quer dizer vencida). */
export function diasAte(iso: string | null | undefined): number {
  if (!iso) return 0;
  const alvo = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

export const STATUS_ORC: { valor: StatusOrcamento; rot: string }[] = [
  { valor: 'rascunho', rot: 'Rascunho' },
  { valor: 'enviado', rot: 'Enviado' },
  { valor: 'aprovado', rot: 'Aprovado' },
  { valor: 'recusado', rot: 'Recusado' },
];

export const STATUS_ORC_CLASSE: Record<StatusOrcamento, string> = {
  rascunho: '',
  enviado: 'info',
  aprovado: 'ok',
  recusado: 'bad',
};

export function stageIndex(stage: StageProjeto): number {
  return STAGES.findIndex((s) => s.valor === stage);
}

/* ---------- Quadro de tarefas do projeto ---------- */

/** Icone (path SVG) de cada coluna do quadro. */
export const COLUNAS: {
  valor: ColunaTarefa;
  rot: string;
  icone: string;
}[] = [
  {
    valor: 'afazer',
    rot: 'A fazer',
    icone: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  },
  {
    valor: 'fazendo',
    rot: 'Fazendo',
    icone: 'M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07-2.83 2.83M9.76 14.24l-2.83 2.83m0-12.14 2.83 2.83m4.48 4.48 2.83 2.83',
  },
  {
    valor: 'validacao',
    rot: 'Validação',
    icone: 'M9 12l2 2 4-4m-3-8 7 4v6c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-4z',
  },
  {
    valor: 'concluido',
    rot: 'Concluído',
    icone: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  },
];

export const COLUNA_LABEL: Record<ColunaTarefa, string> = {
  afazer: 'A fazer',
  fazendo: 'Fazendo',
  validacao: 'Validação',
  concluido: 'Concluído',
};

export const PRIORIDADES: { valor: PrioridadeTarefa; rot: string }[] = [
  { valor: 'baixa', rot: 'Baixa' },
  { valor: 'media', rot: 'Média' },
  { valor: 'alta', rot: 'Alta' },
];

export const PRIORIDADE_LABEL: Record<PrioridadeTarefa, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export const AREAS: { valor: AreaTarefa; rot: string }[] = [
  { valor: 'dev', rot: 'Dev' },
  { valor: 'design', rot: 'Design' },
  { valor: 'produto', rot: 'Produto' },
  { valor: 'cliente', rot: 'Cliente' },
];

export const AREA_LABEL: Record<AreaTarefa, string> = {
  dev: 'Dev',
  design: 'Design',
  produto: 'Produto',
  cliente: 'Cliente',
};

export const RESPONSAVEIS: { valor: string; rot: string }[] = [
  { valor: '', rot: 'Sem responsável' },
  { valor: 'Matheus', rot: 'Matheus' },
  { valor: 'Pai', rot: 'Pai' },
];

/** Iniciais para o avatar do responsavel (ate 2 letras). */
export function iniciais(nome: string | null | undefined): string {
  const partes = (nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '';
  const letras = partes.slice(0, 2).map((p) => p[0].toUpperCase());
  return letras.join('');
}

/** Percentual de tarefas concluidas do projeto (0 a 100). */
export function progressoTarefas(
  feitas: number | undefined,
  total: number | undefined,
): number {
  const t = Number(total || 0);
  if (!t) return 0;
  return Math.round((Number(feitas || 0) / t) * 100);
}

/* Modelos de escopo para orcamentos (itens sugeridos, editaveis) */
export const MODELOS_ESCOPO: Record<
  TipoProjeto,
  { titulo: string; descricao: string; valor: number }[]
> = {
  site: [
    { titulo: 'Layout e identidade', descricao: 'Design das páginas principais', valor: 1800 },
    { titulo: 'Desenvolvimento', descricao: 'Site responsivo em até 6 páginas', valor: 2800 },
    { titulo: 'Publicação', descricao: 'Hospedagem e configuração de domínio', valor: 800 },
  ],
  erp: [
    { titulo: 'Levantamento', descricao: 'Mapeamento de processos e requisitos', valor: 2500 },
    { titulo: 'Módulos principais', descricao: 'Cadastros, estoque e financeiro', valor: 6500 },
    { titulo: 'Integração fiscal', descricao: 'Emissão de notas e relatórios', valor: 3000 },
  ],
  automacao: [
    { titulo: 'Análise do fluxo', descricao: 'Desenho da automação e gatilhos', valor: 1500 },
    { titulo: 'Implementação', descricao: 'Rotinas automáticas e integrações', valor: 3500 },
    { titulo: 'Testes e ajustes', descricao: 'Homologação com o cliente', valor: 1000 },
  ],
  portal: [
    { titulo: 'UX e telas', descricao: 'Fluxo de navegação e protótipo', valor: 2200 },
    { titulo: 'Área logada', descricao: 'Cadastro, login e painel do usuário', valor: 4200 },
    { titulo: 'Publicação', descricao: 'Deploy e configuração inicial', valor: 900 },
  ],
};
