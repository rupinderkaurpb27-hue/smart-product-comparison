from collections.abc import Mapping, Sequence
from math import isfinite
from typing import Any


def fractional_knapsack(
    items: Sequence[Mapping[str, Any]], budget: float
) -> list[dict[str, Any]]:
    """Return the highest-scoring fractional selection within ``budget``.

    Each selected item is copied and includes a ``fraction`` field between 0
    and 1. Items must provide numeric, non-negative ``price`` and numeric
    ``score`` fields. Items with non-positive scores are not selected.
    """
    if isinstance(budget, bool) or not isinstance(budget, (int, float)):
        raise ValueError("budget must be a finite, non-negative number")
    if not isfinite(budget) or budget < 0:
        raise ValueError("budget must be a finite, non-negative number")

    ranked_items: list[tuple[float, int, Mapping[str, Any]]] = []
    free_items: list[tuple[int, Mapping[str, Any]]] = []

    for index, item in enumerate(items):
        if not isinstance(item, Mapping) or "price" not in item or "score" not in item:
            raise ValueError("each item must provide price and score fields")

        price = item["price"]
        score = item["score"]
        if (
            isinstance(price, bool)
            or not isinstance(price, (int, float))
            or not isfinite(price)
            or price < 0
        ):
            raise ValueError("item prices must be finite, non-negative numbers")
        if (
            isinstance(score, bool)
            or not isinstance(score, (int, float))
            or not isfinite(score)
        ):
            raise ValueError("item scores must be finite numbers")

        if score <= 0:
            continue
        if price == 0:
            free_items.append((index, item))
        else:
            ranked_items.append((score / price, index, item))

    ranked_items.sort(key=lambda entry: (-entry[0], entry[1]))

    selection = [dict(item, fraction=1.0) for _, item in free_items]
    remaining_budget = float(budget)
    for _, _, item in ranked_items:
        if remaining_budget <= 0:
            break

        price = float(item["price"])
        fraction = min(1.0, remaining_budget / price)
        selection.append(dict(item, fraction=fraction))
        remaining_budget -= price * fraction

    return selection