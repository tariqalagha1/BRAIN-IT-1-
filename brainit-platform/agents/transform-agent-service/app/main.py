from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes.api import router

settings = get_settings()
app = FastAPI(title=settings.app_name)
app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# Health check endpoint for Docker and orchestration
@app.get("/health")
def health_check():
	return {"status": "ok", "service": "transform-agent"}

app.include_router(router)
