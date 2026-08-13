/* Modelos e regras de cadência da Prospecção Ativa (ver MODULO_PROSPECCAO.md) */

export type StatusProspeccao =
  | 'a_abordar'
  | 'email'
  | 'followup'
  | 'ligacao'
  | 'reuniao'
  | 'proposta'
  | 'fechado'
  | 'perdido';

export interface EmpresaProspeccao {
  id: string;
  nome: string;
  categoria: string;
  contato?: string;
  telefone?: string;
  email?: string;
  status: StatusProspeccao;
  dataPrimeiroEmail?: string;
  dataProposta?: string;
  mensalidade?: number;
  notas?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export type EmpresaProspeccaoInput = Pick<
  EmpresaProspeccao,
  'nome' | 'categoria' | 'contato' | 'telefone' | 'email' | 'mensalidade' | 'notas'
>;

export interface MetasProspeccao {
  metaMrr: number;
  prazoFinal: string;
  emailsPorSemana: number;
  dataInicio: string;
}

/* Esteira de avanço (perdido fica fora — é um desvio, não uma etapa) */
export const ESTEIRA: StatusProspeccao[] = [
  'a_abordar',
  'email',
  'followup',
  'ligacao',
  'reuniao',
  'proposta',
  'fechado',
];

export const STATUS_PROSP_LABEL: Record<StatusProspeccao, string> = {
  a_abordar: 'A abordar',
  email: '1º email',
  followup: 'Follow-up',
  ligacao: 'Ligação',
  reuniao: 'Reunião',
  proposta: 'Proposta',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

export const STATUS_PROSP_CLASSE: Record<StatusProspeccao, string> = {
  a_abordar: '',
  email: 'info',
  followup: 'info',
  ligacao: 'warn',
  reuniao: 'warn',
  proposta: 'warn',
  fechado: 'roxo',
  perdido: 'bad',
};

export function statusIndex(s: StatusProspeccao): number {
  return ESTEIRA.indexOf(s);
}

export function proximoStatus(s: StatusProspeccao): StatusProspeccao | null {
  const i = statusIndex(s);
  if (i < 0 || i >= ESTEIRA.length - 1) return null;
  return ESTEIRA[i + 1];
}

/* Datas em ISO local (YYYY-MM-DD), sem fuso */
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function hojeIso(): string {
  return isoLocal(new Date());
}

export function addDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return isoLocal(d);
}

/** Segunda e domingo da semana corrente (seg–dom). */
export function semanaAtualIso(): [string, string] {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  const seg = new Date(d);
  seg.setDate(d.getDate() - dow);
  const dom = new Date(seg);
  dom.setDate(seg.getDate() + 6);
  return [isoLocal(seg), isoLocal(dom)];
}

export interface ProximaAcao {
  rotulo: string;
  vence: string | null;
}

/** Cadência calculada, nunca digitada. Null quando não há próxima ação. */
export function proximaAcao(e: EmpresaProspeccao): ProximaAcao | null {
  switch (e.status) {
    case 'a_abordar':
      return { rotulo: 'Enviar 1º email', vence: null };
    case 'email':
      return {
        rotulo: 'Follow-up',
        vence: e.dataPrimeiroEmail ? addDias(e.dataPrimeiroEmail, 4) : null,
      };
    case 'followup':
      return {
        rotulo: 'Ligar',
        vence: e.dataPrimeiroEmail ? addDias(e.dataPrimeiroEmail, 8) : null,
      };
    case 'ligacao':
      return { rotulo: 'Marcar reunião', vence: null };
    case 'reuniao':
      return { rotulo: 'Enviar proposta', vence: null };
    case 'proposta':
      return {
        rotulo: 'Cobrar resposta',
        vence: e.dataProposta ? addDias(e.dataProposta, 5) : null,
      };
    default:
      return null;
  }
}

export function acaoAtrasada(e: EmpresaProspeccao): boolean {
  const a = proximaAcao(e);
  return !!a?.vence && a.vence < hojeIso();
}

export function acaoVencidaHoje(e: EmpresaProspeccao): boolean {
  const a = proximaAcao(e);
  return !!a?.vence && a.vence <= hojeIso();
}
