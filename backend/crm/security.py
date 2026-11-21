import os
import time

import bcrypt
import jwt
from fastapi import HTTPException


def _secret() -> str:
    s = os.getenv("JWT_SECRET", "")
    if len(s) < 32:
        raise RuntimeError("JWT_SECRET must be set to 32+ characters")
    return s


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode()[:72], bcrypt.gensalt(12)).decode()


def verify_password(p: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode()[:72], hashed.encode())
    except ValueError:
        return False


def create_token(user) -> str:
    ttl = int(os.getenv("TOKEN_TTL_MINUTES", "720")) * 60
    now = int(time.time())
    return jwt.encode({"sub": str(user.id), "org": user.org_id, "iat": now, "exp": now + ttl}, _secret(), algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, _secret(), algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
