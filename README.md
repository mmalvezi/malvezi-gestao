# Malvezi Gestao

Painel de gestao (clientes, projetos, orcamentos, mensalidades, tarefas e dashboard) para a Malvezi.

- **Backend:** FastAPI + SQLAlchemy. SQLite por padrao (desenvolvimento); Postgres via `DATABASE_URL` no Docker.
- **Frontend:** Angular (Fase 2).
- **Deploy:** Docker Compose no VPS (Fase 3 e 4).

O plano completo esta em [plano-malvezi-gestao-angular-fastapi.md](plano-malvezi-gestao-angular-fastapi.md).

## Rodar o backend (Fase 1)

```bash
cd backend
python -m venv venv
source venv/Scripts/activate    # Windows Git Bash
# source venv/bin/activate      # Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Abra http://localhost:8000/docs. Faca `POST /api/login` com `{ "senha": "malvezi" }`,
copie o token no botao **Authorize** (Bearer) e use as rotas protegidas sob `/api`.

Variaveis de ambiente ficam em `backend/.env` (veja `backend/.env.example`).
`GET /api/health` e publica; todo o resto exige token.
