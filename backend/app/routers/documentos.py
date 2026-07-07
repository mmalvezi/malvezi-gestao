import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Documento, Orcamento
from ..sanitize import limpar_html
from ..schemas import (
    DocumentoCreate,
    DocumentoRead,
    DocumentoUpdate,
    ProximoNumero,
)

router = APIRouter(
    prefix="/documentos",
    tags=["documentos"],
    dependencies=[Depends(get_current_user)],
)

PREFIXO = {"contrato": "CT-", "orcamento": "DOC-", "recibo": "RC-"}


def _proximo_numero(db: Session, tipo: str, orcamento_id: Optional[int]) -> str:
    # Documento de orcamento vinculado a um orcamento reusa o numero do orcamento.
    if tipo == "orcamento" and orcamento_id:
        orc = db.get(Orcamento, orcamento_id)
        if orc and orc.numero:
            return orc.numero

    prefixo = PREFIXO.get(tipo, "DOC-")
    maior = 0
    existentes = (
        db.query(Documento.numero).filter(Documento.tipo == tipo).all()
    )
    for (numero,) in existentes:
        m = re.search(r"(\d+)$", numero or "")
        if m:
            maior = max(maior, int(m.group(1)))
    return f"{prefixo}{maior + 1:04d}"


@router.get("", response_model=list[DocumentoRead])
def listar(
    projeto_id: Optional[int] = Query(None),
    orcamento_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Documento)
    if projeto_id is not None:
        q = q.filter(Documento.projeto_id == projeto_id)
    if orcamento_id is not None:
        q = q.filter(Documento.orcamento_id == orcamento_id)
    return q.order_by(Documento.criado.desc()).all()


@router.get("/proximo-numero", response_model=ProximoNumero)
def proximo_numero(
    tipo: str = Query(...),
    orcamento_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    if tipo not in PREFIXO:
        raise HTTPException(status_code=422, detail="Tipo invalido")
    return ProximoNumero(numero=_proximo_numero(db, tipo, orcamento_id))


@router.get("/{documento_id}", response_model=DocumentoRead)
def obter(documento_id: int, db: Session = Depends(get_db)):
    doc = db.get(Documento, documento_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento nao encontrado")
    return doc


@router.post("", response_model=DocumentoRead, status_code=201)
def criar(dados: DocumentoCreate, db: Session = Depends(get_db)):
    if dados.tipo not in PREFIXO:
        raise HTTPException(status_code=422, detail="Tipo invalido")
    numero = dados.numero or _proximo_numero(db, dados.tipo, dados.orcamento_id)
    doc = Documento(
        tipo=dados.tipo,
        numero=numero,
        projeto_id=dados.projeto_id,
        orcamento_id=dados.orcamento_id,
        titulo=dados.titulo,
        conteudo=limpar_html(dados.conteudo),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.put("/{documento_id}", response_model=DocumentoRead)
def atualizar(
    documento_id: int, dados: DocumentoUpdate, db: Session = Depends(get_db)
):
    doc = db.get(Documento, documento_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento nao encontrado")
    if dados.titulo is not None:
        doc.titulo = dados.titulo
    if dados.conteudo is not None:
        doc.conteudo = limpar_html(dados.conteudo)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{documento_id}", status_code=204)
def excluir(documento_id: int, db: Session = Depends(get_db)):
    doc = db.get(Documento, documento_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento nao encontrado")
    db.delete(doc)
    db.commit()
