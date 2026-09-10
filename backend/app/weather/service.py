import requests
from datetime import datetime

DEFAULT_LAT = 24.8607
DEFAULT_LON = 67.0011
DEFAULT_CITY = "Karachi"


def geocode_city(city_name: str) -> dict | None:
    """Convert a city name into latitude/longitude using Open-Meteo's free geocoding API."""
    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {"name": city_name, "count": 1}
    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    results = data.get("results")
    if not results:
        return None

    result = results[0]
    return {
        "name": result.get("name"),
        "country": result.get("country"),
        "latitude": result.get("latitude"),
        "longitude": result.get("longitude"),
    }


def get_current_weather(lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON) -> dict:
    """Fetch real, live weather data from Open-Meteo (free, no API key needed). Falls back to a neutral response if the API is unreachable."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,precipitation,weather_code,wind_speed_10m",
        "daily": "precipitation_probability_max,temperature_2m_max,temperature_2m_min",
        "timezone": "auto",
        "forecast_days": 7,
    }
    try:
        response = requests.get(url, params=params, timeout=8)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException:
        return {
            "fetched_at": datetime.utcnow().isoformat(),
            "temperature_c": None,
            "precipitation_mm": None,
            "wind_speed_kmh": None,
            "weather_code": None,
            "daily_forecast": [],
            "unavailable": True,
        }

    current = data.get("current", {})
    daily = data.get("daily", {})

    return {
        "fetched_at": datetime.utcnow().isoformat(),
        "temperature_c": current.get("temperature_2m"),
        "precipitation_mm": current.get("precipitation"),
        "wind_speed_kmh": current.get("wind_speed_10m"),
        "weather_code": current.get("weather_code"),
        "daily_forecast": [
            {
                "date": daily["time"][i],
                "rain_probability_percent": daily["precipitation_probability_max"][i],
                "temp_max_c": daily["temperature_2m_max"][i],
                "temp_min_c": daily["temperature_2m_min"][i],
            }
            for i in range(len(daily.get("time", [])))
        ],
    }


def weather_code_to_condition(code: int) -> str:
    if code == 0:
        return "Clear sky"
    if code in [1, 2, 3]:
        return "Partly cloudy"
    if code in [45, 48]:
        return "Foggy"
    if code in [51, 53, 55, 56, 57]:
        return "Drizzle"
    if code in [61, 63, 65, 66, 67]:
        return "Rain"
    if code in [71, 73, 75, 77]:
        return "Snow"
    if code in [80, 81, 82]:
        return "Rain showers"
    if code in [95, 96, 99]:
        return "Thunderstorm"
    return "Unknown"


def get_business_impact(weather: dict) -> list:
    if weather.get("unavailable"):
        return [{
            "signal": "Weather data unavailable",
            "impact": "Could not reach the weather service right now. No demand adjustment applied.",
            "delivery_risk": "Unknown — check again shortly.",
        }]

    signals = []
    rain_prob = weather["daily_forecast"][0]["rain_probability_percent"] if weather["daily_forecast"] else 0
    temp_max = weather["daily_forecast"][0]["temp_max_c"] if weather["daily_forecast"] else None

    if rain_prob is not None and rain_prob >= 50:
        signals.append({
            "signal": "High rain probability",
            "impact": "Increased demand expected for umbrellas, rain jackets, waterproof shoes.",
            "delivery_risk": "Elevated — expect possible delivery delays.",
        })

    if temp_max is not None and temp_max >= 35:
        signals.append({
            "signal": "High temperature",
            "impact": "Increased demand expected for cooling products, beverages, sun protection.",
            "delivery_risk": "Normal.",
        })

    if temp_max is not None and temp_max <= 10:
        signals.append({
            "signal": "Low temperature",
            "impact": "Increased demand expected for warm clothing and heaters.",
            "delivery_risk": "Normal.",
        })

    if not signals:
        signals.append({
            "signal": "Stable conditions",
            "impact": "No significant weather-driven demand shift expected.",
            "delivery_risk": "Normal.",
        })

    return signals