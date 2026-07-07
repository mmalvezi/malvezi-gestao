import { StageProjeto, StatusOrcamento, TipoProjeto } from './models';

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

export const TIPOS: { valor: TipoProjeto; rot: string }[] = [
  { valor: 'site', rot: 'Site' },
  { valor: 'erp', rot: 'ERP' },
  { valor: 'automacao', rot: 'Automacao' },
  { valor: 'portal', rot: 'Portal' },
];

export const TIPO_LABEL: Record<TipoProjeto, string> = {
  site: 'Site',
  erp: 'ERP',
  automacao: 'Automacao',
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
  { valor: 'orcamento', rot: 'Orcamento' },
  { valor: 'aprovado', rot: 'Aprovado' },
  { valor: 'desenvolvimento', rot: 'Producao' },
  { valor: 'entregue', rot: 'Entregue' },
];

export const STAGE_LABEL: Record<StageProjeto, string> = {
  lead: 'Lead',
  orcamento: 'Orcamento',
  aprovado: 'Aprovado',
  desenvolvimento: 'Em producao',
  entregue: 'Entregue',
};

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

/* Modelos de escopo para orcamentos (itens sugeridos, editaveis) */
export const MODELOS_ESCOPO: Record<
  TipoProjeto,
  { titulo: string; descricao: string; valor: number }[]
> = {
  site: [
    { titulo: 'Layout e identidade', descricao: 'Design das paginas principais', valor: 1800 },
    { titulo: 'Desenvolvimento', descricao: 'Site responsivo em ate 6 paginas', valor: 2800 },
    { titulo: 'Publicacao', descricao: 'Hospedagem e configuracao de dominio', valor: 800 },
  ],
  erp: [
    { titulo: 'Levantamento', descricao: 'Mapeamento de processos e requisitos', valor: 2500 },
    { titulo: 'Modulos principais', descricao: 'Cadastros, estoque e financeiro', valor: 6500 },
    { titulo: 'Integracao fiscal', descricao: 'Emissao de notas e relatorios', valor: 3000 },
  ],
  automacao: [
    { titulo: 'Analise do fluxo', descricao: 'Desenho da automacao e gatilhos', valor: 1500 },
    { titulo: 'Implementacao', descricao: 'Rotinas automaticas e integracoes', valor: 3500 },
    { titulo: 'Testes e ajustes', descricao: 'Homologacao com o cliente', valor: 1000 },
  ],
  portal: [
    { titulo: 'UX e telas', descricao: 'Fluxo de navegacao e prototipo', valor: 2200 },
    { titulo: 'Area logada', descricao: 'Cadastro, login e painel do usuario', valor: 4200 },
    { titulo: 'Publicacao', descricao: 'Deploy e configuracao inicial', valor: 900 },
  ],
};
