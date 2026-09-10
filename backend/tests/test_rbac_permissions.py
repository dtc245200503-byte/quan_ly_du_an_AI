import pytest
import time
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

def test_new_user_blank_state_isolation():
    ts = int(time.time() * 1000)
    reg_payload = {
        "identifier": f"newuser_rbac_{ts}@g9.vn",
        "password": "Password123!",
        "full_name": "New User Blank State",
        "role": "Member"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Verify GET /api/projects/ returns empty list []
    res_proj = client.get("/api/projects/", headers=headers)
    assert res_proj.status_code == 200
    assert res_proj.json() == []

    # 3. Verify GET /api/tasks/?project_id=999 returns []
    res_tasks = client.get("/api/tasks/?project_id=999", headers=headers)
    assert res_tasks.status_code == 200
    assert res_tasks.json() == []

    # 4. Verify GET /api/sprints/?project_id=999 returns []
    res_sprints = client.get("/api/sprints/?project_id=999", headers=headers)
    assert res_sprints.status_code == 200
    assert res_sprints.json() == []

    # 5. Verify GET /api/meetings/?project_id=999 returns []
    res_meetings = client.get("/api/meetings/?project_id=999", headers=headers)
    assert res_meetings.status_code == 200
    assert res_meetings.json() == []

def test_rbac_project_access_denied():
    ts = int(time.time() * 1000)
    reg_a = client.post("/api/auth/register", json={
        "identifier": f"usera_rbac_{ts}@g9.vn",
        "password": "Password123!",
        "full_name": "User A",
        "role": "Member"
    })
    assert reg_a.status_code == 200, reg_a.text
    token_a = reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    proj_res = client.post("/api/projects/", json={
        "name": "Dự án bí mật của User A",
        "description": "Bảo mật thông tin"
    }, headers=headers_a)
    assert proj_res.status_code == 200
    proj_id = proj_res.json()["id"]

    # 2. Register User B
    reg_b = client.post("/api/auth/register", json={
        "identifier": f"userb_rbac_{ts}@g9.vn",
        "password": "Password123!",
        "full_name": "User B",
        "role": "Member"
    })
    assert reg_b.status_code == 200, reg_b.text
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. User B tries to fetch User A's project -> 403 Forbidden
    res_get = client.get(f"/api/projects/{proj_id}", headers=headers_b)
    assert res_get.status_code == 403

    # 4. User B tries to delete User A's project -> 403 Forbidden
    res_del = client.delete(f"/api/projects/{proj_id}", headers=headers_b)
    assert res_del.status_code == 403

    # 5. User B tries to create task in User A's project -> 403 Forbidden
    res_create_task = client.post("/api/tasks/", json={
        "project_id": proj_id,
        "title": "Task xâm nhập trái phép",
        "priority": "High"
    }, headers=headers_b)
    assert res_create_task.status_code == 403
