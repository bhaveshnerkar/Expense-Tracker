
from datetime import date, datetime
from pathlib import Path
import sqlite3
import uuid

from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
DB_PATH = BASE_DIR / "expenses.db"

app = Flask(
    __name__,
    static_folder=str(FRONTEND_DIR),
    static_url_path="/static",
)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    FRONTEND_DIR.mkdir(exist_ok=True)

    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL DEFAULT 'Other',
                date TEXT NOT NULL,
                notes TEXT DEFAULT '',
                createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)


@app.get("/")
def home():
    return send_from_directory(str(FRONTEND_DIR), "index.html")


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "message": "API is running"})


@app.get("/api/expenses")
def list_expenses():
    with get_db() as conn:
        rows = conn.execute("""
            SELECT id, name, amount, category, date, notes, createdAt
            FROM expenses
            ORDER BY date DESC, createdAt DESC
        """).fetchall()

    return jsonify([dict(row) for row in rows])


@app.post("/api/expenses")
def create_expense():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON data"}), 400

    name = str(data.get("name", "")).strip()
    category = str(data.get("category", "Other")).strip() or "Other"
    notes = str(data.get("notes", "")).strip()
    expense_date = str(data.get("date", date.today().isoformat())).strip()

    try:
        amount = float(data.get("amount", 0))
        date.fromisoformat(expense_date)
    except (TypeError, ValueError):
        return jsonify({"error": "Enter a valid amount and date"}), 400

    if not name:
        return jsonify({"error": "Expense name is required"}), 400

    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero"}), 400

    expense_id = str(uuid.uuid4())
    created_at = datetime.now().isoformat(timespec="seconds")

    with get_db() as conn:
        conn.execute("""
            INSERT INTO expenses
                (id, name, amount, category, date, notes, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            expense_id,
            name,
            amount,
            category,
            expense_date,
            notes,
            created_at,
        ))

        row = conn.execute("""
            SELECT id, name, amount, category, date, notes, createdAt
            FROM expenses
            WHERE id = ?
        """, (expense_id,)).fetchone()

    return jsonify(dict(row)), 201


@app.put("/api/expenses/<expense_id>")
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
    except (TypeError, ValueError):
        return jsonify({"error": "Enter a valid amount and date"}), 400

    if not name or amount <= 0:
        return jsonify({"error": "Enter a name and positive amount"}), 400

    with get_db() as conn:
        cursor = conn.execute("""
            UPDATE expenses
            SET name = ?, amount = ?, category = ?, date = ?, notes = ?
            WHERE id = ?
        """, (name, amount, category, expense_date, notes, expense_id))

        if cursor.rowcount == 0:
            return jsonify({"error": "Expense not found"}), 404

        row = conn.execute("""
            SELECT id, name, amount, category, date, notes, createdAt
            FROM expenses
            WHERE id = ?
        """, (expense_id,)).fetchone()

    return jsonify(dict(row))


@app.delete("/api/expenses/<expense_id>")
def delete_expense(expense_id):
    with get_db() as conn:
        cursor = conn.execute(
            "DELETE FROM expenses WHERE id = ?", (expense_id,)
        )

    if cursor.rowcount == 0:
        return jsonify({"error": "Expense not found"}), 404

    return jsonify({"ok": True, "message": "Expense deleted"})


@app.delete("/api/expenses")
def delete_all_expenses():
    with get_db() as conn:
        conn.execute("DELETE FROM expenses")

    return jsonify({"ok": True, "message": "All expenses deleted"})


if __name__ == "__main__":
    if not (FRONTEND_DIR / "index.html").is_file():
        raise FileNotFoundError(
            f"index.html not found inside: {FRONTEND_DIR}"
        )

    init_db()
    print("Expense Tracker database ready.")
    print("Open http://127.0.0.1:5000/")
    app.run(host="127.0.0.1", port=5000, debug=False)
