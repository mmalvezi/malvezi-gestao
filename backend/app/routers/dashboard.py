from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Orcamento, Projeto, Recorrencia

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(get_current_user)],
)

ESTAGIOS = ["lead", "orcamento", "aprovado", "desenvolvimento", "entregue"]


def _nome_cliente(projeto: Projeto) -> str:
    return projeto.cliente.nome if projeto.cliente else ""


@router.get("")
def dashboard(db: Session = Depends(get_db)):
    hoje = date.today()

    projetos = db.query(Projeto).all()
    recorrencias = db.query(Recorrencia).all()
    orcamentos = db.query(Orcamento).all()

    ativos = [p for p in projetos if p.stage != "entregue"]

    recorrente_mes = sum(r.valor for r in recorrencias if r.status == "ativo")
    a_receber = sum((p.valor or 0) - (p.pago or 0) for p in ativos)
    projetos_ativos = len(ativos)
    em_producao = sum(p.valor or 0 for p in ativos)

    funil = [
        {"stage": estagio, "count": sum(1 for p in projetos if p.stage == estagio)}
        for estagio in ESTAGIOS
    ]

    com_entrega = sorted(
        [p for p in ativos if p.entrega is not None],
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

    for p in ativos:
        if p.entrega is not None:
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

    for p in projetos:
        if p.stage in ("aprovado", "desenvolvimento") and (p.pago or 0) == 0:
            pendencias.append(
                {
                    "chave": f"pagamento:{p.id}:sem_pagamento",
                    "tipo": "pagamento",
                    "titulo": f"Projeto sem pagamento ({_nome_cliente(p)})",
                    "detalhe": f"{p.tipo} aprovado sem entrada registrada",
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
        "a_receber": a_receber,
        "projetos_ativos": projetos_ativos,
        "em_producao": em_producao,
        "funil": funil,
        "proximas_entregas": proximas_entregas,
        "pendencias": pendencias,
    }
