from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Projeto, TarefaProjeto
from ..schemas import (
    TarefaProjetoColunaUpdate,
    TarefaProjetoCreate,
    TarefaProjetoRead,
    TarefaProjetoUpdate,
)

router = APIRouter(
    tags=["tarefas-projeto"],
    dependencies=[Depends(get_current_user)],
)


def _da_coluna(projeto_id: int, coluna: str, db: Session) -> list[TarefaProjeto]:
    return (
        db.query(TarefaProjeto)
        .filter(
            TarefaProjeto.projeto_id == projeto_id,
            TarefaProjeto.coluna == coluna,
        )
        .order_by(TarefaProjeto.ordem, TarefaProjeto.id)
        .all()
    )


def _renumerar(tarefas: list[TarefaProjeto]) -> None:
    for i, t in enumerate(tarefas):
        t.ordem = i


@router.get("/projetos/{projeto_id}/tarefas", response_model=list[TarefaProjetoRead])
def listar(projeto_id: int, db: Session = Depends(get_db)):
    if not db.get(Projeto, projeto_id):
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")
    return (
        db.query(TarefaProjeto)
        .filter(TarefaProjeto.projeto_id == projeto_id)
        .order_by(TarefaProjeto.ordem, TarefaProjeto.id)
        .all()
    )


@router.post(
    "/projetos/{projeto_id}/tarefas",
    response_model=TarefaProjetoRead,
    status_code=201,
)
def criar(
    projeto_id: int, dados: TarefaProjetoCreate, db: Session = Depends(get_db)
):
    if not db.get(Projeto, projeto_id):
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")
    titulo = (dados.titulo or "").strip()
    if not titulo:
        raise HTTPException(status_code=422, detail="Titulo obrigatorio")

    # Entra no fim da coluna escolhida
    ordem = len(_da_coluna(projeto_id, dados.coluna, db))
    responsavel = (dados.responsavel or "").strip() or None

    tarefa = TarefaProjeto(
        projeto_id=projeto_id,
        titulo=titulo,
        descricao=dados.descricao or "",
        coluna=dados.coluna,
        prioridade=dados.prioridade,
        area=dados.area,
        responsavel=responsavel,
        ordem=ordem,
    )
    db.add(tarefa)
    db.commit()
    db.refresh(tarefa)
    return tarefa


@router.put("/tarefas-projeto/{tarefa_id}", response_model=TarefaProjetoRead)
def atualizar(
    tarefa_id: int, dados: TarefaProjetoUpdate, db: Session = Depends(get_db)
):
    tarefa = db.get(TarefaProjeto, tarefa_id)
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa nao encontrada")
    titulo = (dados.titulo or "").strip()
    if not titulo:
        raise HTTPException(status_code=422, detail="Titulo obrigatorio")

    tarefa.titulo = titulo
    tarefa.descricao = dados.descricao or ""
    tarefa.prioridade = dados.prioridade
    tarefa.area = dados.area
    tarefa.responsavel = (dados.responsavel or "").strip() or None
    db.commit()
    db.refresh(tarefa)
    return tarefa


@router.patch("/tarefas-projeto/{tarefa_id}/coluna", response_model=TarefaProjetoRead)
def mover(
    tarefa_id: int, dados: TarefaProjetoColunaUpdate, db: Session = Depends(get_db)
):
    tarefa = db.get(TarefaProjeto, tarefa_id)
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa nao encontrada")

    origem = tarefa.coluna
    destino = dados.coluna

    # Tira a tarefa da coluna de origem e fecha o buraco na numeracao
    if origem != destino:
        restantes = [t for t in _da_coluna(tarefa.projeto_id, origem, db) if t.id != tarefa.id]
        _renumerar(restantes)

    alvo = [t for t in _da_coluna(tarefa.projeto_id, destino, db) if t.id != tarefa.id]
    pos = len(alvo) if dados.ordem is None else max(0, min(dados.ordem, len(alvo)))
    alvo.insert(pos, tarefa)

    tarefa.coluna = destino
    _renumerar(alvo)

    db.commit()
    db.refresh(tarefa)
    return tarefa


@router.delete("/tarefas-projeto/{tarefa_id}", status_code=204)
def excluir(tarefa_id: int, db: Session = Depends(get_db)):
    tarefa = db.get(TarefaProjeto, tarefa_id)
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa nao encontrada")
    projeto_id, coluna = tarefa.projeto_id, tarefa.coluna
    db.delete(tarefa)
    db.flush()
    _renumerar(_da_coluna(projeto_id, coluna, db))
    db.commit()
