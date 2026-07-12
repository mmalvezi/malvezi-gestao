"""Endpoints para a automacao de cobranca (n8n).

Autenticados por chave de API no header X-API-Key, e SO estes: a chave nao
libera nenhum outro endpoint do sistema. O retorno traz apenas o necessario
para enviar a cobranca, nada alem disso.
"""

import secrets
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..config import settings
from ..cobrancas import garantir_cobrancas
from ..database import get_db
from ..models import CobrancaMensalidade
from ..schemas import CobrancaAutomacao


def checar_api_key(x_api_key: str = Header(default="")) -> None:
    if not settings.api_key or not secrets.compare_digest(
        x_api_key or "", settings.api_key
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chave de API invalida",
        )


router = APIRouter(
    prefix="/automacao",
    tags=["automacao"],
    dependencies=[Depends(checar_api_key)],
)


def _payload(c: CobrancaMensalidade) -> dict:
    r = c.recorrencia
    return {
        "id": c.id,
        "cliente": (r.cliente.nome if r and r.cliente else ""),
        "contato": (r.contato if r else None),
        "valor": c.valor,
        "vencimento": c.vencimento,
        "competencia": c.competencia,
        "plano": (r.plano if r else ""),
        "notificado_em": c.notificado_em,
    }


@router.get("/health")
def health():
    return {"ok": True}


@router.get("/cobrancas-a-vencer", response_model=list[CobrancaAutomacao])
def a_vencer(
    dias: int = Query(3, ge=0, le=60),
    db: Session = Depends(get_db),
):
    garantir_cobrancas(db)
    hoje = date.today()
    limite = hoje + timedelta(days=dias)
    itens = (
        db.query(CobrancaMensalidade)
        .filter(
            CobrancaMensalidade.status == "aberta",
            CobrancaMensalidade.vencimento >= hoje,
            CobrancaMensalidade.vencimento <= limite,
        )
        .order_by(CobrancaMensalidade.vencimento)
        .all()
    )
    return [_payload(c) for c in itens]


@router.get("/cobrancas-vencidas", response_model=list[CobrancaAutomacao])
def vencidas(db: Session = Depends(get_db)):
    garantir_cobrancas(db)
    itens = (
        db.query(CobrancaMensalidade)
        .filter(
            CobrancaMensalidade.status == "aberta",
            CobrancaMensalidade.vencimento < date.today(),
        )
        .order_by(CobrancaMensalidade.vencimento)
        .all()
    )
    return [_payload(c) for c in itens]


@router.post("/cobrancas/{cobranca_id}/notificado")
def marcar_notificado(cobranca_id: int, db: Session = Depends(get_db)):
    c = db.get(CobrancaMensalidade, cobranca_id)
    if not c:
        raise HTTPException(status_code=404, detail="Cobranca nao encontrada")
    c.notificado_em = datetime.now(timezone.utc)
    db.commit()
    return {"id": c.id, "notificado_em": c.notificado_em}
