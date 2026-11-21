import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_headers():
    email = "sec_test_user@example.com"
    pwd = "SecPassword123!"
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "password": pwd,
        "full_name": "Security Test User",
        "currency": "USD",
    })
    if reg_res.status_code == 201:
        token = reg_res.json()["access_token"]
    else:
        login_res = client.post("/api/auth/login", json={"email": email, "password": pwd})
        token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_security_findings_endpoint(auth_headers):
    res = client.get("/api/security/findings", headers=auth_headers)
    assert res.status_code == 200
    findings = res.json()
    assert isinstance(findings, list)
    assert len(findings) > 0
    first = findings[0]
    assert "finding_id" in first
    assert "ai_severity" in first
    assert "remediation_steps" in first


def test_security_summary_endpoint(auth_headers):
    res = client.get("/api/security/summary", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_findings" in data
    assert "cloud_status" in data
    assert "bedrock_model" in data
    assert data["cloud_status"]["vpc"] != ""


def test_security_reports_endpoint(auth_headers):
    res = client.get("/api/security/reports", headers=auth_headers)
    assert res.status_code == 200
    reports = res.json()
    assert isinstance(reports, list)


def test_trigger_security_scan(auth_headers):
    res = client.post("/api/security/scan", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "finding" in data
