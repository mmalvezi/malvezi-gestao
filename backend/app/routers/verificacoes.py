from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import ItemVerificacao, ModeloVerificacao, VerificacaoProjeto
from ..schemas import (
    ItemVerificacaoUpdate,
    ModeloVerificacaoCreate,
    ModeloVerificacaoRead,
    ReordenarInput,
    VerificacaoConcluir,
    VerificacaoRead,
)
from ..verificacoes import garantir_verificacoes

router = APIRouter(
    tags=["verificacoes"],
    dependencies=[Depends(get_current_user)],
)


def _com_apoio(v: VerificacaoProjeto) -> dict:
    p = v.projeto
    return {
        "id": v.id,
        "projeto_id": v.projeto_id,
        "competencia": v.competencia,
        "status": v.status,
        "criado": v.criado,
        "concluida_em": v.concluida_em,
        "observacoes": v.observacoes or "",
        "itens": [
            {
                "id": i.id,
                "titulo": i.titulo,
                "ok": i.ok,
                "observacao": i.observacao or "",
                "ordem": i.ordem,
            }
            for i in v.itens
        ],
        "cliente": (p.cliente.nome if p and p.cliente else None),
        "tipo_projeto": (p.tipo if p else None),
    }


def _verificacao(verificacao_id: int, db: Session) -> VerificacaoProjeto:
    v = db.get(VerificacaoProjeto, verificacao_id)
    if not v:
        raise HTTPException(status_code=404, detail="Verificacao nao encontrada")
    return v


@router.get("/verificacoes", response_model=list[VerificacaoRead])
def listar(
    status: Optional[str] = Query(None),
    competencia: Optional[str] = Query(None),
    projeto_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    garantir_verificacoes(db)
    q = db.query(VerificacaoProjeto)
    if status:
        q = q.filter(VerificacaoProjeto.status == status)
    if competencia:
        q = q.filter(VerificacaoProjeto.competencia == competencia)
    if projeto_id:
        q = q.filter(VerificacaoProjeto.projeto_id == projeto_id)
    itens = q.order_by(VerificacaoProjeto.competencia.desc()).all()
    return [_com_apoio(v) for v in itens]


@router.get("/projetos/{projeto_id}/verificacoes", response_model=list[VerificacaoRead])
def do_projeto(projeto_id: int, db: Session = Depends(get_db)):
    garantir_verificacoes(db)
    itens = (
        db.query(VerificacaoProjeto)
        .filter(VerificacaoProjeto.projeto_id == projeto_id)
        .order_by(VerificacaoProjeto.competencia.desc())
        .all()
    )
    return [_com_apoio(v) for v in itens]


@router.patch("/itens-verificacao/{item_id}", response_model=VerificacaoRead)
def marcar_item(
    item_id: int, dados: ItemVerificacaoUpdate, db: Session = Depends(get_db)
):
    item = db.get(ItemVerificacao, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    item.ok = dados.ok
    item.observacao = dados.observacao or ""
    db.commit()
    db.refresh(item)
    return _com_apoio(item.verificacao)


@router.patch("/verificacoes/{verificacao_id}/concluir", response_model=VerificacaoRead)
def concluir(
    verificacao_id: int, dados: VerificacaoConcluir, db: Session = Depends(get_db)
):
    """Conclui a verificacao do mes. Pode concluir com itens pendentes, desde
    que a pendencia fique registrada nas observacoes."""
    v = _verificacao(verificacao_id, db)
    pendentes = [i.titulo for i in v.itens if not i.ok]
    if pendentes and not (dados.observacoes or "").strip():
        raise HTTPException(
            status_code=422,
            detail=(
                "Ha itens pendentes. Registre nas observacoes o motivo de "
                "concluir mesmo assim."
            ),
        )
    v.status = "concluida"
    v.concluida_em = date.today()
    if (dados.observacoes or "").strip():
        v.observacoes = dados.observacoes.strip()
    db.commit()
    db.refresh(v)
    return _com_apoio(v)


@router.patch("/verificacoes/{verificacao_id}/reabrir", response_model=VerificacaoRead)
def reabrir(verificacao_id: int, db: Session = Depends(get_db)):
    v = _verificacao(verificacao_id, db)
    v.status = "aberta"
    v.concluida_em = None
    db.commit()
    db.refresh(v)
    return _com_apoio(v)


@router.delete("/verificacoes/{verificacao_id}", status_code=204)
def excluir(verificacao_id: int, db: Session = Depends(get_db)):
    v = _verificacao(verificacao_id, db)
    db.delete(v)
    db.commit()


# ---------- Checklist (modelos de verificacao, em Configuracoes) ----------

@router.get("/modelos-verificacao", response_model=list[ModeloVerificacaoRead])
def listar_modelos(tipo: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(ModeloVerificacao)
    if tipo:
        q = q.filter(ModeloVerificacao.tipo_projeto == tipo)
    return q.order_by(
        ModeloVerificacao.tipo_projeto, ModeloVerificacao.ordem
    ).all()


@router.post("/modelos-verificacao", response_model=ModeloVerificacaoRead, status_code=201)
def criar_modelo(dados: ModeloVerificacaoCreate, db: Session = Depends(get_db)):
    titulo = (dados.titulo or "").strip()
    if not titulo:
        raise HTTPException(status_code=422, detail="Titulo obrigatorio")
    quantos = (
        db.query(ModeloVerificacao)
        .filter(ModeloVerificacao.tipo_projeto == dados.tipo_projeto)
        .count()
    )
    m = ModeloVerificacao(
        tipo_projeto=dados.tipo_projeto, titulo=titulo, ordem=quantos, ativo=True
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.put("/modelos-verificacao/{modelo_id}", response_model=ModeloVerificacaoRead)
def atualizar_modelo(
    modelo_id: int, dados: ModeloVerificacaoCreate, db: Session = Depends(get_db)
):
    m = db.get(ModeloVerificacao, modelo_id)
    if not m:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    titulo = (dados.titulo or "").strip()
    if not titulo:
        raise HTTPException(status_code=422, detail="Titulo obrigatorio")
    m.tipo_projeto = dados.tipo_projeto
    m.titulo = titulo
    m.ativo = dados.ativo
    db.commit()
    db.refresh(m)
    return m


@router.post("/modelos-verificacao/reordenar")
def reordenar_modelos(dados: ReordenarInput, db: Session = Depends(get_db)):
    for i, modelo_id in enumerate(dados.ids):
        m = db.get(ModeloVerificacao, modelo_id)
        if m:
            m.ordem = i
    db.commit()
    return {"ok": True}


@router.delete("/modelos-verificacao/{modelo_id}", status_code=204)
def excluir_modelo(modelo_id: int, db: Session = Depends(get_db)):
    m = db.get(ModeloVerificacao, modelo_id)
    if not m:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    db.delete(m)
    db.commit()
