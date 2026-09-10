"use client";

import { useEffect, useState } from "react";
import { CloudRain, Thermometer, Wind, AlertTriangle } from "lucide-react";
import { api } from "@/context/AuthContext";

interface DailyForecast {
  date: string;
  rain_probability_percent: number;
  temp_max_c: number;
  temp_min_c: number;
}

interface BusinessImpact {
  signal: string;
  impact: string;
  delivery_risk: string;
}

interface WeatherData {
  city: string;
  condition: string;
  temperature_c: number;
  precipitation_mm: number;
  wind_speed_kmh: number;
  daily_forecast: DailyForecast[];
  business_impact: BusinessImpact[];
}

interface Warehouse {
  id: number;
  name: string;
  city: string | null;
}

export default function WeatherPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/warehouses").then((res) => setWarehouses(res.data));
  }, []);

  const loadWeather = async (city?: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/weather/current", { params: city ? { city } : {} });
      setWeather(res.data);
    } catch {
      setError("Could not load weather for this location.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, []);

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    loadWeather(city || undefined);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CloudRain className="text-nexora-cyan" size={22} />
          <h1 className="font-display text-2xl font-bold">Weather Intelligence</h1>
        </div>
        <select
          value={selectedCity}
          onChange={(e) => handleCitySelect(e.target.value)}
          className="bg-nexora-surface border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
        >
          <option value="">Default (Karachi)</option>
          {warehouses
            .filter((w) => w.city)
            .map((w) => (
              <option key={w.id} value={w.city!}>
                {w.name} — {w.city}
              </option>
            ))}
        </select>
      </div>

      {loading ? (
        <p className="text-nexora-muted">Loading weather data...</p>
      ) : error ? (
        <p className="text-nexora-danger">{error}</p>
      ) : weather ? (
        <>
          <p className="text-sm text-nexora-muted mb-4">Showing weather for {weather.city}</p>

          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-5">
              <div className="bg-nexora-cyan/10 text-nexora-cyan w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                <Thermometer size={18} />
              </div>
              <p className="text-2xl font-display font-bold mb-1">{weather.temperature_c}°C</p>
              <p className="text-sm text-nexora-muted">{weather.condition}</p>
            </div>
            <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-5">
              <div className="bg-nexora-primary/10 text-nexora-primary w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                <CloudRain size={18} />
              </div>
              <p className="text-2xl font-display font-bold mb-1">{weather.precipitation_mm} mm</p>
              <p className="text-sm text-nexora-muted">Precipitation</p>
            </div>
            <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-5">
              <div className="bg-nexora-warning/10 text-nexora-warning w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                <Wind size={18} />
              </div>
              <p className="text-2xl font-display font-bold mb-1">{weather.wind_speed_kmh} km/h</p>
              <p className="text-sm text-nexora-muted">Wind Speed</p>
            </div>
          </div>

          <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 mb-8">
            <h2 className="font-display font-bold mb-4">Business Impact</h2>
            <div className="space-y-3">
              {weather.business_impact.map((impact, i) => (
                <div key={i} className="flex items-start gap-3 bg-nexora-bg border border-nexora-border rounded-xl p-4">
                  <AlertTriangle className="text-nexora-warning shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="font-medium text-sm">{impact.signal}</p>
                    <p className="text-sm text-nexora-muted">{impact.impact}</p>
                    <p className="text-xs text-nexora-muted mt-1">Delivery risk: {impact.delivery_risk}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6">
            <h2 className="font-display font-bold mb-4">7-Day Forecast</h2>
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
              {weather.daily_forecast.map((day) => (
                <div key={day.date} className="text-center bg-nexora-bg border border-nexora-border rounded-xl p-3">
                  <p className="text-xs text-nexora-muted mb-2">{day.date.slice(5)}</p>
                  <p className="text-sm font-mono font-bold">{day.temp_max_c}°</p>
                  <p className="text-xs text-nexora-muted">{day.temp_min_c}°</p>
                  <p className="text-xs text-nexora-cyan mt-1">{day.rain_probability_percent}%</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}