"""Migracoes do banco, com o Alembic como dono do schema.

Tres cenarios no boot:

1. Banco novo (sem tabelas): "alembic upgrade head" cria o schema inteiro.
2. Banco antigo, criado antes do Alembic (tem tabelas, nao tem
   alembic_version): primeiro a ADOCAO, que completa o que faltar (tabelas
   via create_all, colunas via ALTER com o tipo certo de cada dialeto) e
   marca o banco como atualizado (stamp head). E o caso do VPS.
3. Banco ja adotado: so "alembic upgrade head", que aplica o que estiver
   pendente e nao faz nada se estiver em dia.

Cada ALTER da adocao roda isolado: se um falhar, loga e segue. Uma coluna
com problema nao pode derrubar o sistema inteiro.
"""

import logging
from datetime import date
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text

from .database import Base, SessionLocal, engine
from . import models  # noqa: F401 - registra as tabelas no metadata do Base

log = logging.getLogger("malvezi.migracoes")

RAIZ = Path(__file__).resolve().parent.parent  # backend/

# Colunas adicionadas depois do schema original, por tabela:
# (tabela, coluna, tipo logico, default SQL ou None)
# O tipo logico vira o tipo certo do banco em _tipo_sql().
COLUNAS_LEGADAS = [
    ("recorrencias", "projeto_id", "INTEGER", None),
    ("recorrencias", "dia_vencimento", "INTEGER", "10"),
    ("recorrencias", "inicio", "DATE", None),
    ("recorrencias", "contato", "VARCHAR", None),
    ("orcamentos", "projeto_id", "INTEGER", None),
    ("orcamentos", "plano_gerado_em", "DATETIME", None),
    ("orcamentos", "plano_atualizado_em", "DATETIME", None),
    ("notas_projeto", "titulo", "VARCHAR", "''"),
    ("tarefas_projeto", "prazo", "DATE", None),
    ("tarefas_projeto", "modelo_id", "INTEGER", None),
    ("orcamentos", "forma_pagamento", "VARCHAR", "'parcelas'"),
]


def _tipo_sql(tipo: str, dialeto: str) -> str:
    """Traduz o tipo logico para o dialeto (DATETIME nao existe no Postgres)."""
    if tipo == "DATETIME":
        return "TIMESTAMP" if dialeto == "postgresql" else "DATETIME"
    if tipo == "BOOLEAN":
        # BOOLEAN existe nos dois; o default vai por fora (FALSE)
        return "BOOLEAN"
    return tipo  # INTEGER, VARCHAR, DATE, FLOAT, TEXT: iguais nos dois


def _completar_colunas() -> tuple[list[str], list[str]]:
    """Adiciona as colunas que faltarem, uma a uma, sem derrubar o boot.

    Devolve (aplicadas, falhas) para o log final.
    """
    dialeto = engine.dialect.name
    aplicadas: list[str] = []
    falhas: list[str] = []

    inspetor = inspect(engine)
    tabelas = set(inspetor.get_table_names())

    for tabela, coluna, tipo, padrao in COLUNAS_LEGADAS:
        rotulo = f"{tabela}.{coluna}"
        if tabela not in tabelas:
            continue
        try:
            existentes = {c["name"] for c in inspetor.get_columns(tabela)}
            if coluna in existentes:
                continue
            # SQLite nao suporta IF NOT EXISTS em ADD COLUMN; como acabamos de
            # conferir que a coluna nao existe, o ALTER simples serve nos dois
            sql = f"ALTER TABLE {tabela} ADD COLUMN {coluna} {_tipo_sql(tipo, dialeto)}"
            if padrao is not None:
                sql += f" DEFAULT {padrao}"
            with engine.begin() as conexao:
                conexao.execute(text(sql))
            aplicadas.append(rotulo)
        except Exception as erro:  # noqa: BLE001 - o boot nao pode cair
            log.error("Falha ao adicionar %s: %s", rotulo, erro)
            falhas.append(rotulo)

    return aplicadas, falhas


def _migrar_pago_para_parcela() -> int:
    """Projetos antigos tinham o recebido solto na coluna 'pago': vira uma
    parcela paga, para nada se perder. Idempotente."""
    from .models import ParcelaProjeto, Projeto

    db = SessionLocal()
    migrados = 0
    try:
        projetos = (
            db.query(Projeto)
            .filter(Projeto.pago_legado.isnot(None), Projeto.pago_legado > 0)
            .all()
        )
        for p in projetos:
            if p.parcelas:
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
    except Exception as erro:  # noqa: BLE001
        db.rollback()
        log.error("Falha ao migrar pago para parcelas: %s", erro)
    finally:
        db.close()
    return migrados


def _config_alembic() -> Config:
    cfg = Config(str(RAIZ / "alembic.ini"))
    cfg.set_main_option("script_location", str(RAIZ / "alembic"))
    return cfg


def migrar() -> None:
    """Deixa o banco em dia. Chamado no entrypoint (Docker) e no startup."""
    inspetor = inspect(engine)
    tabelas = set(inspetor.get_table_names())
    cfg = _config_alembic()

    if "clientes" in tabelas and "alembic_version" not in tabelas:
        # Banco criado antes do Alembic (local antigo ou o VPS): adota.
        log.info("Banco existente sem Alembic: completando schema e adotando")

        # Tabelas que faltarem (create_all so cria o que nao existe)
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as erro:  # noqa: BLE001
            log.error("Falha no create_all da adocao: %s", erro)

        aplicadas, falhas = _completar_colunas()
        movidos = _migrar_pago_para_parcela()

        log.info(
            "Adocao concluida. Colunas adicionadas: %s | Falhas: %s | "
            "Projetos com pago migrado para parcela: %d",
            ", ".join(aplicadas) or "nenhuma",
            ", ".join(falhas) or "nenhuma",
            movidos,
        )

        if falhas:
            # Nao marca como em dia com pendencia: tenta de novo no proximo boot
            log.error(
                "Adocao com falhas: o stamp nao foi feito, corrija e reinicie"
            )
            return

        command.stamp(cfg, "head")
        log.info("Banco marcado no Alembic (stamp head)")

    # Daqui em diante o Alembic manda: aplica o que estiver pendente
    command.upgrade(cfg, "head")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    migrar()
    print("Migracoes aplicadas")
