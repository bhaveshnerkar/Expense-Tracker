
from flask import Flask, jsonify, request, send_from_directory
from pathlib import Path
from datetime import date
import sqlite3
import uuid

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
DB_PATH = BASE_DIR / "expenses.db"

app = Flask(
    __name__,
    static_folder=str(FRONTEND_DIR),
    static_url_path="/static"
)


# ---------- DATABASE ----------

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                notes TEXT DEFAULT '',
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)


# ---------- FRONTEND ----------

@app.route("/")
def home():
    return send_from_directory(str(FRONTEND_DIR), "index.html")




# ---------- API: GET ALL ----------

@app.route("/api/expenses", methods=["GET"])
def get_expenses():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM expenses ORDER BY date DESC"
        ).fetchall()

    return jsonify([dict(row) for row in rows])


# ---------- API: ADD ----------

@app.route("/api/expenses", methods=["POST"])
def add_expense():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON data"}), 400

    name = str(data.get("name", "")).strip()
    category = str(data.get("category", "Other")).strip() or "Other"
    notes = str(data.get("notes", "")).strip()
    expense_date = str(data.get("date", date.today().isoformat()))

    try:
        amount = float(data.get("amount", 0))
        date.fromisoformat(expense_date)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid amount or date"}), 400

    if not name or amount <= 0:
        return jsonify({"error": "Enter a name and positive amount"}), 400

    expense_id = str(uuid.uuid4())

    with get_db() as conn:
        conn.execute("""
            INSERT INTO expenses
            (id, name, amount, category, date, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (expense_id, name, amount, category,
              expense_date, notes))

        row = conn.execute(
            "SELECT * FROM expenses WHERE id = ?",
            (expense_id,)
        ).fetchone()

    return jsonify(dict(row)), 201


# ---------- API: UPDATE ----------

@app.route("/api/expenses/<expense_id>", methods=["PUT"])
def update_expense(expense_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON data"}), 400

    name = str(data.get("name", "")).strip()
    category = str(data.get("category", "Other")).strip() or "Other"
    notes = str(data.get("notes", "")).strip()
    expense_date = str(data.get("date", "")).strip()

    try:
        amount = float(data.get("amount", 0))
        date.fromisoformat(expense_date)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid amount or date"}), 400

    if not name or amount <= 0:
        return jsonify({"error": "Invalid expense details"}), 400

    with get_db() as conn:
        cursor = conn.execute("""
            UPDATE expenses
            SET name=?, amount=?, category=?, date=?, notes=?
            WHERE id=?
        """, (name, amount, category, expense_date, notes, expense_id))

        if cursor.rowcount == 0:
            return jsonify({"error": "Expense not found"}), 404

        row = conn.execute(
            "SELECT * FROM expenses WHERE id=?",
            (expense_id,)
        ).fetchone()

    return jsonify(dict(row))


# ---------- API: DELETE ONE ----------

@app.route("/api/expenses/<expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    with get_db() as conn:
        cursor = conn.execute(
            "DELETE FROM expenses WHERE id=?",
            (expense_id,)
        )

    if cursor.rowcount == 0:
        return jsonify({"error": "Expense not found"}), 404

    return jsonify({"message": "Expense deleted"})


# ---------- API: DELETE ALL ----------

@app.route("/api/expenses", methods=["DELETE"])
def delete_all_expenses():
    with get_db() as conn:
        conn.execute("DELETE FROM expenses")

    return jsonify({"message": "All expenses deleted"})


# ---------- START ----------

if __name__ == "__main__":
    if not (FRONTEND_DIR / "index.html").exists():
        raise FileNotFoundError(
            f"index.html not found inside: {FRONTEND_DIR}"
        )

    init_db()
    print("Database ready.")
    print("Open http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
