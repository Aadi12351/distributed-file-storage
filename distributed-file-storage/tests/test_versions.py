def test_list_versions(client, auth_headers):

    file_id = 8

    response = client.get(
        f"/files/{file_id}/versions",
        headers=auth_headers
    )

    assert response.status_code == 200

    versions = response.json()

    assert isinstance(versions, list)

    assert len(versions) >= 1

    for version in versions:

        assert "id" in version
        assert "file_id" in version
        assert "version_number" in version
        assert "original_filename" in version
        assert "file_size" in version
        assert "content_type" in version
        assert "created_at" in version

def test_get_version(client, auth_headers):

    file_id = 8
    version_id = 1

    response = client.get(
        f"/files/{file_id}/versions/{version_id}",
        headers=auth_headers
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == version_id
    assert data["file_id"] == file_id
def test_download_version(client, auth_headers):

    file_id = 8
    version_id = 1

    response = client.get(
        f"/files/{file_id}/versions/{version_id}/download",
        headers=auth_headers
    )

    assert response.status_code == 200

    assert len(response.content) > 0

    assert "content-disposition" in response.headers