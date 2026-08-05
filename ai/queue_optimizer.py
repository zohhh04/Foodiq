"""Queue optimisation for Foodiq's token system.

This module turns the raw live queue (FIFO tokens) into a staff-friendly action
plan: an estimated readiness ETA per order, suggested cooking batches (grouping
similar-preparation items to reduce switching), the recommended "start next"
items to keep the kitchen from stalling, and a per-station load forecast.

It deliberately avoids proposing a globally "optimal" non-FIFO order (per the
tech decisions doc) so staff experience stays transparent and fair — the smarts
come from *ETA prediction* + *batching* rather than re-sequencing customers.
"""

from datetime import datetime, timedelta


def _now():
    try:
        return datetime.now()
    except Exception:  # pragma: no cover - guarded for odd runtimes
        return datetime.utcnow()


def _parse_joined(entry):
    raw = entry.get("joinedAt") or entry.get("issuedAt")
    if isinstance(raw, (int, float)):
        return datetime.fromtimestamp(raw / 1000.0)
    try:
        if isinstance(raw, str):
            return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        pass
    return _now()


def _prep_minutes(entry):
    items = entry.get("items") or []
    total = 0.0
    for it in items:
        qty = float(it.get("qty", 1) or 1)
        prep = float(it.get("prepTimeMin", it.get("prep", 3)) or 3)
        total += qty * prep
    return max(total, 1.0)


def compute_batches(queue):
    """Group queue entries into suggested cooking batches.

    Batches are built in FIFO order but merge neighbouring orders whose items
    share prep times, so similar dishes are cooked together (fewer station
    switches). Each batch lists its member orderIds and the max prep across them.
    """
    batches = []
    current = None
    for entry in queue:
        prep = _prep_minutes(entry)
        if current is None:
            current = {"orderIds": [entry["orderId"]], "prepMin": prep}
            continue
        if abs(prep - current["prepMin"]) <= 1.0:
            current["orderIds"].append(entry["orderId"])
            current["prepMin"] = max(current["prepMin"], prep)
        else:
            batches.append(current)
            current = {"orderIds": [entry["orderId"]], "prepMin": prep}
    if current is not None:
        batches.append(current)
    return batches


def estimate_etas(queue, staff_count=1, prediction=None):
    """Per-token predicted readiness time.

    ``prediction`` is an optional callable: (entry, position) -> wait_minutes.
    Without it, ``_prep_minutes`` + a per-ahead-order overhead is used.
    """
    cumulative = 0.0
    etas = []
    for idx, entry in enumerate(queue):
        position = idx + 1
        if prediction is not None:
            wait = float(prediction(entry, position))
        else:
            wait = 2.0 * (position - 1) + _prep_minutes(entry)
        wait = max(0.0, wait)
        start = cumulative
        ready_at = _now() + timedelta(minutes=wait)
        etas.append(
            {
                "orderId": entry["orderId"],
                "tokenNumber": entry.get("tokenNumber"),
                "queuePosition": position,
                "estimatedWaitMin": round(wait, 1),
                "readyAt": ready_at.isoformat(timespec="seconds"),
                "prepMin": round(_prep_minutes(entry), 1),
            }
        )
        cumulative = wait
    return etas


def recommend_next_to_cook(queue):
    """Items / orders to start cooking right now to avoid kitchen idle time.

    Returns the next batch of orderIds the kitchen should begin — typically the
    head of the queue plus anything else whose prep time is short — up to the
    given number of active stations.
    """
    if not queue:
        return []
    head = queue[0]
    ready_order_ids = [head["orderId"]]
    head_prep = _prep_minutes(head)
    for entry in queue[1:3]:
        if _prep_minutes(entry) <= max(head_prep, 3.0):
            ready_order_ids.append(entry["orderId"])
    return ready_order_ids


def optimize_queue(queue, staff_count=1, prediction=None):
    """Full plan: ETAs + batches + next-to-cook + simple load forecast."""
    if not queue:
        return {
            "totalInQueue": 0,
            "etas": [],
            "batches": [],
            "startNextOrderIds": [],
            "forecast": {"staffCount": staff_count, "loadMin": 0, "busyTime": 0},
        }

    etas = estimate_etas(queue, staff_count=staff_count, prediction=prediction)
    batches = compute_batches(queue)
    start_next = recommend_next_to_cook(queue)
    load = sum(e["estimatedWaitMin"] for e in etas)

    return {
        "totalInQueue": len(queue),
        "etas": etas,
        "batches": batches,
        "startNextOrderIds": start_next,
        "forecast": {
            "staffCount": staff_count,
            "loadMin": round(load, 1),
            "busyTime": round(load / max(staff_count, 1), 1),
        },
    }