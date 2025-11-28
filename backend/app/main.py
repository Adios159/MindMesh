from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import init_db
from .routers import ws

app = FastAPI(title="MindMesh MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ⭐ 여기서 ws.router를 prefix 없이 그대로 포함
app.include_router(ws.router)

@app.on_event("startup")
async def startup():
    init_db()

@app.get("/")
def health():
    return {"ok": True, "service": "mindmesh"}
