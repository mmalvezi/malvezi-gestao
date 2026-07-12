from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import ParcelaProjeto, Projeto
from ..schemas import ParcelaCreate, ParcelaRead

router = APIRouter(
    tags=["parcelas"],
    dependencies=[Depends(get_current_user)],
)


def _parcela(parcela_id: int, db: Session) -> ParcelaProjeto:
    parcela = db.get(ParcelaProjeto, parcela_id)
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela nao encontrada")
    return parcela


@router.get("/projetos/{projeto_id}/parcelas", response_model=list[ParcelaRead])
def listar(projeto_id: int, db: Session = Depends(get_db)):
    if not db.get(Projeto, projeto_id):
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")
    return (
        db.query(ParcelaProjeto)
        .filter(ParcelaProjeto.projeto_id == projeto_id)
        .order_by(ParcelaProjeto.ordem, ParcelaProjeto.id)
        .all()
    )


@router.post(
    "/projetos/{projeto_id}/parcelas", response_model=ParcelaRead, status_code=201
)
def criar(projeto_id: int, dados: ParcelaCreate, db: Session = Depends(get_db)):
    if not db.get(Projeto, projeto_id):
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")

    quantas = (
        db.query(ParcelaProjeto)
        .filter(ParcelaProjeto.projeto_id == projeto_id)
        .count()
    )
    parcela = ParcelaProjeto(
        projeto_id=projeto_id,
        descricao=(dados.descricao or "").strip() or f"Parcela {quantas + 1}",
        valor=dados.valor or 0,
        vencimento=dados.vencimento,
        pago=dados.pago,
        pago_em=dados.pago_em or (date.today() if dados.pago else None),
        ordem=quantas,
    )
    db.add(parcela)
    db.commit()
    db.refresh(parcela)
    return parcela


@router.put("/parcelas/{parcela_id}", response_model=ParcelaRead)
def atualizar(parcela_id: int, dados: ParcelaCreate, db: Session = Depends(get_db)):
    parcela = _parcela(parcela_id, db)
    parcela.descricao = (dados.descricao or "").strip() or parcela.descricao
    parcela.valor = dados.valor or 0
    parcela.vencimento = dados.vencimento
    parcela.pago = dados.pago
    if dados.pago:
        parcela.pago_em = dados.pago_em or parcela.pago_em or date.today()
    else:
        parcela.pago_em = None
    db.commit()
    db.refresh(parcela)
    return parcela


@router.patch("/parcelas/{parcela_id}/pagar", response_model=ParcelaRead)
def alternar_pago(parcela_id: int, db: Session = Depends(get_db)):
    parcela = _parcela(parcela_id, db)
    parcela.pago = not parcela.pago
    parcela.pago_em = date.today() if parcela.pago else None
    db.commit()
    db.refresh(parcela)
    return parcela


@router.delete("/parcelas/{parcela_id}", status_code=204)
def excluir(parcela_id: int, db: Session = Depends(get_db)):
    parcela = _parcela(parcela_id, db)
    projeto_id = parcela.projeto_id
    db.delete(parcela)
    db.flush()
    restantes = (
        db.query(ParcelaProjeto)
        .filter(ParcelaProjeto.projeto_id == projeto_id)
        .order_by(ParcelaProjeto.ordem, ParcelaProjeto.id)
        .all()
    )
    for i, p in enumerate(restantes):
        p.ordem = i
    db.commit()
