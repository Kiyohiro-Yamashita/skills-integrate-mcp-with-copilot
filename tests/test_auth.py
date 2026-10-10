import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.security import HTTPBasicCredentials

from src.app import (
    activities,
    get_activities,
    get_staff_activities,
    hash_staff_password,
    require_staff,
    verify_staff_password,
)


class StaffAuthenticationTests(unittest.TestCase):
    def setUp(self):
        self.password = "test-only-password"
        self.password_hash = hash_staff_password(self.password)
        self.environment = patch.dict(
            os.environ,
            {
                "STAFF_USERNAME": "staff-test",
                "STAFF_PASSWORD_HASH": self.password_hash,
            },
        )
        self.environment.start()

    def tearDown(self):
        self.environment.stop()

    def test_password_hash_verifies_without_storing_plaintext(self):
        self.assertNotIn(self.password, self.password_hash)
        self.assertTrue(verify_staff_password(self.password, self.password_hash))
        self.assertFalse(verify_staff_password("wrong-password", self.password_hash))

    def test_valid_staff_credentials_are_accepted(self):
        credentials = HTTPBasicCredentials(
            username="staff-test", password=self.password
        )

        self.assertEqual(require_staff(credentials), "staff-test")

    def test_invalid_or_missing_credentials_are_rejected(self):
        invalid_credentials = HTTPBasicCredentials(
            username="staff-test", password="wrong-password"
        )

        for credentials in (None, invalid_credentials):
            with self.subTest(credentials=credentials):
                with self.assertRaises(HTTPException) as error:
                    require_staff(credentials)
                self.assertEqual(error.exception.status_code, 401)

    def test_unconfigured_staff_credentials_fail_closed(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(HTTPException) as error:
                require_staff(None)

        self.assertEqual(error.exception.status_code, 503)

    def test_public_activity_response_does_not_expose_participant_emails(self):
        public_activities = get_activities()

        self.assertNotIn("participants", public_activities["Chess Club"])
        self.assertEqual(
            public_activities["Chess Club"]["participant_count"],
            len(activities["Chess Club"]["participants"]),
        )

    def test_staff_roster_contains_participant_emails(self):
        staff_activities = get_staff_activities("staff-test")

        self.assertEqual(
            staff_activities["Chess Club"]["participants"],
            activities["Chess Club"]["participants"],
        )


if __name__ == "__main__":
    unittest.main()