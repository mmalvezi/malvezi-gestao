from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import NotaProjeto, Projeto
from ..schemas import NotaProjetoCreate, NotaProjetoRead

router = APIRouter(
    tags=["notas"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/projetos/{projeto_id}/notas", response_model=list[NotaProjetoRead])
def listar(projeto_id: int, db: Session = Depends(get_db)):
    return (
        db.query(NotaProjeto)
        .filter(NotaProjeto.projeto_id == projeto_id)
        .order_by(NotaProjeto.criado.desc())
        .all()
    )


@router.post(
    "/projetos/{projeto_id}/notas", response_model=NotaProjetoRead, status_code=201
)
def criar(
    projeto_id: int, dados: NotaProjetoCreate, db: Session = Depends(get_db)
):
    if not db.get(Projeto, projeto_id):
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")
    texto = (dados.texto or "").strip()
    if not texto:
        raise HTTPException(status_code=422, detail="Nota vazia")
    nota = NotaProjeto(projeto_id=projeto_id, texto=texto)
    db.add(nota)
    db.commit()
    db.refresh(nota)
    return nota


@router.delete("/notas/{nota_id}", status_code=204)
def excluir(nota_id: int, db: Session = Depends(get_db)):
    nota = db.get(NotaProjeto, nota_id)
    if not nota:
        raise HTTPException(status_code=404, detail="Nota nao encontrada")
    db.delete(nota)
    db.commit()
