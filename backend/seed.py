"""
Optional helper script that populates the local SQLite database with a demo
user and sample bug reports, so the Dashboard / Bug History / Analytics pages
have something to show immediately after setup.

Run from the backend/ directory, with the virtual environment active:
    python seed.py
"""
import random
import datetime

from app.database import Base, engine, SessionLocal
from app import models
from app.auth import hash_password

Base.metadata.create_all(bind=engine)

DEMO_EMAIL = "demo@bugadvisor.dev"
DEMO_PASSWORD = "demo1234"

SAMPLE_BUGS = [
    ("Null pointer on checkout submit", "Checkout crashes when the cart is empty and the user hits submit.", "Frontend", "High", "P2"),
    ("Login API returns 500 on special characters", "Passwords containing '&' cause a 500 error from /api/auth/login.", "Backend", "Critical", "P1"),
    ("Dashboard chart flickers on resize", "Chart.js canvas flickers when the browser window is resized quickly.", "Frontend", "Low", "P3"),
    ("Duplicate bug entries after retry", "Submitting a bug report twice due to a network retry creates duplicate rows.", "Database", "Medium", "P2"),
    ("Analytics summary slow with 10k+ bugs", "The /api/analytics/summary endpoint takes 4s+ to respond on large datasets.", "Backend", "Medium", "P2"),
    ("Stack trace field not saving newlines", "Multi-line stack traces are stored as a single line, losing formatting.", "Database", "Low", "P3"),
    ("Session expires without warning", "JWT expiry logs the user out silently with no toast or notification.", "Frontend", "Medium", "P2"),
    ("Race condition on concurrent bug updates", "Two PATCH requests to the same bug can overwrite each other's changes.", "Backend", "High", "P1"),
    ("CORS error on staging environment", "Staging frontend can't reach the API due to a missing CORS origin entry.", "Infra", "Critical", "P0"),
    ("Pagination off-by-one on last page", "The last page of Bug History sometimes renders an empty table.", "Frontend", "Low", "P3"),
]

STATUSES = list(models.StatusEnum)


def run():
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == DEMO_EMAIL).first()
        if not user:
            user = models.User(
                full_name="Demo User",
                email=DEMO_EMAIL,
                hashed_password=hash_password(DEMO_PASSWORD),
                role="Developer",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")
        else:
            print(f"Demo user already exists: {DEMO_EMAIL}")

        if db.query(models.Bug).count() > 0:
            print("Bugs table already has data, skipping bug seeding.")
            return

        for i, (title, desc, category, severity, priority) in enumerate(SAMPLE_BUGS):
            created = datetime.datetime.utcnow() - datetime.timedelta(
                days=random.randint(0, 13), hours=random.randint(0, 23)
            )
            status = random.choice(STATUSES)
            resolution_notes = None
            if status in (models.StatusEnum.resolved, models.StatusEnum.closed):
                resolution_notes = "Fixed and verified in staging before release."

            bug = models.Bug(
                title=title,
                description=desc,
                stack_trace=f'Traceback (most recent call last):\n  File "app/module_{i}.py", line {10 + i}, in handler\n    raise RuntimeError("{title}")',
                category=category,
                severity=severity,
                priority=priority,
                status=status,
                resolution_notes=resolution_notes,
                reporter_id=user.id,
                created_at=created,
                updated_at=created,
            )
            db.add(bug)

        db.commit()
        print(f"Seeded {len(SAMPLE_BUGS)} sample bugs.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
