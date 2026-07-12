"""Roteiro de tarefas por tipo de projeto.

Quando um projeto entra num estagio, as tarefas dos modelos daquele tipo com
aquele gatilho nascem sozinhas no quadro. A trava contra duplicacao e o
modelo_id gravado na tarefa: se o projeto ja tem uma tarefa daquele modelo,
ela nao nasce de novo, mesmo que o estagio va e volte.
"""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from .models import ModeloTarefa, Projeto, TarefaProjeto

# Ordem da trilha (recusado fica fora: projeto recusado nao gera tarefas)
TRILHA = ["lead", "orcamento", "aprovado", "desenvolvimento", "entregue"]


def gerar_tarefas_do_estagio(projeto: Projeto, stage: str, db: Session) -> int:
    """Cria as tarefas dos modelos do tipo do projeto com gatilho no estagio.

    Nunca duplica. Devolve quantas tarefas nasceram.
    """
    if stage not in TRILHA:
        return 0

    modelos = (
        db.query(ModeloTarefa)
        .filter(
            ModeloTarefa.tipo_projeto == projeto.tipo,
            ModeloTarefa.stage_gatilho == stage,
            ModeloTarefa.ativo.is_(True),
        )
        .order_by(ModeloTarefa.ordem, ModeloTarefa.id)
        .all()
    )
    if not modelos:
        return 0

    ja_geradas = {t.modelo_id for t in projeto.tarefas if t.modelo_id}
    # Posicao no fim de cada coluna
    fim_coluna: dict[str, int] = {}
    for t in projeto.tarefas:
        fim_coluna[t.coluna] = max(fim_coluna.get(t.coluna, 0), t.ordem + 1)

    hoje = date.today()
    criadas = 0
    for m in modelos:
        if m.id in ja_geradas:
            continue
        coluna = m.coluna_inicial or "afazer"
        db.add(
            TarefaProjeto(
                projeto_id=projeto.id,
                titulo=m.titulo,
                descricao=m.descricao or "",
                coluna=coluna,
                prioridade=m.prioridade or "media",
                area=m.area or "dev",
                responsavel=m.responsavel_padrao,
                prazo=(hoje + timedelta(days=m.dias_prazo)) if m.dias_prazo else None,
                modelo_id=m.id,
                ordem=fim_coluna.get(coluna, 0),
            )
        )
        fim_coluna[coluna] = fim_coluna.get(coluna, 0) + 1
        criadas += 1

    return criadas


def aplicar_roteiro_completo(projeto: Projeto, db: Session) -> int:
    """Gera (sem duplicar) as tarefas do estagio atual e dos anteriores.

    E o botao "Aplicar modelo de tarefas": cobre o caso de um projeto que
    pulou estagios e quer o roteiro inteiro ate aqui.
    """
    if projeto.stage not in TRILHA:
        return 0
    ate = TRILHA.index(projeto.stage) + 1
    criadas = 0
    for stage in TRILHA[:ate]:
        criadas += gerar_tarefas_do_estagio(projeto, stage, db)
        db.flush()
        # Recarrega a colecao para o proximo estagio enxergar as recem-criadas
        db.expire(projeto, ["tarefas"])
    return criadas
