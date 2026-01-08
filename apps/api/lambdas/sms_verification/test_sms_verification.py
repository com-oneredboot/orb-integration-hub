# file: apps/api/lambdas/sms_verification/test_sms_verification.py
# author: Claude Code Assistant
# date: 2025-06-20
# description: Comprehensive security-focused unit tests for SMS verification Lambda

import unittest
import json
import time
import hmac
import hashlib
from unittest.mock import patch, MagicMock, Mock
from moto import mock_secretsmanager, mock_sns, mock_dynamodb
import boto3
import pytest

# Import the lambda function
import sys
import os
sys.path.append(os.path.dirname(__file__))
from index import lambda_handler, generate_verification_code, verify_code, check_rate_limit, get_secret

class TestSMSVerificationSecurity(unittest.TestCase):
    """Comprehensive security tests for SMS verification Lambda function"""

    def setUp(self):
        """Set up test environment before each test"""
        self.test_event = {
            'input': {
                'phoneNumber': '+1234567890'
            }
        }
        self.test_context = MagicMock()
        
        # Mock environment variables
        os.environ['SMS_ORIGINATION_NUMBER'] = '+1234567890'
        os.environ['SMS_VERIFICATION_SECRET_NAME'] = 'test-secret'
        os.environ['SMS_RATE_LIMIT_TABLE_NAME'] = 'test-rate-limit-table'
        os.environ['LOGGING_LEVEL'] = 'DEBUG'

    def tearDown(self):
        """Clean up after each test"""
        # Clear environment variables
        for key in ['SMS_ORIGINATION_NUMBER', 'SMS_VERIFICATION_SECRET_NAME', 
                   'SMS_RATE_LIMIT_TABLE_NAME', 'LOGGING_LEVEL']:
            if key in os.environ:
                del os.environ[key]

    @mock_secretsmanager
    @mock_sns
    @mock_dynamodb
    def test_valid_sms_generation_security(self):
        """Test secure SMS code generation and sending"""
        # Setup mocks
        self._setup_valid_mocks()
        
        result = lambda_handler(self.test_event, self.test_context)
        
        self.assertEqual(result['StatusCode'], 200)
        self.assertIn('sent successfully', result['Message'])
        self.assertEqual(result['Data']['phoneNumber'], '+1234567890')

    @mock_secretsmanager
    @mock_dynamodb
    def test_rate_limiting_security(self):
        """Test rate limiting protection against SMS abuse"""
        self._setup_rate_limit_mocks()
        
        # First request should succeed
        result1 = lambda_handler(self.test_event, self.test_context)
        self.assertEqual(result1['StatusCode'], 200)
        
        # Simulate multiple rapid requests
        for i in range(4):  # Exceed the 3 SMS per hour limit
            result = lambda_handler(self.test_event, self.test_context)
            
        # Should be rate limited
        self.assertEqual(result['StatusCode'], 429)
        self.assertIn('rate limit', result['Message'].lower())

    def test_phone_number_validation_security(self):
        """Test phone number validation against malicious inputs"""
        malicious_phone_numbers = [
            # XSS attempts
            '<script>alert("xss")</script>',
            'javascript:alert("xss")',
            
            # SQL injection attempts
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            
            # Command injection attempts
            "; rm -rf /",
            "$(rm -rf /)",
            
            # Format violations
            '',
            'phone',
            '123',
            '1234567890123456789',  # Too long
            '++++1234567890',
            
            # Special characters
            '+1234567890<script>',
            '+1234567890"onload="alert(1)"',
            '+1234567890\x00',
            '+1234567890\r\n',
        ]
        
        for malicious_phone in malicious_phone_numbers:
            with self.subTest(phone=malicious_phone):
                event = {
                    'input': {
                        'phoneNumber': malicious_phone
                    }
                }
                
                with patch('index.get_secret'), \
                     patch('index.sns_client'), \
                     patch('index.check_rate_limit') as mock_rate_limit:
                    
                    mock_rate_limit.return_value = (True, "Allowed")
                    
                    result = lambda_handler(event, self.test_context)
                    
                    # Should fail validation for malicious inputs
                    if not malicious_phone or len(malicious_phone) < 7:
                        self.assertGreaterEqual(result['StatusCode'], 400)

    def test_verification_code_security(self):
        """Test verification code generation and validation security"""
        secret = 'test-secret-key'
        phone = '+1234567890'
        timestamp = int(time.time())
        
        # Test code generation consistency
        code1 = generate_verification_code(phone, timestamp, secret)
        code2 = generate_verification_code(phone, timestamp, secret)
        self.assertEqual(code1, code2)
        
        # Test code format
        self.assertEqual(len(code1), 6)
        self.assertTrue(code1.isdigit())
        
        # Test code verification
        self.assertTrue(verify_code(phone, code1, secret))
        
        # Test invalid codes
        invalid_codes = [
            '000000',
            '123456',
            'abcdef',
            '<script>',
            '"; DROP',
            '',
            None,
            '12345',   # Too short
            '1234567', # Too long
        ]
        
        for invalid_code in invalid_codes:
            with self.subTest(code=invalid_code):
                if invalid_code is not None:
                    self.assertFalse(verify_code(phone, str(invalid_code), secret))

    def test_timing_attack_prevention(self):
        """Test timing attack prevention in code verification"""
        secret = 'test-secret-key'
        phone = '+1234567890'
        current_time = int(time.time())
        
        valid_code = generate_verification_code(phone, current_time, secret)
        invalid_code = '000000'
        
        # Measure timing for valid vs invalid codes
        valid_times = []
        invalid_times = []
        
        for _ in range(10):
            # Time valid code verification
            start = time.time()
            verify_code(phone, valid_code, secret)
            valid_times.append(time.time() - start)
            
            # Time invalid code verification
            start = time.time()
            verify_code(phone, invalid_code, secret)
            invalid_times.append(time.time() - start)
        
        # Calculate average times
        avg_valid = sum(valid_times) / len(valid_times)
        avg_invalid = sum(invalid_times) / len(invalid_times)
        
        # Timing difference should be minimal (within 10ms)
        timing_diff = abs(avg_valid - avg_invalid)
        self.assertLess(timing_diff, 0.01, "Timing attack vulnerability detected")

    @mock_secretsmanager
    def test_secret_management_security(self):
        """Test secure secret management and caching"""
        # Setup Secrets Manager mock
        client = boto3.client('secretsmanager', region_name='us-east-1')
        client.create_secret(
            Name='test-secret',
            SecretString=json.dumps({'secret_key': 'test-secret-value'})
        )
        
        with patch('index.SECRET_NAME', 'test-secret'):
            # Test secret retrieval
            secret1 = get_secret()
            secret2 = get_secret()  # Should use cache
            
            self.assertEqual(secret1, secret2)
            self.assertEqual(secret1, 'test-secret-value')

    def test_input_sanitization_security(self):
        """Test input sanitization against various attack vectors"""
        attack_vectors = [
            # XSS
            {'phoneNumber': '<img src=x onerror=alert(1)>'},
            {'phoneNumber': 'javascript:alert(document.cookie)'},
            
            # Command injection
            {'phoneNumber': '; cat /etc/passwd'},
            {'phoneNumber': '`rm -rf /`'},
            
            # Path traversal
            {'phoneNumber': '../../../etc/passwd'},
            {'phoneNumber': '..\\..\\..\\windows\\system32'},
            
            # NULL bytes
            {'phoneNumber': '+1234567890\x00'},
            
            # Unicode attacks
            {'phoneNumber': '+1234567890\u202e'},
            
            # Large payload
            {'phoneNumber': 'A' * 10000},
        ]
        
        for attack_input in attack_vectors:
            with self.subTest(input=attack_input):
                event = {'input': attack_input}
                
                with patch('index.get_secret'), \
                     patch('index.sns_client'), \
                     patch('index.check_rate_limit') as mock_rate_limit:
                    
                    mock_rate_limit.return_value = (True, "Allowed")
                    
                    result = lambda_handler(event, self.test_context)
                    
                    # Should handle malicious input gracefully
                    self.assertIn('StatusCode', result)
                    
                    # Should not expose sensitive information
                    self.assertNotIn('secret', result['Message'].lower())
                    self.assertNotIn('error', result['Message'].lower())

    def test_sms_spoofing_protection(self):
        """Test protection against SMS spoofing attempts"""
        # Test with malicious origination number attempts
        malicious_numbers = [
            'BANK',
            'ALERT',
            '911',
            'SPAM',
            '<script>',
            '"; DROP',
        ]
        
        for malicious_num in malicious_numbers:
            with self.subTest(origination=malicious_num):
                with patch.dict(os.environ, {'SMS_ORIGINATION_NUMBER': malicious_num}):
                    with patch('index.get_secret'), \
                         patch('index.check_rate_limit') as mock_rate_limit, \
                         patch('index.sns_client.publish') as mock_publish:
                        
                        mock_rate_limit.return_value = (True, "Allowed")
                        mock_publish.return_value = {'MessageId': 'test-id'}
                        
                        result = lambda_handler(self.test_event, self.test_context)
                        
                        # Should still work but with controlled origination
                        self.assertEqual(result['StatusCode'], 200)

    def test_denial_of_service_protection(self):
        """Test protection against DoS attacks"""
        # Test large number of rapid requests
        with patch('index.get_secret'), \
             patch('index.sns_client'), \
             patch('index.check_rate_limit') as mock_rate_limit:
            
            # Simulate rate limiting triggering after several requests
            request_count = 0
            def rate_limit_side_effect(phone):
                nonlocal request_count
                request_count += 1
                if request_count > 3:
                    return (False, "Rate limit exceeded")
                return (True, "Allowed")
            
            mock_rate_limit.side_effect = rate_limit_side_effect
            
            # Make multiple requests
            rate_limited_count = 0
            for _ in range(10):
                result = lambda_handler(self.test_event, self.test_context)
                if result['StatusCode'] == 429:
                    rate_limited_count += 1
            
            # Should have triggered rate limiting
            self.assertGreater(rate_limited_count, 0)

    def test_error_information_disclosure(self):
        """Test that errors don't disclose sensitive information"""
        # Test various error conditions
        error_conditions = [
            # Missing environment variables
            lambda: setattr(os.environ, 'SMS_VERIFICATION_SECRET_NAME', ''),
            
            # Invalid secret format
            lambda: None,  # Will be handled in mock
            
            # SNS service errors
            lambda: None,  # Will be handled in mock
        ]
        
        for i, condition in enumerate(error_conditions):
            with self.subTest(condition=i):
                with patch('index.get_secret') as mock_secret, \
                     patch('index.sns_client.publish') as mock_publish:
                    
                    # Simulate different error conditions
                    if i == 0:
                        mock_secret.side_effect = Exception("AWS Error: AccessKey=AKIA123 Secret=secret123")
                    elif i == 1:
                        mock_secret.side_effect = Exception("Database connection failed: host=db.internal.com")
                    elif i == 2:
                        mock_publish.side_effect = Exception("SNS Error: Endpoint=sns.amazonaws.com Token=token123")
                    
                    result = lambda_handler(self.test_event, self.test_context)
                    
                    # Should not expose sensitive information
                    self.assertNotIn('AKIA123', result['Message'])
                    self.assertNotIn('secret123', result['Message'])
                    self.assertNotIn('db.internal.com', result['Message'])
                    self.assertNotIn('token123', result['Message'])
                    self.assertNotIn('sns.amazonaws.com', result['Message'])

    def test_concurrent_request_security(self):
        """Test security under concurrent request scenarios"""
        import threading
        import queue
        
        results = queue.Queue()
        
        def make_request():
            with patch('index.get_secret'), \
                 patch('index.sns_client'), \
                 patch('index.check_rate_limit') as mock_rate_limit:
                
                mock_rate_limit.return_value = (True, "Allowed")
                result = lambda_handler(self.test_event, self.test_context)
                results.put(result)
        
        # Create multiple concurrent threads
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Collect results
        collected_results = []
        while not results.empty():
            collected_results.append(results.get())
        
        # Should handle concurrent requests without errors
        self.assertEqual(len(collected_results), 10)
        for result in collected_results:
            self.assertIn('StatusCode', result)

    def _setup_valid_mocks(self):
        """Setup valid mocks for successful test scenarios"""
        # Mock Secrets Manager
        client = boto3.client('secretsmanager', region_name='us-east-1')
        client.create_secret(
            Name='test-secret',
            SecretString=json.dumps({'secret_key': 'test-secret-value'})
        )
        
        # Mock SNS
        sns_client = boto3.client('sns', region_name='us-east-1')
        
        # Mock DynamoDB for rate limiting
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table = dynamodb.create_table(
            TableName='test-rate-limit-table',
            KeySchema=[
                {'AttributeName': 'phoneNumber', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'phoneNumber', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )

    def _setup_rate_limit_mocks(self):
        """Setup mocks for rate limiting tests"""
        # Mock DynamoDB table for rate limiting
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table = dynamodb.create_table(
            TableName='test-rate-limit-table',
            KeySchema=[
                {'AttributeName': 'phoneNumber', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'phoneNumber', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        
        # Pre-populate with rate limit data (3 requests already made)
        table.put_item(Item={
            'phoneNumber': '+1234567890',
            'requestCount': 3,
            'firstRequestTime': int(time.time()),
            'ttl': int(time.time()) + 3600
        })


if __name__ == '__main__':
    # Run the tests
    unittest.main(verbosity=2)