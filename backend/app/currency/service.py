import httpx

FRANKFURTER_URL = "https://api.frankfurter.dev/v2"


def get_exchange_rate(
    from_currency: str,
    to_currency: str = "INR",
) -> float:
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    if from_currency == to_currency:
        return 1.0

    url = f"{FRANKFURTER_URL}/rate/{from_currency}/{to_currency}"

    with httpx.Client(timeout=10) as client:
        response = client.get(url)
        response.raise_for_status()

    data = response.json()

    return float(data["rate"])
