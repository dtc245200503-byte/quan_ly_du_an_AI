def test_ai_services(client, auth_headers):
    # 1. Create project
    proj = client.post("/api/projects/", json={"name": "AI Test Project"}, headers=auth_headers).json()
    proj_id = proj["id"]

    # 2. Weekly summary
    weekly_res = client.post("/api/ai/weekly-summary", json={"project_id": proj_id}, headers=auth_headers)
    assert weekly_res.status_code == 200
    assert "summary" in weekly_res.json()
    assert "risks" in weekly_res.json()

    # 3. Meeting minutes
    meeting_res = client.post("/api/ai/meeting-minutes", json={
        "project_id": proj_id,
        "title": "Meeting 1",
        "raw_notes": "Discussed task priorities.\n- Complete backend unit tests.\n- Fix UI bugs."
    }, headers=auth_headers)
    assert meeting_res.status_code == 200
    assert len(meeting_res.json()["action_items"]) > 0

    # 4. Suggest assignment
    suggest_res = client.post("/api/ai/suggest-assignment", json={
        "project_id": proj_id,
        "task_title": "Build FastAPI Auth",
        "required_skills": ["Python", "FastAPI"]
    }, headers=auth_headers)
    assert suggest_res.status_code == 200
    assert "suggested_assignee" in suggest_res.json()
