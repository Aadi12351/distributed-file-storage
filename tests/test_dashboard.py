def test_dashboard_stats(client, auth_headers):

    response = client.get(
        "/dashboard/stats",
        headers=auth_headers
    )

    assert response.status_code == 200

    data = response.json()

    required_fields = [
        "total_files",
        "total_folders",
        "total_storage_bytes",
        "total_storage_mb",
        "total_storage_gb",
        "deleted_files",
        "shared_files"
    ]

    for field in required_fields:
        assert field in data

    assert data["total_files"] >= 0
    assert data["total_folders"] >= 0