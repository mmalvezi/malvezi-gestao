"""Plano de pagamento do orcamento virando parcelas do projeto.

O plano descreve as condicoes combinadas (percentuais, valores fixos, marcos e
prazos). Na aprovacao, ele vira ParcelaProjeto no projeto vinculado, com
valores e datas calculados. Depois disso as parcelas sao do projeto: editar o
orcamento nao mexe nelas, no maximo gera um aviso para regerar na mao.
"""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from .models import Orcamento, ParcelaProjeto, Projeto


def _valor_da_parcela(parcela, total: float) -> float:
    if parcela.tipo_valor == "fixo":
        return round(parcela.valor_fixo or 0, 2)
    return round(total * (parcela.percentual or 0) / 100, 2)


def _vencimento_da_parcela(parcela, projeto: Projeto, aprovacao: date):
    if parcela.tipo_vencimento == "dias":
        return aprovacao + timedelta(days=parcela.dias or 0)
    if parcela.marco == "entrega":
        # Sem data de entrega prevista, a parcela fica sem vencimento
        return projeto.entrega
    return aprovacao  # marco aprovacao


def gerar_parcelas_do_plano(
    orcamento: Orcamento,
    projeto: Projeto,
    db: Session,
    substituir: bool = False,
) -> int:
    """Cria as parcelas do projeto a partir do plano do orcamento.

    Nunca duplica: se o projeto ja tem parcelas e substituir e False, nao faz
    nada. Devolve quantas parcelas foram criadas.
    """
    if not orcamento.plano:
        return 0
    if projeto.parcelas and not substituir:
        return 0

    if substituir:
        for antiga in list(projeto.parcelas):
            db.delete(antiga)
        db.flush()

    hoje = date.today()
    total = orcamento.total
    criadas = 0
    for i, pp in enumerate(orcamento.plano):
        db.add(
            ParcelaProjeto(
                projeto_id=projeto.id,
                descricao=(pp.descricao or "").strip() or f"Parcela {i + 1}",
                valor=_valor_da_parcela(pp, total),
                vencimento=_vencimento_da_parcela(pp, projeto, hoje),
                pago=False,
                pago_em=None,
                ordem=i,
            )
        )
        criadas += 1

    from .models import agora

    orcamento.plano_gerado_em = agora()
    return criadas


def orcamento_com_plano(projeto: Projeto, db: Session) -> Orcamento | None:
    """O orcamento vinculado ao projeto que tem plano de pagamento.

    Prioriza o aprovado; entre iguais, o mais recente.
    """
    candidatos = (
        db.query(Orcamento)
        .filter(Orcamento.projeto_id == projeto.id)
        .order_by(Orcamento.criado.desc())
        .all()
    )
    com_plano = [o for o in candidatos if o.plano]
    if not com_plano:
        return None
    aprovados = [o for o in com_plano if o.status == "aprovado"]
    return (aprovados or com_plano)[0]


def plano_info(projeto: Projeto, db: Session) -> dict:
    """Situacao do plano para a tela de parcelas do projeto."""
    orc = orcamento_com_plano(projeto, db)
    if not orc:
        return {"tem_plano": False}
    mudou = bool(
        orc.plano_gerado_em
        and orc.plano_atualizado_em
        and orc.plano_atualizado_em > orc.plano_gerado_em
    )
    return {
        "tem_plano": True,
        "orcamento_id": orc.id,
        "orcamento_numero": orc.numero,
        "gerado": orc.plano_gerado_em is not None,
        "plano_mudou": mudou,
    }
