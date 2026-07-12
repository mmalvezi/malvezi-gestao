"""Geracao das cobrancas mensais das mensalidades ativas.

Nao depende de cron: garantir_cobrancas() e chamada na subida do app e nas
leituras do painel e da lista de mensalidades. E barata e nunca duplica, porque
o par (recorrencia, competencia) tem chave unica no banco.
"""

import calendar
from datetime import date

from sqlalchemy.orm import Session

from .models import CobrancaMensalidade, Recorrencia

# Ate quantos meses para tras gerar cobrancas que faltaram
MESES_RETROATIVOS = 6


def competencia_de(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def vencimento_da_competencia(ano: int, mes: int, dia: int) -> date:
    """Dia do vencimento naquele mes. Se o mes nao tem esse dia (ex.: 31 em
    fevereiro), usa o ultimo dia do mes."""
    ultimo = calendar.monthrange(ano, mes)[1]
    return date(ano, mes, min(max(dia or 1, 1), ultimo))


def _meses_desde(inicio: date, hoje: date) -> list[tuple[int, int]]:
    """Lista de (ano, mes) do inicio ate o mes atual, limitada aos ultimos
    MESES_RETROATIVOS meses, para nao gerar historico infinito."""
    limite = hoje.year * 12 + (hoje.month - 1) - MESES_RETROATIVOS
    corrente = max(inicio.year * 12 + (inicio.month - 1), limite)
    fim = hoje.year * 12 + (hoje.month - 1)
    meses = []
    while corrente <= fim:
        meses.append((corrente // 12, corrente % 12 + 1))
        corrente += 1
    return meses


def garantir_cobrancas(db: Session, hoje: date | None = None) -> int:
    """Cria as cobrancas que faltam para as mensalidades ativas.

    Devolve quantas cobrancas foram criadas.
    """
    hoje = hoje or date.today()
    criadas = 0

    ativas = db.query(Recorrencia).filter(Recorrencia.status == "ativo").all()
    for r in ativas:
        inicio = r.inicio or hoje
        if inicio > hoje:
            continue
        existentes = {c.competencia for c in r.cobrancas}
        for ano, mes in _meses_desde(inicio, hoje):
            competencia = f"{ano:04d}-{mes:02d}"
            if competencia in existentes:
                continue
            db.add(
                CobrancaMensalidade(
                    recorrencia_id=r.id,
                    competencia=competencia,
                    vencimento=vencimento_da_competencia(ano, mes, r.dia_vencimento),
                    valor=r.valor or 0,
                    status="aberta",
                )
            )
            criadas += 1

    if criadas:
        db.commit()
    return criadas
