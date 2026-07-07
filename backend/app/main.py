from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import auth
from .config import settings
from .database import Base, SessionLocal, engine
from .routers import (
    clientes,
    dashboard,
    orcamentos,
    projetos,
    recorrencias,
    tarefas,
)
from .seed import run_seed

# Cria as tabelas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Malvezi Gestao")

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
app.include_router(orcamentos.router, prefix="/api")
app.include_router(recorrencias.router, prefix="/api")
app.include_router(tarefas.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"ok": True}


@app.on_event("startup")
def _seed_inicial():
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()
