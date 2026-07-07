import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from .config import settings
from .schemas import Login, TokenRead, MeRead

router = APIRouter()

security = HTTPBearer()

ALGORITHM = "HS256"


def criar_token() -> str:
    expira = datetime.now(timezone.utc) + timedelta(hours=settings.token_hours)
    payload = {"sub": "malvezi", "exp": expira}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    token = credentials.credentials
    erro = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalido ou expirado",
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        raise erro
    sub = payload.get("sub")
    if sub is None:
        raise erro
    return sub


@router.post("/login", response_model=TokenRead)
def login(dados: Login):
    if not secrets.compare_digest(dados.senha, settings.app_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha incorreta",
        )
    return TokenRead(token=criar_token())


@router.get("/me", response_model=MeRead)
def me(usuario: str = Depends(get_current_user)):
    return MeRead(usuario=usuario)
