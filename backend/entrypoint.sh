#!/bin/sh
# Aplica as migracoes (Alembic, com adocao de banco antigo) antes de subir a
# API. Se a migracao falhar, o container para aqui, com o erro no log, em vez
# de subir com o schema errado.
set -e

echo "Aplicando migracoes do banco..."
python -m app.migrar

echo "Subindo a API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
