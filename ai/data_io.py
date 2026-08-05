"""Shared helpers for saving / loading Foodiq model artifacts.

Everything the ML layer produces (trained models, catalog + feature metadata)
lives in ``ai/model_store/`` as ``.joblib`` (binary models) and ``.json``
(human-friendly metadata). Helper functions below centralise the paths and the
in-memory caches so ``recommend.py``, ``wait_time.py`` and ``queue_optimizer.py``
stay consistent.
"""

import json
import os

import joblib

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model_store")

_caches = {}


def _path(name):
    return os.path.join(MODEL_DIR, name)


def json_path(name):
    return _path(f"{name}.json")


def model_path(name):
    return _path(f"{name}.joblib")


def save_json(name, payload):
    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(json_path(name), "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False)


def load_json(name, default=None):
    path = json_path(name)
    if not os.path.exists(path):
        return {} if default is None else default
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def save_model(name, payload):
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(payload, model_path(name))


def load_model(name):
    path = model_path(name)
    if not os.path.exists(path):
        return None
    return joblib.load(path)


def cached_loader(name, loader):
    """Return a cached value; ``clear_cache()`` resets all loaders."""
    if name not in _caches:
        _caches[name] = loader()
    return _caches[name]


def get_catalog():
    """Full menu catalog: {food_item_id: {name, tags, category}}.

    Populated by ``train.py`` from the exported menu. The catalog is the
    universe of recommendable items (popularity 0 for never-ordered ones).
    """

    def _load():
        data = load_json("catalog", {})
        return data.get("items", {})

    return cached_loader("catalog", _load)


def get_popularity():
    """Item popularity: {food_item_id: times_ordered}."""

    def _load():
        data = load_json("popularity", [])
        return {str(entry["item"]): entry["count"] for entry in data}

    return cached_loader("popularity", _load)


def clear_cache():
    _caches.clear()