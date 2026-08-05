import os
import sys
from typing import List, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Query
from pydantic import BaseModel

import queue_optimizer as qo
from recommend import get_recommendations, retrain
from wait_time import predict_wait_minutes, train as train_wait

app = FastAPI(title="Foodiq AI Service", version="1.0.0")


class PredictWaitRequest(BaseModel):
    features: dict


class OrderLine(BaseModel):
    foodItem: Optional[str] = None
    name: Optional[str] = None
    qty: int = 1
    price: float = 0
    prepTimeMin: Optional[float] = None


class QueueEntry(BaseModel):
    orderId: str
    tokenNumber: Optional[int] = None
    estimatedWaitMin: Optional[float] = None
    joinedAt: Optional[object] = None
    issuedAt: Optional[object] = None
    items: Optional[List[OrderLine]] = None


class OptimizeQueueRequest(BaseModel):
    queue: List[QueueEntry]
    staffCount: int = 1


class TrainSampleLine(BaseModel):
    foodItem: str
    qty: int = 1


class TrainOrder(BaseModel):
    user: str
    status: str = "completed"
    queueLength: float = 0
    createdAt: str = ""
    completedAt: str = ""
    subtotal: float = 0
    items: List[TrainSampleLine] = []


class TrainRequest(BaseModel):
    catalog: List[dict] = []
    orders: List[TrainOrder] = []
    ratings: List[dict] = []


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/recommend")
def recommend(
    userId: str = Query(...),
    limit: int = Query(10, ge=1, le=50),
    favorites: str = Query("", description="comma-separated favorite food ids"),
    history: str = Query("", description="comma-separated previously ordered ids"),
    exclude: str = Query("", description="comma-separated ids to never recommend"),
):
    fav = _split(favorites)
    hist = _split(history)
    ex = _split(exclude)
    items = get_recommendations(userId, limit, favorites=fav, history=hist, exclude=ex)
    return {"userId": userId, "items": items}


@app.post("/predict-wait")
def predict_wait(req: PredictWaitRequest):
    wait_minutes = predict_wait_minutes(req.features)
    return {"waitMinutes": wait_minutes}


@app.post("/optimize-queue")
def optimize_queue(req: OptimizeQueueRequest):
    entries = [entry.dict() for entry in req.queue]
    plan = qo.optimize_queue(entries, staff_count=req.staffCount)
    return plan


@app.post("/train")
def train_snapshot(req: TrainRequest):
    """Train/retrain models from an inline snapshot (dev convenience mirror of train.py)."""
    import json
    import os
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        with open(os.path.join(tmp, "catalog.json"), "w", encoding="utf-8") as fh:
            json.dump(req.catalog, fh)
        with open(os.path.join(tmp, "orders.json"), "w", encoding="utf-8") as fh:
            json.dump([o.dict() for o in req.orders], fh)
        with open(os.path.join(tmp, "ratings.json"), "w", encoding="utf-8") as fh:
            json.dump(req.ratings, fh)

        from train import (
            build_and_save_metadata,
            train_cf_model,
            train_wait_model,
        )

        catalog, orders, ratings = req.catalog, [o.dict() for o in req.orders], req.ratings
        items, popularity, rating_bonus = build_and_save_metadata(catalog, orders, ratings)
        train_wait_model(orders, items)
        train_cf_model(orders, ratings, items)

    return {
        "status": "ok",
        "catalogItems": len(req.catalog),
        "ordersTrained": len(req.orders),
        "ratingsTrained": len(req.ratings),
    }


def _split(raw: str) -> List[str]:
    return [p for p in (raw or "").split(",") if p]