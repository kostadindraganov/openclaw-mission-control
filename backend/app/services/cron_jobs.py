from __future__ import annotations

import logging
from typing import Any

from app.integrations.openclaw_gateway import (
    OpenClawGatewayError,
    list_cron_jobs,
    upsert_cron_job,
)

logger = logging.getLogger(__name__)

MISSION_CONTROL_CRON_NAME = "mission-control-runner/10m"


def _mission_control_runner_message() -> str:
    return (
        "You are the Mission Control Runner agent.\n\n"
        "On this scheduled tick:\n"
        "- Run the HEARTBEAT.md procedure for Mission Control (check-in, list boards, "
        "list tasks).\n"
        "- If any task is already in_progress, stop (do not claim another).\n"
        "- Otherwise, find the oldest inbox task across all boards, claim it by moving "
        "to in_progress.\n"
        "- Execute the task fully.\n"
        "- When complete, move it to review.\n"
        "- If no inbox tasks exist, do nothing.\n"
        "Only update Mission Control (no chat messages)."
    )


def build_mission_control_cron_job() -> dict[str, Any]:
    return {
        "name": MISSION_CONTROL_CRON_NAME,
        "schedule": {"kind": "every", "everyMs": 600000},
        "sessionTarget": "isolated",
        "enabled": True,
        "payload": {"kind": "agentTurn", "message": _mission_control_runner_message()},
    }


async def ensure_mission_control_cron_job() -> None:
    try:
        payload = await list_cron_jobs()
    except OpenClawGatewayError as exc:
        logger.warning("Gateway cron list failed: %s", exc)
        return

    jobs: list[dict[str, Any]] = []
    if isinstance(payload, list):
        jobs = payload
    elif isinstance(payload, dict):
        jobs = list(payload.get("jobs", []))

    job = build_mission_control_cron_job()
    if any(item.get("name") == job["name"] for item in jobs):
        logger.info("Updating gateway cron job: %s", job["name"])
    else:
        logger.info("Creating gateway cron job: %s", job["name"])

    try:
        await upsert_cron_job(job)
    except OpenClawGatewayError as exc:
        logger.warning("Gateway cron upsert failed: %s", exc)
