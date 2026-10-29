def test_list_files(client, auth_headers):

    response = client.get(
        "/files",
        headers=auth_headers
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_file_details(client, auth_headers):

    file_id = 8

    response = client.get(
        f"/files/{file_id}",
        headers=auth_headers
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == file_id
    assert "original_filename" in data
    assert "file_size" in data
    assert "content_type" in data
    assert "created_at" in data

def test_file_metadata(client, auth_headers):

    file_id = 8

    response = client.get(
        f"/files/{file_id}/metadata",
        headers=auth_headers
    )

    assert response.status_code == 200

    data = response.json()

    required_fields = [
        "id",
        "name",
        "extension",
        "type",
        "mime_type",
        "size",
        "size_formatted",
        "created_at",
        "is_shared",
        "share_count"
    ]

    for field in required_fields:
        assert field in data, f"Missing field: {field}"

def test_file_preview(client, auth_headers):

    file_id = 6

    response = client.get(
        f"/files/{file_id}/preview",
        headers=auth_headers
    )

    assert response.status_code == 200

    assert response.headers["content-type"] == "application/pdf"

    assert len(response.content) > 0

def test_file_download(client, auth_headers):

    file_id = 6

    response = client.get(
        f"/files/{file_id}/download",
        headers=auth_headers
    )

    assert response.status_code == 200

    assert len(response.content) > 0

    assert "content-disposition" in response.headers