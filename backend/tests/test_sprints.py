def test_sprint_lifecycle(client, auth_headers):
    # 1. Create Project
    proj_res = client.post("/api/projects/", json={
        "name": "Sprint Project"
    }, headers=auth_headers)
    proj_id = proj_res.json()["id"]

    # 2. Create Sprint
    sprint_res = client.post("/api/sprints/", json={
        "project_id": proj_id,
        "name": "Sprint 1 — Alpha Release",
        "goal": "Deliver core features"
    }, headers=auth_headers)
    assert sprint_res.status_code == 200
    sprint = sprint_res.json()
    assert sprint["status"] == "Planning"
    sprint_id = sprint["id"]

    # 3. Update Sprint to Active
    update_res = client.put(f"/api/sprints/{sprint_id}", json={
        "status": "Active"
    }, headers=auth_headers)
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "Active"
