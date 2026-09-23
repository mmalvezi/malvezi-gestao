"""Parcelamento automatico: quantidade de parcelas vira valores e datas.

A regra e a mesma no orcamento e no projeto: a primeira parcela cai na data
de partida (aprovacao/hoje) e as seguintes de mes em mes. A sobra dos centavos
fica na primeira parcela, entao a soma sempre fecha o total exato.
"""

from calendar import monthrange
from datetime import date


def dividir_valor(total: float, quantidade: int) -> list[float]:
    """Divide o total em N parcelas, com a sobra de centavos na primeira."""
    if quantidade < 1:
        return []
    centavos = round(round(total, 2) * 100)
    base, resto = divmod(centavos, quantidade)
    valores = [base] * quantidade
    valores[0] += resto
    return [v / 100 for v in valores]


def somar_meses(partida: date, meses: int) -> date:
    """Mesma data nos meses seguintes; em mes curto, cai no ultimo dia."""
    mes = partida.month - 1 + meses
    ano = partida.year + mes // 12
    mes = mes % 12 + 1
    dia = min(partida.day, monthrange(ano, mes)[1])
    return date(ano, mes, dia)


def vencimentos(partida: date, quantidade: int) -> list[date]:
    """Primeira na data de partida, as demais de mes em mes."""
    return [somar_meses(partida, i) for i in range(max(quantidade, 0))]
