import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import auth
from .cobrancas import garantir_cobrancas
from .config import settings
from .database import SessionLocal
from .migrar import migrar
from .routers import (
    alertas,
    anexos,
    automacao,
    clientes,
    cobrancas,
    dashboard,
    documentos,
    modelos,
    modelos_tarefa,
    notas,
    orcamentos,
    parcelas,
    projetos,
    recorrencias,
    tarefas,
    tarefas_projeto,
    verificacoes,
)
from .verificacoes import garantir_verificacoes
from .seed import (
    run_seed,
    run_seed_checklist,
    run_seed_modelos,
    run_seed_roteiro,
)

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
app.include_router(modelos_tarefa.router, prefix="/api")
app.include_router(verificacoes.router, prefix="/api")
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
    # No Docker o entrypoint ja migrou antes do uvicorn; aqui e a rede de
    # seguranca para o dev local (uvicorn direto). Rodar duas vezes e inocuo.
    try:
        migrar()
    except Exception as erro:  # noqa: BLE001 - o boot nao pode cair por migracao
        logging.getLogger("malvezi.migracoes").error(
            "Falha ao aplicar migracoes no startup: %s", erro
        )
    db = SessionLocal()
    try:
        run_seed(db)
        run_seed_modelos(db)
        run_seed_roteiro(db)
        run_seed_checklist(db)
        garantir_cobrancas(db)
        garantir_verificacoes(db)
    finally:
        db.close()
