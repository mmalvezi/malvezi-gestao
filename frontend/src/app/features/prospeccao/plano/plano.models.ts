/* Modelos, seed (v2) e migração do Plano de Captação
   (ver MODULO_PLANO_CAPTACAO.md e prompt-atualizacao-v2.md) */

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
  faixaMin: number;
  faixaMax: number;
  /** Entrada manual — usada só quando o pipeline não tem dados pra calcular. */
  valorManual?: number;
  acaoSeAbaixo: string;
  /** Unidade de exibição (padrão '%'). */
  unidade?: string;
  /** true = saudável é ficar ATÉ faixaMax (ex.: ciclo em dias); estourar é ruim. */
  melhorMenor?: boolean;
}

export interface PlanoCaptacao {
  cidades: string[];
  categorias: CategoriaAlvo[];
  fontes: FonteBusca[];
  rotina: BlocoRotina[];
  checklistPartida: ItemChecklist[];
  metricas: MetricaFunil[];
  atualizadoEm: string;
  /** Versão do seed aplicado — controla a migração única. */
  seedVersion?: number;
}

export const SEED_VERSION = 2;

/** Seed atual (v2 — ICP industrial). Ponto de partida, tudo editável na tela. */
export function planoSeed(): PlanoCaptacao {
  return {
    cidades: [],
    categorias: [
      {
        id: 'industrias',
        nome: 'Indústrias com processo produtivo próprio',
        dorTipica: 'PCP, rastreabilidade de lote e qualidade rodando em planilha porque o ERP de prateleira não cobre',
        ativa: true,
        respostas: 0,
      },
      {
        id: 'transportadoras',
        nome: 'Transportadoras e operadores logísticos médios',
        dorTipica: 'TMS genérico não cobre acerto de agregados, torre de controle própria e integração com WMS do cliente',
        ativa: true,
        respostas: 0,
      },
      {
        id: 'construtoras',
        nome: 'Construtoras e incorporadoras regionais',
        dorTipica: 'medição de obra, suprimentos e contratos num Frankenstein de planilhas',
        ativa: true,
        respostas: 0,
      },
      {
        id: 'distribuidoras',
        nome: 'Distribuidoras e atacadistas grandes',
        dorTipica: 'força de vendas externa, roteirização e preço por cliente rodando fora do sistema fiscal',
        ativa: true,
        respostas: 0,
      },
      {
        id: 'servicos-industriais',
        nome: 'Serviços industriais (manutenção, montagem, facilities)',
        dorTipica: 'gestão de contratos, medição de serviço e apontamento de equipe de campo sem sistema',
        ativa: true,
        respostas: 0,
      },
    ],
    fontes: [
      {
        id: 'ciesp',
        nome: 'CIESP Jundiaí',
        descricao: 'Lista de associados = ICP pronto; participar dos eventos mensais.',
        empresasColetadas: 0,
      },
      {
        id: 'cnpj',
        nome: 'Consulta CNPJ (Casa dos Dados / CNPJ.biz)',
        descricao: 'Filtrar cidades + CNAE das categorias + porte "Demais" + capital social alto.',
        empresasColetadas: 0,
      },
      {
        id: 'linkedin',
        nome: 'LinkedIn',
        descricao: 'Empresas da região com 30+ funcionários; decisor = sócio ou gerente adm/industrial; vagas abertas = timing.',
        empresasColetadas: 0,
      },
      {
        id: 'condominios',
        nome: 'Condomínios logísticos e distritos industriais',
        descricao: 'Levantar ocupantes dos condomínios de Cabreúva/Itupeva/Jundiaí e distritos de Jundiaí/Itu.',
        empresasColetadas: 0,
      },
      {
        id: 'rede',
        nome: 'Rede pessoal e indicação',
        descricao: 'Contatos próprios e da família que trabalham em ou vendem para indústrias da região.',
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
      { id: 'q1', texto: 'Ajustar meta semanal no sistema: 15 → 10 primeiros emails', feito: false },
      { id: 'q2', texto: 'Destravar propostas paradas: Hugo Rodrigues (ORC-0001) e Pavani Soluções (ORC-0002)', feito: false },
      { id: 'q3', texto: 'Mapear associados CIESP Jundiaí e verificar próximo evento', feito: false },
      { id: 'q4', texto: 'Rodar 1ª consulta CNPJ: cidades + CNAEs das categorias 1 e 2 + porte "Demais"', feito: false },
      { id: 'q5', texto: 'Montar lista inicial de 20 empresas do ICP com decisor nomeado', feito: false },
      { id: 'q6', texto: 'Enviar os 5 primeiros emails da v2', feito: false },
    ],
    metricas: [
      {
        id: 'resposta',
        nome: 'Taxa de resposta (1º email + follow-up)',
        faixaMin: 5,
        faixaMax: 10,
        acaoSeAbaixo: 'Reescrever assunto e 1ª linha; checar spam.',
      },
      {
        id: 'resposta_reuniao',
        nome: 'Resposta → reunião',
        faixaMin: 30,
        faixaMax: 50,
        acaoSeAbaixo: 'Reunião de 15 min, online, propor 2 horários.',
      },
      {
        id: 'reuniao_proposta',
        nome: 'Reunião → proposta',
        faixaMin: 50,
        faixaMax: 100,
        acaoSeAbaixo: 'Qualificar porte antes — está entrando empresa fora do ICP?',
      },
      {
        id: 'proposta_fechamento',
        nome: 'Proposta → fechamento',
        faixaMin: 25,
        faixaMax: 35,
        acaoSeAbaixo: 'Rever valor de entrada; nunca remover ou reduzir a mensalidade.',
      },
      {
        id: 'ciclo_proposta',
        nome: 'Ciclo proposta → resposta',
        faixaMin: 0,
        faixaMax: 45,
        unidade: 'dias',
        melhorMenor: true,
        acaoSeAbaixo: 'Follow-up de proposta em D+5 sem falha; incluir prazo de validade na proposta.',
      },
    ],
    atualizadoEm: new Date().toISOString(),
    seedVersion: SEED_VERSION,
  };
}

/* ============================== Migração v1 → v2 ==============================
   O seed só roda no primeiro uso, então instalações existentes migram aqui:
   cada bloco é substituído pelo v2 SOMENTE se ainda estiver idêntico ao seed
   v1 (usuário não editou). Contadores e valores manuais migram por id. */

/** Snapshot do seed v1 (apenas os campos que o usuário edita — sem contadores/estados). */
const SEED_V1 = {
  categorias: [
    { id: 'oficinas', nome: 'Oficinas mecânicas', dorTipica: 'ordens de serviço no papel e orçamentos que se perdem no WhatsApp', ativa: true },
    { id: 'clinicas', nome: 'Clínicas e consultórios', dorTipica: 'agenda com furos e confirmação de consulta feita na mão', ativa: true },
    { id: 'petshops', nome: 'Petshops e veterinárias', dorTipica: 'cadastro de clientes, vacinas e retornos espalhados em planilhas', ativa: true },
    { id: 'restaurantes', nome: 'Restaurantes e lanchonetes', dorTipica: 'pedidos anotados errado e nenhum controle do custo dos pratos', ativa: true },
    { id: 'mat-construcao', nome: 'Lojas de materiais de construção', dorTipica: 'estoque desatualizado e orçamento lento no balcão', ativa: true },
    { id: 'academias', nome: 'Academias e estúdios', dorTipica: 'mensalidades em planilha e cobrança sempre atrasada', ativa: true },
    { id: 'contabilidade', nome: 'Escritórios de contabilidade', dorTipica: 'tarefas repetitivas refeitas à mão todo mês', ativa: true },
    { id: 'escolas', nome: 'Escolas e cursos livres', dorTipica: 'matrículas e mensalidades controladas no papel', ativa: true },
  ],
  fontes: [
    { id: 'maps', nome: 'Google Maps', descricao: 'Busque "categoria + cidade" e anote nome, telefone e site das que aparecem bem avaliadas.' },
    { id: 'ace', nome: 'ACE / CDL', descricao: 'Lista de associados da associação comercial da cidade — empresas ativas e organizadas.' },
    { id: 'cnpj', nome: 'Consulta CNPJ', descricao: 'Filtre CNPJs ativos por CNAE e cidade em sites de consulta gratuita.' },
    { id: 'instagram', nome: 'Instagram / grupos', descricao: 'Negócios ativos da região que aparecem em grupos locais e hashtags da cidade.' },
    { id: 'rede', nome: 'Rede pessoal', descricao: 'Avise conhecidos do que você faz — indicação ainda é a porta mais quente.' },
  ],
  checklist: [
    { id: 'p1', texto: 'Definir as cidades da região de atuação' },
    { id: 'p2', texto: 'Escolher 3 categorias pra começar (as outras esperam)' },
    { id: 'p3', texto: 'Ajustar os modelos de email com seu nome e 2 projetos de exemplo' },
    { id: 'p4', texto: 'Garimpar as primeiras 25 empresas no pipeline' },
    { id: 'p5', texto: 'Enviar os primeiros 15 emails na primeira semana' },
  ],
  metricas: [
    { id: 'resposta', nome: 'Taxa de resposta', faixaMin: 3, faixaMax: 8, acaoSeAbaixo: 'Reescrever assunto e 1ª linha (a dor típica) e testar outra categoria.' },
    { id: 'resposta_reuniao', nome: 'Resposta → reunião', faixaMin: 30, faixaMax: 50, acaoSeAbaixo: 'Responder em minutos, não horas, e já oferecer 2 horários prontos.' },
    { id: 'reuniao_proposta', nome: 'Reunião → proposta', faixaMin: 50, faixaMax: 100, acaoSeAbaixo: 'Qualificar melhor antes de aceitar a reunião — dor real e quem decide.' },
    { id: 'proposta_fechamento', nome: 'Proposta → fechamento', faixaMin: 25, faixaMax: 35, acaoSeAbaixo: 'Rever preço e escopo, e cobrar resposta no D+5 sem falta.' },
  ],
};

/** Compara item a item só os campos editáveis (ordem e tamanho contam). */
function igualAoSeed<T>(atual: T[], base: Partial<T>[], campos: (keyof T)[]): boolean {
  if (atual.length !== base.length) return false;
  return atual.every((item, i) =>
    campos.every((c) => (item as any)[c] === (base[i] as any)[c]),
  );
}

/**
 * Migra dados salvos para o seed atual. Retorna o MESMO objeto quando não há
 * nada a fazer (versão já atual) — quem chama usa isso pra decidir persistir.
 */
export function migrarPlano(salvo: PlanoCaptacao): PlanoCaptacao {
  if ((salvo.seedVersion ?? 1) >= SEED_VERSION) return salvo;
  const v2 = planoSeed();
  const novo: PlanoCaptacao = { ...salvo, seedVersion: SEED_VERSION };

  if (igualAoSeed(salvo.categorias, SEED_V1.categorias, ['id', 'nome', 'dorTipica', 'ativa'])) {
    novo.categorias = v2.categorias;
  }

  if (igualAoSeed(salvo.fontes, SEED_V1.fontes, ['id', 'nome', 'descricao'])) {
    // Contadores seguem por id (ex.: 'cnpj' e 'rede' existem nas duas versões)
    novo.fontes = v2.fontes.map((f) => {
      const antiga = salvo.fontes.find((x) => x.id === f.id);
      return antiga ? { ...f, empresasColetadas: antiga.empresasColetadas } : f;
    });
  }

  if (igualAoSeed(salvo.checklistPartida, SEED_V1.checklist, ['id', 'texto'])) {
    novo.checklistPartida = v2.checklistPartida;
  }

  if (igualAoSeed(salvo.metricas, SEED_V1.metricas, ['id', 'nome', 'faixaMin', 'faixaMax', 'acaoSeAbaixo'])) {
    novo.metricas = v2.metricas.map((m) => {
      const antiga = salvo.metricas.find((x) => x.id === m.id);
      return antiga?.valorManual !== undefined
        ? { ...m, valorManual: antiga.valorManual }
        : m;
    });
  }

  return novo;
}
