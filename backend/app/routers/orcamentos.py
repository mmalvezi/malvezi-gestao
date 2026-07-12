import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import (
    Cliente,
    Orcamento,
    OrcamentoItem,
    ParcelaOrcamento,
    Projeto,
    agora,
)
from ..plano import gerar_parcelas_do_plano
from ..schemas import (
    OrcamentoCreate,
    OrcamentoRead,
    StatusUpdate,
)
from .anexos import apagar_arquivo

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


def _validar_projeto(projeto_id: int | None, db: Session):
    if projeto_id is not None and not db.get(Projeto, projeto_id):
        raise HTTPException(status_code=400, detail="Projeto inexistente")


def _assinatura_plano(plano) -> list[tuple]:
    """Retrato do plano para saber se ele realmente mudou numa edicao."""
    return [
        (
            (p.descricao or "").strip(),
            p.tipo_valor,
            p.percentual,
            p.valor_fixo,
            p.tipo_vencimento,
            p.marco,
            p.dias,
        )
        for p in plano
    ]


def _gerar_se_aprovado(orcamento: Orcamento, db: Session) -> None:
    """Orcamento aprovado com projeto vinculado: gera as parcelas do plano.

    Nunca duplica: se o projeto ja tem parcelas, nao mexe (a tela avisa e
    oferece substituir explicitamente).
    """
    if orcamento.status != "aprovado" or not orcamento.projeto_id:
        return
    projeto = db.get(Projeto, orcamento.projeto_id)
    if projeto:
        gerar_parcelas_do_plano(orcamento, projeto, db)


@router.get("", response_model=list[OrcamentoRead])
def listar(db: Session = Depends(get_db)):
    return db.query(Orcamento).order_by(Orcamento.criado.desc()).all()


@router.get("/{orcamento_id}", response_model=OrcamentoRead)
def obter(orcamento_id: int, db: Session = Depends(get_db)):
    orcamento = db.get(Orcamento, orcamento_id)
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orcamento nao encontrado")
    return orcamento


@router.post("", response_model=OrcamentoRead, status_code=201)
def criar(dados: OrcamentoCreate, db: Session = Depends(get_db)):
    _validar_cliente(dados.cliente_id, db)
    _validar_projeto(dados.projeto_id, db)
    payload = dados.model_dump()
    itens = payload.pop("itens", [])
    plano = payload.pop("plano", [])
    orcamento = Orcamento(numero=_proximo_numero(db), **payload)
    orcamento.itens = [OrcamentoItem(**item) for item in itens]
    orcamento.plano = [ParcelaOrcamento(**p) for p in plano]
    if plano:
        orcamento.plano_atualizado_em = agora()
    db.add(orcamento)
    db.flush()
    _gerar_se_aprovado(orcamento, db)
    db.commit()
    db.refresh(orcamento)
    return orcamento


@router.put("/{orcamento_id}", response_model=OrcamentoRead)
def atualizar(orcamento_id: int, dados: OrcamentoCreate, db: Session = Depends(get_db)):
    orcamento = db.get(Orcamento, orcamento_id)
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orcamento nao encontrado")
    _validar_cliente(dados.cliente_id, db)
    _validar_projeto(dados.projeto_id, db)
    payload = dados.model_dump()
    itens = payload.pop("itens", [])
    plano = payload.pop("plano", [])
    ja_aprovado = orcamento.status == "aprovado"
    assinatura_antiga = _assinatura_plano(orcamento.plano)
    for campo, valor in payload.items():
        setattr(orcamento, campo, valor)
    # Substitui as listas (cascade delete-orphan remove as antigas)
    orcamento.itens = [OrcamentoItem(**item) for item in itens]
    orcamento.plano = [ParcelaOrcamento(**p) for p in plano]
    # Marca a mudanca do plano so quando ele mudou de verdade, para o aviso
    # de "plano divergente" nao disparar em qualquer edicao do orcamento
    if _assinatura_plano(orcamento.plano) != assinatura_antiga:
        orcamento.plano_atualizado_em = agora()
    # Aprovacao feita direto pelo formulario tambem gera as parcelas
    if not ja_aprovado:
        _gerar_se_aprovado(orcamento, db)
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
    _gerar_se_aprovado(orcamento, db)
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
    # O plano de pagamento acompanha a copia; o vinculo com projeto nao
    # (a copia costuma ser uma negociacao nova)
    copia.plano = [
        ParcelaOrcamento(
            descricao=p.descricao,
            tipo_valor=p.tipo_valor,
            percentual=p.percentual,
            valor_fixo=p.valor_fixo,
            tipo_vencimento=p.tipo_vencimento,
            marco=p.marco,
            dias=p.dias,
            ordem=p.ordem,
        )
        for p in original.plano
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
    # O cascade limpa o registro do anexo; o arquivo em disco sai junto
    if orcamento.anexo:
        apagar_arquivo(orcamento.anexo)
    db.delete(orcamento)
    db.commit()
