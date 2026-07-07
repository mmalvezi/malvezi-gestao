import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Cliente, Orcamento, OrcamentoItem
from ..schemas import (
    OrcamentoCreate,
    OrcamentoRead,
    StatusUpdate,
)

router = APIRouter(
    prefix="/orcamentos",
    tags=["orcamentos"],
    dependencies=[Depends(get_current_user)],
)

STATUS_VALIDOS = {"rascunho", "enviado", "aprovado", "recusado"}


def _proximo_numero(db: Session) -> str:
    maior = 0
    for (numero,) in db.query(Orcamento.numero).all():
        m = re.search(r"(\d+)$", numero or "")
        if m:
            maior = max(maior, int(m.group(1)))
    return f"ORC-{maior + 1:04d}"


def _validar_cliente(cliente_id: int, db: Session):
    if not db.get(Cliente, cliente_id):
        raise HTTPException(status_code=400, detail="Cliente inexistente")


@router.get("", response_model=list[OrcamentoRead])
def listar(db: Session = Depends(get_db)):
    return db.query(Orcamento).order_by(Orcamento.criado.desc()).all()


@router.post("", response_model=OrcamentoRead, status_code=201)
def criar(dados: OrcamentoCreate, db: Session = Depends(get_db)):
    _validar_cliente(dados.cliente_id, db)
    payload = dados.model_dump()
    itens = payload.pop("itens", [])
    orcamento = Orcamento(numero=_proximo_numero(db), **payload)
    orcamento.itens = [OrcamentoItem(**item) for item in itens]
    db.add(orcamento)
    db.commit()
    db.refresh(orcamento)
    return orcamento


@router.put("/{orcamento_id}", response_model=OrcamentoRead)
def atualizar(orcamento_id: int, dados: OrcamentoCreate, db: Session = Depends(get_db)):
    orcamento = db.get(Orcamento, orcamento_id)
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orcamento nao encontrado")
    _validar_cliente(dados.cliente_id, db)
    payload = dados.model_dump()
    itens = payload.pop("itens", [])
    for campo, valor in payload.items():
        setattr(orcamento, campo, valor)
    # Substitui a lista de itens (cascade delete-orphan remove os antigos)
    orcamento.itens = [OrcamentoItem(**item) for item in itens]
    db.commit()
    db.refresh(orcamento)
    return orcamento


@router.patch("/{orcamento_id}/status", response_model=OrcamentoRead)
def trocar_status(
    orcamento_id: int, dados: StatusUpdate, db: Session = Depends(get_db)
):
    orcamento = db.get(Orcamento, orcamento_id)
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orcamento nao encontrado")
    if dados.status not in STATUS_VALIDOS:
        raise HTTPException(status_code=422, detail="Status invalido")
    orcamento.status = dados.status
    db.commit()
    db.refresh(orcamento)
    return orcamento


@router.post("/{orcamento_id}/duplicar", response_model=OrcamentoRead, status_code=201)
def duplicar(orcamento_id: int, db: Session = Depends(get_db)):
    original = db.get(Orcamento, orcamento_id)
    if not original:
        raise HTTPException(status_code=404, detail="Orcamento nao encontrado")
    copia = Orcamento(
        numero=_proximo_numero(db),
        cliente_id=original.cliente_id,
        titulo=original.titulo,
        tipo=original.tipo,
        desconto=original.desconto,
        pagamento=original.pagamento,
        prazo=original.prazo,
        validade_dias=original.validade_dias,
        obs=original.obs,
        status="rascunho",
    )
    copia.itens = [
        OrcamentoItem(
            titulo=item.titulo,
            descricao=item.descricao,
            valor=item.valor,
            ordem=item.ordem,
        )
        for item in original.itens
    ]
    db.add(copia)
    db.commit()
    db.refresh(copia)
    return copia


@router.delete("/{orcamento_id}", status_code=204)
def excluir(orcamento_id: int, db: Session = Depends(get_db)):
    orcamento = db.get(Orcamento, orcamento_id)
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orcamento nao encontrado")
    db.delete(orcamento)
    db.commit()
