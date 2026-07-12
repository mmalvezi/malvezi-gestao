import { moeda, dataBr } from './utils';

export interface ItemDoc {
  titulo: string;
  descricao: string;
  valor: number;
}

/** Parcela da forma de pagamento, ja com o vencimento em texto legivel. */
export interface ParcelaDoc {
  descricao: string;
  vencimento: string; // "Na aprovação", "Na entrega", "30 dias após a aprovação"
  valor: number;
}

export interface DadosDoc {
  data?: string; // iso; default hoje
  cliente?: string;
  empresa?: string;
  contato?: string;
  numero?: string;
  tipo?: string; // rotulo (label)
  escopo?: string;
  valor?: number;
  pagamento?: string;
  prazo?: string;
  entrega?: string | null; // iso
  cidade_sede?: string;
  foro?: string;
  titulo?: string;
  itens?: ItemDoc[];
  parcelas?: ParcelaDoc[];
  desconto?: number;
  validade?: number | string;
  obs?: string;
  referente?: string;
}

function tabelaItens(itens: ItemDoc[]): string {
  const linhas = itens
    .map(
      (i, idx) => `
      <tr>
        <td><span class="num">${idx + 1}</span></td>
        <td>
          <div class="bold">${escapar(i.titulo)}</div>
          ${i.descricao ? `<div class="doc-sub">${escapar(i.descricao)}</div>` : ''}
        </td>
        <td style="text-align:right">${moeda(i.valor)}</td>
      </tr>`,
    )
    .join('');
  return `<table>
    <thead>
      <tr>
        <th style="width:34px">#</th>
        <th>Item</th>
        <th style="width:130px;text-align:right">Valor</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>`;
}

/** Bloco de forma de pagamento do PDF: tabela das parcelas com o total para
    conferencia. Orcamentos antigos sem plano caem no texto livre que tinham. */
function blocoPagamento(dados: DadosDoc): string {
  const parcelas = dados.parcelas || [];
  if (!parcelas.length) {
    const texto = (dados.pagamento || '').trim() || 'A combinar';
    return `<div class="doc-box"><b>Pagamento:</b> ${escapar(texto)}</div>`;
  }
  const soma = parcelas.reduce((s, p) => s + Number(p.valor || 0), 0);
  const linhas = parcelas
    .map(
      (p) => `
      <tr>
        <td><b>${escapar(p.descricao)}</b></td>
        <td>${escapar(p.vencimento)}</td>
        <td style="text-align:right">${moeda(p.valor)}</td>
      </tr>`,
    )
    .join('');
  return `<table>
    <thead>
      <tr>
        <th>Parcela</th>
        <th style="width:200px">Vencimento</th>
        <th style="width:130px;text-align:right">Valor</th>
      </tr>
    </thead>
    <tbody>${linhas}
      <tr>
        <td colspan="2" style="border-bottom:none"><b>Total das parcelas</b></td>
        <td style="text-align:right;border-bottom:none"><b>${moeda(soma)}</b></td>
      </tr>
    </tbody>
  </table>`;
}

function escapar(txt: string): string {
  return (txt || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Recebe o corpo do modelo (HTML com marcadores) e os dados, devolve o HTML
 * preenchido. Marcadores sem dado viram vazio.
 */
export function preencherCorpo(corpo: string, dados: DadosDoc): string {
  const itens = dados.itens || [];
  const temItens = itens.length > 0;
  const subtotal = temItens
    ? itens.reduce((s, i) => s + Number(i.valor || 0), 0)
    : Number(dados.valor || 0);
  const desconto = Number(dados.desconto || 0);
  const total = temItens
    ? Math.max(subtotal - desconto, 0)
    : Number(dados.valor || 0);

  const mapa: Record<string, string> = {
    data: dataBr(dados.data || new Date().toISOString()),
    cliente: dados.cliente || '',
    empresa: dados.empresa || '',
    contato: dados.contato || '',
    numero: dados.numero || '',
    tipo: dados.tipo || '',
    escopo: dados.escopo || '',
    valor: moeda(dados.valor || 0),
    pagamento: dados.pagamento || '',
    prazo: dados.prazo || '',
    entrega: dados.entrega ? dataBr(dados.entrega) : 'a combinar',
    cidade_sede: dados.cidade_sede || 'Cabreúva',
    foro: dados.foro || 'comarca de Jundiaí',
    titulo: dados.titulo || '',
    subtotal: moeda(subtotal),
    desconto: moeda(desconto),
    total: moeda(total),
    validade: String(dados.validade ?? ''),
    obs: dados.obs || '',
    referente:
      dados.referente ||
      (dados.tipo
        ? `serviço de ${dados.tipo}${dados.escopo ? ` (${dados.escopo})` : ''}`
        : ''),
  };

  return corpo.replace(/\{\{\s*(\w+)\s*\}\}/g, (_todo, chave: string) => {
    if (chave === 'itens') return tabelaItens(itens);
    if (chave === 'parcelas') return blocoPagamento(dados);
    return chave in mapa ? mapa[chave] : '';
  });
}
