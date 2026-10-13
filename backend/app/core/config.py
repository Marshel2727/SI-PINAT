from functools import lru_cache
from sqlalchemy import URL
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_env: str = "development"
    app_secret: str
    public_origin: str = "http://localhost:3000"
    cookie_secure: bool = False
    db_host: str = "localhost"
    db_port: int = 3306
    db_name: str = "sipinat"
    db_user: str = "sipinat"
    db_password: str
    upload_dir: str = "storage/uploads"
    session_hours: int = 24

    @property
    def database_url(self):
        return URL.create("mysql+pymysql", username=self.db_user, password=self.db_password,
                          host=self.db_host, port=self.db_port, database=self.db_name,
                          query={"charset": "utf8mb4"})

@lru_cache
def settings():
    value = Settings()
    if len(value.app_secret) < 32 or "CHANGE_ME" in value.app_secret:
        raise ValueError("APP_SECRET harus acak dan minimal 32 karakter.")
    if value.app_env == "production" and (not value.cookie_secure or not value.public_origin.startswith("https://")):
        raise ValueError("Produksi memerlukan HTTPS dan COOKIE_SECURE=true.")
    return value
