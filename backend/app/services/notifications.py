"""
Notification service
-----------------------
Thin helpers for creating in-app notifications. There is no delivery
mechanism beyond the database row itself — no email, no websocket push, no
browser push. The frontend polls GET /api/notifications and shows a badge;
that is the entire "notification" system in this build. Documented here so
it's not overstated anywhere else.
"""
from sqlalchemy.orm import Session

from app import models


def notify(db: Session, user_id: int, notif_type: models.NotificationType, message: str, related_bug_id: int = None):
    if user_id is None:
        return
    db.add(
        models.Notification(
            user_id=user_id,
            type=notif_type,
            message=message,
            related_bug_id=related_bug_id,
        )
    )


def notify_bug_assigned(db: Session, bug: models.Bug, assignee: models.User):
    notify(
        db,
        user_id=assignee.id,
        notif_type=models.NotificationType.bug_assigned,
        message=f'You were assigned to bug #{bug.id}: "{bug.title}"',
        related_bug_id=bug.id,
    )


def notify_bug_resolved(db: Session, bug: models.Bug):
    """Notify the reporter, unless they resolved it themselves."""
    notify(
        db,
        user_id=bug.reporter_id,
        notif_type=models.NotificationType.bug_resolved,
        message=f'Bug #{bug.id} you reported was marked {bug.status.value}: "{bug.title}"',
        related_bug_id=bug.id,
    )


def notify_critical_bug(db: Session, bug: models.Bug, recipients: list):
    """recipients: list of User objects to notify (e.g. all Admins/Team Leads)."""
    for user in recipients:
        if user.id == bug.reporter_id:
            continue  # the reporter already knows
        notify(
            db,
            user_id=user.id,
            notif_type=models.NotificationType.critical_bug,
            message=f'New Critical bug reported: "{bug.title}" (#{bug.id})',
            related_bug_id=bug.id,
        )


def notify_ai_analysis_complete(db: Session, bug: models.Bug):
    recipients = {bug.reporter_id}
    if bug.assignee_id:
        recipients.add(bug.assignee_id)
    for user_id in recipients:
        notify(
            db,
            user_id=user_id,
            notif_type=models.NotificationType.ai_analysis_complete,
            message=f'AI analysis is ready for bug #{bug.id}: "{bug.title}"',
            related_bug_id=bug.id,
        )
