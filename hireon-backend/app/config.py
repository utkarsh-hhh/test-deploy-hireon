"""
Application configuration using pydantic-settings.
All values read from environment variables / .env file.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ────────────────────────────────────────────────────────────────────
    app_name: str = "Hireon"
    app_env: str = "development"
    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    # ── Database ───────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://postgres:root@localhost:5432/hireon_db"

    # ── AI API Keys ────────────────────────────────────────────────────────────
    gemini_api_key: str = ""
    groq_api_key: str = ""
    mistral_api_key: str = ""

    # ── Email (SMTP) ───────────────────────────────────────────────────────────
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "HireOn"

    # ── Google Calendar ────────────────────────────────────────────────────────
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/v1/calendar/callback"

    # ── Storage ────────────────────────────────────────────────────────────────
    upload_dir: str = "uploads"
    max_file_size_mb: int = 10

    # ── CORS ───────────────────────────────────────────────────────────────────
    frontend_url: str = "http://localhost:5173"

    # ── Logging ────────────────────────────────────────────────────────────────
    log_level: str = "INFO"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
