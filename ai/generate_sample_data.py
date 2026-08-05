"""Generate a realistic synthetic dataset so the AI layer works out of the box.

Produces ``ai/data/{catalog,orders,ratings}.json`` in the shape ``train.py``
expects, then you run:

    python ai/generate_sample_data.py
    python ai/train.py

This simulates ~25 customers, ~120 orders with prep/revenue realism, a handful
of ratings, and item popularity skew. It is only for development/demo — replace
the files with a real export (or point the backend at its DB) before production.
"""

import json
import os
import random
from datetime import datetime, timedelta

random.seed(7)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

CATALOG = [
    {"_id": "i1", "name": "Masala Dosa", "tags": ["dosa", "breakfast"], "category": "south-indian", "prepTimeMin": 4, "inStock": True},
    {"_id": "i2", "name": "Idli Sambar", "tags": ["idli", "breakfast"], "category": "south-indian", "prepTimeMin": 2, "inStock": True},
    {"_id": "i3", "name": "Veg Biryani", "tags": ["biryani", "rice"], "category": "north-indian", "prepTimeMin": 8, "inStock": True},
    {"_id": "i4", "name": "Paneer Butter Masala", "tags": ["paneer", "curry"], "category": "north-indian", "prepTimeMin": 6, "inStock": True},
    {"_id": "i5", "name": "Samosa", "tags": ["snack", "fried"], "category": "snacks", "prepTimeMin": 1, "inStock": True},
    {"_id": "i6", "name": "Vada Pav", "tags": ["snack", "fast"], "category": "snacks", "prepTimeMin": 2, "inStock": True},
    {"_id": "i7", "name": "Filter Coffee", "tags": ["coffee", "hot"], "category": "beverages", "prepTimeMin": 1, "inStock": True},
    {"_id": "i8", "name": "Lemon Iced Tea", "tags": ["tea", "cold"], "category": "beverages", "prepTimeMin": 1, "inStock": True},
    {"_id": "i9", "name": "Veg Fried Rice", "tags": ["rice", "chinese"], "category": "chinese", "prepTimeMin": 5, "inStock": True},
    {"_id": "i10", "name": "Hakka Noodles", "tags": ["noodles", "chinese"], "category": "chinese", "prepTimeMin": 5, "inStock": True},
]

# latent "taste" per item to create realistic customer affinity patterns
TASTE = {
    "i1": [1, 0, 0], "i2": [1, 0, 0], "i3": [0, 1, 0], "i4": [0, 1, 0],
    "i5": [0, 0, 2], "i6": [0, 0, 2], "i7": [0, 0, 2], "i8": [1, 0, 0],
    "i9": [0, 1, 1], "i10": [0, 1, 1],
}
BASE_PRICE = {it["_id"]: {"Masala Dosa": 60, "Idli Sambar": 40, "Veg Biryani": 120, "Paneer Butter Masala": 140,
                          "Samosa": 15, "Vada Pav": 25, "Filter Coffee": 20, "Lemon Iced Tea": 35,
                          "Veg Fried Rice": 100, "Hakka Noodles": 110}[it["name"]] for it in CATALOG}


def profile_for(i):
    # each user leans toward one taste profile so CF finds latent patterns
    return [0, 1, 2][i % 3]


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    users = [f"u{i:02d}" for i in range(1, 26)]

    orders = []
    ratings = []
    now = datetime.utcnow()

    for user in users:
        profile = profile_for(int(user[1:]))
        n_orders = random.randint(3, 8)
        for _ in range(n_orders):
            # sample items biased toward the user's profile + a bit of variety
            pool = [iid for iid, t in TASTE.items() if profile in t]
            extras = [it["_id"] for it in CATALOG if it["_id"] not in pool]
            chosen = random.sample(pool, random.randint(1, 2)) + random.sample(
                extras, min(random.randint(0, 1), len(extras))
            )
            lines = []
            subtotal = 0.0
            prep = 0.0
            for iid in chosen:
                qty = random.randint(1, 3 if iid in pool else 1)
                lines.append({"foodItem": iid, "qty": qty})
                subtotal += qty * BASE_PRICE[iid]
                prep += qty * next(it["prepTimeMin"] for it in CATALOG if it["_id"] == iid)

            placed = now - timedelta(days=random.randint(0, 30), minutes=random.randint(0, 500))
            # actual wait = reasonable prep + queue contention, with noise
            queue_noise = random.randint(0, 4)
            wait_min = round(prep * 1.1 + queue_noise + random.gauss(0, 1.5))
            wait_min = max(wait_min, 2)
            completed = placed + timedelta(minutes=wait_min)

            orders.append(
                {
                    "user": user,
                    "status": "completed",
                    "queueLength": random.randint(0, 5),
                    "createdAt": placed.isoformat(timespec="seconds"),
                    "completedAt": completed.isoformat(timespec="seconds"),
                    "subtotal": round(subtotal, 2),
                    "items": lines,
                }
            )
            # ~30% of purchases get rated
            if random.random() < 0.3:
                target = random.choice(lines)["foodItem"]
                ratings.append(
                    {"user": user, "foodItem": target, "rating": random.choice([3, 4, 4, 5, 5])}
                )

    with open(os.path.join(DATA_DIR, "catalog.json"), "w", encoding="utf-8") as fh:
        json.dump(CATALOG, fh, ensure_ascii=False, indent=2)
    with open(os.path.join(DATA_DIR, "orders.json"), "w", encoding="utf-8") as fh:
        json.dump(orders, fh, ensure_ascii=False, indent=2)
    with open(os.path.join(DATA_DIR, "ratings.json"), "w", encoding="utf-8") as fh:
        json.dump(ratings, fh, ensure_ascii=False, indent=2)

    print("Wrote %d orders, %d ratings, %d catalog items -> %s" % (len(orders), len(ratings), len(CATALOG), DATA_DIR))


if __name__ == "__main__":
    main()