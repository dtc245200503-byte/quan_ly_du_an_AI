from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db_schema():
    """
    Quy định R1: Tự kiểm tra và bổ sung cột mới cho các bảng đã tồn tại (auto-patch schema).
    Lưu ý: Đây là giải pháp vá tạm thời phù hợp quy mô SQLite cho dự án đồ án,
    không phải migration chuẩn production (như Alembic). Giúp app không crash với OperationalError.
    """
    with engine.connect() as conn:
        # Check tasks table for ai_risk_score column
        try:
            result = conn.execute(text("PRAGMA table_info(tasks)"))
            columns = [row[1] for row in result.fetchall()]
            if columns and "ai_risk_score" not in columns:
                conn.execute(text("ALTER TABLE tasks ADD COLUMN ai_risk_score FLOAT DEFAULT 0.0"))
                conn.commit()
        except Exception as e:
            print(f"[DB AUTO-MIGRATION] Warning patching tasks table: {e}")

