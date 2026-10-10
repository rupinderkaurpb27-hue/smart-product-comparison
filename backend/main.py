from math import isfinite
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
from flask import Flask, request
from flask_cors import CORS

load_dotenv(Path(__file__).with_name(".env"))

if __package__:
    from .algorithms.knapsack import fractional_knapsack
    from .database import client, db
    from .services.sentiment import average_sentiment_score
else:
    from algorithms.knapsack import fractional_knapsack
    from database import client, db
    from services.sentiment import average_sentiment_score

app = Flask(__name__)
CORS(app)


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.post("/api/compare")
def compare_products():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return {"error": "request body must be a JSON object"}, 400

    budget = payload.get("budget")
    keyword = payload.get("keyword")
    try:
        valid_budget = (
            not isinstance(budget, bool)
            and isinstance(budget, (int, float))
            and isfinite(budget)
            and budget >= 0
        )
    except OverflowError:
        valid_budget = False
    if not valid_budget:
        return {"error": "budget must be a finite, non-negative number"}, 400
    if not isinstance(keyword, str) or not keyword.strip():
        return {"error": "keyword must be a non-empty string"}, 400

    keyword = keyword.strip()
    normalized_keyword = keyword.casefold()
    if "laptop" in normalized_keyword:
        if budget < 75000:
            products = [
                {
                    "name": "HP Pavilion 15",
                    "price": 52000,
                    "reviews": [
                        "A reliable everyday laptop with a comfortable keyboard.",
                        "The display is clear and performance handles office work well.",
                    ],
                },
                {
                    "name": "Lenovo IdeaPad 3",
                    "price": 45000,
                    "reviews": [
                        "Good value for study and everyday productivity.",
                        "The lightweight design and responsive performance are convenient.",
                    ],
                },
                {
                    "name": "Dell Inspiron",
                    "price": 58000,
                    "reviews": [
                        "Dependable performance and a crisp screen for daily use.",
                        "The build feels sturdy and setup is straightforward.",
                    ],
                },
            ]
        else:
            products = [
                {
                    "name": "MacBook Air M3",
                    "price": 115000,
                    "reviews": [
                        "Fast performance, excellent battery life, and a lightweight design.",
                        "The display is sharp and the build quality feels premium.",
                    ],
                },
                {
                    "name": "ASUS ROG",
                    "price": 120000,
                    "reviews": [
                        "Powerful gaming performance with a vivid high-refresh display.",
                        "Cooling is effective and the keyboard feels great for long sessions.",
                    ],
                },
                {
                    "name": "Dell XPS",
                    "price": 140000,
                    "reviews": [
                        "Premium construction, a brilliant screen, and dependable performance.",
                        "The keyboard and trackpad make everyday work comfortable.",
                    ],
                },
            ]
    elif "mobile" in normalized_keyword or "phone" in normalized_keyword:
        if budget < 75000:
            products = [
                {
                    "name": "Samsung Galaxy A55",
                    "price": 39999,
                    "reviews": [
                        "A vibrant display and dependable battery make it great for daily use.",
                        "The camera is versatile and the design feels premium.",
                    ],
                },
                {
                    "name": "OnePlus Nord 4",
                    "price": 29999,
                    "reviews": [
                        "Fast performance and charging offer excellent everyday value.",
                        "The bright display and solid battery life stand out.",
                    ],
                },
                {
                    "name": "Google Pixel 8a",
                    "price": 52999,
                    "reviews": [
                        "The camera takes detailed photos and the software is easy to use.",
                        "Smooth performance and a bright screen make it a strong mid-range phone.",
                    ],
                },
            ]
        else:
            products = [
                {
                    "name": "iPhone 15 Pro",
                    "price": 130000,
                    "reviews": [
                        "The camera system is excellent and performance stays smooth.",
                        "Premium materials and a bright display make it a great flagship.",
                    ],
                },
                {
                    "name": "Samsung S24",
                    "price": 124999,
                    "reviews": [
                        "A bright display, versatile cameras, and fast everyday performance.",
                        "The compact design feels premium and is comfortable to use.",
                    ],
                },
                {
                    "name": "OnePlus 12",
                    "price": 64999,
                    "reviews": [
                        "Fast charging and responsive performance make this a strong flagship.",
                        "The display is vibrant and the camera takes detailed photos.",
                    ],
                },
            ]
    elif "cpu" in normalized_keyword or "processor" in normalized_keyword:
        products = [
            {
                "name": "Intel i7",
                "price": 38500,
                "reviews": [
                    "The Intel i7 delivers responsive performance for demanding applications.",
                    "Multitasking stays smooth, although its power draw can run high under load.",
                ],
            },
            {
                "name": "Ryzen 5",
                "price": 22000,
                "reviews": [
                    "Ryzen 5 offers impressive speed and excellent value for a desktop build.",
                    "Everyday workloads feel quick, and the processor stays efficient during use.",
                ],
            },
        ]
    elif "gpu" in normalized_keyword or "graphics" in normalized_keyword:
        products = [
            {
                "name": "RTX 4070 Ti",
                "price": 82000,
                "reviews": [
                    "The RTX 4070 Ti renders games smoothly with crisp, detailed graphics.",
                    "Its strong performance is excellent, though the purchase price is steep.",
                ],
            },
            {
                "name": "RX 7800 XT",
                "price": 51000,
                "reviews": [
                    "RX 7800 XT provides vivid visuals and capable performance in modern games.",
                    "The card offers generous graphics power for its competitive price.",
                ],
            },
        ]
    elif "ram" in normalized_keyword or "storage" in normalized_keyword:
        products = [
            {
                "name": "Corsair 32GB DDR5",
                "price": 11500,
                "reviews": [
                    "Corsair 32GB DDR5 memory keeps demanding multitasking responsive.",
                    "Installation is straightforward and the memory kit performs reliably.",
                ],
            },
            {
                "name": "Samsung 2TB SSD",
                "price": 16500,
                "reviews": [
                    "The Samsung 2TB SSD loads large files quickly and quietly.",
                    "Its roomy capacity and dependable transfer speeds make storage convenient.",
                ],
            },
        ]
    elif "motherboard" in normalized_keyword or "psu" in normalized_keyword:
        products = [
            {
                "name": "ASUS Z790",
                "price": 35000,
                "reviews": [
                    "ASUS Z790 provides stable connectivity and a well-designed component layout.",
                    "Setup is dependable, with useful expansion options for a powerful PC.",
                ],
            },
            {
                "name": "Corsair 850W",
                "price": 12500,
                "reviews": [
                    "The Corsair 850W power supply delivers consistent, quiet operation.",
                    "Cable management is tidy and the unit handles demanding hardware reliably.",
                ],
            },
        ]
    elif "monitor" in normalized_keyword or "keyboard" in normalized_keyword:
        products = [
            {
                "name": "LG 4K Monitor",
                "price": 32999,
                "reviews": [
                    "The LG 4K Monitor displays sharp detail and rich, accurate colors.",
                    "Its clear picture is excellent for work, entertainment, and creative tasks.",
                ],
            },
            {
                "name": "Logitech G Pro Keyboard",
                "price": 14500,
                "reviews": [
                    "Logitech G Pro Keyboard has crisp keys and a responsive gaming feel.",
                    "The compact layout is sturdy and comfortable during long sessions.",
                ],
            },
        ]
    else:
        products = [
            {
                "name": "Sony WH-1000XM5",
                "price": 29999,
                "reviews": [
                    "Excellent noise cancellation and clear sound for travel.",
                    "Comfortable for long listening sessions with reliable battery life.",
                ],
            },
            {
                "name": "Apple Watch",
                "price": 44900,
                "reviews": [
                    "Helpful health tracking and a bright, easy-to-read display.",
                    "Smooth performance and useful fitness features throughout the day.",
                ],
            },
            {
                "name": "boAt Rockerz",
                "price": 1500,
                "reviews": [
                    "Enjoyable sound and comfortable fit at an accessible price.",
                    "Simple pairing and dependable battery life for everyday listening.",
                ],
            },
        ]

    for product in products:
        sentiment_score = average_sentiment_score(product["reviews"])
        searchable_text = " ".join([product["name"], *product["reviews"]])
        keyword_relevance = float(normalized_keyword in searchable_text.casefold())
        combined_value_rank = (
            0.7 * ((sentiment_score + 1.0) / 2.0) + 0.3 * keyword_relevance
        )
        product["sentiment_score"] = sentiment_score
        product["keyword_relevance"] = keyword_relevance
        product["combined_value_rank"] = combined_value_rank
        product["score"] = combined_value_rank

    selections = fractional_knapsack(products, budget)
    history_saved = False
    try:
        db.comparison_history.insert_one({
            "keyword": keyword,
            "budget": budget,
            "selections": selections,
            "created_at": datetime.now(timezone.utc),
        })
        history_saved = True
    except Exception:
        pass

    return {
        "keyword": keyword,
        "budget": budget,
        "selections": selections,
        "history_saved": history_saved,
    }


@app.get("/api/history")
def comparison_history():
    try:
        records = db.comparison_history.find().sort("created_at", -1).limit(50)
        history = [
            {
                "id": str(record["_id"]),
                "keyword": record["keyword"],
                "budget": record["budget"],
                "selections": record["selections"],
                "created_at": record["created_at"].isoformat(),
            }
            for record in records
        ]
        return {"history": history}
    except Exception:
        return {"error": "Database history is unavailable"}, 503


@app.get("/test")
def test_database():
    try:
        client.admin.command("ping")
        return {"status": "ok", "database": "product_comparison"}
    except Exception:
        return {"status": "error", "message": "Database connection failed"}, 503


if __name__ == "__main__":
    app.run(debug=True)
