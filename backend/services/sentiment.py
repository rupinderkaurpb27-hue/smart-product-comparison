from collections.abc import Iterable
from functools import lru_cache

from nltk.sentiment.vader import SentimentIntensityAnalyzer


@lru_cache(maxsize=1)
def _get_analyzer() -> SentimentIntensityAnalyzer:
    try:
        return SentimentIntensityAnalyzer()
    except LookupError as error:
        raise RuntimeError(
            "NLTK VADER lexicon is missing; install it with "
            "python -m nltk.downloader vader_lexicon"
        ) from error


def average_sentiment_score(reviews: Iterable[str]) -> float:
    """Return the mean VADER compound score for reviews, in [-1.0, 1.0]."""
    total_score = 0.0
    review_count = 0
    for review in reviews:
        if not isinstance(review, str):
            raise ValueError("each review must be a string")
        total_score += _get_analyzer().polarity_scores(review)["compound"]
        review_count += 1

    return total_score / review_count if review_count else 0.0