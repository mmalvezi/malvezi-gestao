FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# CRLF do Windows quebraria o shebang do entrypoint no Linux
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh
EXPOSE 8000
# O entrypoint roda "python -m app.migrar" (Alembic) antes do uvicorn
ENTRYPOINT ["./entrypoint.sh"]
