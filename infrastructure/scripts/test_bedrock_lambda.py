"""
Test script for simulating GuardDuty and Scheduled EventBridge events against the Security Scanner Lambda logic.
"""
import sys
import os
os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
os.environ["AWS_REGION"] = "us-east-1"
import unittest
from unittest.mock import MagicMock, patch

# Add lambda path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "lambda")))

from security_scanner import handler, sanitize_with_guardrail, invoke_bedrock_analysis


class TestSecurityScannerLambda(unittest.TestCase):

    @patch("security_scanner.table")
    @patch("security_scanner.s3_client")
    @patch("security_scanner.bedrock_runtime")
    def test_guardduty_event_processing(self, mock_bedrock, mock_s3, mock_table):
        # Mock Bedrock response
        mock_response_body = MagicMock()
        mock_response_body.read.return_value = b'{"content": [{"text": "{\\"severity_level\\": \\"HIGH\\", \\"risk_analysis\\": \\"Compromised EC2 credentials detected.\\", \\"financial_impact\\": \\"$500 potential compute cost\\", \\"remediation_steps\\": [\\"Revoke IAM credential\\"], \\"automated_action_recommended\\": \\"Isolate instance\\"}"}]}'
        mock_bedrock.invoke_model.return_value = {"body": mock_response_body}

        # Mock Guardrail response
        mock_bedrock.apply_guardrail.return_value = {"action": "NONE", "outputs": [{"text": "Safe content"}]}

        sample_event = {
            "source": "aws.guardduty",
            "detail": {
                "id": "gd-test-12345",
                "type": "UnauthorizedAccess:EC2/SSHBruteForce",
                "severity": 8.0,
                "title": "SSH Brute Force on Backend EC2",
                "description": "Suspicious login attempts detected from unknown IP 198.51.100.2.",
                "resource": {"instanceId": "i-0123456789abcdef0"}
            }
        }

        result = handler(sample_event, None)
        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(result["body"]["findings_count"], 1)
        mock_table.put_item.assert_called_once()
        mock_s3.put_object.assert_called_once()
        print("\n[✓] GuardDuty finding ingestion & AI analysis test PASSED!")

    @patch("security_scanner.table")
    @patch("security_scanner.s3_client")
    @patch("security_scanner.bedrock_runtime")
    def test_scheduled_audit_event(self, mock_bedrock, mock_s3, mock_table):
        mock_response_body = MagicMock()
        mock_response_body.read.return_value = b'{"content": [{"text": "{\\"severity_level\\": \\"LOW\\", \\"risk_analysis\\": \\"Audit nominal\\", \\"financial_impact\\": \\"None\\", \\"remediation_steps\\": [], \\"automated_action_recommended\\": \\"None\\"}"}]}'
        mock_bedrock.invoke_model.return_value = {"body": mock_response_body}
        mock_bedrock.apply_guardrail.return_value = {"action": "NONE", "outputs": [{"text": "Safe content"}]}

        sample_scheduled_event = {
            "source": "aws.events",
            "detail-type": "Scheduled Event"
        }

        result = handler(sample_scheduled_event, None)
        self.assertEqual(result["statusCode"], 200)
        mock_table.put_item.assert_called_once()
        print("[✓] Scheduled FinOps audit scan test PASSED!")


if __name__ == "__main__":
    unittest.main()
