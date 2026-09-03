def test_reports_and_analytics(client, auth_headers):
    # 1. Create project
    proj = client.post("/api/projects/", json={"name": "Analytics Project"}, headers=auth_headers).json()

    # 2. Get dashboard stats
    stats_res = client.get(f"/api/reports/dashboard-stats?project_id={proj['id']}", headers=auth_headers)
    assert stats_res.status_code == 200
    assert "total_tasks" in stats_res.json()

    # 3. Get workload report
    workload_res = client.get(f"/api/reports/workload?project_id={proj['id']}", headers=auth_headers)
    assert workload_res.status_code == 200
    assert isinstance(workload_res.json(), list)
