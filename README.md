# Malvezi Gestão

Painel de gestão (clientes, projetos, orçamentos, mensalidades, tarefas e dashboard) para a Malvezi.

- **Backend:** FastAPI + SQLAlchemy. SQLite por padrão (desenvolvimento); Postgres via `DATABASE_URL` no Docker.
- **Frontend:** Angular (build estático servido por nginx no container).
- **Deploy:** Docker Compose (Fase 3), publicação no VPS na Fase 4.

O plano completo está em [plano-malvezi-gestao-angular-fastapi.md](plano-malvezi-gestao-angular-fastapi.md).

Senha padrão de desenvolvimento: `malvezi` (variável `APP_PASSWORD`).

## Rodar em desenvolvimento

Backend (porta 8000):

```bash
cd backend
python -m venv venv
source venv/Scripts/activate    # Windows Git Bash
# source venv/bin/activate      # Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Abra http://localhost:8000/docs para testar a API. `GET /api/health` é pública;
o resto exige token (faça `POST /api/login` com `{ "senha": "malvezi" }`).

Frontend (porta 4200), em outra aba, com o backend rodando:

```bash
cd frontend
npm install
ng serve --proxy-config proxy.conf.json
```

Abra http://localhost:4200. O `proxy.conf.json` encaminha `/api` para o backend
local, então não há CORS em desenvolvimento.

## Rodar tudo com Docker

Empacota frontend (nginx), backend (FastAPI) e banco (Postgres) isolados.

```bash
cp .env.example .env      # defina APP_PASSWORD, SECRET_KEY, DB_PASSWORD e HOST_PORT
docker compose --env-file .env up -d --build
docker compose ps
```

Abra `http://127.0.0.1:8090` (ou a `HOST_PORT` do `.env`). O container `web`
serve o Angular e encaminha `/api` para o `api`. Os dados ficam no volume
`pgdata` do Postgres e sobrevivem a `docker compose down` (sem `-v`).

Comandos úteis:

```bash
docker compose logs -f api      # logs do backend
docker compose down             # para tudo, mantém os dados
docker compose down -v          # para tudo e apaga o volume do banco
```
