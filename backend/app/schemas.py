from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field

# Tipos com valores fixos
TipoProjeto = Literal["site", "erp", "automacao", "portal"]
StageProjeto = Literal[
    "lead", "orcamento", "aprovado", "desenvolvimento", "entregue", "recusado"
]
StatusOrcamento = Literal["rascunho", "enviado", "aprovado", "recusado"]
StatusRecorrencia = Literal["previsto", "ativo", "pausado"]
StatusCobranca = Literal["aberta", "paga", "cancelada"]
TipoValorParcela = Literal["percentual", "fixo"]
TipoVencimentoParcela = Literal["marco", "dias"]
MarcoParcela = Literal["aprovacao", "entrega"]
ColunaTarefa = Literal["afazer", "fazendo", "validacao", "concluido"]
PrioridadeTarefa = Literal["baixa", "media", "alta"]
AreaTarefa = Literal["dev", "design", "produto", "cliente"]


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
    stage: StageProjeto = "lead"
    entrega: Optional[date] = None
    escopo: str = ""


class ProjetoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    tipo: TipoProjeto
    valor: float
    stage: StageProjeto
    entrega: Optional[date] = None
    # Tolerante a NULL (linhas inseridas a mao direto no banco)
    escopo: Optional[str] = ""
    criado: datetime
    cliente: Optional[ClienteRead] = None
    # Recebimentos: derivados das parcelas
    pago: float = 0
    saldo: float = 0
    parcelas_total: int = 0
    parcelas_pagas: int = 0
    # Progresso do quadro de tarefas do projeto
    tarefas_total: int = 0
    tarefas_feitas: int = 0


# ---------- Parcelas do projeto ----------
class ParcelaCreate(BaseModel):
    descricao: str = ""
    valor: float = 0
    vencimento: Optional[date] = None
    pago: bool = False
    pago_em: Optional[date] = None


class ParcelaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    projeto_id: int
    descricao: str = ""
    valor: float
    vencimento: Optional[date] = None
    pago: bool
    pago_em: Optional[date] = None
    ordem: int


# ---------- Tarefa do projeto (quadro kanban interno) ----------
class TarefaProjetoCreate(BaseModel):
    titulo: str
    descricao: str = ""
    coluna: ColunaTarefa = "afazer"
    prioridade: PrioridadeTarefa = "media"
    area: AreaTarefa = "dev"
    responsavel: Optional[str] = None
    prazo: Optional[date] = None


class TarefaProjetoUpdate(BaseModel):
    titulo: str
    descricao: str = ""
    prioridade: PrioridadeTarefa = "media"
    area: AreaTarefa = "dev"
    responsavel: Optional[str] = None
    prazo: Optional[date] = None


class TarefaProjetoColunaUpdate(BaseModel):
    coluna: ColunaTarefa
    ordem: Optional[int] = None


class TarefaProjetoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    projeto_id: int
    titulo: str
    descricao: str = ""
    coluna: ColunaTarefa
    prioridade: PrioridadeTarefa
    area: AreaTarefa
    responsavel: Optional[str] = None
    prazo: Optional[date] = None
    modelo_id: Optional[int] = None
    ordem: int
    criado: datetime
    atualizado: Optional[datetime] = None


# ---------- Modelos de tarefas (roteiro por tipo de projeto) ----------
class ModeloTarefaCreate(BaseModel):
    tipo_projeto: TipoProjeto
    stage_gatilho: Literal[
        "lead", "orcamento", "aprovado", "desenvolvimento", "entregue"
    ]
    titulo: str
    descricao: str = ""
    area: AreaTarefa = "dev"
    prioridade: PrioridadeTarefa = "media"
    responsavel_padrao: Optional[str] = None
    coluna_inicial: ColunaTarefa = "afazer"
    dias_prazo: Optional[int] = Field(None, ge=0, le=365)
    ordem: int = 0
    ativo: bool = True


class ModeloTarefaRead(ModeloTarefaCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


class ReordenarInput(BaseModel):
    ids: list[int]


class DuplicarModelosInput(BaseModel):
    de: TipoProjeto
    para: TipoProjeto


# ---------- Checklist de verificacao mensal ----------
class ModeloVerificacaoCreate(BaseModel):
    tipo_projeto: TipoProjeto
    titulo: str
    ordem: int = 0
    ativo: bool = True


class ModeloVerificacaoRead(ModeloVerificacaoCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


class ItemVerificacaoUpdate(BaseModel):
    ok: bool
    observacao: str = ""


class ItemVerificacaoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    ok: bool
    observacao: str = ""
    ordem: int = 0


class VerificacaoConcluir(BaseModel):
    observacoes: str = ""


class VerificacaoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    projeto_id: int
    competencia: str
    status: Literal["aberta", "concluida"]
    criado: datetime
    concluida_em: Optional[date] = None
    observacoes: str = ""
    itens: list[ItemVerificacaoRead] = []
    # Apoio para as telas
    cliente: Optional[str] = None
    tipo_projeto: Optional[str] = None


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


# ---------- Plano de pagamento do orcamento ----------
class ParcelaOrcamentoCreate(BaseModel):
    descricao: str = ""
    tipo_valor: TipoValorParcela = "percentual"
    percentual: Optional[float] = None
    valor_fixo: Optional[float] = None
    tipo_vencimento: TipoVencimentoParcela = "marco"
    marco: Optional[MarcoParcela] = None
    dias: Optional[int] = None
    ordem: int = 0


class ParcelaOrcamentoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    descricao: str = ""
    tipo_valor: TipoValorParcela
    percentual: Optional[float] = None
    valor_fixo: Optional[float] = None
    tipo_vencimento: TipoVencimentoParcela
    marco: Optional[MarcoParcela] = None
    dias: Optional[int] = None
    ordem: int = 0


class PlanoInfo(BaseModel):
    """Situacao do plano de pagamento visto pelo projeto."""

    tem_plano: bool = False
    orcamento_id: Optional[int] = None
    orcamento_numero: Optional[str] = None
    gerado: bool = False
    plano_mudou: bool = False


class OrcamentoCreate(BaseModel):
    cliente_id: int
    projeto_id: Optional[int] = None
    titulo: str
    tipo: TipoProjeto
    desconto: float = 0
    pagamento: str = ""
    prazo: str = ""
    validade_dias: int = 15
    obs: str = ""
    status: StatusOrcamento = "rascunho"
    itens: list[OrcamentoItemCreate] = []
    plano: list[ParcelaOrcamentoCreate] = []


class OrcamentoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero: str
    cliente_id: int
    projeto_id: Optional[int] = None
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
    plano: list[ParcelaOrcamentoRead] = []
    # Proposta em PDF anexada (o front sabe sem outra chamada)
    tem_anexo: bool = False
    anexo_nome: Optional[str] = None
    anexo_tamanho: Optional[int] = None
    anexo_criado: Optional[datetime] = None

    @computed_field
    @property
    def total(self) -> float:
        soma = sum(item.valor for item in self.itens)
        return max(soma - self.desconto, 0)


# ---------- Recorrencia (mensalidade) ----------
class RecorrenciaCreate(BaseModel):
    cliente_id: int
    projeto_id: Optional[int] = None
    plano: str
    valor: float = 0
    status: StatusRecorrencia = "ativo"
    dia_vencimento: int = Field(10, ge=1, le=28)
    inicio: Optional[date] = None
    contato: Optional[str] = None


class RecorrenciaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    projeto_id: Optional[int] = None
    plano: str
    valor: float
    status: StatusRecorrencia
    dia_vencimento: int = 10
    inicio: Optional[date] = None
    contato: Optional[str] = None
    criado: datetime
    cliente: Optional[ClienteRead] = None


# ---------- Cobrancas da mensalidade ----------
class CobrancaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recorrencia_id: int
    competencia: str
    vencimento: date
    valor: float
    status: StatusCobranca
    pago_em: Optional[date] = None
    notificado_em: Optional[datetime] = None
    # Dados de apoio para a tela, sem outra chamada
    cliente: Optional[str] = None
    plano: Optional[str] = None
    contato: Optional[str] = None


class CobrancaAutomacao(BaseModel):
    """Payload enxuto para o n8n: so o necessario para cobrar."""

    id: int
    cliente: str
    contato: Optional[str] = None
    valor: float
    vencimento: date
    competencia: str
    plano: str
    notificado_em: Optional[datetime] = None


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


# ---------- Alertas dispensados ----------
class DispensarInput(BaseModel):
    chave: str


# ---------- Notas do projeto ----------
class NotaProjetoCreate(BaseModel):
    titulo: str = ""
    texto: str


class NotaProjetoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    projeto_id: int
    titulo: str = ""
    texto: str
    criado: datetime
