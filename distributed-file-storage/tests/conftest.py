import os
from pathlib import Path

import pytest
import httpx
from dotenv import load_dotenv


# Load .env from project root
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


BASE_URL = "http://127.0.0.1:8000"


# ============================================================
# HTTP CLIENT
# ============================================================

@pytest.fixture(scope="session")
def client():
    with httpx.Client(
        base_url=BASE_URL,
        timeout=30.0
    ) as client:
        yield client


# ============================================================
# AUTHENTICATION TOKEN
# ============================================================

@pytest.fixture(scope="session")
def auth_token(client):

    email = os.getenv("TEST_EMAIL")
    password = os.getenv("TEST_PASSWORD")

    if not email or not password:
        pytest.fail(
            "TEST_EMAIL and TEST_PASSWORD environment "
            "variables are required"
        )

    response = client.post(
        "/auth/login",
        data={
            "username": email,
            "password": password
        }
    )

    assert response.status_code == 200, (
        f"Login failed: {response.status_code} "
        f"{response.text}"
    )

    data = response.json()

    assert "access_token" in data, (
        f"access_token missing from login response: "
        f"{data}"
    )

    return data["access_token"]


# ============================================================
# AUTHORIZATION HEADERS
# ============================================================

@pytest.fixture(scope="session")
def auth_headers(auth_token):

    return {
        "Authorization": f"Bearer {auth_token}"
    }