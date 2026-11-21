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


def test_ai_suggestions_endpoint(auth_headers):
    res = client.get("/api/security/suggestions", headers=auth_headers)
    assert res.status_code == 200
    suggestions = res.json()
    assert isinstance(suggestions, list)
    assert len(suggestions) > 0
    first = suggestions[0]
    assert "title" in first
    assert "impact" in first


def test_guardrail_test_endpoint(auth_headers):
    # Test PII masking
    res = client.post("/api/security/test-guardrail", headers=auth_headers, json={
        "prompt": "Here is my credit card 4111 2222 3333 4444 and email john@example.com"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == "GUARDRAIL_INTERVENED"
    assert "****-****-****-1234" in data["sanitized_output"]

    # Test clean prompt
    clean_res = client.post("/api/security/test-guardrail", headers=auth_headers, json={
        "prompt": "Show monthly expense analytics for Q3"
    })
    assert clean_res.status_code == 200
    assert clean_res.json()["action"] == "PASSED"


def test_simulate_threat_endpoint(auth_headers):
    res = client.post("/api/security/simulate-threat", headers=auth_headers, json={
        "threat_type": "IAM_CREDENTIAL_EXFILTRATION"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "finding" in data
    finding_id = data["finding"]["finding_id"]

    # Test resolving the finding
    resolve_res = client.post(f"/api/security/resolve/{finding_id}", headers=auth_headers)
    assert resolve_res.status_code == 200
    assert resolve_res.json()["finding"]["status"] == "RESOLVED"
