from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import ModeloTarefa
from ..schemas import (
    DuplicarModelosInput,
    ModeloTarefaCreate,
    ModeloTarefaRead,
    ReordenarInput,
)

router = APIRouter(
    prefix="/modelos-tarefa",
    tags=["modelos-tarefa"],
    dependencies=[Depends(get_current_user)],
)


def _modelo(modelo_id: int, db: Session) -> ModeloTarefa:
    m = db.get(ModeloTarefa, modelo_id)
    if not m:
        raise HTTPException(status_code=404, detail="Modelo nao encontrado")
    return m


@router.get("", response_model=list[ModeloTarefaRead])
def listar(tipo: str | None = None, db: Session = Depends(get_db)):
    q = db.query(ModeloTarefa)
    if tipo:
        q = q.filter(ModeloTarefa.tipo_projeto == tipo)
    return q.order_by(
        ModeloTarefa.tipo_projeto, ModeloTarefa.stage_gatilho, ModeloTarefa.ordem
    ).all()


@router.post("", response_model=ModeloTarefaRead, status_code=201)
def criar(dados: ModeloTarefaCreate, db: Session = Depends(get_db)):
    titulo = (dados.titulo or "").strip()
    if not titulo:
        raise HTTPException(status_code=422, detail="Titulo obrigatorio")
    payload = dados.model_dump()
    payload["titulo"] = titulo
    # Entra no fim do grupo (tipo + estagio)
    quantos = (
        db.query(ModeloTarefa)
        .filter(
            ModeloTarefa.tipo_projeto == dados.tipo_projeto,
            ModeloTarefa.stage_gatilho == dados.stage_gatilho,
        )
        .count()
    )
    payload["ordem"] = quantos
    m = ModeloTarefa(**payload)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.put("/{modelo_id}", response_model=ModeloTarefaRead)
def atualizar(
    modelo_id: int, dados: ModeloTarefaCreate, db: Session = Depends(get_db)
):
    m = _modelo(modelo_id, db)
    titulo = (dados.titulo or "").strip()
    if not titulo:
        raise HTTPException(status_code=422, detail="Titulo obrigatorio")
    payload = dados.model_dump()
    payload["titulo"] = titulo
    for campo, valor in payload.items():
        setattr(m, campo, valor)
    db.commit()
    db.refresh(m)
    return m


@router.post("/reordenar")
def reordenar(dados: ReordenarInput, db: Session = Depends(get_db)):
    """Recebe os ids de um grupo na nova ordem e regrava o campo ordem."""
    for i, modelo_id in enumerate(dados.ids):
        m = db.get(ModeloTarefa, modelo_id)
        if m:
            m.ordem = i
    db.commit()
    return {"ok": True}


@router.post("/duplicar", response_model=list[ModeloTarefaRead])
def duplicar(dados: DuplicarModelosInput, db: Session = Depends(get_db)):
    """Copia o roteiro de um tipo para outro, pulando titulos que o destino
    ja tem no mesmo estagio (para poder rodar mais de uma vez sem bagunca)."""
    if dados.de == dados.para:
        raise HTTPException(status_code=422, detail="Escolha tipos diferentes")
    origem = (
        db.query(ModeloTarefa)
        .filter(ModeloTarefa.tipo_projeto == dados.de)
        .order_by(ModeloTarefa.stage_gatilho, ModeloTarefa.ordem)
        .all()
    )
    destino = db.query(ModeloTarefa).filter(
        ModeloTarefa.tipo_projeto == dados.para
    ).all()
    existentes = {(m.stage_gatilho, m.titulo.strip().lower()) for m in destino}
    fim_grupo: dict[str, int] = {}
    for m in destino:
        fim_grupo[m.stage_gatilho] = max(
            fim_grupo.get(m.stage_gatilho, 0), m.ordem + 1
        )

    copiados = []
    for m in origem:
        chave = (m.stage_gatilho, m.titulo.strip().lower())
        if chave in existentes:
            continue
        novo = ModeloTarefa(
            tipo_projeto=dados.para,
            stage_gatilho=m.stage_gatilho,
            titulo=m.titulo,
            descricao=m.descricao or "",
            area=m.area,
            prioridade=m.prioridade,
            responsavel_padrao=m.responsavel_padrao,
            coluna_inicial=m.coluna_inicial,
            dias_prazo=m.dias_prazo,
            ordem=fim_grupo.get(m.stage_gatilho, 0),
            ativo=m.ativo,
        )
        fim_grupo[m.stage_gatilho] = fim_grupo.get(m.stage_gatilho, 0) + 1
        db.add(novo)
        copiados.append(novo)
    db.commit()
    for n in copiados:
        db.refresh(n)
    return copiados


@router.delete("/{modelo_id}", status_code=204)
def excluir(modelo_id: int, db: Session = Depends(get_db)):
    m = _modelo(modelo_id, db)
    db.delete(m)
    db.commit()
