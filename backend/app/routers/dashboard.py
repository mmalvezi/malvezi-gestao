from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..cobrancas import garantir_cobrancas
from ..database import get_db
from ..models import (
    CobrancaMensalidade,
    Orcamento,
    Projeto,
    Recorrencia,
    VerificacaoProjeto,
)
from ..verificacoes import competencia_atual, garantir_verificacoes

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


MESES_BR = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
]


def _nome_cliente(projeto: Projeto) -> str:
    return projeto.cliente.nome if projeto.cliente else ""


def _dinheiro(valor) -> float:
    return round(float(valor or 0), 2)


def _data_br(d: date) -> str:
    return f"{d.day:02d}/{d.month:02d}/{d.year}"


def _moeda_br(valor) -> str:
    """R$ 1.234,56 (virgula decimal, ponto de milhar)."""
    texto = f"{float(valor or 0):,.2f}"
    return "R$ " + texto.replace(",", "@").replace(".", ",").replace("@", ".")


def _competencia_br(competencia: str) -> str:
    """"2026-07" vira "julho de 2026"."""
    partes = (competencia or "").split("-")
    if len(partes) == 2 and partes[1].isdigit():
        mes = int(partes[1])
        if 1 <= mes <= 12:
            return f"{MESES_BR[mes - 1]} de {partes[0]}"
    return competencia or ""


def _relativo(dias: int) -> str:
    """Complemento legivel: (há 3 dias), (hoje), (amanhã), (em 5 dias)."""
    if dias < -1:
        return f"(há {-dias} dias)"
    if dias == -1:
        return "(ontem)"
    if dias == 0:
        return "(hoje)"
    if dias == 1:
        return "(amanhã)"
    return f"(em {dias} dias)"


@router.get("")
def dashboard(db: Session = Depends(get_db)):
    hoje = date.today()

    # Leituras baratas que mantem cobrancas e verificacoes em dia, sem cron
    garantir_cobrancas(db, hoje)
    garantir_verificacoes(db, hoje)

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
            "stage": p.stage,
            "entrega": p.entrega.isoformat(),
            "dias_restantes": (p.entrega - hoje).days,
        }
        for p in com_entrega[:5]
    ]

    # Dinheiro do mes corrente (bloco Dinheiro do painel)
    def _no_mes(d) -> bool:
        return bool(d and d.year == hoje.year and d.month == hoje.month)

    recebido_mes = _dinheiro(
        sum(
            pp.valor or 0
            for p in vivos
            for pp in p.parcelas
            if pp.pago and _no_mes(pp.pago_em)
        )
        + sum(
            c.valor or 0
            for c in cobrancas
            if c.status == "paga" and _no_mes(c.pago_em)
        )
    )
    cobrancas_abertas = _dinheiro(
        sum(c.valor or 0 for c in cobrancas if c.status == "aberta")
    )

    # Propostas aguardando resposta (bloco Propostas em aberto)
    propostas = [
        {
            "id": o.id,
            "numero": o.numero,
            "cliente": (o.cliente.nome if o.cliente else ""),
            "total": _dinheiro(o.total),
            "dias": (hoje - o.criado.date()).days if o.criado else 0,
        }
        for o in orcamentos
        if o.status == "enviado"
    ]

    pendencias = []

    for o in orcamentos:
        if o.status == "enviado":
            nome = o.cliente.nome if o.cliente else ""
            pendencias.append(
                {
                    "chave": f"orcamento:{o.id}:enviado",
                    "link": "/orcamentos",
                    "tipo": "orcamento",
                    "titulo": f"Orcamento {o.numero} aguardando resposta",
                    "detalhe": f"{o.titulo} - {nome}",
                }
            )

    for p in com_entrega:
        dias = (p.entrega - hoje).days
        if dias <= 15:
            if dias < 0:
                motivo, titulo = "atrasada", "Entrega atrasada"
                detalhe = f"Era para {_data_br(p.entrega)} {_relativo(dias)}"
            else:
                motivo, titulo = "proxima", "Entrega proxima"
                detalhe = f"Entrega em {_data_br(p.entrega)} {_relativo(dias)}"
            pendencias.append(
                {
                    "chave": f"entrega:{p.id}:{motivo}",
                    "link": f"/projetos/{p.id}",
                    "tipo": "entrega",
                    "titulo": f"{titulo} ({_nome_cliente(p)})",
                    "detalhe": detalhe,
                }
            )

    for p in vivos:
        # Fechado e nada recebido: falta a entrada
        if p.stage in ATIVOS and p.pago == 0:
            pendencias.append(
                {
                    "chave": f"pagamento:{p.id}:sem_pagamento",
                    "link": f"/projetos/{p.id}",
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
                    "link": f"/projetos/{p.id}",
                    "tipo": "pagamento",
                    "titulo": f"Receber saldo ({_nome_cliente(p)})",
                    "detalhe": (
                        f"{_moeda_br(p.saldo)} em aberto, projeto ja entregue"
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
                        "link": f"/projetos/{p.id}",
                        "tipo": "pagamento",
                        "titulo": f"Parcela vencida ({_nome_cliente(p)})",
                        "detalhe": (
                            f"{parcela.descricao}, {_moeda_br(parcela.valor)}, "
                            f"venceu em {_data_br(parcela.vencimento)} "
                            f"{_relativo(dias)}"
                        ),
                    }
                )
            elif dias <= 7:
                pendencias.append(
                    {
                        "chave": f"parcela:{parcela.id}:a_vencer",
                        "link": f"/projetos/{p.id}",
                        "tipo": "pagamento",
                        "titulo": f"Parcela a vencer ({_nome_cliente(p)})",
                        "detalhe": (
                            f"{parcela.descricao}, {_moeda_br(parcela.valor)}, "
                            f"vence em {_data_br(parcela.vencimento)} "
                            f"{_relativo(dias)}"
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
                    "link": "/mensalidades",
                    "tipo": "cobranca",
                    "titulo": f"Mensalidade vencida ({nome})",
                    "detalhe": (
                        f"Competência de {_competencia_br(c.competencia)}, "
                        f"{_moeda_br(c.valor)}, venceu em "
                        f"{_data_br(c.vencimento)} {_relativo(dias)}"
                    ),
                }
            )
        elif dias <= 3:
            pendencias.append(
                {
                    "chave": f"cobranca:{c.id}:a_vencer",
                    "link": "/mensalidades",
                    "tipo": "cobranca",
                    "titulo": f"Mensalidade a vencer ({nome})",
                    "detalhe": (
                        f"Competência de {_competencia_br(c.competencia)}, "
                        f"{_moeda_br(c.valor)}, vence em "
                        f"{_data_br(c.vencimento)} {_relativo(dias)}"
                    ),
                }
            )

    # Verificacao mensal dos entregues: aberta do mes vira alerta
    comp = competencia_atual(hoje)
    verificacoes_mes = (
        db.query(VerificacaoProjeto)
        .filter(VerificacaoProjeto.competencia == comp)
        .all()
    )
    verif_pendentes = [v for v in verificacoes_mes if v.status == "aberta"]
    verif_concluidas = len(verificacoes_mes) - len(verif_pendentes)
    for v in verif_pendentes:
        nome = v.projeto.cliente.nome if v.projeto and v.projeto.cliente else ""
        pendentes_qtd = sum(1 for i in v.itens if not i.ok)
        pendencias.append(
            {
                "chave": f"verificacao:{v.id}:aberta",
                "link": f"/projetos/{v.projeto_id}",
                "tipo": "verificacao",
                "titulo": (
                    f"Verificação de {_competencia_br(comp)} pendente ({nome})"
                ),
                "detalhe": (
                    f"{pendentes_qtd} de {len(v.itens)} itens do checklist "
                    "por conferir"
                ),
            }
        )

    for r in recorrencias:
        if r.status == "pausado":
            nome = r.cliente.nome if r.cliente else ""
            pendencias.append(
                {
                    "chave": f"recorrencia:{r.id}:pausada",
                    "link": "/mensalidades",
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
        # Verificacoes do mes corrente (saude dos entregues)
        "verificacoes_pendentes": len(verif_pendentes),
        "verificacoes_concluidas": verif_concluidas,
        # Bloco Dinheiro e bloco Propostas do painel
        "recebido_mes": recebido_mes,
        "cobrancas_abertas": cobrancas_abertas,
        "propostas": propostas,
        "funil": funil,
        "proximas_entregas": proximas_entregas,
        "pendencias": pendencias,
    }
