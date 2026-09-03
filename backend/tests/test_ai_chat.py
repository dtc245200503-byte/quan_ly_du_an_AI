def test_ai_chat_copilot(client, auth_headers):
    # 1. Create project
    proj_res = client.post("/api/projects/", json={
        "name": "AI Chat Test Project",
        "description": "Project for AI chat testing"
    }, headers=auth_headers)
    assert proj_res.status_code == 200
    proj_id = proj_res.json()["id"]

    # 2. Call AI Chat endpoint with query
    chat_res = client.post("/api/ai-chat/chat", json={
        "project_id": proj_id,
        "message": "Tóm tắt tiến độ tuần này",
        "history": []
    }, headers=auth_headers)
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert "reply" in data
    assert "suggested_actions" in data
    assert len(data["reply"]) > 0
