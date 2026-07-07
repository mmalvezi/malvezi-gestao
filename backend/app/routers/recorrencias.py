from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Cliente, Recorrencia
from ..schemas import RecorrenciaCreate, RecorrenciaRead, StatusUpdate

router = APIRouter(
    prefix="/recorrencias",
    tags=["recorrencias"],
    dependencies=[Depends(get_current_user)],
)

STATUS_VALIDOS = {"ativo", "pausado"}


def _validar_cliente(cliente_id: int, db: Session):
    if not db.get(Cliente, cliente_id):
        raise HTTPException(status_code=400, detail="Cliente inexistente")


@router.get("", response_model=list[RecorrenciaRead])
def listar(db: Session = Depends(get_db)):
    return db.query(Recorrencia).order_by(Recorrencia.criado.desc()).all()


@router.post("", response_model=RecorrenciaRead, status_code=201)
def criar(dados: RecorrenciaCreate, db: Session = Depends(get_db)):
    _validar_cliente(dados.cliente_id, db)
    recorrencia = Recorrencia(**dados.model_dump())
    db.add(recorrencia)
    db.commit()
    db.refresh(recorrencia)
    return recorrencia


@router.put("/{recorrencia_id}", response_model=RecorrenciaRead)
def atualizar(
    recorrencia_id: int, dados: RecorrenciaCreate, db: Session = Depends(get_db)
):
    recorrencia = db.get(Recorrencia, recorrencia_id)
    if not recorrencia:
        raise HTTPException(status_code=404, detail="Recorrencia nao encontrada")
    _validar_cliente(dados.cliente_id, db)
    for campo, valor in dados.model_dump().items():
        setattr(recorrencia, campo, valor)
    db.commit()
    db.refresh(recorrencia)
    return recorrencia


@router.patch("/{recorrencia_id}/status", response_model=RecorrenciaRead)
def trocar_status(
    recorrencia_id: int, dados: StatusUpdate, db: Session = Depends(get_db)
):
    recorrencia = db.get(Recorrencia, recorrencia_id)
    if not recorrencia:
        raise HTTPException(status_code=404, detail="Recorrencia nao encontrada")
    if dados.status not in STATUS_VALIDOS:
        raise HTTPException(status_code=422, detail="Status invalido")
    recorrencia.status = dados.status
    db.commit()
    db.refresh(recorrencia)
    return recorrencia


@router.delete("/{recorrencia_id}", status_code=204)
def excluir(recorrencia_id: int, db: Session = Depends(get_db)):
    recorrencia = db.get(Recorrencia, recorrencia_id)
    if not recorrencia:
        raise HTTPException(status_code=404, detail="Recorrencia nao encontrada")
    db.delete(recorrencia)
    db.commit()
