import os
from sqlmodel import SQLModel, create_engine

DB_URL = os.getenv("DB_URL", "sqlite:///./dev.db")
engine = create_engine(DB_URL, echo=False)

def init_db():
    from . import models  # ensure models are imported
    SQLModel.metadata.create_all(engine)