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
    pago = Column(Float, default=0)
    # lead | orcamento | aprovado | desenvolvimento | entregue
    stage = Column(String, default="lead")
    entrega = Column(Date, nullable=True)
    escopo = Column(Text, default="")
    criado = Column(DateTime, default=agora)

    cliente = relationship("Cliente", back_populates="projetos")


class Orcamento(Base):
    __tablename__ = "orcamentos"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String, unique=True, nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
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

    cliente = relationship("Cliente", back_populates="orcamentos")
    itens = relationship(
        "OrcamentoItem",
        back_populates="orcamento",
        cascade="all, delete-orphan",
        order_by="OrcamentoItem.ordem",
    )


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
    __tablename__ = "recorrencias"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    plano = Column(String, nullable=False)
    valor = Column(Float, default=0)
    status = Column(String, default="ativo")  # ativo | pausado
    criado = Column(DateTime, default=agora)

    cliente = relationship("Cliente", back_populates="recorrencias")


class Tarefa(Base):
    __tablename__ = "tarefas"

    id = Column(Integer, primary_key=True, index=True)
    texto = Column(String, nullable=False)
    done = Column(Boolean, default=False)
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
