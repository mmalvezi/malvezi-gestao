import { Orcamento, Projeto, TipoDocumento } from './models';
import { DadosDoc } from './preencher';
import { TIPO_LABEL } from './utils';

const CIDADE_SEDE = 'Cabreúva';
const FORO = 'comarca de Jundiaí';

export function dadosDeProjeto(
  p: Projeto,
  tipo: TipoDocumento,
  numero: string,
): DadosDoc {
  const cli = p.cliente;
  const base: DadosDoc = {
    data: new Date().toISOString(),
    cliente: cli?.nome || '',
    empresa: cli?.empresa || '',
    contato: cli?.contato || '',
    numero,
    cidade_sede: CIDADE_SEDE,
    foro: FORO,
  };

  if (tipo === 'orcamento') {
    return {
      ...base,
      titulo: p.escopo ? p.escopo.slice(0, 60) : TIPO_LABEL[p.tipo],
      tipo: TIPO_LABEL[p.tipo],
      itens: [
        { titulo: TIPO_LABEL[p.tipo], descricao: p.escopo || '', valor: p.valor },
      ],
      desconto: 0,
      validade: 15,
      pagamento: 'A combinar',
      prazo: 'A combinar',
      obs: '',
      valor: p.valor,
    };
  }

  // contrato ou recibo
  return {
    ...base,
    tipo: TIPO_LABEL[p.tipo],
    escopo: p.escopo || '',
    valor: tipo === 'recibo' ? p.pago : p.valor,
    pagamento: 'A combinar',
    prazo: 'A combinar',
    entrega: p.entrega || null,
    referente: `serviço de ${TIPO_LABEL[p.tipo]}${p.escopo ? ` (${p.escopo})` : ''}`,
  };
}

/** Orcamento sintetico (id 0) a partir de um projeto: pre-preenche o
    formulario/documento quando o projeto ainda nao tem orcamento salvo. */
export function orcamentoDeProjeto(p: Projeto): Orcamento {
  return {
    id: 0,
    numero: 'ORC-' + String(p.id).padStart(4, '0'),
    cliente_id: p.cliente_id,
    // Nasce vinculado: quando salvo e aprovado, o plano vira parcelas aqui
    projeto_id: p.id,
    titulo: p.escopo ? p.escopo.slice(0, 60) : TIPO_LABEL[p.tipo],
    tipo: p.tipo,
    desconto: 0,
    pagamento: 'A combinar',
    prazo: 'A combinar',
    validade_dias: 15,
    obs: '',
    status: 'rascunho',
    cliente: p.cliente,
    itens: [
      {
        titulo: TIPO_LABEL[p.tipo],
        descricao: p.escopo || '',
        valor: p.valor,
        ordem: 1,
      },
    ],
    total: p.valor,
  };
}

export function dadosDeOrcamento(o: Orcamento, numero?: string): DadosDoc {
  const cli = o.cliente;
  return {
    data: new Date().toISOString(),
    cliente: cli?.nome || '',
    empresa: cli?.empresa || '',
    contato: cli?.contato || '',
    numero: numero || o.numero,
    titulo: o.titulo,
    tipo: TIPO_LABEL[o.tipo],
    itens: o.itens.map((i) => ({
      titulo: i.titulo,
      descricao: i.descricao,
      valor: i.valor,
    })),
    desconto: o.desconto,
    validade: o.validade_dias,
    pagamento: o.pagamento,
    prazo: o.prazo,
    obs: o.obs,
    valor: o.total,
    cidade_sede: CIDADE_SEDE,
    foro: FORO,
  };
}
