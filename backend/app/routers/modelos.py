from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import ModeloDocumento
from ..sanitize import limpar_html
from ..schemas import ModeloDocumentoRead, ModeloDocumentoUpdate

router = APIRouter(
    prefix="/modelos",
    tags=["modelos"],
    dependencies=[Depends(get_current_user)],
)

TIPOS_VALIDOS = {"contrato", "orcamento", "recibo"}


@router.get("", response_model=list[ModeloDocumentoRead])
def listar(db: Session = Depends(get_db)):
    return db.query(ModeloDocumento).order_by(ModeloDocumento.tipo).all()


@router.get("/{tipo}", response_model=ModeloDocumentoRead)
def obter(tipo: str, db: Session = Depends(get_db)):
    modelo = db.query(ModeloDocumento).filter(ModeloDocumento.tipo == tipo).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo nao encontrado")
    return modelo


@router.put("/{tipo}", response_model=ModeloDocumentoRead)
def atualizar(
    tipo: str, dados: ModeloDocumentoUpdate, db: Session = Depends(get_db)
):
    if tipo not in TIPOS_VALIDOS:
        raise HTTPException(status_code=422, detail="Tipo invalido")
    modelo = db.query(ModeloDocumento).filter(ModeloDocumento.tipo == tipo).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo nao encontrado")
    modelo.titulo = dados.titulo
    modelo.corpo = limpar_html(dados.corpo)
    db.commit()
    db.refresh(modelo)
    return modelo
