"""Offline training pipeline for the Foodiq AI layer.

Reads exported snapshots from ``ai/data/`` and trains + saves every model that
the FastAPI service serves:

    python ai/train.py [--data ai/data]

Expected snapshot files (each a JSON array):
    catalog.json   -> [{"_id", "name", "tags":[], "category", "prepTimeMin", "inStock"}]
    orders.json    -> [{ "user", "status", "createdAt", "completedAt",
                         "subtotal", "items":[{ "foodItem", "qty" }] }]
    ratings.json   -> [{ "user", "foodItem", "rating" }]

Outputs written to ``ai/model_store/``:
    cf_model.joblib        collaborative-filtering latent model
    wait_model.joblib      gradient-boosting wait-time regressor
    catalog.json           recommendable-item universe
    popularity.json        times each item was ordered
"""

import argparse
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
import pandas as pd

import recommend
import wait_time
from data_io import save_json

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def _load(path, default=None):
    if not os.path.exists(path):
        return default or []
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _minutes_between(start, end):
    if not start or not end:
        return None
    try:
        s = datetime.fromisoformat(str(start).replace("Z", "+00:00"))
        e = datetime.fromisoformat(str(end).replace("Z", "+00:00"))
        return max((e - s).total_seconds() / 60.0, 0.1)
    except (TypeError, ValueError):
        return None


def build_and_save_metadata(catalog, orders, ratings):
    """Catalog universe + popularity index persisted for recommend.py."""
    items = {}
    popularity = {}
    rating_bonus = {}

    for it in catalog:
        item_id = str(it.get("_id") or it.get("id") or it.get("name"))
        items[item_id] = {
            "name": it.get("name", item_id),
            "tags": it.get("tags", []) or [],
            "category": str(it.get("category", "")) or None,
            "prepTimeMin": float(it.get("prepTimeMin", it.get("prep", 3)) or 3),
        }
        popularity.setdefault(item_id, 0)

    for order in orders:
        for line in order.get("items", []):
            fid = str(line.get("foodItem"))
            if fid in items:
                popularity[fid] += int(line.get("qty", 1) or 1)

    for r in ratings:
        fid = str(r.get("foodItem"))
        if fid in items:
            rating_bonus[fid] = max(rating_bonus.get(fid, 0.0), float(r.get("rating", 3)))

    save_json("catalog", {"items": items})
    save_json(
        "popularity",
        [{"item": i, "count": c} for i, c in sorted(popularity.items())],
    )
    return items, popularity, rating_bonus


def train_wait_model(orders, catalog):
    """Build DataFrame + labels for completed orders, fit & save the GBR."""
    rows = []
    labels = []
    for order in orders:
        if order.get("status") not in ("completed", "picked"):
            continue
        wait = _minutes_between(order.get("createdAt"), order.get("completedAt"))
        if wait is None:
            continue

        lines = order.get("items", [])
        qty = sum(int(l.get("qty", 1) or 1) for l in lines)
        prep = 0.0
        for l in lines:
            meta = catalog.get(str(l.get("foodItem")), {})
            prep += int(l.get("qty", 1) or 1) * float(
                meta.get("prepTimeMin", 3) or 3
            )
        avg_prep = (prep / qty) if qty else 3.0

        rows.append(
            {
                "queue_length": float(order.get("queueLength", 0) or 0),
                "order_items": float(len(lines)),
                "total_qty": float(qty),
                "subtotal": float(order.get("subtotal", 0) or 0),
                "avg_prep_min": float(avg_prep),
            }
        )
        labels.append(wait)

    if len(rows) < 20:
        print("  not enough completed orders for wait-time model (%d); keeping fallback" % len(rows))
        return None

    df = pd.DataFrame(rows)
    model = wait_time.train(df, labels)
    print("  wait-time GBR trained on %d completed orders" % len(df))
    return model


def train_cf_model(orders, ratings, catalog):
    """Derive CF interaction weights and fit the latent model."""
    interactions = []
    for order in orders:
        user = str(order.get("user"))
        for line in order.get("items", []):
            fid = str(line.get("foodItem"))
            if fid not in catalog:
                continue
            interactions.append((user, fid, float(line.get("qty", 1) or 1)))

    rating_lookup = {}
    for r in ratings:
        key = (str(r.get("user")), str(r.get("foodItem")))
        rating_lookup[key] = max(rating_lookup.get(key, 0.0), float(r.get("rating", 3)))

    boosted = []
    seen = set()
    for user, fid, base in interactions:
        bonus = rating_lookup.get((user, fid), 0.0)
        w = min(base + bonus * 0.5, 20.0)
        key = (user, fid)
        if key in seen:
            continue
        seen.add(key)
        boosted.append((user, fid, w))

    if len(boosted) < 3:
        print("  not enough interactions for CF (%d); saving empty model" % len(boosted))
        recommend.train_cf([])
        return None
    model = recommend.train_cf(boosted)
    print("  CF trained on %d distinct user-item interactions" % len(boosted))
    return model


def main():
    parser = argparse.ArgumentParser(description="Train Foodiq AI models from exported snapshots")
    parser.add_argument("--data", default=DATA_DIR, help="directory with catalog/orders/ratings json")
    args = parser.parse_args()

    catalog = _load(os.path.join(args.data, "catalog.json"))
    orders = _load(os.path.join(args.data, "orders.json"))
    ratings = _load(os.path.join(args.data, "ratings.json"))

    print("Loading snapshots:")
    print("  catalog : %d items" % len(catalog))
    print("  orders  : %d orders" % len(orders))
    print("  ratings : %d ratings" % len(ratings))

    items, popularity, rating_bonus = build_and_save_metadata(catalog, orders, ratings)
    print("\nTraining wait-time model...")
    train_wait_model(orders, items)

    print("Training recommendation model...")
    train_cf_model(orders, ratings, items)

    print("\nDone. Artifacts written to ai/model_store/")


if __name__ == "__main__":
    main()