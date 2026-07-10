"""Unit tests for app.auth — password hashing and JWT creation (no DB)."""
from datetime import timedelta

from jose import jwt

from app.auth import get_password_hash, verify_password, create_access_token
from app.config import settings


def test_hash_is_not_plaintext_and_verifies():
    pw = "hunter2password"
    hashed = get_password_hash(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True


def test_verify_rejects_wrong_password():
    hashed = get_password_hash("correct-horse")
    assert verify_password("wrong-horse", hashed) is False


def test_hash_uses_random_salt():
    pw = "same-password"
    assert get_password_hash(pw) != get_password_hash(pw)


def test_create_access_token_is_decodable():
    token = create_access_token({"sub": "user-123"})
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    assert payload["sub"] == "user-123"
    assert "exp" in payload


def test_create_access_token_custom_expiry():
    t1 = create_access_token({"sub": "u"}, expires_delta=timedelta(minutes=1))
    t2 = create_access_token({"sub": "u"}, expires_delta=timedelta(minutes=60))
    exp1 = jwt.decode(t1, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])["exp"]
    exp2 = jwt.decode(t2, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])["exp"]
    assert exp2 > exp1
