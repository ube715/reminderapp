
import os
import sqlite3
import uuid
import base64
import threading
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest
from datetime import datetime, timezone

from flask import Flask, g, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  
DATABASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reminders.db")
WELLNESS_PROFILE_ID = "default"
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_MESSAGING_SERVICE_SID = os.getenv("TWILIO_MESSAGING_SERVICE_SID", "").strip()

# Simple in-memory demo credentials (in production, use proper auth)
DEMO_USERS = {
    "demo@example.com": "demo123",
}

def get_db():
    """Open a per-request database connection stored on Flask's `g` object."""
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
    """Create the reminders table if it doesn't exist."""
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
    """Convert a sqlite3.Row to a plain dictionary."""
    return dict(row)


def calculate_bmi(weight_kg, height_cm):
    if not weight_kg or not height_cm:
        return None

    height_m = height_cm / 100
    if height_m <= 0:
        return None

    return round(weight_kg / (height_m * height_m), 1)


def get_default_wellness_profile():
    return {
        "profile_id": WELLNESS_PROFILE_ID,
        "contact_number": "",
        "water_intake": 0,
        "step_count": 0,
        "weight_kg": None,
        "height_cm": None,
        "bmi": None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def normalize_phone_number(contact_number):
    digits = "".join(character for character in str(contact_number) if character.isdigit())

    if str(contact_number).strip().startswith("+"):
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

    request = urlrequest.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(request, timeout=15) as response:
            response_text = response.read().decode("utf-8")
    except urlerror.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Twilio request failed with status {exc.code}: {error_body or exc.reason}") from exc

    return response_text


def schedule_twilio_sms(contact_number, body_text, delay_seconds=30):
    timer = threading.Timer(delay_seconds, lambda: send_twilio_sms(contact_number, body_text))
    timer.daemon = True
    timer.start()

@app.route("/api/health", methods=["GET"])
def health_check():
    """Simple health check endpoint."""
    return jsonify({"status": "ok", "message": "Reminder API is running"}), 200


@app.route("/api/wellness/profile", methods=["GET"])
def get_wellness_profile():
    db = get_db()
    row = db.execute(
        "SELECT * FROM wellness_profile WHERE profile_id = ?",
        (WELLNESS_PROFILE_ID,),
    ).fetchone()

    if row is None:
                return jsonify(get_default_wellness_profile()), 200

    return jsonify(row_to_dict(row)), 200


@app.route("/api/wellness/profile", methods=["PUT", "PATCH"])
def update_wellness_profile():
    data = request.get_json(silent=True) or {}
    db = get_db()

    existing = db.execute(
        "SELECT * FROM wellness_profile WHERE profile_id = ?",
        (WELLNESS_PROFILE_ID,),
    ).fetchone()

    current = get_default_wellness_profile()
    if existing is not None:
        current.update(row_to_dict(existing))

    contact_number = str(data.get("contact_number", current["contact_number"]))
    water_intake = int(data.get("water_intake", current["water_intake"]) or 0)
    step_count = int(data.get("step_count", current["step_count"]) or 0)

    weight_value = data.get("weight_kg", current["weight_kg"])
    height_value = data.get("height_cm", current["height_cm"])

    try:
        weight_kg = float(weight_value) if weight_value not in (None, "") else None
    except (TypeError, ValueError):
        weight_kg = None

    try:
        height_cm = float(height_value) if height_value not in (None, "") else None
    except (TypeError, ValueError):
        height_cm = None

    profile = {
        "profile_id": WELLNESS_PROFILE_ID,
        "contact_number": contact_number,
        "water_intake": water_intake,
        "step_count": step_count,
        "weight_kg": weight_kg,
        "height_cm": height_cm,
        "bmi": calculate_bmi(weight_kg, height_cm),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    db.execute(
        """
        INSERT INTO wellness_profile (
            profile_id, contact_number, water_intake, step_count,
            weight_kg, height_cm, bmi, updated_at
        ) VALUES (
            :profile_id, :contact_number, :water_intake, :step_count,
            :weight_kg, :height_cm, :bmi, :updated_at
        )
        ON CONFLICT(profile_id) DO UPDATE SET
            contact_number = excluded.contact_number,
            water_intake = excluded.water_intake,
            step_count = excluded.step_count,
            weight_kg = excluded.weight_kg,
            height_cm = excluded.height_cm,
            bmi = excluded.bmi,
            updated_at = excluded.updated_at
        """,
        profile,
    )
    db.commit()

    return jsonify(profile), 200


@app.route("/api/wellness/water-reminder", methods=["POST"])
def send_water_reminder_sms():
    data = request.get_json(silent=True) or {}
    contact_number = normalize_phone_number(data.get("contact_number", ""))
    message_body = str(data.get("message", "You should drink water.")).strip() or "You should drink water."
    delayed_message = str(data.get("delayed_message", "You should drink water.")).strip() or "You should drink water."

    if not contact_number:
        return jsonify({"error": "A valid contact_number is required."}), 400

    try:
        immediate_result = send_twilio_sms(contact_number, message_body)
        schedule_twilio_sms(contact_number, delayed_message, int(data.get("delay_seconds", 30) or 30))
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 503

    return jsonify(
        {
            "message": "Water reminder sent.",
            "contact_number": contact_number,
            "immediate_result": immediate_result,
            "delayed_message": delayed_message,
        }
    ), 200


@app.route("/api/auth/login", methods=["POST"])
def login():
    """
    Login endpoint.

    Body (JSON):
        { "email": "demo@example.com", "password": "demo123" }

    Returns a token on successful login.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required."}), 400

    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    # Check credentials against demo users
    if email in DEMO_USERS and DEMO_USERS[email] == password:
        # Generate a simple token (in production, use JWT or similar)
        token = f"token_{uuid.uuid4().hex}"
        return (
            jsonify({
                "token": token,
                "user": {"email": email},
                "message": "Login successful"
            }),
            200,
        )

    return jsonify({"error": "Invalid email or password."}), 401


@app.route("/api/reminders", methods=["POST"])
def create_reminder():
    """
    Create a new reminder.

    Body (JSON):
        { "message": "Take medicine at 3 PM" }

    Returns the created reminder with a generated id.
    """
    data = request.get_json(silent=True)
    if not data or not data.get("message", "").strip():
        return jsonify({"error": "A non-empty 'message' field is required."}), 400

    reminder = {
        "id": uuid.uuid4().hex,
        "message": data["message"].strip(),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reminded_at": None,
    }

    db = get_db()
    db.execute(
        """
        INSERT INTO reminders (id, message, status, created_at, reminded_at)
        VALUES (:id, :message, :status, :created_at, :reminded_at)
        """,
        reminder,
    )
    db.commit()

    return jsonify(reminder), 201


@app.route("/api/reminders", methods=["GET"])
def list_reminders():
    """
    Return all reminders, newest first.

    Optional query params:
        ?status=pending   → filter by status (pending | done)
    """
    db = get_db()
    status_filter = request.args.get("status")

    if status_filter:
        rows = db.execute(
            "SELECT * FROM reminders WHERE status = ? ORDER BY created_at DESC",
            (status_filter,),
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM reminders ORDER BY created_at DESC"
        ).fetchall()

    return jsonify([row_to_dict(r) for r in rows]), 200

@app.route("/api/reminders/<reminder_id>", methods=["GET"])
def get_reminder(reminder_id):
    """Return a single reminder by id."""
    db = get_db()
    row = db.execute(
        "SELECT * FROM reminders WHERE id = ?", (reminder_id,)
    ).fetchone()

    if row is None:
        return jsonify({"error": "Reminder not found."}), 404

    return jsonify(row_to_dict(row)), 200


@app.route("/api/reminders/<reminder_id>", methods=["PUT", "PATCH"])
def update_reminder(reminder_id):
    """
    Update a reminder's message or status.

    Body (JSON – all fields optional):
        { "message": "Updated text", "status": "done" }
    """
    db = get_db()
    existing = db.execute(
        "SELECT * FROM reminders WHERE id = ?", (reminder_id,)
    ).fetchone()

    if existing is None:
        return jsonify({"error": "Reminder not found."}), 404

    data = request.get_json(silent=True) or {}
    new_message = data.get("message", existing["message"])
    new_status = data.get("status", existing["status"])
    reminded_at = existing["reminded_at"]

    if new_status == "done" and existing["status"] != "done":
        reminded_at = datetime.now(timezone.utc).isoformat()

    db.execute(
        """
        UPDATE reminders
           SET message = ?, status = ?, reminded_at = ?
         WHERE id = ?
        """,
        (new_message, new_status, reminded_at, reminder_id),
    )
    db.commit()

    updated = db.execute(
        "SELECT * FROM reminders WHERE id = ?", (reminder_id,)
    ).fetchone()

    return jsonify(row_to_dict(updated)), 200

@app.route("/api/reminders/<reminder_id>", methods=["DELETE"])
def delete_reminder(reminder_id):
    """Delete a reminder by id."""
    db = get_db()
    existing = db.execute(
        "SELECT * FROM reminders WHERE id = ?", (reminder_id,)
    ).fetchone()

    if existing is None:
        return jsonify({"error": "Reminder not found."}), 404

    db.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
    db.commit()

    return jsonify({"message": "Reminder deleted.", "id": reminder_id}), 200

if __name__ == "__main__":
    init_db()
    port_value = os.getenv("PORT", "5000")
    try:
        port = int(port_value)
    except ValueError:
        port = 5000

    debug_value = os.getenv("FLASK_DEBUG", "").strip().lower()
    debug = debug_value in {"1", "true", "yes", "on"}

    print(f"\n  🔔 Reminder API running at http://localhost:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=debug)
