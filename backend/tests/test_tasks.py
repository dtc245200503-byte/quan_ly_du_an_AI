def test_task_crud_and_status_transition(client, auth_headers):
    # 1. Create project
    proj_res = client.post("/api/projects/", json={
        "name": "Test Project",
        "description": "Project for task testing"
    }, headers=auth_headers)
    proj_id = proj_res.json()["id"]

    # 2. Create task
    task_res = client.post("/api/tasks/", json={
        "project_id": proj_id,
        "title": "Build Login Screen",
        "description": "Form with email/phone auto detect",
        "status": "Todo",
        "priority": "High",
        "estimated_hours": 4.5
    }, headers=auth_headers)
    assert task_res.status_code == 200
    task = task_res.json()
    assert task["title"] == "Build Login Screen"
    assert task["status"] == "Todo"
    task_id = task["id"]

    # 3. Patch task status to InProgress (Kanban Drag)
    patch_res = client.patch(f"/api/tasks/{task_id}", json={
        "status": "InProgress"
    }, headers=auth_headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "InProgress"

    # 4. Filter tasks
    list_res = client.get(f"/api/tasks/?project_id={proj_id}&status=InProgress", headers=auth_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
