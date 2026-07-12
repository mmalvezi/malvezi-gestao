from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import auth
from .cobrancas import garantir_cobrancas
from .config import settings
from .database import Base, SessionLocal, engine
from .migracoes import rodar_migracoes
from .routers import (
    alertas,
    anexos,
    automacao,
    clientes,
    cobrancas,
    dashboard,
    documentos,
    modelos,
    notas,
    orcamentos,
    parcelas,
    projetos,
    recorrencias,
    tarefas,
    tarefas_projeto,
)
from .seed import run_seed, run_seed_modelos

# Cria as tabelas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Malvezi Gestão")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas de autenticacao e dados, todas sob /api
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(clientes.router, prefix="/api")
app.include_router(projetos.router, prefix="/api")
app.include_router(parcelas.router, prefix="/api")
app.include_router(orcamentos.router, prefix="/api")
app.include_router(anexos.router, prefix="/api")
app.include_router(recorrencias.router, prefix="/api")
app.include_router(cobrancas.router, prefix="/api")
app.include_router(tarefas.router, prefix="/api")
app.include_router(tarefas_projeto.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(modelos.router, prefix="/api")
app.include_router(documentos.router, prefix="/api")
app.include_router(notas.router, prefix="/api")
app.include_router(alertas.router, prefix="/api")
# Automacao (n8n): autenticada por chave de API, nao pelo login
app.include_router(automacao.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"ok": True}


@app.on_event("startup")
def _preparar():
    db = SessionLocal()
    try:
        run_seed(db)
        run_seed_modelos(db)
        rodar_migracoes(db)
        garantir_cobrancas(db)
    finally:
        db.close()
