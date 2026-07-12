"""Proposta em PDF anexada ao orcamento.

O arquivo fica em disco (pasta de uploads, um subdiretorio por orcamento) e o
banco guarda so o registro. Cada orcamento tem no maximo um anexo: enviar outro
substitui o anterior, apagando o arquivo antigo.
"""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..models import AnexoOrcamento, Orcamento

router = APIRouter(
    prefix="/orcamentos",
    tags=["anexos"],
    dependencies=[Depends(get_current_user)],
)

ASSINATURA_PDF = b"%PDF"
PEDACO = 1024 * 1024  # 1 MB por leitura


def _limite_bytes() -> int:
    return settings.upload_max_mb * 1024 * 1024


def _pasta(orcamento_id: int) -> Path:
    """Pasta do orcamento. O caminho vem do id (int), nunca do nome enviado."""
    pasta = Path(settings.uploads_dir).resolve() / "orcamentos" / str(orcamento_id)
    pasta.mkdir(parents=True, exist_ok=True)
    return pasta


def _caminho(anexo: AnexoOrcamento) -> Path:
    return _pasta(anexo.orcamento_id) / anexo.nome_arquivo


def apagar_arquivo(anexo: AnexoOrcamento) -> None:
    """Remove o arquivo do disco, ignorando se ja nao existe."""
    try:
        _caminho(anexo).unlink(missing_ok=True)
    except OSError:
        pass


def _orcamento(orcamento_id: int, db: Session) -> Orcamento:
    orcamento = db.get(Orcamento, orcamento_id)
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orcamento nao encontrado")
    return orcamento


@router.post("/{orcamento_id}/anexo", status_code=201)
async def enviar(
    orcamento_id: int,
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    orcamento = _orcamento(orcamento_id, db)

    nome_original = (arquivo.filename or "").strip() or "proposta.pdf"
    if not nome_original.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=422, detail="Somente arquivos PDF sao aceitos (.pdf)"
        )
    if (arquivo.content_type or "").lower() != "application/pdf":
        raise HTTPException(
            status_code=422, detail="Somente arquivos PDF sao aceitos"
        )

    # Nome em disco sempre gerado: o nome enviado nunca vira caminho
    nome_arquivo = f"{uuid.uuid4().hex}.pdf"
    destino = _pasta(orcamento_id) / nome_arquivo

    limite = _limite_bytes()
    total = 0
    primeiro = True
    try:
        with destino.open("wb") as saida:
            while pedaco := await arquivo.read(PEDACO):
                if primeiro:
                    if not pedaco.startswith(ASSINATURA_PDF):
                        raise HTTPException(
                            status_code=422,
                            detail="O arquivo nao e um PDF valido",
                        )
                    primeiro = False
                total += len(pedaco)
                if total > limite:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            "Arquivo muito grande. O limite e "
                            f"{settings.upload_max_mb} MB"
                        ),
                    )
                saida.write(pedaco)
        if total == 0:
            raise HTTPException(status_code=422, detail="Arquivo vazio")
    except HTTPException:
        destino.unlink(missing_ok=True)
        raise
    except OSError:
        destino.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Falha ao salvar o arquivo")

    # Substitui o anexo anterior (arquivo e registro)
    antigo = orcamento.anexo
    if antigo:
        apagar_arquivo(antigo)
        db.delete(antigo)
        db.flush()

    anexo = AnexoOrcamento(
        orcamento_id=orcamento_id,
        nome_original=nome_original,
        nome_arquivo=nome_arquivo,
        tamanho=total,
    )
    db.add(anexo)
    db.commit()
    db.refresh(anexo)
    return {
        "nome": anexo.nome_original,
        "tamanho": anexo.tamanho,
        "criado": anexo.criado,
    }


@router.get("/{orcamento_id}/anexo")
def baixar(orcamento_id: int, db: Session = Depends(get_db)):
    orcamento = _orcamento(orcamento_id, db)
    anexo = orcamento.anexo
    if not anexo:
        raise HTTPException(status_code=404, detail="Este orcamento nao tem anexo")
    caminho = _caminho(anexo)
    if not caminho.is_file():
        raise HTTPException(status_code=404, detail="Arquivo do anexo nao encontrado")
    return FileResponse(
        caminho,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{anexo.nome_arquivo}"',
            "X-Nome-Original": anexo.nome_original.encode("ascii", "ignore").decode(),
        },
    )


@router.delete("/{orcamento_id}/anexo", status_code=204)
def remover(orcamento_id: int, db: Session = Depends(get_db)):
    orcamento = _orcamento(orcamento_id, db)
    anexo = orcamento.anexo
    if not anexo:
        raise HTTPException(status_code=404, detail="Este orcamento nao tem anexo")
    apagar_arquivo(anexo)
    db.delete(anexo)
    db.commit()
