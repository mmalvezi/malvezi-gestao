from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import AlertaDispensado
from ..schemas import DispensarInput

router = APIRouter(
    prefix="/alertas",
    tags=["alertas"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/dispensados", response_model=list[str])
def listar(db: Session = Depends(get_db)):
    return [a.chave for a in db.query(AlertaDispensado).all()]


@router.post("/dispensados", status_code=201)
def dispensar(dados: DispensarInput, db: Session = Depends(get_db)):
    chave = (dados.chave or "").strip()
    if not chave:
        return {"chave": ""}
    existe = (
        db.query(AlertaDispensado)
        .filter(AlertaDispensado.chave == chave)
        .first()
    )
    if not existe:
        db.add(AlertaDispensado(chave=chave))
        db.commit()
    return {"chave": chave}


@router.delete("/dispensados", status_code=204)
def reexibir(chave: str = Query(...), db: Session = Depends(get_db)):
    alerta = (
        db.query(AlertaDispensado)
        .filter(AlertaDispensado.chave == chave)
        .first()
    )
    if alerta:
        db.delete(alerta)
        db.commit()
