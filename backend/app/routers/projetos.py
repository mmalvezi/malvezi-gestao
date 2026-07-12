from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Cliente, Projeto
from ..schemas import ProjetoCreate, ProjetoRead, StageUpdate

router = APIRouter(
    prefix="/projetos",
    tags=["projetos"],
    dependencies=[Depends(get_current_user)],
)


def _validar_cliente(cliente_id: int, db: Session):
    if not db.get(Cliente, cliente_id):
        raise HTTPException(status_code=400, detail="Cliente inexistente")


@router.get("", response_model=list[ProjetoRead])
def listar(db: Session = Depends(get_db)):
    return db.query(Projeto).order_by(Projeto.criado.desc()).all()


@router.get("/{projeto_id}", response_model=ProjetoRead)
def obter(projeto_id: int, db: Session = Depends(get_db)):
    projeto = db.get(Projeto, projeto_id)
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")
    return projeto


@router.post("", response_model=ProjetoRead, status_code=201)
def criar(dados: ProjetoCreate, db: Session = Depends(get_db)):
    _validar_cliente(dados.cliente_id, db)
    projeto = Projeto(**dados.model_dump())
    db.add(projeto)
    db.commit()
    db.refresh(projeto)
    return projeto


@router.put("/{projeto_id}", response_model=ProjetoRead)
def atualizar(projeto_id: int, dados: ProjetoCreate, db: Session = Depends(get_db)):
    projeto = db.get(Projeto, projeto_id)
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")
    _validar_cliente(dados.cliente_id, db)
    for campo, valor in dados.model_dump().items():
        setattr(projeto, campo, valor)
    db.commit()
    db.refresh(projeto)
    return projeto


@router.patch("/{projeto_id}/stage", response_model=ProjetoRead)
def trocar_stage(projeto_id: int, dados: StageUpdate, db: Session = Depends(get_db)):
    projeto = db.get(Projeto, projeto_id)
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")
    projeto.stage = dados.stage
    db.commit()
    db.refresh(projeto)
    return projeto


@router.delete("/{projeto_id}", status_code=204)
def excluir(projeto_id: int, db: Session = Depends(get_db)):
    projeto = db.get(Projeto, projeto_id)
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")
    db.delete(projeto)
    db.commit()
