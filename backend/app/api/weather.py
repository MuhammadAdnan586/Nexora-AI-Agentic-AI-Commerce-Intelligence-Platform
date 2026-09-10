from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import require_role
from app.models.user import User, UserRole
from app.weather.service import get_current_weather, get_business_impact, weather_code_to_condition, geocode_city, DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY

router = APIRouter(prefix="/weather", tags=["Weather Intelligence"])


@router.get("/current")
def current_weather(
    city: str | None = None,
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    lat, lon, resolved_city = DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY

    if city:
        location = geocode_city(city)
        if not location:
            raise HTTPException(status_code=404, detail=f"Could not find location for '{city}'")
        lat, lon, resolved_city = location["latitude"], location["longitude"], location["name"]

    weather = get_current_weather(lat, lon)
    condition = weather_code_to_condition(weather["weather_code"]) if weather["weather_code"] is not None else "Unknown"
    impact = get_business_impact(weather)

    return {
        "city": resolved_city,
        "condition": condition,
        "temperature_c": weather["temperature_c"],
        "precipitation_mm": weather["precipitation_mm"],
        "wind_speed_kmh": weather["wind_speed_kmh"],
        "daily_forecast": weather["daily_forecast"],
        "business_impact": impact,
    }