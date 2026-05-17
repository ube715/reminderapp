from flask import Flask, g, jsonify, request
from flask_cors import CORS
import os
import sqlite3
import uuid
import base64
import threading
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)

# Use /tmp for serverless database (ephemeral, but works for demo)
DATABASE = "/tmp/reminders.db"
WELLNESS_PROFILE_ID = "default"

# Twilio environment variables
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_MESSAGING_SERVICE_SID = os.getenv("TWILIO_MESSAGING_SERVICE_SID", "").strip()

# Demo credentials
DEMO_USERS = {
    "demo@example.com": "demo123",
}

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL;")
        g.db.execute("PRAGMA foreign_keys=ON;")
    return g.db

@app.teardown_appcontext
def close_db(_exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()

def init_db():
    db = sqlite3.connect(DATABASE)
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS reminders (
            id          TEXT PRIMARY KEY,
            message     TEXT NOT NULL,
            status      TEXT NOT NULL DEFAULT 'pending',
            created_at  TEXT NOT NULL,
            reminded_at TEXT
        );
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS wellness_profile (
            profile_id     TEXT PRIMARY KEY,
            contact_number TEXT,
            water_intake   INTEGER NOT NULL DEFAULT 0,
            step_count     INTEGER NOT NULL DEFAULT 0,
            weight_kg      REAL,
            height_cm      REAL,
            bmi            REAL,
            updated_at     TEXT NOT NULL
        );
        """
    )
    db.commit()
    db.close()

def row_to_dict(row):
    return dict(row) if row else None

def normalize_phone_number(contact_number):
    if not contact_number:
        return ""
    
    contact_number = str(contact_number).strip()
    digits = "".join(filter(str.isdigit, contact_number))
    
    if not digits:
        return str(contact_number).strip()
    
    if len(digits) == 10:
        return f"+1{digits}"
    
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    
    if digits.startswith("+"):
        return digits
    
    return f"+{digits}" if digits else ""

def send_twilio_sms(to_number, body_text):
    if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_MESSAGING_SERVICE_SID):
        raise RuntimeError("Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID.")
    
    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
    payload = urlparse.urlencode(
        {
            "MessagingServiceSid": TWILIO_MESSAGING_SERVICE_SID,
            "To": to_number,
            "Body": body_text,
        }
    ).encode("utf-8")
    credentials = base64.b64encode(f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode("utf-8")).decode("ascii")
    
    request_obj = urlrequest.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    
    try:
        with urlrequest.urlopen(request_obj, timeout=15) as response:
            response_text = response.read().decode("utf-8")
    except urlerror.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Twilio request failed with status {exc.code}: {error_body or exc.reason}") from exc
    
    return response_text

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Reminder API is running"}), 200

@app.route("/api/wellness/profile", methods=["GET"])
def get_wellness_profile():
    init_db()
    db = get_db()
    row = db.execute(
        "SELECT * FROM wellness_profile WHERE profile_id = ?",
        (WELLNESS_PROFILE_ID,)
    ).fetchone()
    
    if row:
        return jsonify(row_to_dict(row)), 200
    else:
        return jsonify({
            "profile_id": WELLNESS_PROFILE_ID,
            "contact_number": None,
            "water_intake": 0,
            "step_count": 0,
            "weight_kg": None,
            "height_cm": None,
            "bmi": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }), 200

@app.route("/api/wellness/profile", methods=["PUT"])
def update_wellness_profile():
    init_db()
    db = get_db()
    data = request.get_json()
    
    contact_number = data.get("contact_number")
    water_intake = data.get("water_intake", 0)
    step_count = data.get("step_count", 0)
    weight_kg = data.get("weight_kg")
    height_cm = data.get("height_cm")
    bmi = data.get("bmi")
    
    updated_at = datetime.now(timezone.utc).isoformat()
    
    db.execute(
        """
        INSERT OR REPLACE INTO wellness_profile
        (profile_id, contact_number, water_intake, step_count, weight_kg, height_cm, bmi, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (WELLNESS_PROFILE_ID, contact_number, water_intake, step_count, weight_kg, height_cm, bmi, updated_at)
    )
    db.commit()
    
    return jsonify({
        "message": "Wellness profile updated.",
        "profile_id": WELLNESS_PROFILE_ID,
        "contact_number": contact_number,
        "water_intake": water_intake,
        "step_count": step_count,
        "weight_kg": weight_kg,
        "height_cm": height_cm,
        "bmi": bmi,
        "updated_at": updated_at
    }), 200

@app.route("/api/wellness/water-reminder", methods=["POST"])
def send_water_reminder_sms():
    init_db()
    data = request.get_json()
    contact_number = data.get("contact_number", "").strip()
    message = data.get("message", "You should drink water.")
    delayed_message = data.get("delayed_message", message)
    delay_seconds = data.get("delay_seconds", 30)
    
    if not contact_number:
        return jsonify({"error": "contact_number is required"}), 400
    
    normalized_number = normalize_phone_number(contact_number)
    
    try:
        result = send_twilio_sms(normalized_number, message)
        return jsonify({
            "message": "Water reminder sent.",
            "contact_number": normalized_number,
            "delayed_message": delayed_message,
            "immediate_result": result
        }), 200
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()
    
    if email not in DEMO_USERS:
        return jsonify({"error": "Invalid email or password"}), 401
    
    if DEMO_USERS[email] != password:
        return jsonify({"error": "Invalid email or password"}), 401
    
    return jsonify({
        "token": "demo-token",
        "user": {
            "id": "demo-user",
            "email": email,
            "name": "Demo User"
        },
        "message": "Login successful"
    }), 200

@app.route("/api/reminders", methods=["POST"])
def create_reminder():
    init_db()
    db = get_db()
    data = request.get_json()
    message = data.get("message", "").strip()
    
    if not message:
        return jsonify({"error": "message is required"}), 400
    
    reminder_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    
    db.execute(
        "INSERT INTO reminders (id, message, status, created_at) VALUES (?, ?, ?, ?)",
        (reminder_id, message, "pending", created_at)
    )
    db.commit()
    
    return jsonify({
        "id": reminder_id,
        "message": message,
        "status": "pending",
        "created_at": created_at,
        "reminded_at": None
    }), 201

@app.route("/api/reminders", methods=["GET"])
def list_reminders():
    init_db()
    db = get_db()
    status = request.args.get("status")
    
    if status:
        rows = db.execute(
            "SELECT * FROM reminders WHERE status = ? ORDER BY created_at DESC",
            (status,)
        ).fetchall()
    else:
        rows = db.execute("SELECT * FROM reminders ORDER BY created_at DESC").fetchall()
    
    reminders = [row_to_dict(row) for row in rows]
    return jsonify(reminders), 200

@app.route("/api/reminders/<reminder_id>", methods=["GET"])
def get_reminder(reminder_id):
    init_db()
    db = get_db()
    row = db.execute("SELECT * FROM reminders WHERE id = ?", (reminder_id,)).fetchone()
    
    if not row:
        return jsonify({"error": "Reminder not found"}), 404
    
    return jsonify(row_to_dict(row)), 200

@app.route("/api/reminders/<reminder_id>", methods=["PUT"])
def update_reminder(reminder_id):
    init_db()
    db = get_db()
    data = request.get_json()
    
    row = db.execute("SELECT * FROM reminders WHERE id = ?", (reminder_id,)).fetchone()
    if not row:
        return jsonify({"error": "Reminder not found"}), 404
    
    message = data.get("message", row["message"])
    status = data.get("status", row["status"])
    reminded_at = data.get("reminded_at", row["reminded_at"])
    
    db.execute(
        "UPDATE reminders SET message = ?, status = ?, reminded_at = ? WHERE id = ?",
        (message, status, reminded_at, reminder_id)
    )
    db.commit()
    
    return jsonify({
        "id": reminder_id,
        "message": message,
        "status": status,
        "created_at": row["created_at"],
        "reminded_at": reminded_at
    }), 200

@app.route("/api/reminders/<reminder_id>", methods=["DELETE"])
def delete_reminder(reminder_id):
    init_db()
    db = get_db()
    row = db.execute("SELECT * FROM reminders WHERE id = ?", (reminder_id,)).fetchone()
    
    if not row:
        return jsonify({"error": "Reminder not found"}), 404
    
    db.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
    db.commit()
    
    return jsonify({"message": "Reminder deleted"}), 200

@app.route("/api/reminders/<reminder_id>/mark-done", methods=["PUT"])
def mark_reminder_done(reminder_id):
    init_db()
    db = get_db()
    row = db.execute("SELECT * FROM reminders WHERE id = ?", (reminder_id,)).fetchone()
    
    if not row:
        return jsonify({"error": "Reminder not found"}), 404
    
    reminded_at = datetime.now(timezone.utc).isoformat()
    db.execute(
        "UPDATE reminders SET status = ?, reminded_at = ? WHERE id = ?",
        ("completed", reminded_at, reminder_id)
    )
    db.commit()
    
    return jsonify({
        "id": reminder_id,
        "message": row["message"],
        "status": "completed",
        "created_at": row["created_at"],
        "reminded_at": reminded_at
    }), 200

# Vercel serverless handler
def handler(request):
    return app(environ={**request.environ, 'wsgi.input': request.stream}, start_response)
