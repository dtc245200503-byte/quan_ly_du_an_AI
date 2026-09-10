import datetime

def test_chat_history_saving_and_retrieval(client, auth_headers):
    # 1. Create project
    proj_res = client.post("/api/projects/", json={
        "name": "Phase 2 History Test Project",
        "description": "Project for chat history testing"
    }, headers=auth_headers)
    assert proj_res.status_code == 200
    proj_id = proj_res.json()["id"]

    # 2. Send chat message
    chat_res = client.post("/api/ai-chat/chat", json={
        "project_id": proj_id,
        "message": "Kiểm tra lịch họp nhóm",
        "history": []
    }, headers=auth_headers)
    assert chat_res.status_code == 200

    # 3. Retrieve history
    hist_res = client.get(f"/api/ai-chat/history?project_id={proj_id}", headers=auth_headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    user_contents = [m["content"] for m in history if m["role"] == "user"]
    assert "Kiểm tra lịch họp nhóm" in user_contents



def test_ai_reports_saving_and_retrieval(client, auth_headers):
    # 1. Create project
    proj_res = client.post("/api/projects/", json={
        "name": "Phase 3 AI Report Test",
        "description": "Testing AI Reports DB saving"
    }, headers=auth_headers)
    proj_id = proj_res.json()["id"]

    # 2. Generate weekly summary
    sum_res = client.post("/api/ai/weekly-summary", json={"project_id": proj_id}, headers=auth_headers)
    assert sum_res.status_code == 200

    # 3. Retrieve AI reports
    rep_res = client.get(f"/api/ai/reports?project_id={proj_id}", headers=auth_headers)
    assert rep_res.status_code == 200
    reports = rep_res.json()
    assert len(reports) >= 1
    assert reports[0]["report_type"] == "Weekly"
    assert "TÌNH TRẠNG SỨC KHỎE DỰ ÁN" in reports[0]["content"]



def test_risk_analysis_endpoint_and_task_scores(client, auth_headers):
    # 1. Create project
    proj_res = client.post("/api/projects/", json={
        "name": "Phase 4 Risk Analysis Test",
        "description": "Testing ai_risk_score calculation"
    }, headers=auth_headers)
    proj_id = proj_res.json()["id"]

    # 2. Create overdue task
    past_due = (datetime.datetime.utcnow() - datetime.timedelta(days=2)).isoformat()
    task_res = client.post("/api/tasks/", json={
        "project_id": proj_id,
        "title": "Task có nguy cơ trễ hạn cao",
        "status": "InProgress",
        "due_date": past_due,
        "estimated_hours": 15.0
    }, headers=auth_headers)
    assert task_res.status_code == 200
    task_id = task_res.json()["id"]

    # 3. Call risk analysis API
    risk_res = client.post("/api/ai/analyze-risk", json={"project_id": proj_id}, headers=auth_headers)
    assert risk_res.status_code == 200
    data = risk_res.json()
    assert data["analyzed_tasks_count"] >= 1
    assert len(data["high_risk_tasks"]) >= 1
    assert data["high_risk_tasks"][0]["id"] == task_id
    assert data["high_risk_tasks"][0]["ai_risk_score"] == 1.0

    # 4. Get task and verify ai_risk_score field
    task_detail = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
    assert task_detail.status_code == 200
    assert task_detail.json()["ai_risk_score"] == 1.0


def test_ai_feedback_submission(client, auth_headers):
    feed_res = client.post("/api/ai/feedback", json={
        "feature": "chat",
        "rating": "up",
        "note": "Trả lời rất hữu ích và chính xác!"
    }, headers=auth_headers)

    assert feed_res.status_code == 200
    data = feed_res.json()
    assert data["feature"] == "chat"
    assert data["rating"] == "up"
    assert data["note"] == "Trả lời rất hữu ích và chính xác!"
