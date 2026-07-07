from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, computed_field

# Tipos com valores fixos
TipoProjeto = Literal["site", "erp", "automacao", "portal"]
StageProjeto = Literal["lead", "orcamento", "aprovado", "desenvolvimento", "entregue"]
StatusOrcamento = Literal["rascunho", "enviado", "aprovado", "recusado"]
StatusRecorrencia = Literal["ativo", "pausado"]


# ---------- Auth ----------
class Login(BaseModel):
    senha: str


class TokenRead(BaseModel):
    token: str


class MeRead(BaseModel):
    usuario: str


# ---------- Cliente ----------
class ClienteCreate(BaseModel):
    nome: str
    empresa: Optional[str] = None
    contato: Optional[str] = None


class ClienteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    empresa: Optional[str] = None
    contato: Optional[str] = None
    criado: datetime


# ---------- Projeto ----------
class ProjetoCreate(BaseModel):
    cliente_id: int
    tipo: TipoProjeto
    valor: float = 0
    pago: float = 0
    stage: StageProjeto = "lead"
    entrega: Optional[date] = None
    escopo: str = ""


class ProjetoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    tipo: TipoProjeto
    valor: float
    pago: float
    stage: StageProjeto
    entrega: Optional[date] = None
    escopo: str = ""
    criado: datetime
    cliente: Optional[ClienteRead] = None


# ---------- Orcamento ----------
class OrcamentoItemCreate(BaseModel):
    titulo: str
    descricao: str = ""
    valor: float = 0
    ordem: int = 0


class OrcamentoItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    descricao: str = ""
    valor: float
    ordem: int


class OrcamentoCreate(BaseModel):
    cliente_id: int
    titulo: str
    tipo: TipoProjeto
    desconto: float = 0
    pagamento: str = ""
    prazo: str = ""
    validade_dias: int = 15
    obs: str = ""
    status: StatusOrcamento = "rascunho"
    itens: list[OrcamentoItemCreate] = []


class OrcamentoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero: str
    cliente_id: int
    titulo: str
    tipo: TipoProjeto
    desconto: float
    pagamento: str = ""
    prazo: str = ""
    validade_dias: int
    obs: str = ""
    status: StatusOrcamento
    criado: datetime
    cliente: Optional[ClienteRead] = None
    itens: list[OrcamentoItemRead] = []

    @computed_field
    @property
    def total(self) -> float:
        soma = sum(item.valor for item in self.itens)
        return max(soma - self.desconto, 0)


# ---------- Recorrencia ----------
class RecorrenciaCreate(BaseModel):
    cliente_id: int
    plano: str
    valor: float = 0
    status: StatusRecorrencia = "ativo"


class RecorrenciaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    plano: str
    valor: float
    status: StatusRecorrencia
    criado: datetime
    cliente: Optional[ClienteRead] = None


# ---------- Tarefa ----------
class TarefaCreate(BaseModel):
    texto: str
    done: bool = False


class TarefaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    texto: str
    done: bool
    criado: datetime


# ---------- Auxiliares ----------
class StageUpdate(BaseModel):
    stage: StageProjeto


class StatusUpdate(BaseModel):
    status: str


# ---------- Documentos ----------
TipoDocumento = Literal["contrato", "orcamento", "recibo"]


class ModeloDocumentoUpdate(BaseModel):
    titulo: str = ""
    corpo: str = ""


class ModeloDocumentoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo: TipoDocumento
    titulo: str
    corpo: str
    atualizado: Optional[datetime] = None


class DocumentoCreate(BaseModel):
    tipo: TipoDocumento
    numero: Optional[str] = None
    projeto_id: Optional[int] = None
    orcamento_id: Optional[int] = None
    titulo: str = ""
    conteudo: str = ""


class DocumentoUpdate(BaseModel):
    titulo: Optional[str] = None
    conteudo: Optional[str] = None


class DocumentoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo: TipoDocumento
    numero: str
    projeto_id: Optional[int] = None
    orcamento_id: Optional[int] = None
    titulo: str
    conteudo: str
    criado: datetime
    atualizado: Optional[datetime] = None


class ProximoNumero(BaseModel):
    numero: str
