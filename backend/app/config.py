from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./malvezi.db"
    secret_key: str = "dev-secret-troque"
    app_password: str = "malvezi"
    token_hours: int = 720
    cors_origins: list[str] = ["http://localhost:4200"]
    # Pasta dos anexos (PDF das propostas). No Docker: /app/uploads, em volume.
    uploads_dir: str = "./uploads"
    # Limite de tamanho do anexo, em MB
    upload_max_mb: int = 20


settings = Settings()
