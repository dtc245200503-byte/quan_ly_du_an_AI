import datetime

def test_meeting_crud(client, auth_headers):
    # 1. Create project
    proj_res = client.post("/api/projects/", json={
        "name": "Meeting Test Project",
        "description": "Project for testing meetings"
    }, headers=auth_headers)
    assert proj_res.status_code == 200
    proj_id = proj_res.json()["id"]

    # 2. Create meeting
    start_time = (datetime.datetime.utcnow() + datetime.timedelta(hours=1)).isoformat()
    meeting_res = client.post("/api/meetings/", json={
        "project_id": proj_id,
        "title": "Họp Demo Google Meet",
        "platform": "Google Meet",
        "meeting_link": "https://meet.google.com/abc-defg-hij",
        "start_time": start_time,
        "participants": []
    }, headers=auth_headers)
    assert meeting_res.status_code == 201
    mt = meeting_res.json()
    assert mt["title"] == "Họp Demo Google Meet"
    assert mt["platform"] == "Google Meet"
    meeting_id = mt["id"]

    # 3. Get meetings list
    get_res = client.get(f"/api/meetings/?project_id={proj_id}", headers=auth_headers)
    assert get_res.status_code == 200
    meetings = get_res.json()
    assert len(meetings) == 1

    # 4. Update meeting
    update_res = client.put(f"/api/meetings/{meeting_id}", json={
        "title": "Họp Demo Teams Cập Nhật",
        "platform": "Microsoft Teams"
    }, headers=auth_headers)
    assert update_res.status_code == 200
    assert update_res.json()["platform"] == "Microsoft Teams"

    # 5. Delete meeting
    del_res = client.delete(f"/api/meetings/{meeting_id}", headers=auth_headers)
    assert del_res.status_code == 200
