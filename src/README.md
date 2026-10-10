# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Staff can sign up and unregister students
- Public activity listings show registration counts without exposing student email addresses
- Staff-only participant rosters

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Configure a staff account. Generate a salted PBKDF2 password hash; enter the password when prompted:

   ```bash
   export STAFF_USERNAME=staff
   export STAFF_PASSWORD_HASH="$(python3 -c 'import base64, getpass, hashlib, secrets; p=getpass.getpass(); s=secrets.token_bytes(16); n=310000; d=hashlib.pbkdf2_hmac("sha256", p.encode(), s, n); print(f"pbkdf2_sha256${n}${base64.urlsafe_b64encode(s).decode()}${base64.urlsafe_b64encode(d).decode()}")')"
   ```

3. Run the application from the repository root:

   ```bash
   uvicorn src.app:app --reload
   ```

4. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc
   - Activities page: http://localhost:8000/

Staff credentials are sent using HTTP Basic authentication. Use HTTPS whenever the app is accessed beyond a local development environment. Student self-service changes are disabled until a student identity-verification method is configured.

## API Endpoints

| Method | Endpoint                                                          | Description                                                         |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Get public activity details and participant counts                 |
| GET    | `/staff/session`                                                  | Verify staff credentials (HTTP Basic)                              |
| GET    | `/staff/activities`                                               | Get activities and participant emails (staff only)                 |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Register a student (staff only)                                     |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Unregister a student (staff only)                                |

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

Activity and signup data is stored in memory, which means it will be reset when the server restarts. Staff credentials are configured separately through environment variables; the password is stored as a salted PBKDF2 hash, not as plaintext.
