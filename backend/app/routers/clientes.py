from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Cliente
from ..schemas import ClienteCreate, ClienteRead

router = APIRouter(
    prefix="/clientes",
    tags=["clientes"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[ClienteRead])
def listar(db: Session = Depends(get_db)):
    return db.query(Cliente).order_by(Cliente.nome).all()


@router.post("", response_model=ClienteRead, status_code=201)
def criar(dados: ClienteCreate, db: Session = Depends(get_db)):
    cliente = Cliente(**dados.model_dump())
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.get("/{cliente_id}", response_model=ClienteRead)
def obter(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente nao encontrado")
    return cliente


@router.put("/{cliente_id}", response_model=ClienteRead)
def atualizar(cliente_id: int, dados: ClienteCreate, db: Session = Depends(get_db)):
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente nao encontrado")
    for campo, valor in dados.model_dump().items():
        setattr(cliente, campo, valor)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.delete("/{cliente_id}", status_code=204)
def excluir(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente nao encontrado")
    db.delete(cliente)
    db.commit()
