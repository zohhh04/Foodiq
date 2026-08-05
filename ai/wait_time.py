"""Wait-time prediction for Foodiq's queue optimisation.

A gradient-boosting regressor (scikit-learn ``HistGradientBoostingRegressor``)
is trained offline by ``train.py`` from historical orders and served here. The
labels are the real elapsed minutes between order placement and completion.

Feature vector (kept cheap for the backend to build):
    queue_length, order_items, total_qty, subtotal, avg_prep_min

While no model is trained yet (or after a fresh reset) the module falls back to
a transparent heuristic so the API keeps working during cold start.
"""

import numpy as np

from data_io import load_model, save_model

MODEL_PATH = "wait_model"

FEATURE_KEYS = ["queue_length", "order_items", "total_qty", "subtotal", "avg_prep_min"]


def _features_to_vector(features):
    return np.array(
        [
            float(features.get("queue_length", 0)),
            float(features.get("order_items", 0)),
            float(features.get("total_qty", 0)),
            float(features.get("subtotal", 0) or 0),
            float(features.get("avg_prep_min", 3)),
        ],
        dtype=float,
    ).reshape(1, -1)


def feature_names():
    return list(FEATURE_KEYS)


def train(features_df, labels):
    """Fit a histogram-based gradient boosting regressor.

    Args:
        features_df: pandas DataFrame whose columns include FEATURE_KEYS.
        labels: iterable of actual wait minutes per row (float).

    Returns:
        The fitted estimator, persisted to ``model_store/wait_model.joblib``.
    """
    from sklearn.ensemble import HistGradientBoostingRegressor

    X = features_df[FEATURE_KEYS].values.astype(float)
    y = np.asarray(labels, dtype=float)

    model = HistGradientBoostingRegressor(
        max_iter=120,
        max_leaf_nodes=15,
        learning_rate=0.08,
        l2_regularization=0.1,
        random_state=42,
    )
    model.fit(X, y)
    save_model(MODEL_PATH, model)
    return model


def predict_wait_minutes(features):
    """Predict estimated wait in minutes (model first, heuristic fallback).

    The backend sends the same loosely-typed dict from ``aiService.js``:
        queueLength, orderItems, totalQty, subtotal
    plus an optional avgPrepMin. We normalise the aliases.
    """
    normalised = _normalise_input(features)
    model = load_model(MODEL_PATH)

    if model is None:
        return _heuristic(normalised)

    try:
        pred = float(model.predict(_features_to_vector(normalised))[0])
        return round(max(0.0, pred), 1)
    except Exception:
        return _heuristic(normalised)


def _normalise_input(features):
    return {
        "queue_length": features.get("queueLength", features.get("queue_length", 0)),
        "order_items": features.get(
            "orderItems", features.get("order_items", features.get("itemCount", 0))
        ),
        "total_qty": features.get("totalQty", features.get("total_qty", 1)),
        "subtotal": features.get("subtotal", features.get("totalsize", 0)),
        "avg_prep_min": features.get(
            "avgPrepMin", features.get("avg_prep_min", 3)
        ),
    }


def _heuristic(f):
    # Per order ahead (~3 min) + prep time contribution (items*qty-style load).
    return round(
        3.0 * float(f["queue_length"])
        + 0.5 * float(f["total_qty"])
        + 0.2 * float(f["subtotal"]) / 10.0
        + float(f["avg_prep_min"]) / 2.0,
        1,
    )