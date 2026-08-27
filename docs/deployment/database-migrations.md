# Database Migrations & PostgreSQL Setup Guide — ParkTwin AI

ParkTwin AI supports both **SQLite** (default for local development and single-container execution) and **PostgreSQL** (production deployment with multi-worker concurrency).

---

## 1. Switching Database Backend

### SQLite Mode (Default)
By default, ParkTwin AI uses SQLite stored at `./data/parktwin.db`:
```bash
DATABASE_URL=sqlite+aiosqlite:///./data/parktwin.db
```

### PostgreSQL Mode
To run with PostgreSQL:
1. Install PostgreSQL driver support:
   ```bash
   pip install -e ".[postgres]"
   ```
2. Set the `DATABASE_URL` environment variable:
   ```bash
   DATABASE_URL=postgresql+asyncpg://parktwin:password@localhost:5432/parktwin_db
   ```

---

## 2. Running Schema Migrations with Alembic

ParkTwin AI manages database schemas across SQLite and PostgreSQL using **Alembic**.

### Migration Commands

- **Apply all pending migrations to the database**:
  ```bash
  alembic upgrade head
  ```

- **Check current database migration version**:
  ```bash
  alembic current
  ```

- **Generate a new migration revision (after modifying models)**:
  ```bash
  alembic revision --autogenerate -m "describe_changes"
  ```

- **Roll back the last migration**:
  ```bash
  alembic downgrade -1
  ```

---

## 3. Data Migration (SQLite → PostgreSQL)

To migrate an existing SQLite database into PostgreSQL:

```bash
python scripts/migrations/migrate_to_postgres.py \
    --sqlite-url sqlite+aiosqlite:///./data/parktwin.db \
    --postgres-url postgresql+asyncpg://parktwin:password@localhost:5432/parktwin_db
```

The migration tool is **idempotent**: it verifies primary keys in the PostgreSQL database and safely skips rows that have already been imported.
