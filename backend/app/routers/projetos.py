from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..cobrancas import garantir_cobrancas
from ..database import get_db
from ..models import Cliente, Projeto
from ..plano import gerar_parcelas_do_plano, orcamento_com_plano, plano_info
from ..schemas import PlanoInfo, ProjetoCreate, ProjetoRead, StageUpdate

router = APIRouter(
    prefix="/projetos",
    tags=["projetos"],
    dependencies=[Depends(get_current_user)],
)


def _validar_cliente(cliente_id: int, db: Session):
    if not db.get(Cliente, cliente_id):
        raise HTTPException(status_code=400, detail="Cliente inexistente")


def _ativar_mensalidades(projeto: Projeto, db: Session) -> None:
    """Projeto entregue: as mensalidades previstas dele passam a valer hoje.

    Sair de entregue nao desativa nada: uma vez ativa, so a mao pausa.
    """
    if projeto.stage != "entregue":
        return
    hoje = date.today()
    for r in projeto.recorrencias:
        if r.status == "previsto":
            r.status = "ativo"
            r.inicio = r.inicio or hoje


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
    _ativar_mensalidades(projeto, db)
    db.commit()
    db.refresh(projeto)
    return projeto


@router.patch("/{projeto_id}/stage", response_model=ProjetoRead)
def trocar_stage(projeto_id: int, dados: StageUpdate, db: Session = Depends(get_db)):
    projeto = db.get(Projeto, projeto_id)
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")
    projeto.stage = dados.stage
    _ativar_mensalidades(projeto, db)
    # Projeto aprovado: o plano de pagamento do orcamento vinculado vira
    # parcelas (se o projeto ainda nao tiver nenhuma)
    if projeto.stage == "aprovado":
        orc = orcamento_com_plano(projeto, db)
        if orc:
            gerar_parcelas_do_plano(orc, projeto, db)
    db.commit()
    db.refresh(projeto)
    # A entrega pode ter ativado mensalidades: ja deixa as cobrancas em dia
    garantir_cobrancas(db)
    db.refresh(projeto)
    return projeto


@router.get("/{projeto_id}/plano-info", response_model=PlanoInfo)
def info_do_plano(projeto_id: int, db: Session = Depends(get_db)):
    """Situacao do plano de pagamento do orcamento vinculado, para a tela de
    parcelas avisar sobre geracao pendente ou plano divergente."""
    projeto = db.get(Projeto, projeto_id)
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")
    return plano_info(projeto, db)


@router.post("/{projeto_id}/parcelas/gerar-do-plano", status_code=201)
def gerar_do_plano(
    projeto_id: int, substituir: bool = False, db: Session = Depends(get_db)
):
    """Gera (ou regenera, com substituir=true) as parcelas a partir do plano."""
    projeto = db.get(Projeto, projeto_id)
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")
    orc = orcamento_com_plano(projeto, db)
    if not orc:
        raise HTTPException(
            status_code=404,
            detail="Nenhum orcamento vinculado com plano de pagamento",
        )
    criadas = gerar_parcelas_do_plano(orc, projeto, db, substituir=substituir)
    db.commit()
    return {"criadas": criadas, "orcamento": orc.numero}


@router.delete("/{projeto_id}", status_code=204)
def excluir(projeto_id: int, db: Session = Depends(get_db)):
    projeto = db.get(Projeto, projeto_id)
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto nao encontrado")
    db.delete(projeto)
    db.commit()
