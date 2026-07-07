from datetime import date, timedelta

from sqlalchemy.orm import Session

from .models import (
    Cliente,
    Orcamento,
    OrcamentoItem,
    Projeto,
    Recorrencia,
    Tarefa,
)


def run_seed(db: Session):
    # So popula se nao houver nenhum cliente. Nunca sobrescreve dados reais.
    if db.query(Cliente).first():
        return

    hoje = date.today()

    clientes = [
        Cliente(nome="Otica Visao Clara", empresa="Otica Visao Clara ME", contato="contato@visaoclara.com.br"),
        Cliente(nome="Mercado Sao Jorge", empresa="Mercado Sao Jorge Ltda", contato="(11) 90000-0001"),
        Cliente(nome="Auto Pecas Central", empresa="Auto Pecas Central", contato="vendas@apcentral.com.br"),
        Cliente(nome="Restaurante Sabor Caseiro", empresa=None, contato="(11) 90000-0002"),
        Cliente(nome="Clinica Bem Estar", empresa="Clinica Bem Estar", contato="recepcao@bemestar.com.br"),
        Cliente(nome="Pousada Recanto", empresa="Pousada Recanto", contato="reservas@recanto.com.br"),
        Cliente(nome="Transportadora Rota Certa", empresa="Rota Certa Logistica", contato="(11) 90000-0003"),
    ]
    db.add_all(clientes)
    db.flush()  # garante ids

    (otica, mercado, autopecas, restaurante, clinica, pousada, transportadora) = clientes

    projetos = [
        Projeto(
            cliente_id=otica.id, tipo="site", valor=4500, pago=4500,
            stage="entregue", entrega=hoje - timedelta(days=20),
            escopo="Site institucional com catalogo de armacoes.",
        ),
        Projeto(
            cliente_id=mercado.id, tipo="automacao", valor=6800, pago=3400,
            stage="desenvolvimento", entrega=hoje + timedelta(days=10),
            escopo="Automacao de pedidos e controle de estoque.",
        ),
        Projeto(
            cliente_id=autopecas.id, tipo="erp", valor=12000, pago=0,
            stage="aprovado", entrega=hoje + timedelta(days=30),
            escopo="ERP de pecas com integracao fiscal.",
        ),
        Projeto(
            cliente_id=clinica.id, tipo="portal", valor=8200, pago=2000,
            stage="desenvolvimento", entrega=hoje + timedelta(days=5),
            escopo="Portal de agendamento de consultas.",
        ),
        Projeto(
            cliente_id=pousada.id, tipo="site", valor=5200, pago=0,
            stage="orcamento", entrega=None,
            escopo="Site com reservas e galeria de fotos.",
        ),
        Projeto(
            cliente_id=transportadora.id, tipo="automacao", valor=9500, pago=0,
            stage="lead", entrega=None,
            escopo="Rastreamento de cargas e relatorios.",
        ),
    ]
    db.add_all(projetos)

    orcamentos = [
        Orcamento(
            numero="ORC-0001", cliente_id=pousada.id,
            titulo="Site institucional com reservas", tipo="site",
            desconto=200, pagamento="50% entrada, 50% na entrega",
            prazo="30 dias", validade_dias=15, obs="Inclui dominio no primeiro ano.",
            status="enviado",
            itens=[
                OrcamentoItem(titulo="Layout e identidade", descricao="Design das paginas principais", valor=1800, ordem=1),
                OrcamentoItem(titulo="Desenvolvimento", descricao="Site responsivo com reservas", valor=2800, ordem=2),
                OrcamentoItem(titulo="Publicacao", descricao="Hospedagem e configuracao", valor=800, ordem=3),
            ],
        ),
        Orcamento(
            numero="ORC-0002", cliente_id=restaurante.id,
            titulo="Cardapio digital e pedidos", tipo="automacao",
            desconto=0, pagamento="A vista com 5% de desconto",
            prazo="20 dias", validade_dias=15, obs="",
            status="rascunho",
            itens=[
                OrcamentoItem(titulo="Cardapio digital", descricao="Menu online com QR Code", valor=1500, ordem=1),
                OrcamentoItem(titulo="Modulo de pedidos", descricao="Pedidos via WhatsApp", valor=2200, ordem=2),
            ],
        ),
    ]
    db.add_all(orcamentos)

    recorrencias = [
        Recorrencia(cliente_id=otica.id, plano="Manutencao mensal", valor=350, status="ativo"),
        Recorrencia(cliente_id=clinica.id, plano="Hospedagem e suporte", valor=280, status="ativo"),
        Recorrencia(cliente_id=mercado.id, plano="Suporte tecnico", valor=420, status="ativo"),
        Recorrencia(cliente_id=autopecas.id, plano="Manutencao ERP", valor=600, status="pausado"),
    ]
    db.add_all(recorrencias)

    tarefas = [
        Tarefa(texto="Enviar contrato para Auto Pecas Central", done=False),
        Tarefa(texto="Cobrar retorno do orcamento da Pousada Recanto", done=False),
    ]
    db.add_all(tarefas)

    db.commit()
