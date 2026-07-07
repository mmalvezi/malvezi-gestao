# Malvezi Gestao, Plano de execucao (Angular + FastAPI + Docker)

Documento para construir no Claude Code, fase por fase, e publicar no mesmo VPS da EPR Moreira sem conflito. Cada fase tem um objetivo, o que pedir ao Claude Code e um criterio de "pronto" antes de seguir.

Idioma do produto: pt-BR, sem travessoes. Identidade: roxo `#6E4BFF` a azul `#2E86FF`, fontes Space Grotesk (titulos) e Inter (texto), simbolo dos tres blocos em escada. A referencia visual e o painel HTML que ja temos (`malvezi-controle.html`); o app Angular reproduz as mesmas telas e o mesmo documento de orcamento/contrato/recibo.

---

## Decisoes de arquitetura (e por que evitam os problemas do Everton e do Dirceu)

- **Front:** Angular (build estatico servido por nginx dentro do container).
- **Back:** FastAPI + SQLAlchemy + PostgreSQL.
- **Empacotamento:** Docker Compose. Um projeto compose isolado, com nome proprio, rede propria, volume proprio e porta propria.
- **Exposicao:** o container publica so em `127.0.0.1:PORTA`. O nginx do host (o mesmo que ja serve a EPR) apenas faz proxy do subdominio `gestao.malvezi.com.br` para essa porta. HTTPS pelo certbot do host.
- **Senha:** uma senha unica (login a token JWT). Sem cadastro de usuarios.

Por que isso resolve o historico de dor:
1. **Conflito de porta:** a porta e escolhida depois de checar o que esta livre e o container escuta so no localhost. Nada de brigar por 80/8000/3000.
2. **nginx pisando no outro:** criamos um arquivo novo em `sites-available`, so do subdominio. Nunca editamos os blocos da EPR. Sempre `nginx -t` antes de recarregar.
3. **Versao de runtime:** Python e Node ficam dentro dos containers, nas versoes certas. Nao dependem do que esta instalado no host nem afetam a EPR.
4. **Banco misturado:** Postgres proprio, em container e volume dedicados. Nao encosta em banco algum da EPR.
5. **Reprodutivel:** se der ruim, `docker compose down` e sobe de novo, igual. Nada fica "sujo" no host.

---

## Estrutura do repositorio

```
malvezi-gestao/
  backend/
    app/
      main.py            # cria app, CORS, inclui routers, cria tabelas, seed inicial
      config.py          # le variaveis de ambiente (.env)
      database.py        # engine + SessionLocal + Base
      models.py          # tabelas SQLAlchemy
      schemas.py         # modelos Pydantic (entrada/saida)
      auth.py            # senha unica -> JWT + dependencia get_current_user
      routers/
        clientes.py
        projetos.py
        orcamentos.py
        recorrencias.py
        tarefas.py
        dashboard.py
      seed.py            # dados de exemplo (clientes ficticios) so se o banco estiver vazio
    requirements.txt
    Dockerfile
  frontend/
    src/
      app/
        core/            # AuthService, ApiService, guard, interceptor, models
        layout/          # sidebar + topbar + BrandMark
        features/
          login/
          painel/
          projetos/
          orcamentos/
          recorrencia/
          clientes/
          financeiro/
        shared/          # componentes de documento (orcamento/contrato/recibo), pipes, dialog
      environments/
      styles.scss        # tokens da marca (cores, fontes, gradiente)
    nginx.conf           # nginx do container web (serve Angular + proxy /api)
    proxy.conf.json      # dev: encaminha /api para o backend local
    Dockerfile
  docker-compose.yml
  .env.example
  .gitignore
  README.md
```

---

## FASE 0, Preparacao local

**Objetivo:** ter as ferramentas para construir e testar antes de pensar em VPS.

Peca ao Claude Code:
- Conferir/instalar Node 20 LTS, Angular CLI (`npm i -g @angular/cli`), Python 3.12, Docker Desktop.
- Criar a pasta `malvezi-gestao/` e o repositorio git com um `.gitignore` que ignore `node_modules`, `dist`, `__pycache__`, `.env`, `*.db`.

**Pronto quando:** `node -v`, `ng version`, `python --version` e `docker --version` respondem.

---

## FASE 1, Backend (FastAPI + Postgres)

**Objetivo:** uma API que guarda tudo e protege com senha.

### 1.1 Dependencias (`backend/requirements.txt`)
```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
pydantic
pydantic-settings
python-jose[cryptography]
passlib[bcrypt]
python-dotenv
```

### 1.2 Modelos (tabelas)
- **cliente**: id, nome, empresa (opcional), contato (opcional), criado.
- **projeto**: id, cliente_id (FK), tipo (`site` | `erp` | `automacao` | `portal`), valor, pago, stage (`lead` | `orcamento` | `aprovado` | `desenvolvimento` | `entregue`), entrega (data), escopo, criado.
- **orcamento**: id, numero (ex.: ORC-0001), cliente_id (FK), titulo, tipo, desconto, pagamento, prazo, validade_dias, obs, status (`rascunho` | `enviado` | `aprovado` | `recusado`), criado.
- **orcamento_item**: id, orcamento_id (FK), titulo, descricao, valor, ordem.
- **recorrencia**: id, cliente_id (FK), plano, valor, status (`ativo` | `pausado`), criado.
- **tarefa**: id, texto, done, criado.

### 1.3 Autenticacao (senha unica)
- `POST /api/login` recebe `{ "senha": "..." }`, compara com `APP_PASSWORD` (variavel de ambiente) e devolve `{ "token": "<jwt>" }` assinado com `SECRET_KEY`.
- Dependencia `get_current_user` valida o token; todas as rotas de dados exigem token. `GET /api/health` fica publica.

### 1.4 Endpoints (REST, todos sob `/api`)
- `POST /login`, `GET /me`
- `clientes`: GET (lista), POST, PATCH/PUT, DELETE
- `projetos`: GET, POST, PATCH (inclui trocar `stage`), DELETE
- `orcamentos`: GET (com itens), POST (com itens), PUT (com itens), PATCH (trocar `status`), POST `/{id}/duplicar`, DELETE
- `recorrencias`: GET, POST, PATCH (trocar `status`), PUT, DELETE
- `tarefas`: GET, POST, PATCH (alternar `done`), DELETE
- `dashboard`: GET devolve os numeros prontos (recorrente/mes, a receber, projetos ativos, em producao, funil por estagio, proximas entregas, pendencias automaticas)

Numeracao de orcamento: no POST, gera `ORC-` + (maior numero existente + 1), com 4 digitos.

### 1.5 Seed e CORS
- `seed.py`: se as tabelas estiverem vazias, insere os dados de exemplo (mesmos clientes ficticios do painel HTML: Otica Visao Clara, Mercado Sao Jorge, etc.). Nunca sobrescreve dados reais.
- CORS liberado so para o dominio do front (em producao e mesma origem, entao CORS quase nao entra em jogo; em dev, liberar `http://localhost:4200`).

**Pronto quando:** rodando local (`uvicorn app.main:app --reload` com um Postgres local ou SQLite temporario), o `/api/login` devolve token e os CRUDs respondem (testar no `/docs` que o FastAPI gera sozinho).

---

## FASE 2, Frontend (Angular)

**Objetivo:** as mesmas telas do painel HTML, agora falando com a API.

### 2.1 Projeto e tokens
- `ng new` (standalone components, SCSS, routing).
- `styles.scss` com as variaveis da marca (roxo, azul, tinta, cinzas, gradiente) e as fontes Space Grotesk + Inter (via `@fontsource` ou Google Fonts). Reproduzir o visual do `malvezi-controle.html`.
- `BrandMark` como componente (o SVG dos tres blocos em escada, versao colorida e branca).

### 2.2 Core
- `AuthService`: login, guarda o token, logout, `isLoggedIn`.
- `HTTP interceptor`: injeta `Authorization: Bearer <token>` e, no 401, manda para `/login`.
- `AuthGuard`: protege as rotas internas.
- `ApiService` (ou um service por entidade) para clientes, projetos, orcamentos, recorrencias, tarefas, dashboard.
- Modelos (interfaces) espelhando as entidades do backend.

### 2.3 Layout
- Menu lateral + topo (igual ao painel HTML), centralizado (largura maxima com margens iguais), responsivo (menu vira gaveta no celular), com o indicador de sessao/logout.

### 2.4 Telas (paridade com o painel atual)
- **Login:** tela simples com campo de senha e o logo.
- **Painel:** KPIs (recorrente/mes, a receber, projetos ativos, em producao), proximas entregas, "precisa de atencao" (alertas automaticos + lembretes editaveis), funil por estagio.
- **Projetos:** cartoes e quadro (kanban), o stepper com checks por etapa, editor em dialogo, e a area de documentos do projeto (orcamento, contrato de prestacao de servico e recibo em PDF via impressao).
- **Orcamentos:** lista, editor com modelos de escopo (Site, ERP, Automacao, Portal), troca de status, e o documento de orcamento pronto para PDF.
- **Mensalidades (recorrencia):** MRR no topo, lista, editor, situacao ativo/pausado.
- **Clientes:** agregado a partir de projetos e recorrencias (quanto gerou em projetos e quanto paga por mes).
- **Financeiro:** recebido, a receber, recorrente/mes, carteira total, grafico simples e listas de recorrencia ativa e orcamentos em aberto.

### 2.5 Documentos (PDF)
- Componentes de documento (orcamento, contrato, recibo) com a regua degrade, o lockup da Malvezi e o rodape `malvezi.com.br`, usando CSS de impressao (`@media print`) e `window.print()` para gerar o PDF, como no painel atual. (Geracao de PDF no servidor com WeasyPrint fica como melhoria futura, opcional.)

### 2.6 Ambiente
- `environment.ts` com `apiUrl`. Em producao, `apiUrl = '/api'` (mesma origem, servido pelo nginx do container). Em dev, `proxy.conf.json` encaminha `/api` para `http://localhost:8000`.

**Pronto quando:** `ng serve` com o backend rodando: login funciona, da para criar projeto/orcamento/mensalidade, trocar estagio/status, emitir os PDFs, e recarregar mantem os dados (vindos da API).

---

## FASE 3, Containerizacao (Docker)

**Objetivo:** empacotar front, back e banco de forma isolada e reproduzivel.

### 3.1 `backend/Dockerfile`
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 3.2 `frontend/nginx.conf` (nginx de dentro do container web)
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3.3 `frontend/Dockerfile` (multi-stage: build Angular, serve com nginx)
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# ajuste o nome da pasta em dist/ conforme o nome do projeto Angular
COPY --from=build /app/dist/malvezi-gestao/browser /usr/share/nginx/html
```

### 3.4 `docker-compose.yml`
```yaml
name: malvezi-gestao

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: malvezi
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: malvezi
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: ./backend
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql+psycopg2://malvezi:${DB_PASSWORD}@db:5432/malvezi
      SECRET_KEY: ${SECRET_KEY}
      APP_PASSWORD: ${APP_PASSWORD}
    depends_on:
      - db

  web:
    build: ./frontend
    restart: unless-stopped
    depends_on:
      - api
    ports:
      - "127.0.0.1:${HOST_PORT}:80"

volumes:
  pgdata:
```

### 3.5 `.env.example`
```dotenv
# senha do login do painel (a que voce e seu pai vao usar)
APP_PASSWORD=troque-esta-senha
# chave para assinar o token (gere uma aleatoria longa)
SECRET_KEY=troque-por-uma-chave-bem-grande-e-aleatoria
# senha do banco (interna, so entre os containers)
DB_PASSWORD=uma-senha-forte-do-banco
# porta local no host (definida na Fase 4, depois de checar o que esta livre)
HOST_PORT=8090
```

**Pronto quando (no seu PC):** `docker compose --env-file .env up --build` sobe os tres servicos e `http://127.0.0.1:8090` abre o app, com login e dados persistindo (pare com `down`, suba de novo, os dados continuam).

---

## FASE 4, Deploy no VPS (com blindagem anti-conflito)

**Objetivo:** publicar em `gestao.malvezi.com.br` sem encostar na EPR.

### 4.1 Pre-voo (diagnostico antes de qualquer coisa)
Rode e leia cada saida antes de prosseguir:
```bash
# portas em uso (para escolher uma HOST_PORT livre, ex.: 8090)
sudo ss -ltnp

# vhosts e portas que o nginx ja usa (garanta que 'gestao.malvezi.com.br' NAO existe ainda)
sudo nginx -T | grep -E "server_name|listen"

# docker instalado? containers e redes ja existentes?
docker ps -a 2>/dev/null; docker network ls 2>/dev/null

# espaco e memoria
df -h; free -m
```
Regras de ouro:
- Escolha uma `HOST_PORT` que nao apareca no `ss -ltnp`.
- Se `gestao.malvezi.com.br` ja aparecer em algum bloco, pare e me avise.
- Nao edite nenhum arquivo de nginx existente. So vamos criar um novo.

### 4.2 Docker no host (se ainda nao tiver)
```bash
# so rode se 'docker --version' falhar
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # saia e entre de novo no SSH depois disso
```
Instalar o Docker nao muda nada do que a EPR ja usa; ela continua rodando como esta.

### 4.3 Codigo e variaveis
```bash
sudo mkdir -p /opt/malvezi-gestao && sudo chown $USER:$USER /opt/malvezi-gestao
cd /opt/malvezi-gestao
git clone <URL_DO_SEU_REPO> .
cp .env.example .env
nano .env    # defina APP_PASSWORD, SECRET_KEY, DB_PASSWORD e HOST_PORT (a porta livre do pre-voo)
```

### 4.4 Subir os containers
```bash
docker compose --env-file .env up -d --build
docker compose ps          # os tres devem ficar "running"/"healthy"
curl -s http://127.0.0.1:$(grep HOST_PORT .env | cut -d= -f2)/api/health   # deve responder {"ok":true}
```
Se `/api/health` responder, o app esta de pe internamente. Falta so o subdominio e o HTTPS.

### 4.5 DNS no GoDaddy
Em malvezi.com.br a DNS, adicione:
- Type `A`, Name `gestao`, Value `IP do VPS`, TTL 1 hora.

(O site principal continua na Vercel. So o subdominio aponta para o VPS. Nao mexa em `@` nem `www`.)

### 4.6 nginx do host (arquivo NOVO, so do subdominio)
```bash
sudo nano /etc/nginx/sites-available/malvezi-gestao
```
Cole (troque `8090` pela sua `HOST_PORT`):
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name gestao.malvezi.com.br;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Ative com cuidado:
```bash
sudo ln -s /etc/nginx/sites-available/malvezi-gestao /etc/nginx/sites-enabled/
sudo nginx -t          # PRECISA dizer "syntax is ok" e "test is successful"
sudo systemctl reload nginx
```
Se `nginx -t` reclamar, nao recarregue; me mande a mensagem.

### 4.7 HTTPS
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d gestao.malvezi.com.br
```
Escolha redirecionar HTTP para HTTPS. Renova sozinho.

**Pronto quando:** `https://gestao.malvezi.com.br` abre, pede login, e funciona igual ao seu PC. A EPR continua intacta (nao tocamos em nada dela).

---

## FASE 5, Pos-deploy (rotina)

- **Atualizar o app:**
  ```bash
  cd /opt/malvezi-gestao && git pull && docker compose --env-file .env up -d --build
  ```
  Os dados ficam no volume do Postgres, nao se perdem no build.
- **Backup do banco:**
  ```bash
  docker compose exec db pg_dump -U malvezi malvezi > backup-$(date +%F).sql
  ```
  Agende no cron e leve a copia para fora do VPS de vez em quando.
- **Logs:** `docker compose logs -f api` (ou `web`, ou `db`).
- **Reverter:** `git checkout <commit-bom> && docker compose --env-file .env up -d --build`.
- **Remover tudo um dia (sem afetar a EPR):** `docker compose down -v`, apague `/opt/malvezi-gestao`, o arquivo do nginx do subdominio e o registro DNS.

---

## Troubleshooting (os perrengues tipicos e a saida)

- **Porta ja em uso ao subir o compose:** escolha outra `HOST_PORT` livre (veja o `ss -ltnp`), ajuste o `.env` e o bloco do nginx, `docker compose up -d` de novo.
- **502 Bad Gateway no navegador:** o container `web` nao esta no ar ou a `HOST_PORT` do nginx nao bate com a do `.env`. Cheque `docker compose ps` e o `proxy_pass`.
- **`nginx -t` falhou:** provavelmente erro de digitacao no bloco ou `server_name` repetido. Corrija e teste de novo antes de recarregar. Nunca recarregue com o teste falhando (e o que costuma derrubar os outros sites).
- **certbot nao valida:** o DNS ainda nao propagou (espere) ou a porta 80 nao esta chegando no host. Confirme o registro A e que o nginx esta servindo em 80.
- **Login nao passa / 401 em tudo:** `APP_PASSWORD` ou `SECRET_KEY` diferentes entre o que subiu e o `.env`; refaca o `up -d` apos ajustar o `.env`.
- **Erro de conexao com o banco:** o `DATABASE_URL` do servico `api` tem que usar o host `db` (nome do servico), nao `localhost`.
- **Front chama a API errada:** em producao o `apiUrl` tem que ser `/api` (mesma origem). Se estiver apontando para `localhost:8000`, da erro fora do seu PC.

---

## Ordem sugerida de execucao no Claude Code

1. Fase 1 inteira (backend) e testar no `/docs`.
2. Fase 2 inteira (frontend) apontando para o backend local.
3. Fase 3 (Docker) e validar tudo junto no seu PC com `docker compose up`.
4. So entao Fase 4 (VPS), comecando pelo pre-voo da 4.1.

Faca um commit ao fim de cada fase. Se algo travar na Fase 4, me mande a saida do comando que falhou (principalmente do pre-voo, do `docker compose ps` e do `nginx -t`) que a gente resolve sem risco para a EPR.
