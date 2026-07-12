"""Verificacao mensal de saude dos projetos entregues.

Todo projeto no estagio entregue ganha, uma vez por mes, um checklist do tipo
dele (site, erp, automacao, portal). Sem cron: garantir_verificacoes() roda na
subida do app e no GET do dashboard, e o indice unico (projeto, competencia)
impede duplicar. Vale tambem para os projetos que ja estavam entregues antes
da funcionalidade existir; nunca gera meses retroativos.
"""

from datetime import date

from sqlalchemy.orm import Session

from .models import ItemVerificacao, ModeloVerificacao, Projeto, VerificacaoProjeto


def competencia_atual(hoje: date | None = None) -> str:
    hoje = hoje or date.today()
    return f"{hoje.year:04d}-{hoje.month:02d}"


def garantir_verificacoes(db: Session, hoje: date | None = None) -> int:
    """Cria a verificacao do mes para cada projeto entregue que nao a tem.

    Devolve quantas verificacoes foram criadas.
    """
    comp = competencia_atual(hoje)

    entregues = db.query(Projeto).filter(Projeto.stage == "entregue").all()
    if not entregues:
        return 0

    existentes = {
        v.projeto_id
        for v in db.query(VerificacaoProjeto)
        .filter(VerificacaoProjeto.competencia == comp)
        .all()
    }

    modelos = (
        db.query(ModeloVerificacao)
        .filter(ModeloVerificacao.ativo.is_(True))
        .order_by(ModeloVerificacao.ordem, ModeloVerificacao.id)
        .all()
    )
    por_tipo: dict[str, list[ModeloVerificacao]] = {}
    for m in modelos:
        por_tipo.setdefault(m.tipo_projeto, []).append(m)

    criadas = 0
    for p in entregues:
        if p.id in existentes:
            continue
        verificacao = VerificacaoProjeto(
            projeto_id=p.id, competencia=comp, status="aberta"
        )
        verificacao.itens = [
            ItemVerificacao(titulo=m.titulo, ok=False, observacao="", ordem=i)
            for i, m in enumerate(por_tipo.get(p.tipo, []))
        ]
        db.add(verificacao)
        criadas += 1

    if criadas:
        db.commit()
    return criadas
