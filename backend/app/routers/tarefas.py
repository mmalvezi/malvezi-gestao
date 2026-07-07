from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Tarefa
from ..schemas import TarefaCreate, TarefaRead

router = APIRouter(
    prefix="/tarefas",
    tags=["tarefas"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[TarefaRead])
def listar(db: Session = Depends(get_db)):
    return db.query(Tarefa).order_by(Tarefa.criado.desc()).all()


@router.post("", response_model=TarefaRead, status_code=201)
def criar(dados: TarefaCreate, db: Session = Depends(get_db)):
    tarefa = Tarefa(**dados.model_dump())
    db.add(tarefa)
    db.commit()
    db.refresh(tarefa)
    return tarefa


@router.patch("/{tarefa_id}/toggle", response_model=TarefaRead)
def alternar(tarefa_id: int, db: Session = Depends(get_db)):
    tarefa = db.get(Tarefa, tarefa_id)
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa nao encontrada")
    tarefa.done = not tarefa.done
    db.commit()
    db.refresh(tarefa)
    return tarefa


@router.delete("/{tarefa_id}", status_code=204)
def excluir(tarefa_id: int, db: Session = Depends(get_db)):
    tarefa = db.get(Tarefa, tarefa_id)
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa nao encontrada")
    db.delete(tarefa)
    db.commit()
