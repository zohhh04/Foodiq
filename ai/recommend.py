"""Hybrid recommendation engine for Foodiq.

Pipeline (three signals blended):

1. **Collaborative filtering** — a truncated-SVD latent model trained from the
   user x item interaction matrix (order counts weighted by ratings). Captures
   "users who ordered X also ordered Y".
2. **Content-based** — tag/category overlap between the candidate item and the
   user's favorites + past orders. Great for cold-start and niche users.
3. **Popularity** — most-ordered items overall. Guarantees a sensible result for
   brand-new users with no history at all.

Final score = w_cf * CF(cf score) + w_content * content(overlap) + w_pop * popularity.

Models are produced offline by ``train.py`` and loaded lazily here. If no model
is present the engine degrades gracefully to pure popularity so the API always
answers.
"""

import numpy as np

from data_io import clear_cache, get_catalog, get_popularity, load_model, save_model

CF_PATH = "cf_model"

WEIGHTS = {"cf": 0.5, "content": 0.3, "popularity": 0.2}


def train_cf(interactions, n_components=8, seed=42):
    """Fit the collaborative-filtering latent model from interaction triples.

    Args:
        interactions: iterable of (user_id, food_item_id, weight)
            where weight encodes engagement (orders + rating bonus).
        n_components: latent dimensionality for the SVD.
        seed: random seed for reproducibility.

    Returns:
        The fitted ``cf_model`` dict, already persisted to the model store:
            {"users": [...], "items": [...], "u": ndarray, "v": ndarray}
        where ``u[i] @ v[j]`` approximates user i's affinity for item j.
    """

    from scipy import sparse
    from sklearn.decomposition import TruncatedSVD

    rows, cols, data = [], [], []
    for user_id, item_id, weight in interactions:
        rows.append(str(user_id))
        cols.append(str(item_id))
        data.append(float(weight))

    users = sorted(set(rows))
    items = set(cols)
    user_index = {u: i for i, u in enumerate(users)}
    item_index = {
        it: i for i, it in enumerate(items)
    }  # item ids present in interactions

    if not data:
        model = {"users": users, "items": [], "u": np.zeros((len(users), n_components)), "v": np.zeros((0, n_components))}
        save_model(CF_PATH, model)
        return model

    matrix = sparse.csr_matrix(
        (data, ([user_index[u] for u in rows], [item_index[c] for c in cols])),
        shape=(len(users), len(item_index)),
    )

    svd = TruncatedSVD(n_components=min(n_components, matrix.shape[0], matrix.shape[1]), random_state=seed)
    u_proj = svd.fit_transform(matrix)
    v_proj = svd.components_.T  # shape (n_items, k)

    model = {
        "users": users,
        "items": list(item_index.keys()),
        "u": np.asarray(u_proj, dtype=float),
        "v": np.asarray(v_proj, dtype=float),
    }
    save_model(CF_PATH, model)
    return model


def _load_cf():
    return load_model(CF_PATH)


def _cf_scores(cf, user_id, candidates):
    """Raw CF affinity score for each candidate item (0 when no signal)."""
    scores = {}
    if not cf:
        return scores
    try:
        row = cf["users"].index(str(user_id))
    except ValueError:
        return scores

    index = {it: i for i, it in enumerate(cf["items"])}
    user_vec = cf["u"][row]
    for item_id in candidates:
        col = index.get(str(item_id))
        if col is None:
            continue
        scores[str(item_id)] = float(np.dot(user_vec, cf["v"][col]))
    return scores


def _content_scores(catalog, favorites, history, candidates):
    """Tag/category overlap score between candidates and user's seen items."""
    liked_tags = {}
    for item_id in (favorites or []) + (history or []):
        meta = catalog.get(str(item_id))
        if not meta:
            continue
        for tag in meta.get("tags", []):
            liked_tags[tag] = liked_tags.get(tag, 0) + 1

    if not liked_tags:
        return {}

    scores = {}
    for item_id in candidates:
        meta = catalog.get(str(item_id))
        if not meta:
            continue
        overlap = sum(liked_tags.get(tag, 0) for tag in meta.get("tags", []))
        if overlap:
            scores[str(item_id)] = overlap
    return scores


def _normalise(scores):
    if not scores:
        return {}
    max_val = max(abs(v) for v in scores.values()) or 1.0
    return {k: v / max_val for k, v in scores.items()}


def get_recommendations(user_id, limit=10, favorites=None, history=None, exclude=None):
    """Return a ranked list of recommended food_item ids (highest score first).

    Args:
        user_id: the customer.
        limit: max number of recommendations.
        favorites: ids of items the user marked as favourite (cold-start signal).
        history: ids of items the user already ordered.
        exclude: extra ids to never recommend (e.g. out-of-stock).
    """
    catalog = get_catalog()
    popularity = get_popularity()
    cf = _load_cf()

    history_ids = {str(i) for i in (history or [])}
    exclude_ids = {str(i) for i in (exclude or [])}

    # Candidate universe: everything in the catalog the user hasn't ordered.
    candidates = [i for i in catalog if i not in history_ids and i not in exclude_ids]
    if not candidates:
        return []

    cf_sc = _normalise(_cf_scores(cf, user_id, candidates))
    content_sc = _normalise(_content_scores(catalog, favorites, history, candidates))
    pop_sc = _normalise({i: float(popularity.get(i, 0)) for i in candidates})

    scored = []
    for item_id in candidates:
        score = (
            WEIGHTS["cf"] * cf_sc.get(item_id, 0.0)
            + WEIGHTS["content"] * content_sc.get(item_id, 0.0)
            + WEIGHTS["popularity"] * pop_sc.get(item_id, 0.0)
        )
        scored.append((score, item_id))

    scored.sort(key=lambda pair: (-pair[0], pair[1]))
    return [item_id for _, item_id in scored[:limit]]


def retrain(interactions, catalog=None, popularity=None):
    """Convenience wrapper: fit + persist everything recommend.py needs."""
    model = train_cf(interactions)
    clear_cache()
    return model