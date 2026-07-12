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

Os anexos de proposta em PDF ficam no volume `uploads`, também preservado entre
deploys.

## Migrações do banco (Alembic)

O schema é versionado pelo Alembic (`backend/alembic`). No Docker, o
`entrypoint.sh` roda `python -m app.migrar` antes do uvicorn: todo deploy
aplica as migrações pendentes sozinho. No desenvolvimento local, o próprio
startup do app faz o mesmo, então basta rodar o uvicorn normalmente.

Bancos criados antes do Alembic (como o de produção) são adotados
automaticamente no primeiro boot: o `app/migrar.py` completa tabelas e colunas
que faltarem, com os tipos certos de cada banco (`TIMESTAMP` no Postgres,
`DATETIME` no SQLite), e marca o banco como atualizado (`stamp head`). Cada
ajuste roda isolado: uma coluna com problema é logada e não derruba o boot.

Para criar uma migração nova depois de mexer nos models:

```bash
cd backend
alembic revision --autogenerate -m "descricao da mudanca"
alembic upgrade head
```

## Automação (n8n)

As cobranças mensais das mensalidades ativas são geradas sozinhas (competência,
vencimento e valor congelado). Para um robô cobrar por WhatsApp ou e-mail, a API
expõe um punhado de endpoints protegidos por **chave de API**, separados do
login por senha do painel.

### Configurar a chave

Defina `API_KEY` no `.env` (o `docker-compose.yml` já repassa a variável para o
container `api`):

```
API_KEY=chave-longa-e-aleatoria-para-o-n8n
```

A chave vai no header `X-API-Key` e libera **somente** as rotas
`/api/automacao/*`. Ela não dá acesso a nenhum outro endpoint do sistema. Sem a
chave correta, a resposta é `401`.

### Endpoints

| Método | Rota | Para que serve |
|---|---|---|
| GET | `/api/automacao/health` | Testar se a chave está valendo |
| GET | `/api/automacao/cobrancas-a-vencer?dias=3` | Cobranças em aberto que vencem nos próximos N dias (padrão 3) |
| GET | `/api/automacao/cobrancas-vencidas` | Cobranças em aberto já fora do prazo |
| POST | `/api/automacao/cobrancas/{id}/notificado` | Marca `notificado_em` para não avisar duas vezes |

As listas devolvem só o necessário para cobrar: `id`, `cliente`, `contato`,
`valor`, `vencimento`, `competencia`, `plano` e `notificado_em`.

```bash
curl -H "X-API-Key: $API_KEY" \
  "http://localhost:8000/api/automacao/cobrancas-a-vencer?dias=3"
```

### Exemplo de fluxo no n8n

1. **Schedule Trigger**: todo dia às 9h.
2. **HTTP Request**: `GET /api/automacao/cobrancas-a-vencer?dias=3` com o header
   `X-API-Key`.
3. **Filter**: descarta os itens que já têm `notificado_em` preenchido.
4. **Envio**: monta a mensagem com `cliente`, `valor`, `vencimento` e dispara
   para o `contato` (WhatsApp ou e-mail).
5. **HTTP Request**: `POST /api/automacao/cobrancas/{{ $json.id }}/notificado`,
   para o mesmo cliente não ser cobrado de novo no dia seguinte.

Um segundo fluxo igual, apontando para `cobrancas-vencidas`, cobre os atrasados.
