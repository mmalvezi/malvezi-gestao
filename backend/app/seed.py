from datetime import date, timedelta

from sqlalchemy.orm import Session

from .models import (
    Cliente,
    ModeloDocumento,
    ModeloTarefa,
    ModeloVerificacao,
    Orcamento,
    OrcamentoItem,
    Projeto,
    Recorrencia,
    Tarefa,
)

TIPOS_PROJETO = ["site", "erp", "automacao", "portal"]


def run_seed(db: Session):
    # So popula se nao houver nenhum cliente. Nunca sobrescreve dados reais.
    if db.query(Cliente).first():
        return

    hoje = date.today()

    clientes = [
        Cliente(nome="Ótica Visão Clara", empresa="Ótica Visão Clara ME", contato="contato@visaoclara.com.br"),
        Cliente(nome="Mercado São Jorge", empresa="Mercado São Jorge Ltda", contato="(11) 90000-0001"),
        Cliente(nome="Auto Peças Central", empresa="Auto Peças Central", contato="vendas@apcentral.com.br"),
        Cliente(nome="Restaurante Sabor Caseiro", empresa=None, contato="(11) 90000-0002"),
        Cliente(nome="Clínica Bem Estar", empresa="Clínica Bem Estar", contato="recepcao@bemestar.com.br"),
        Cliente(nome="Pousada Recanto", empresa="Pousada Recanto", contato="reservas@recanto.com.br"),
        Cliente(nome="Transportadora Rota Certa", empresa="Rota Certa Logística", contato="(11) 90000-0003"),
    ]
    db.add_all(clientes)
    db.flush()  # garante ids

    (otica, mercado, autopecas, restaurante, clinica, pousada, transportadora) = clientes

    projetos = [
        Projeto(
            cliente_id=otica.id, tipo="site", valor=4500, pago_legado=4500,
            stage="entregue", entrega=hoje - timedelta(days=20),
            escopo="Site institucional com catálogo de armações.",
        ),
        Projeto(
            cliente_id=mercado.id, tipo="automacao", valor=6800, pago_legado=3400,
            stage="desenvolvimento", entrega=hoje + timedelta(days=10),
            escopo="Automação de pedidos e controle de estoque.",
        ),
        Projeto(
            cliente_id=autopecas.id, tipo="erp", valor=12000, pago_legado=0,
            stage="aprovado", entrega=hoje + timedelta(days=30),
            escopo="ERP de peças com integração fiscal.",
        ),
        Projeto(
            cliente_id=clinica.id, tipo="portal", valor=8200, pago_legado=2000,
            stage="desenvolvimento", entrega=hoje + timedelta(days=5),
            escopo="Portal de agendamento de consultas.",
        ),
        Projeto(
            cliente_id=pousada.id, tipo="site", valor=5200, pago_legado=0,
            stage="orcamento", entrega=None,
            escopo="Site com reservas e galeria de fotos.",
        ),
        Projeto(
            cliente_id=transportadora.id, tipo="automacao", valor=9500, pago_legado=0,
            stage="lead", entrega=None,
            escopo="Rastreamento de cargas e relatórios.",
        ),
    ]
    db.add_all(projetos)

    orcamentos = [
        Orcamento(
            numero="ORC-0001", cliente_id=pousada.id,
            titulo="Site institucional com reservas", tipo="site",
            desconto=200, pagamento="50% de entrada, 50% na entrega",
            prazo="30 dias", validade_dias=15, obs="Inclui domínio no primeiro ano.",
            status="enviado",
            itens=[
                OrcamentoItem(titulo="Layout e identidade", descricao="Design das páginas principais", valor=1800, ordem=1),
                OrcamentoItem(titulo="Desenvolvimento", descricao="Site responsivo com reservas", valor=2800, ordem=2),
                OrcamentoItem(titulo="Publicação", descricao="Hospedagem e configuração", valor=800, ordem=3),
            ],
        ),
        Orcamento(
            numero="ORC-0002", cliente_id=restaurante.id,
            titulo="Cardápio digital e pedidos", tipo="automacao",
            desconto=0, pagamento="À vista com 5% de desconto",
            prazo="20 dias", validade_dias=15, obs="",
            status="rascunho",
            itens=[
                OrcamentoItem(titulo="Cardápio digital", descricao="Menu online com QR Code", valor=1500, ordem=1),
                OrcamentoItem(titulo="Módulo de pedidos", descricao="Pedidos via WhatsApp", valor=2200, ordem=2),
            ],
        ),
    ]
    db.add_all(orcamentos)

    inicio = hoje - timedelta(days=60)
    recorrencias = [
        Recorrencia(
            cliente_id=otica.id, plano="Suporte e manutenção do sistema", valor=350,
            status="ativo", dia_vencimento=10, inicio=inicio, contato=otica.contato,
        ),
        Recorrencia(
            cliente_id=clinica.id, plano="Hospedagem, suporte e pequenas evoluções",
            valor=280, status="ativo", dia_vencimento=5, inicio=inicio,
            contato=clinica.contato,
        ),
        Recorrencia(
            cliente_id=mercado.id, plano="Suporte técnico", valor=420,
            status="ativo", dia_vencimento=20, inicio=inicio, contato=mercado.contato,
        ),
        Recorrencia(
            cliente_id=autopecas.id, plano="Manutenção do ERP", valor=600,
            status="pausado", dia_vencimento=15, contato=autopecas.contato,
        ),
    ]
    db.add_all(recorrencias)

    tarefas = [
        Tarefa(texto="Enviar contrato para Auto Peças Central", done=False),
        Tarefa(texto="Cobrar retorno do orçamento da Pousada Recanto", done=False),
    ]
    db.add_all(tarefas)

    db.commit()


CORPO_CONTRATO = """
<p>Pelo presente instrumento, de um lado <b>Malvezi Sistemas e Automação</b>
(Contratada) e, de outro lado, <b>{{cliente}}</b> {{empresa}} (Contratante),
ajustam a prestação de serviços descrita abaixo.</p>

<div class="clausula"><b>Cláusula 1. Objeto.</b> A Contratada prestará serviço de
{{tipo}} conforme o escopo: {{escopo}}.</div>

<div class="clausula"><b>Cláusula 2. Valor e pagamento.</b> O valor total do
serviço é de {{valor}}. Forma de pagamento: {{pagamento}}.</div>

<div class="clausula"><b>Cláusula 3. Prazo.</b> A entrega está prevista para
{{entrega}}. Prazo combinado: {{prazo}}.</div>

<div class="clausula"><b>Cláusula 4. Responsabilidades.</b> A Contratada
compromete-se a executar o serviço com qualidade técnica. A Contratante
compromete-se a fornecer as informações e os acessos necessários no tempo
adequado.</div>

<div class="clausula"><b>Cláusula 5. Suporte e garantia.</b> Após a entrega, a
Contratada oferece 30 dias de garantia para correção de falhas relacionadas ao
escopo entregue.</div>

<div class="clausula"><b>Cláusula 6. Vigência.</b> Este contrato vigora a partir
da assinatura até a conclusão do objeto e o cumprimento das obrigações de ambas
as partes. Fica eleito o foro da {{foro}} para tratar de qualquer questão,
estando a Contratada sediada em {{cidade_sede}}.</div>

<div class="assinaturas">
  <div class="assinatura">Malvezi Sistemas e Automação<br><span class="mut">Contratada</span></div>
  <div class="assinatura">{{cliente}}<br><span class="mut">Contratante</span></div>
</div>
""".strip()

def run_seed_modelos(db: Session):
    # Apenas o contrato usa modelo editavel. Orcamento e recibo sao automaticos,
    # entao removemos modelos antigos desses tipos se existirem.
    antigos = (
        db.query(ModeloDocumento)
        .filter(ModeloDocumento.tipo.in_(["orcamento", "recibo"]))
        .all()
    )
    for m in antigos:
        db.delete(m)
    if antigos:
        db.commit()

    # Cria o modelo padrao de contrato se ainda nao existir.
    existe = (
        db.query(ModeloDocumento)
        .filter(ModeloDocumento.tipo == "contrato")
        .first()
    )
    if not existe:
        db.add(
            ModeloDocumento(
                tipo="contrato",
                titulo="Contrato de prestação de serviços",
                corpo=CORPO_CONTRATO,
            )
        )
        db.commit()


# ---------------------------------------------------------------------------
# Roteiro padrao de tarefas por tipo de projeto (ajustavel em Configuracoes)
# (stage, titulo, area, prioridade, dias_prazo)
_ROTEIRO_COMUM = [
    ("orcamento", "Levantamento de requisitos", "cliente", "alta", 3),
    ("orcamento", "Montar escopo e orçamento", "produto", "media", 3),
    ("orcamento", "Enviar proposta ao cliente", "cliente", "media", 2),
    ("aprovado", "Reunião de kickoff com o cliente", "cliente", "alta", 5),
    ("aprovado", "Cobrar entrada", "produto", "alta", 3),
    ("aprovado", "Assinar contrato", "cliente", "media", 5),
    ("aprovado", "Montar cronograma", "produto", "media", 5),
    ("entregue", "Entregar acessos e documentação", "cliente", "media", 5),
    ("entregue", "Ativar mensalidade e combinar suporte", "produto", "media", 5),
]

_ROTEIRO_DESENVOLVIMENTO = {
    "erp": [
        ("Modelar banco de dados", "dev"),
        ("Cadastros básicos", "dev"),
        ("Telas principais", "dev"),
        ("Importação de dados do sistema antigo", "dev"),
        ("Testes com o cliente", "cliente"),
        ("Treinamento da equipe", "cliente"),
    ],
    "site": [
        ("Coletar textos e imagens do cliente", "cliente"),
        ("Layout das páginas", "design"),
        ("Desenvolvimento", "dev"),
        ("SEO e publicação", "dev"),
        ("Revisão com o cliente", "cliente"),
    ],
    "automacao": [
        ("Mapear o processo atual", "produto"),
        ("Desenvolver a automação", "dev"),
        ("Testes com dados reais", "dev"),
        ("Acompanhar primeira semana", "cliente"),
    ],
    "portal": [
        ("Desenho das telas", "design"),
        ("Login e permissões", "dev"),
        ("Módulos principais", "dev"),
        ("Treinamento", "cliente"),
    ],
}


def run_seed_roteiro(db: Session):
    """Modelos de tarefas padrao. So roda com a tabela vazia: nunca
    sobrescreve ajustes feitos em Configuracoes."""
    if db.query(ModeloTarefa).first():
        return
    for tipo in TIPOS_PROJETO:
        ordem_grupo: dict[str, int] = {}
        for stage, titulo, area, prioridade, dias in _ROTEIRO_COMUM:
            db.add(ModeloTarefa(
                tipo_projeto=tipo, stage_gatilho=stage, titulo=titulo,
                area=area, prioridade=prioridade, dias_prazo=dias,
                ordem=ordem_grupo.get(stage, 0), ativo=True,
            ))
            ordem_grupo[stage] = ordem_grupo.get(stage, 0) + 1
        for i, (titulo, area) in enumerate(_ROTEIRO_DESENVOLVIMENTO[tipo]):
            db.add(ModeloTarefa(
                tipo_projeto=tipo, stage_gatilho="desenvolvimento",
                titulo=titulo, area=area, prioridade="media",
                ordem=i, ativo=True,
            ))
    db.commit()


# Checklist mensal padrao dos projetos entregues, por tipo
_CHECKLIST_COMUM = [
    "Sistema está no ar e acessível",
    "Backup em dia",
    "Sem erros críticos reportados",
    "Cliente sem reclamações pendentes",
    "Mensalidade em dia",
]

_CHECKLIST_EXTRA = {
    "erp": [
        "Banco de dados saudável (espaço e desempenho)",
        "Integrações funcionando",
    ],
    "portal": [
        "Banco de dados saudável (espaço e desempenho)",
        "Integrações funcionando",
    ],
    "site": [
        "Certificado HTTPS válido",
        "Formulário e WhatsApp funcionando",
        "Domínio não vence nos próximos 30 dias",
    ],
    "automacao": [
        "Rotina executou sem falhas no último mês",
        "Logs sem erros",
    ],
}


def run_seed_checklist(db: Session):
    """Itens padrao do checklist de verificacao mensal. So com a tabela vazia."""
    if db.query(ModeloVerificacao).first():
        return
    for tipo in TIPOS_PROJETO:
        itens = _CHECKLIST_COMUM + _CHECKLIST_EXTRA.get(tipo, [])
        for i, titulo in enumerate(itens):
            db.add(ModeloVerificacao(
                tipo_projeto=tipo, titulo=titulo, ordem=i, ativo=True,
            ))
    db.commit()
