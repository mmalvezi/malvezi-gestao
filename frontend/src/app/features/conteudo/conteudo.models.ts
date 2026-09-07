/**
 * Modelo do módulo de conteúdo.
 *
 * A fonte da estratégia é `marketing/plano-instagram.md` no MazyOS: um perfil
 * só, voltado ao autônomo, 2 posts por semana produzidos em lote, e a regra
 * dura de que 6 dos 8 posts não vendem nada. Os pesos dos pilares e a ordem de
 * publicação abaixo vêm de lá — mudou lá, muda aqui.
 */

export type StatusPost = 'ideia' | 'texto' | 'arte' | 'aprovado' | 'publicado';

export const STATUS_ORDEM: StatusPost[] = [
  'ideia',
  'texto',
  'arte',
  'aprovado',
  'publicado',
];

export const STATUS_LABEL: Record<StatusPost, string> = {
  ideia: 'Ideia',
  texto: 'Texto escrito',
  arte: 'Arte pronta',
  aprovado: 'Aprovado',
  publicado: 'Publicado',
};

/** Classes de badge já existentes no tema (mesmas da prospecção). */
export const STATUS_CLASSE: Record<StatusPost, string> = {
  ideia: 'cinza',
  texto: 'azul',
  arte: 'roxo',
  aprovado: 'verde',
  publicado: 'verde',
};

export function proximoStatus(s: StatusPost): StatusPost | null {
  const i = STATUS_ORDEM.indexOf(s);
  return i < 0 || i === STATUS_ORDEM.length - 1 ? null : STATUS_ORDEM[i + 1];
}

export type Pilar = 'dor' | 'ensino' | 'prova' | 'bastidor';

export const PILAR_LABEL: Record<Pilar, string> = {
  dor: 'Dor nomeada',
  ensino: 'Ensino prático',
  prova: 'Prova de par',
  bastidor: 'Bastidor',
};

export const PILAR_DESCRICAO: Record<Pilar, string> = {
  dor: 'Dizer em voz alta o que ele sente e não fala.',
  ensino: 'Conta que ele pode fazer hoje, sem comprar nada.',
  prova: 'Dirceu e Everton: gente igual a ele.',
  bastidor: 'O sistema aparecendo sem ser vendido.',
};

/** Peso alvo a cada 8 posts, conforme o plano. Bastidor entra quando couber. */
export const PILAR_META: Record<Pilar, number | null> = {
  dor: 3,
  ensino: 3,
  prova: 2,
  bastidor: null,
};

export type Formato = 'carrossel' | 'post' | 'story' | 'reels';

export const FORMATO_LABEL: Record<Formato, string> = {
  carrossel: 'Carrossel',
  post: 'Post único',
  story: 'Story',
  reels: 'Reels',
};

export interface Post {
  id: string;
  titulo: string;
  pilar: Pilar;
  formato: Formato;
  status: StatusPost;
  /** O plano permite no máximo 2 em 8 com convite, e mesmo assim suave. */
  vende: boolean;
  /** O que o post diz. É isso que vira briefing para o /carrossel. */
  angulo: string;
  observacoes: string;
  /** Data prevista de publicação (ISO, yyyy-mm-dd). */
  dataPrevista?: string;
  /** Pasta gerada no MazyOS, ex.: marketing/conteudo/carrossel-...-2026-09-05 */
  pasta?: string;
  legenda?: string;
  criadoEm: string;
  atualizadoEm: string;
  publicadoEm?: string;
}

export type PostInput = Omit<
  Post,
  'id' | 'status' | 'criadoEm' | 'atualizadoEm' | 'publicadoEm'
>;

export function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Monta o comando para colar no Claude Code do MazyOS. É a ponte entre pedir
 * aqui e produzir lá: o briefing vai junto, então a skill não precisa
 * adivinhar ângulo nem pilar.
 */
export function comandoCarrossel(p: Post): string {
  const linhas = [
    `/carrossel ${p.titulo}`,
    '',
    `Formato: ${FORMATO_LABEL[p.formato].toLowerCase()}, 1080x1350.`,
    `Pilar: ${PILAR_LABEL[p.pilar].toLowerCase()} — ${PILAR_DESCRICAO[p.pilar]}`,
    `Vende: ${p.vende ? 'sim, convite suave no fim' : 'não, nenhum convite'}`,
  ];
  if (p.angulo.trim()) linhas.push('', `Ângulo: ${p.angulo.trim()}`);
  if (p.observacoes.trim()) linhas.push('', p.observacoes.trim());
  linhas.push(
    '',
    'Público: autônomo de serviço (eletricista, serralheiro, marceneiro).',
    'Seguir marketing/plano-instagram.md e identidade/design-guide.md.',
  );
  return linhas.join('\n');
}

/** Semana ISO usada para agrupar o lote de produção. */
export function semanaDe(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const alvo = new Date(d);
  alvo.setDate(alvo.getDate() + 3 - ((d.getDay() + 6) % 7));
  const primeira = new Date(alvo.getFullYear(), 0, 4);
  const semana =
    1 +
    Math.round(
      ((alvo.getTime() - primeira.getTime()) / 86400000 -
        3 +
        ((primeira.getDay() + 6) % 7)) /
        7,
    );
  return `${alvo.getFullYear()}-S${String(semana).padStart(2, '0')}`;
}

/**
 * Os 8 primeiros posts, já na ordem de publicação decidida no plano (que não é
 * a ordem da lista: perfil novo precisa fazer sentido em cinco segundos).
 */
export const POSTS_INICIAIS: Array<
  Pick<Post, 'titulo' | 'pilar' | 'formato' | 'vende' | 'angulo'>
> = [
  {
    titulo: 'Você fechou a obra. Sobrou quanto?',
    pilar: 'dor',
    formato: 'carrossel',
    vende: false,
    angulo:
      'Define de cara para quem é o perfil. A conta que ele nunca fecha no fim da obra.',
  },
  {
    titulo: 'Três custos que somem do seu orçamento',
    pilar: 'ensino',
    formato: 'carrossel',
    vende: false,
    angulo:
      'Prova que o perfil é útil e não propaganda: deslocamento, retrabalho e hora de compra.',
  },
  {
    titulo: 'Do caderno ao celular, a história do Dirceu',
    pilar: 'prova',
    formato: 'carrossel',
    vende: true,
    angulo:
      'Prova que é real, com nome e cidade. O print é dele, escrito em agosto, e não foi pedido. O convite fecha no sob medida: o sistema segue o jeito dele de tocar obra.',
  },
  {
    titulo: 'Como calcular o preço da sua hora',
    pilar: 'ensino',
    formato: 'carrossel',
    vende: false,
    angulo: 'Conta simples que ele faz hoje, sem comprar nada.',
  },
  {
    titulo: 'Orçamento no WhatsApp vs orçamento em PDF',
    pilar: 'dor',
    formato: 'carrossel',
    vende: false,
    angulo: 'O que o cliente pensa quando recebe preço solto na conversa.',
  },
  {
    titulo: 'Trabalhou o mês inteiro e não sobrou dinheiro',
    pilar: 'dor',
    formato: 'carrossel',
    vende: false,
    angulo: 'Faturamento alto e caixa vazio: para onde o dinheiro foi.',
  },
  {
    titulo: 'Do Excel ao celular, o Everton',
    pilar: 'prova',
    formato: 'carrossel',
    vende: true,
    angulo:
      'Ele montava orçamento no Excel, sem lista automatizada. É o post mais forte para o argumento de sob medida: a personalização sai da boca dele, "ajustado de acordo com o seguimento de sua empresa" e "ficou do jeito que eu precisava". Usar as frases, não parafrasear.',
  },
  {
    titulo: 'Orçamento em dois minutos',
    pilar: 'bastidor',
    formato: 'carrossel',
    vende: false,
    angulo: 'O sistema aparecendo sem ser vendido: gravação da tela do orçamento.',
  },
];
