from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..cobrancas import garantir_cobrancas
from ..database import get_db
from ..models import CobrancaMensalidade
from ..schemas import CobrancaRead

router = APIRouter(
    prefix="/cobrancas",
    tags=["cobrancas"],
    dependencies=[Depends(get_current_user)],
)


def _com_apoio(c: CobrancaMensalidade) -> dict:
    """Junta cliente, plano e contato para a tela nao precisar de outra chamada."""
    r = c.recorrencia
    return {
        "id": c.id,
        "recorrencia_id": c.recorrencia_id,
        "competencia": c.competencia,
        "vencimento": c.vencimento,
        "valor": c.valor,
        "status": c.status,
        "pago_em": c.pago_em,
        "notificado_em": c.notificado_em,
        "cliente": (r.cliente.nome if r and r.cliente else None),
        "plano": (r.plano if r else None),
        "contato": (r.contato if r else None),
    }


def _cobranca(cobranca_id: int, db: Session) -> CobrancaMensalidade:
    c = db.get(CobrancaMensalidade, cobranca_id)
    if not c:
        raise HTTPException(status_code=404, detail="Cobranca nao encontrada")
    return c


@router.get("", response_model=list[CobrancaRead])
def listar(
    status: Optional[str] = Query(None),
    ate: Optional[date] = Query(None),
    vencidas: bool = Query(False),
    db: Session = Depends(get_db),
):
    garantir_cobrancas(db)

    q = db.query(CobrancaMensalidade)
    if status:
        q = q.filter(CobrancaMensalidade.status == status)
    if ate:
        q = q.filter(CobrancaMensalidade.vencimento <= ate)
    if vencidas:
        q = q.filter(
            CobrancaMensalidade.status == "aberta",
            CobrancaMensalidade.vencimento < date.today(),
        )
    itens = q.order_by(CobrancaMensalidade.vencimento).all()
    return [_com_apoio(c) for c in itens]


@router.post("/gerar")
def gerar(db: Session = Depends(get_db)):
    criadas = garantir_cobrancas(db)
    return {"criadas": criadas}


@router.patch("/{cobranca_id}/pagar", response_model=CobrancaRead)
def pagar(cobranca_id: int, db: Session = Depends(get_db)):
    c = _cobranca(cobranca_id, db)
    c.status = "paga"
    c.pago_em = date.today()
    db.commit()
    db.refresh(c)
    return _com_apoio(c)


@router.patch("/{cobranca_id}/cancelar", response_model=CobrancaRead)
def cancelar(cobranca_id: int, db: Session = Depends(get_db)):
    c = _cobranca(cobranca_id, db)
    c.status = "cancelada"
    c.pago_em = None
    db.commit()
    db.refresh(c)
    return _com_apoio(c)


@router.patch("/{cobranca_id}/reabrir", response_model=CobrancaRead)
def reabrir(cobranca_id: int, db: Session = Depends(get_db)):
    c = _cobranca(cobranca_id, db)
    c.status = "aberta"
    c.pago_em = None
    db.commit()
    db.refresh(c)
    return _com_apoio(c)
