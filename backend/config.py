import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    OTP_TTL_SECONDS: int = 600
    OTP_RESEND_SECONDS: int = 60
    OTP_MAX_SENDS: int = 5
    OTP_MAX_ATTEMPTS: int = 5
    OTP_WINDOW_SECONDS: int = 3600
    OTP_IP_MAX_SENDS: int = 20
    RESET_TTL_SECONDS: int = 600
    PROJECT_NAME: str = "G9 - Quản Lý Dự Án"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    DATABASE_URL: str = "sqlite:///./g9_pm.db"
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")

    # CORS: danh sách origin của frontend được phép gọi API (phân tách bởi dấu phẩy trong .env)
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Gemini API Settings (Miễn phí)
    GEMINI_API_KEY: Optional[str] = None

    # LLM Settings (Giữ nguyên cấu hình cũ)
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-sonnet-5"

    class Config:
        env_file = ".env"
        extra = "ignore"  # Bỏ qua báo lỗi khi file .env chứa các biến phụ khác

settings = Settings()
