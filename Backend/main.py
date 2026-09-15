from contextlib import asynccontextmanager
from fastapi import FastAPI
from database import engine, Base
import schemas as schemas
import models  # <-- IMPORTANT: Must import models so SQLAlchemy registers them
from routes import teachers, students, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs when server starts up: Creates all tables in CockroachDB
    async with engine.begin() as conn:
        # await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Runs when server shuts down
    await engine.dispose()

app = FastAPI(title="Sygnus Academia API", lifespan=lifespan)

app.include_router(teachers.router)
app.include_router(students.router)
# app.include_router(admin.router)