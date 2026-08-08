def test_login(client):

    import os

    response = client.post(
        "/auth/login",
        data={
            "username": os.getenv("TEST_EMAIL"),
            "password": os.getenv("TEST_PASSWORD")
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"