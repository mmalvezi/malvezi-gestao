/* Modelos e seed do Plano de Captação (ver MODULO_PLANO_CAPTACAO.md) */

export interface CategoriaAlvo {
  id: string;
  nome: string;
  dorTipica: string;
  ativa: boolean;
  /** Contador manual de respostas recebidas (emails enviados vêm do pipeline). */
  respostas: number;
}

export interface FonteBusca {
  id: string;
  nome: string;
  descricao: string;
  empresasColetadas: number;
}

export interface BlocoRotina {
  dia: 1 | 2 | 3 | 4 | 5; // seg=1 … sex=5
  titulo: string;
  descricao: string;
  concluidoEm?: string; // ISO date do último dia em que foi marcado
}

export interface ItemChecklist {
  id: string;
  texto: string;
  feito: boolean;
}

export interface MetricaFunil {
  id: string;
  nome: string;
  faixaMin: number; // %
  faixaMax: number; // %
  /** Entrada manual — usada só quando o pipeline não tem dados pra calcular. */
  valorManual?: number;
  acaoSeAbaixo: string;
}

export interface PlanoCaptacao {
  cidades: string[];
  categorias: CategoriaAlvo[];
  fontes: FonteBusca[];
  rotina: BlocoRotina[];
  checklistPartida: ItemChecklist[];
  metricas: MetricaFunil[];
  atualizadoEm: string;
}

/** Seed do primeiro uso — ponto de partida, tudo editável na tela. */
export function planoSeed(): PlanoCaptacao {
  return {
    cidades: [],
    categorias: [
      {
        id: 'oficinas',
        nome: 'Oficinas mecânicas',
        dorTipica: 'ordens de serviço no papel e orçamentos que se perdem no WhatsApp',
        ativa: true,
        respostas: 0,
      },
      {
        id: 'clinicas',
        nome: 'Clínicas e consultórios',
        dorTipica: 'agenda com furos e confirmação de consulta feita na mão',
        ativa: true,
        respostas: 0,
      },
      {
        id: 'petshops',
        nome: 'Petshops e veterinárias',
        dorTipica: 'cadastro de clientes, vacinas e retornos espalhados em planilhas',
        ativa: true,
        respostas: 0,
      },
      {
        id: 'restaurantes',
        nome: 'Restaurantes e lanchonetes',
        dorTipica: 'pedidos anotados errado e nenhum controle do custo dos pratos',
        ativa: true,
        respostas: 0,
      },
      {
        id: 'mat-construcao',
        nome: 'Lojas de materiais de construção',
        dorTipica: 'estoque desatualizado e orçamento lento no balcão',
        ativa: true,
        respostas: 0,
      },
      {
        id: 'academias',
        nome: 'Academias e estúdios',
        dorTipica: 'mensalidades em planilha e cobrança sempre atrasada',
        ativa: true,
        respostas: 0,
      },
      {
        id: 'contabilidade',
        nome: 'Escritórios de contabilidade',
        dorTipica: 'tarefas repetitivas refeitas à mão todo mês',
        ativa: true,
        respostas: 0,
      },
      {
        id: 'escolas',
        nome: 'Escolas e cursos livres',
        dorTipica: 'matrículas e mensalidades controladas no papel',
        ativa: true,
        respostas: 0,
      },
    ],
    fontes: [
      {
        id: 'maps',
        nome: 'Google Maps',
        descricao: 'Busque "categoria + cidade" e anote nome, telefone e site das que aparecem bem avaliadas.',
        empresasColetadas: 0,
      },
      {
        id: 'ace',
        nome: 'ACE / CDL',
        descricao: 'Lista de associados da associação comercial da cidade — empresas ativas e organizadas.',
        empresasColetadas: 0,
      },
      {
        id: 'cnpj',
        nome: 'Consulta CNPJ',
        descricao: 'Filtre CNPJs ativos por CNAE e cidade em sites de consulta gratuita.',
        empresasColetadas: 0,
      },
      {
        id: 'instagram',
        nome: 'Instagram / grupos',
        descricao: 'Negócios ativos da região que aparecem em grupos locais e hashtags da cidade.',
        empresasColetadas: 0,
      },
      {
        id: 'rede',
        nome: 'Rede pessoal',
        descricao: 'Avise conhecidos do que você faz — indicação ainda é a porta mais quente.',
        empresasColetadas: 0,
      },
    ],
    rotina: [
      {
        dia: 1,
        titulo: 'Garimpo',
        descricao: 'Listar 25–30 empresas novas e enriquecer 15 (contato, email, dor).',
      },
      {
        dia: 2,
        titulo: 'Emails',
        descricao: 'Enviar 8–10 primeiros emails personalizados pela dor da categoria.',
      },
      {
        dia: 3,
        titulo: 'Emails + follow-ups',
        descricao: 'Enviar mais 5–7 emails e todos os follow-ups que venceram (D+4).',
      },
      {
        dia: 4,
        titulo: 'Ligações',
        descricao: 'Ligar pra quem não respondeu (D+8) e cobrar propostas paradas (D+5).',
      },
      {
        dia: 5,
        titulo: 'Revisão',
        descricao: 'Atualizar o pipeline, medir a semana e deixar o garimpo de segunda pronto.',
      },
    ],
    checklistPartida: [
      { id: 'p1', texto: 'Definir as cidades da região de atuação', feito: false },
      { id: 'p2', texto: 'Escolher 3 categorias pra começar (as outras esperam)', feito: false },
      { id: 'p3', texto: 'Ajustar os modelos de email com seu nome e 2 projetos de exemplo', feito: false },
      { id: 'p4', texto: 'Garimpar as primeiras 25 empresas no pipeline', feito: false },
      { id: 'p5', texto: 'Enviar os primeiros 15 emails na primeira semana', feito: false },
    ],
    metricas: [
      {
        id: 'resposta',
        nome: 'Taxa de resposta',
        faixaMin: 3,
        faixaMax: 8,
        acaoSeAbaixo: 'Reescrever assunto e 1ª linha (a dor típica) e testar outra categoria.',
      },
      {
        id: 'resposta_reuniao',
        nome: 'Resposta → reunião',
        faixaMin: 30,
        faixaMax: 50,
        acaoSeAbaixo: 'Responder em minutos, não horas, e já oferecer 2 horários prontos.',
      },
      {
        id: 'reuniao_proposta',
        nome: 'Reunião → proposta',
        faixaMin: 50,
        faixaMax: 100,
        acaoSeAbaixo: 'Qualificar melhor antes de aceitar a reunião — dor real e quem decide.',
      },
      {
        id: 'proposta_fechamento',
        nome: 'Proposta → fechamento',
        faixaMin: 25,
        faixaMax: 35,
        acaoSeAbaixo: 'Rever preço e escopo, e cobrar resposta no D+5 sem falta.',
      },
    ],
    atualizadoEm: new Date().toISOString(),
  };
}
