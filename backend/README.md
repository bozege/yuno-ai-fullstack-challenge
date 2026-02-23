# Kijani Retry Hub - Backend

FastAPI + SQLAlchemy (SQLite) backend.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed_data
uvicorn app.main:app --reload
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs
