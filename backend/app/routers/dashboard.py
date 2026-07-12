from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..cobrancas import garantir_cobrancas
from ..database import get_db
from ..models import CobrancaMensalidade, Orcamento, Projeto, Recorrencia

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(get_current_user)],
)

# A trilha do funil. "recusado" e terminal e fica fora dela.
ESTAGIOS = ["lead", "orcamento", "aprovado", "desenvolvimento", "entregue"]

# Propostas em aberto: expectativa, nao caixa
EM_NEGOCIACAO = ("lead", "orcamento")
# Projetos fechados: viraram compromisso de pagamento
FECHADOS = ("aprovado", "desenvolvimento", "entregue")
# Em andamento
ATIVOS = ("aprovado", "desenvolvimento")


def _nome_cliente(projeto: Projeto) -> str:
    return projeto.cliente.nome if projeto.cliente else ""


def _dinheiro(valor) -> float:
    return round(float(valor or 0), 2)


@router.get("")
def dashboard(db: Session = Depends(get_db)):
    hoje = date.today()

    # Leitura barata que mantem as cobrancas do mes em dia, sem cron
    garantir_cobrancas(db, hoje)

    projetos = db.query(Projeto).all()
    recorrencias = db.query(Recorrencia).all()
    orcamentos = db.query(Orcamento).all()
    cobrancas = db.query(CobrancaMensalidade).all()

    recusados = [p for p in projetos if p.stage == "recusado"]
    vivos = [p for p in projetos if p.stage != "recusado"]

    negociando = [p for p in vivos if p.stage in EM_NEGOCIACAO]
    fechados = [p for p in vivos if p.stage in FECHADOS]
    ativos = [p for p in vivos if p.stage in ATIVOS]

    # Expectativa: proposta em aberto, ainda nao e compromisso
    em_negociacao = _dinheiro(sum(p.valor or 0 for p in negociando))

    # A receber: o que ja esta fechado e ainda nao foi pago, INCLUINDO os
    # entregues com saldo (a cobranca mais urgente, que antes ficava de fora).
    a_receber = _dinheiro(sum(p.saldo for p in fechados))

    ja_recebido = _dinheiro(sum(p.pago for p in vivos))
    carteira_total = _dinheiro(sum(p.valor or 0 for p in fechados))
    em_producao = _dinheiro(sum(p.valor or 0 for p in ativos))

    # Mensalidades: o MRR conta so as ativas; as previstas vao a parte
    recorrente_mes = _dinheiro(
        sum(r.valor or 0 for r in recorrencias if r.status == "ativo")
    )
    recorrente_previsto = _dinheiro(
        sum(r.valor or 0 for r in recorrencias if r.status == "previsto")
    )

    # Taxa de aprovacao: fechados sobre (fechados + recusados)
    decididos = len(fechados) + len(recusados)
    taxa_aprovacao = round(len(fechados) / decididos * 100) if decididos else 0

    funil = [
        {"stage": estagio, "count": sum(1 for p in vivos if p.stage == estagio)}
        for estagio in ESTAGIOS
    ]

    com_entrega = sorted(
        [p for p in vivos if p.stage != "entregue" and p.entrega is not None],
        key=lambda p: p.entrega,
    )
    proximas_entregas = [
        {
            "id": p.id,
            "cliente": _nome_cliente(p),
            "tipo": p.tipo,
            "entrega": p.entrega.isoformat(),
            "dias_restantes": (p.entrega - hoje).days,
        }
        for p in com_entrega[:5]
    ]

    pendencias = []

    for o in orcamentos:
        if o.status == "enviado":
            nome = o.cliente.nome if o.cliente else ""
            pendencias.append(
                {
                    "chave": f"orcamento:{o.id}:enviado",
                    "tipo": "orcamento",
                    "titulo": f"Orcamento {o.numero} aguardando resposta",
                    "detalhe": f"{o.titulo} - {nome}",
                }
            )

    for p in com_entrega:
        dias = (p.entrega - hoje).days
        if dias <= 15:
            motivo = "atrasada" if dias < 0 else "proxima"
            pendencias.append(
                {
                    "chave": f"entrega:{p.id}:{motivo}",
                    "tipo": "entrega",
                    "titulo": f"Entrega proxima ({_nome_cliente(p)})",
                    "detalhe": f"Faltam {dias} dia(s) para {p.entrega.isoformat()}",
                }
            )

    for p in vivos:
        # Fechado e nada recebido: falta a entrada
        if p.stage in ATIVOS and p.pago == 0:
            pendencias.append(
                {
                    "chave": f"pagamento:{p.id}:sem_pagamento",
                    "tipo": "pagamento",
                    "titulo": f"Projeto sem pagamento ({_nome_cliente(p)})",
                    "detalhe": f"{p.tipo} aprovado sem entrada registrada",
                }
            )
        # Entregue e ainda com saldo: a cobranca mais urgente que existe
        if p.stage == "entregue" and p.saldo > 0:
            pendencias.append(
                {
                    "chave": f"saldo:{p.id}:entregue",
                    "tipo": "pagamento",
                    "titulo": f"Receber saldo ({_nome_cliente(p)})",
                    "detalhe": (
                        f"R$ {p.saldo:.2f} em aberto, projeto ja entregue"
                    ),
                }
            )
        # Parcelas vencidas ou vencendo
        for parcela in p.parcelas:
            if parcela.pago or not parcela.vencimento:
                continue
            dias = (parcela.vencimento - hoje).days
            if dias < 0:
                pendencias.append(
                    {
                        "chave": f"parcela:{parcela.id}:vencida",
                        "tipo": "pagamento",
                        "titulo": f"Parcela vencida ({_nome_cliente(p)})",
                        "detalhe": (
                            f"{parcela.descricao}, R$ {parcela.valor:.2f}, "
                            f"venceu em {parcela.vencimento.isoformat()}"
                        ),
                    }
                )
            elif dias <= 7:
                pendencias.append(
                    {
                        "chave": f"parcela:{parcela.id}:a_vencer",
                        "tipo": "pagamento",
                        "titulo": f"Parcela a vencer ({_nome_cliente(p)})",
                        "detalhe": (
                            f"{parcela.descricao}, R$ {parcela.valor:.2f}, "
                            f"vence em {parcela.vencimento.isoformat()}"
                        ),
                    }
                )

    # Cobrancas de mensalidade vencidas ou vencendo nos proximos 3 dias
    for c in cobrancas:
        if c.status != "aberta":
            continue
        nome = (
            c.recorrencia.cliente.nome
            if c.recorrencia and c.recorrencia.cliente
            else ""
        )
        dias = (c.vencimento - hoje).days
        if dias < 0:
            pendencias.append(
                {
                    "chave": f"cobranca:{c.id}:vencida",
                    "tipo": "cobranca",
                    "titulo": f"Mensalidade vencida ({nome})",
                    "detalhe": (
                        f"Competencia {c.competencia}, R$ {c.valor:.2f}, "
                        f"venceu em {c.vencimento.isoformat()}"
                    ),
                }
            )
        elif dias <= 3:
            pendencias.append(
                {
                    "chave": f"cobranca:{c.id}:a_vencer",
                    "tipo": "cobranca",
                    "titulo": f"Mensalidade a vencer ({nome})",
                    "detalhe": (
                        f"Competencia {c.competencia}, R$ {c.valor:.2f}, "
                        f"vence em {c.vencimento.isoformat()}"
                    ),
                }
            )

    for r in recorrencias:
        if r.status == "pausado":
            nome = r.cliente.nome if r.cliente else ""
            pendencias.append(
                {
                    "chave": f"recorrencia:{r.id}:pausada",
                    "tipo": "recorrencia",
                    "titulo": f"Mensalidade pausada ({nome})",
                    "detalhe": f"Plano {r.plano} esta pausado",
                }
            )

    return {
        "recorrente_mes": recorrente_mes,
        "recorrente_previsto": recorrente_previsto,
        "em_negociacao": em_negociacao,
        "em_negociacao_qtd": len(negociando),
        "a_receber": a_receber,
        "ja_recebido": ja_recebido,
        "carteira_total": carteira_total,
        "projetos_ativos": len(ativos),
        "em_producao": em_producao,
        "recusados_qtd": len(recusados),
        "taxa_aprovacao": taxa_aprovacao,
        "funil": funil,
        "proximas_entregas": proximas_entregas,
        "pendencias": pendencias,
    }
