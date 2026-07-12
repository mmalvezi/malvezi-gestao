from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


def agora():
    return datetime.now(timezone.utc)


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    empresa = Column(String, nullable=True)
    contato = Column(String, nullable=True)
    criado = Column(DateTime, default=agora)

    projetos = relationship(
        "Projeto", back_populates="cliente", cascade="all, delete-orphan"
    )
    orcamentos = relationship(
        "Orcamento", back_populates="cliente", cascade="all, delete-orphan"
    )
    recorrencias = relationship(
        "Recorrencia", back_populates="cliente", cascade="all, delete-orphan"
    )


class Projeto(Base):
    __tablename__ = "projetos"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    tipo = Column(String, nullable=False)  # site | erp | automacao | portal
    valor = Column(Float, default=0)
    # Coluna antiga do valor recebido. O recebido agora vem das parcelas; este
    # campo so existe para migrar os projetos antigos (ver migracoes.py).
    pago_legado = Column("pago", Float, default=0)
    # lead | orcamento | aprovado | desenvolvimento | entregue | recusado
    stage = Column(String, default="lead")
    entrega = Column(Date, nullable=True)
    escopo = Column(Text, default="")
    criado = Column(DateTime, default=agora)

    cliente = relationship("Cliente", back_populates="projetos")
    parcelas = relationship(
        "ParcelaProjeto",
        back_populates="projeto",
        cascade="all, delete-orphan",
        order_by="ParcelaProjeto.ordem",
    )
    recorrencias = relationship("Recorrencia", back_populates="projeto")
    tarefas = relationship(
        "TarefaProjeto",
        back_populates="projeto",
        cascade="all, delete-orphan",
        order_by="TarefaProjeto.ordem",
    )

    @property
    def tarefas_total(self) -> int:
        return len(self.tarefas)

    @property
    def tarefas_feitas(self) -> int:
        return sum(1 for t in self.tarefas if t.coluna == "concluido")

    # ----- Recebimentos (derivados das parcelas) -----
    @property
    def pago(self) -> float:
        """Recebido de verdade: soma das parcelas marcadas como pagas."""
        return sum(p.valor or 0 for p in self.parcelas if p.pago)

    @property
    def saldo(self) -> float:
        """Quanto falta receber. Sem parcelas cadastradas, e o valor cheio."""
        return max((self.valor or 0) - self.pago, 0)

    @property
    def parcelas_total(self) -> int:
        return len(self.parcelas)

    @property
    def parcelas_pagas(self) -> int:
        return sum(1 for p in self.parcelas if p.pago)


class ParcelaProjeto(Base):
    """Parcela de recebimento de um projeto. Sempre cadastrada a mao."""

    __tablename__ = "parcelas_projeto"

    id = Column(Integer, primary_key=True, index=True)
    projeto_id = Column(
        Integer, ForeignKey("projetos.id", ondelete="CASCADE"), nullable=False
    )
    descricao = Column(String, nullable=False, default="")
    valor = Column(Float, default=0)
    vencimento = Column(Date, nullable=True)
    pago = Column(Boolean, default=False)
    pago_em = Column(Date, nullable=True)
    ordem = Column(Integer, default=0)
    criado = Column(DateTime, default=agora)

    projeto = relationship("Projeto", back_populates="parcelas")


class TarefaProjeto(Base):
    """Tarefa interna de execucao de um projeto (quadro kanban do projeto).

    Nao confundir com Tarefa, que sao os lembretes soltos do painel.
    """

    __tablename__ = "tarefas_projeto"

    id = Column(Integer, primary_key=True, index=True)
    projeto_id = Column(
        Integer, ForeignKey("projetos.id", ondelete="CASCADE"), nullable=False
    )
    titulo = Column(String, nullable=False)
    descricao = Column(Text, default="")
    # afazer | fazendo | validacao | concluido
    coluna = Column(String, nullable=False, default="afazer")
    prioridade = Column(String, nullable=False, default="media")  # baixa|media|alta
    area = Column(String, nullable=False, default="dev")  # dev|design|produto|cliente
    responsavel = Column(String, nullable=True)
    ordem = Column(Integer, default=0)
    criado = Column(DateTime, default=agora)
    atualizado = Column(DateTime, default=agora, onupdate=agora)

    projeto = relationship("Projeto", back_populates="tarefas")


class Orcamento(Base):
    __tablename__ = "orcamentos"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String, unique=True, nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    # Projeto vinculado: e nele que as parcelas do plano de pagamento nascem
    projeto_id = Column(
        Integer, ForeignKey("projetos.id", ondelete="SET NULL"), nullable=True
    )
    titulo = Column(String, nullable=False)
    tipo = Column(String, nullable=False)
    desconto = Column(Float, default=0)
    pagamento = Column(String, default="")
    prazo = Column(String, default="")
    validade_dias = Column(Integer, default=15)
    obs = Column(Text, default="")
    # rascunho | enviado | aprovado | recusado
    status = Column(String, default="rascunho")
    criado = Column(DateTime, default=agora)
    # Controle do plano de pagamento: quando as parcelas foram geradas no
    # projeto e quando o plano mudou pela ultima vez (para avisar se divergiu)
    plano_gerado_em = Column(DateTime, nullable=True)
    plano_atualizado_em = Column(DateTime, nullable=True)

    cliente = relationship("Cliente", back_populates="orcamentos")
    projeto = relationship("Projeto")
    itens = relationship(
        "OrcamentoItem",
        back_populates="orcamento",
        cascade="all, delete-orphan",
        order_by="OrcamentoItem.ordem",
    )
    plano = relationship(
        "ParcelaOrcamento",
        back_populates="orcamento",
        cascade="all, delete-orphan",
        order_by="ParcelaOrcamento.ordem",
    )

    @property
    def total(self) -> float:
        soma = sum(item.valor or 0 for item in self.itens)
        return max(soma - (self.desconto or 0), 0)
    # Proposta em PDF anexada: no maximo uma por orcamento
    anexo = relationship(
        "AnexoOrcamento",
        back_populates="orcamento",
        cascade="all, delete-orphan",
        uselist=False,
    )

    @property
    def tem_anexo(self) -> bool:
        return self.anexo is not None

    @property
    def anexo_nome(self):
        return self.anexo.nome_original if self.anexo else None

    @property
    def anexo_tamanho(self):
        return self.anexo.tamanho if self.anexo else None

    @property
    def anexo_criado(self):
        return self.anexo.criado if self.anexo else None


class AnexoOrcamento(Base):
    """Proposta em PDF anexada ao orcamento (o arquivo fica em disco)."""

    __tablename__ = "anexos_orcamento"

    id = Column(Integer, primary_key=True, index=True)
    orcamento_id = Column(
        Integer, ForeignKey("orcamentos.id", ondelete="CASCADE"), nullable=False
    )
    nome_original = Column(String, nullable=False)
    nome_arquivo = Column(String, nullable=False)  # nome gerado, unico, em disco
    tamanho = Column(Integer, default=0)  # bytes
    criado = Column(DateTime, default=agora)

    orcamento = relationship("Orcamento", back_populates="anexo")


class ParcelaOrcamento(Base):
    """Parcela do PLANO de pagamento do orcamento (a condicao combinada).

    Nao e o recebimento em si: quando o orcamento e aprovado, o plano vira
    ParcelaProjeto no projeto vinculado, e la sim se controla o que foi pago.
    """

    __tablename__ = "parcelas_orcamento"

    id = Column(Integer, primary_key=True, index=True)
    orcamento_id = Column(
        Integer, ForeignKey("orcamentos.id", ondelete="CASCADE"), nullable=False
    )
    descricao = Column(String, nullable=False, default="")
    tipo_valor = Column(String, nullable=False, default="percentual")  # percentual|fixo
    percentual = Column(Float, nullable=True)
    valor_fixo = Column(Float, nullable=True)
    tipo_vencimento = Column(String, nullable=False, default="marco")  # marco|dias
    marco = Column(String, nullable=True)  # aprovacao | entrega
    dias = Column(Integer, nullable=True)  # dias corridos apos a aprovacao
    ordem = Column(Integer, default=0)

    orcamento = relationship("Orcamento", back_populates="plano")


class OrcamentoItem(Base):
    __tablename__ = "orcamento_itens"

    id = Column(Integer, primary_key=True, index=True)
    orcamento_id = Column(
        Integer, ForeignKey("orcamentos.id", ondelete="CASCADE"), nullable=False
    )
    titulo = Column(String, nullable=False)
    descricao = Column(Text, default="")
    valor = Column(Float, default=0)
    ordem = Column(Integer, default=0)

    orcamento = relationship("Orcamento", back_populates="itens")


class Recorrencia(Base):
    """Mensalidade. Pode nascer vinculada a um projeto e so passa a valer
    (status ativo) quando aquele projeto e entregue."""

    __tablename__ = "recorrencias"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    projeto_id = Column(
        Integer, ForeignKey("projetos.id", ondelete="SET NULL"), nullable=True
    )
    plano = Column(String, nullable=False)
    valor = Column(Float, default=0)
    status = Column(String, default="ativo")  # previsto | ativo | pausado
    dia_vencimento = Column(Integer, default=10)  # 1 a 28
    inicio = Column(Date, nullable=True)
    contato = Column(String, nullable=True)  # WhatsApp ou e-mail da cobranca
    criado = Column(DateTime, default=agora)

    cliente = relationship("Cliente", back_populates="recorrencias")
    projeto = relationship("Projeto", back_populates="recorrencias")
    cobrancas = relationship(
        "CobrancaMensalidade",
        back_populates="recorrencia",
        cascade="all, delete-orphan",
        order_by="CobrancaMensalidade.vencimento",
    )


class CobrancaMensalidade(Base):
    """Cobranca de um mes (competencia) de uma mensalidade.

    O valor e copiado da mensalidade no momento da geracao: se o valor mudar
    depois, as cobrancas ja geradas mantem o que foi cobrado.
    """

    __tablename__ = "cobrancas_mensalidade"
    __table_args__ = (
        UniqueConstraint(
            "recorrencia_id", "competencia", name="uq_cobranca_recorrencia_competencia"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    recorrencia_id = Column(
        Integer, ForeignKey("recorrencias.id", ondelete="CASCADE"), nullable=False
    )
    competencia = Column(String, nullable=False)  # AAAA-MM
    vencimento = Column(Date, nullable=False)
    valor = Column(Float, default=0)
    status = Column(String, nullable=False, default="aberta")  # aberta|paga|cancelada
    pago_em = Column(Date, nullable=True)
    notificado_em = Column(DateTime, nullable=True)  # a automacao marca aqui
    criado = Column(DateTime, default=agora)

    recorrencia = relationship("Recorrencia", back_populates="cobrancas")


class Tarefa(Base):
    __tablename__ = "tarefas"

    id = Column(Integer, primary_key=True, index=True)
    texto = Column(String, nullable=False)
    done = Column(Boolean, default=False)
    criado = Column(DateTime, default=agora)


class AlertaDispensado(Base):
    __tablename__ = "alertas_dispensados"

    id = Column(Integer, primary_key=True, index=True)
    chave = Column(String, unique=True, nullable=False)  # {tipo}:{id}:{motivo}
    criado = Column(DateTime, default=agora)


class NotaProjeto(Base):
    __tablename__ = "notas_projeto"

    id = Column(Integer, primary_key=True, index=True)
    projeto_id = Column(
        Integer, ForeignKey("projetos.id", ondelete="CASCADE"), nullable=False
    )
    texto = Column(Text, nullable=False)
    criado = Column(DateTime, default=agora)


class ModeloDocumento(Base):
    __tablename__ = "modelos_documento"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String, unique=True, nullable=False)  # contrato | orcamento | recibo
    titulo = Column(String, nullable=False, default="")
    corpo = Column(Text, nullable=False, default="")  # HTML com marcadores
    atualizado = Column(DateTime, default=agora, onupdate=agora)


class Documento(Base):
    __tablename__ = "documentos"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String, nullable=False)  # contrato | orcamento | recibo
    numero = Column(String, nullable=False, default="")
    projeto_id = Column(
        Integer, ForeignKey("projetos.id", ondelete="CASCADE"), nullable=True
    )
    orcamento_id = Column(
        Integer, ForeignKey("orcamentos.id", ondelete="CASCADE"), nullable=True
    )
    titulo = Column(String, nullable=False, default="")
    conteudo = Column(Text, nullable=False, default="")  # HTML final ja editado
    criado = Column(DateTime, default=agora)
    atualizado = Column(DateTime, default=agora, onupdate=agora)
