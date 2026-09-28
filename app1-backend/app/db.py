"""SQLite-backed estimate history (stdlib only; one short-lived connection per call)."""
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS estimates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  label TEXT,
  payload TEXT NOT NULL
)"""


class HistoryStore:
    def __init__(self, path: Path):
        self.path = Path(path)
        if str(path) != ":memory:":
            self.path.parent.mkdir(parents=True, exist_ok=True)
        self._keep: sqlite3.Connection | None = None
        if str(path) == ":memory:":  # tests: one shared connection
            self._keep = sqlite3.connect(":memory:", check_same_thread=False)
        with self._conn() as c:
            c.execute(SCHEMA)

    @contextmanager
    def _conn(self):
        c = self._keep or sqlite3.connect(self.path)
        c.row_factory = sqlite3.Row
        try:
            yield c
            c.commit()
        finally:
            if not self._keep:
                c.close()

    @staticmethod
    def _row(r) -> dict:
        d = json.loads(r["payload"])
        return {"id": r["id"], "created_at": r["created_at"], "label": r["label"], **d}

    def add(self, label: str | None, payload: dict) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        with self._conn() as c:
            cur = c.execute(
                "INSERT INTO estimates(created_at,label,payload) VALUES (?,?,?)",
                (now, label, json.dumps(payload)),
            )
            return self._row(c.execute("SELECT * FROM estimates WHERE id=?", (cur.lastrowid,)).fetchone())

    def get_many(self, ids: list[int]) -> list[dict]:
        with self._conn() as c:
            rows = {r["id"]: self._row(r) for r in c.execute(
                f"SELECT * FROM estimates WHERE id IN ({','.join('?' * len(ids))})", ids)}
        return [rows[i] for i in ids if i in rows]

    def get(self, id_: int) -> dict | None:
        found = self.get_many([id_])
        return found[0] if found else None

    def list(self, limit: int = 50, offset: int = 0) -> tuple[list[dict], int]:
        with self._conn() as c:
            total = c.execute("SELECT COUNT(*) FROM estimates").fetchone()[0]
            rows = c.execute("SELECT * FROM estimates ORDER BY id DESC LIMIT ? OFFSET ?", (limit, offset))
            return [self._row(r) for r in rows], total

    def delete(self, id_: int) -> bool:
        with self._conn() as c:
            return c.execute("DELETE FROM estimates WHERE id=?", (id_,)).rowcount > 0

    def clear(self) -> int:
        with self._conn() as c:
            return c.execute("DELETE FROM estimates").rowcount
