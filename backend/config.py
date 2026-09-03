import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "G9 - Quản Lý Dự Án"
    SECRET_KEY: str = "g9_super_secret_jwt_key_2026_modern_corporate_blue"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    DATABASE_URL: str = "sqlite:///./g9_pm.db"
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")

    class Config:
        env_file = ".env"

settings = Settings()
