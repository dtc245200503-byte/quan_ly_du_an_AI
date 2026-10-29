import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.database import Base, engine, init_db_schema
from backend.routers import (
    auth, users, projects, sprints, tasks, comments_attachments, reports, ai, meetings, ai_chat
)

# Initialize Database Tables & Auto-patch Schema (Rule R1)
Base.metadata.create_all(bind=engine)
init_db_schema()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="RESTful API cho Hệ thống G9 - Quản Lý Dự Án",
    version="5.0.0"
)

@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    if request.url.path.startswith("/api/auth/"):
        # Pydantic's default response echoes input, including passwords.
        return JSONResponse(status_code=422, content={"detail": "Thông tin không hợp lệ. Kiểm tra email, họ tên, mã OTP 6 số và mật khẩu (8 ký tự trở lên, tối đa 72 byte)."})
    from fastapi.exception_handlers import request_validation_exception_handler
    return await request_validation_exception_handler(request, exc)

# Enable CORS for Frontend
# Lưu ý: không dùng allow_origins=["*"] kèm allow_credentials=True vì đây là tổ hợp
# không hợp lệ theo spec CORS (trình duyệt sẽ chặn). Lấy danh sách origin cụ thể từ config.
_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files for Uploaded Attachments
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(sprints.router)
app.include_router(tasks.router)
app.include_router(comments_attachments.router)
app.include_router(reports.router)
app.include_router(ai.router)
app.include_router(meetings.router)
app.include_router(ai_chat.router)


@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "online",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
