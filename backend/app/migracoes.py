"""Ajustes de dados executados na subida do app.

O create_all cria as tabelas novas, mas nao mexe nas colunas que ja existiam
nem migra dados. Aqui cuidamos disso, sempre de forma idempotente.
"""

from datetime import date

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from .models import ParcelaProjeto, Projeto

# Colunas novas em tabelas antigas: (tabela, coluna, tipo SQL, valor padrao)
COLUNAS_NOVAS = [
    ("recorrencias", "projeto_id", "INTEGER", None),
    ("recorrencias", "dia_vencimento", "INTEGER", "10"),
    ("recorrencias", "inicio", "DATE", None),
    ("recorrencias", "contato", "VARCHAR", None),
    ("orcamentos", "projeto_id", "INTEGER", None),
    ("orcamentos", "plano_gerado_em", "DATETIME", None),
    ("orcamentos", "plano_atualizado_em", "DATETIME", None),
]


def _adicionar_colunas(db: Session) -> None:
    """Adiciona colunas que passaram a existir em tabelas ja criadas."""
    inspetor = inspect(db.bind)
    tabelas = set(inspetor.get_table_names())
    for tabela, coluna, tipo, padrao in COLUNAS_NOVAS:
        if tabela not in tabelas:
            continue
        existentes = {c["name"] for c in inspetor.get_columns(tabela)}
        if coluna in existentes:
            continue
        sql = f"ALTER TABLE {tabela} ADD COLUMN {coluna} {tipo}"
        if padrao is not None:
            sql += f" DEFAULT {padrao}"
        db.execute(text(sql))
    db.commit()


def _migrar_pago_para_parcela(db: Session) -> int:
    """O recebido do projeto agora vem das parcelas. Projetos antigos tinham o
    valor solto na coluna 'pago': viram uma parcela paga, para nao perder nada."""
    projetos = (
        db.query(Projeto)
        .filter(Projeto.pago_legado.isnot(None), Projeto.pago_legado > 0)
        .all()
    )
    migrados = 0
    for p in projetos:
        if p.parcelas:  # ja tem parcelas: nada a migrar
            continue
        db.add(
            ParcelaProjeto(
                projeto_id=p.id,
                descricao="Valores recebidos anteriormente",
                valor=p.pago_legado,
                vencimento=None,
                pago=True,
                pago_em=date.today(),
                ordem=0,
            )
        )
        p.pago_legado = 0
        migrados += 1
    if migrados:
        db.commit()
    return migrados


def rodar_migracoes(db: Session) -> None:
    _adicionar_colunas(db)
    _migrar_pago_para_parcela(db)
