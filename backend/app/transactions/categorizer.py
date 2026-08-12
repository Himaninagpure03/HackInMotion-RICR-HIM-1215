"""
Rule-based categorization: the transaction's description/merchant text is
matched against a keyword -> category map, first match wins.

Chosen over an ML model or third-party NLP API for the hackathon timeline —
it's fast to build, has zero external dependency/latency, and is trivial to
explain and extend in the README. The only contract the rest of the app
relies on is `categorize(description) -> category_name | None`, so this can
be swapped for a model or API later without touching callers.
"""

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Food": ["swiggy", "zomato", "restaurant", "cafe", "dominos", "mcdonald", "kfc"],
    "Groceries": ["bigbasket", "blinkit", "zepto", "grocery", "supermarket", "dmart"],
    "Rent": ["rent", "landlord"],
    "Subscriptions": ["netflix", "spotify", "prime video", "hotstar", "youtube premium", "icloud"],
    "Travel": ["uber", "ola", "irctc", "makemytrip", "airlines", "indigo", "goair"],
    "Bills": ["electricity", "water bill", "broadband", "recharge", "gas bill", "wifi"],
    "Shopping": ["amazon", "flipkart", "myntra", "ajio", "nykaa"],
    "Health": ["pharmacy", "hospital", "clinic", "apollo", "practo", "medplus"],
    "Entertainment": ["bookmyshow", "pvr", "inox"],
    "Income": ["salary", "payroll", "credited", "stipend"],
}


def categorize(description: str) -> str | None:
    text = description.lower()
    for category_name, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return category_name
    return None
