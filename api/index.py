"""Vercel serverless entrypoint: exposes the FastAPI ASGI app."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from crm.main import app  # noqa: E402,F401
