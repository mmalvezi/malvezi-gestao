from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..cobrancas import garantir_cobrancas
from ..database import get_db
from ..models import Cliente, Projeto, Recorrencia
from ..schemas import RecorrenciaCreate, RecorrenciaRead, StatusUpdate

router = APIRouter(
    prefix="/recorrencias",
    tags=["recorrencias"],
    dependencies=[Depends(get_current_user)],
)

STATUS_VALIDOS = {"previsto", "ativo", "pausado"}


def _validar_cliente(cliente_id: int, db: Session):
    if not db.get(Cliente, cliente_id):
        raise HTTPException(status_code=400, detail="Cliente inexistente")


def _validar_projeto(projeto_id: int | None, db: Session):
    if projeto_id is not None and not db.get(Projeto, projeto_id):
        raise HTTPException(status_code=400, detail="Projeto inexistente")


@router.get("", response_model=list[RecorrenciaRead])
def listar(db: Session = Depends(get_db)):
    # Leitura barata que mantem as cobrancas do mes em dia, sem cron
    garantir_cobrancas(db)
    return db.query(Recorrencia).order_by(Recorrencia.criado.desc()).all()


@router.get("/projeto/{projeto_id}", response_model=list[RecorrenciaRead])
def listar_do_projeto(projeto_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Recorrencia)
        .filter(Recorrencia.projeto_id == projeto_id)
        .order_by(Recorrencia.criado.desc())
        .all()
    )


@router.post("", response_model=RecorrenciaRead, status_code=201)
def criar(dados: RecorrenciaCreate, db: Session = Depends(get_db)):
    _validar_cliente(dados.cliente_id, db)
    _validar_projeto(dados.projeto_id, db)
    recorrencia = Recorrencia(**dados.model_dump())
    # Ativa ja nasce valendo a partir de hoje, se nao vier data
    if recorrencia.status == "ativo" and not recorrencia.inicio:
        recorrencia.inicio = date.today()
    db.add(recorrencia)
    db.commit()
    db.refresh(recorrencia)
    garantir_cobrancas(db)
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
    _validar_projeto(dados.projeto_id, db)
    for campo, valor in dados.model_dump().items():
        setattr(recorrencia, campo, valor)
    if recorrencia.status == "ativo" and not recorrencia.inicio:
        recorrencia.inicio = date.today()
    db.commit()
    db.refresh(recorrencia)
    garantir_cobrancas(db)
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
    if recorrencia.status == "ativo" and not recorrencia.inicio:
        recorrencia.inicio = date.today()
    db.commit()
    db.refresh(recorrencia)
    garantir_cobrancas(db)
    db.refresh(recorrencia)
    return recorrencia


@router.delete("/{recorrencia_id}", status_code=204)
def excluir(recorrencia_id: int, db: Session = Depends(get_db)):
    recorrencia = db.get(Recorrencia, recorrencia_id)
    if not recorrencia:
        raise HTTPException(status_code=404, detail="Recorrencia nao encontrada")
    db.delete(recorrencia)
    db.commit()
