import os
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool


@lru_cache
def _factory():
    url = os.getenv("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    # Serverless + Neon pooler (PgBouncer): no app-side pool, no server-side prepared statements.
    engine = create_engine(url, poolclass=NullPool, connect_args={"prepare_threshold": None})
    return sessionmaker(engine, expire_on_commit=False)


def new_session():
    return _factory()()
