// controllers/weatherController.js
// Proxies OpenWeatherMap API — keeps API key secure on backend

const axios = require('axios');
const cache = require('../config/cache');

const API_BASE    = 'https://api.openweathermap.org/data/2.5';
const GEO_BASE    = 'https://api.openweathermap.org/geo/1.0';
const ICON_BASE   = 'https://openweathermap.org/img/wn';

// Helper — build icon URL
const iconUrl = (code) => `${ICON_BASE}/${code}@2x.png`;

// Helper — format wind direction
const windDir = (deg) => {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
};

// ---- GET /api/weather?city=Chennai ----
const getCurrentWeather = async (req, res) => {
  try {
    const city = req.query.city?.trim();
    const lat  = req.query.lat;
    const lon  = req.query.lon;

    if (!city && (!lat || !lon)) {
      return res.status(400).json({ success: false, error: 'City name or coordinates are required.' });
    }

    const cacheKey = city ? `weather_${city.toLowerCase()}` : `weather_${lat}_${lon}`;

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit: ${cacheKey}`);
      return res.json({ success: true, cached: true, data: cached });
    }

    const params = {
      appid: process.env.OPENWEATHER_API_KEY,
      units: 'metric',
      ...(city ? { q: city } : { lat, lon })
    };

    const response = await axios.get(`${API_BASE}/weather`, { params });
    const d = response.data;

    const result = {
      city:        d.name,
      country:     d.sys.country,
      temperature: Math.round(d.main.temp),
      feelsLike:   Math.round(d.main.feels_like),
      tempMin:     Math.round(d.main.temp_min),
      tempMax:     Math.round(d.main.temp_max),
      humidity:    d.main.humidity,
      pressure:    d.main.pressure,
      visibility:  Math.round((d.visibility || 0) / 1000),
      description: d.weather[0].description,
      icon:        iconUrl(d.weather[0].icon),
      iconCode:    d.weather[0].icon,
      windSpeed:   d.wind.speed,
      windDir:     windDir(d.wind.deg || 0),
      cloudiness:  d.clouds.all,
      sunrise:     new Date(d.sys.sunrise * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      sunset:      new Date(d.sys.sunset  * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      timezone:    d.timezone,
      lat:         d.coord.lat,
      lon:         d.coord.lon,
      timestamp:   new Date().toISOString()
    };

    cache.set(cacheKey, result);
    console.log(`🌤️  Weather fetched: ${result.city}, ${result.country}`);
    res.json({ success: true, cached: false, data: result });

  } catch (err) {
    console.error('Weather API error:', err.response?.data || err.message);
    if (err.response?.status === 404) {
      return res.status(404).json({ success: false, error: 'City not found. Please check the spelling and try again.' });
    }
    if (err.response?.status === 401) {
      return res.status(401).json({ success: false, error: 'Invalid API key.' });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch weather data. Please try again.' });
  }
};

// ---- GET /api/forecast?city=Chennai ----
const getForecast = async (req, res) => {
  try {
    const city = req.query.city?.trim();
    const lat  = req.query.lat;
    const lon  = req.query.lon;

    if (!city && (!lat || !lon)) {
      return res.status(400).json({ success: false, error: 'City name or coordinates are required.' });
    }

    const cacheKey = city ? `forecast_${city.toLowerCase()}` : `forecast_${lat}_${lon}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, cached: true, data: cached });
    }

    const params = {
      appid: process.env.OPENWEATHER_API_KEY,
      units: 'metric',
      cnt:   40,
      ...(city ? { q: city } : { lat, lon })
    };

    const response = await axios.get(`${API_BASE}/forecast`, { params });
    const list = response.data.list;

    // Group by day — take one entry per day (noon time preferred)
    const days = {};
    list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const day  = date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
      const hour = date.getHours();
      if (!days[day] || Math.abs(hour - 12) < Math.abs(new Date(days[day].dt * 1000).getHours() - 12)) {
        days[day] = item;
      }
    });

    const forecast = Object.entries(days).slice(0, 5).map(([day, item]) => ({
      day,
      temp:        Math.round(item.main.temp),
      tempMin:     Math.round(item.main.temp_min),
      tempMax:     Math.round(item.main.temp_max),
      description: item.weather[0].description,
      icon:        iconUrl(item.weather[0].icon),
      humidity:    item.main.humidity,
      windSpeed:   item.wind.speed,
      pop:         Math.round((item.pop || 0) * 100)
    }));

    const result = {
      city:     response.data.city.name,
      country:  response.data.city.country,
      forecast
    };

    cache.set(cacheKey, result);
    res.json({ success: true, cached: false, data: result });

  } catch (err) {
    console.error('Forecast API error:', err.response?.data || err.message);
    if (err.response?.status === 404) {
      return res.status(404).json({ success: false, error: 'City not found.' });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch forecast data.' });
  }
};

// ---- GET /api/search?q=Chen ---- (city autocomplete)
const searchCities = async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, error: 'Query too short.' });
    }

    const response = await axios.get(`${GEO_BASE}/direct`, {
      params: { q, limit: 5, appid: process.env.OPENWEATHER_API_KEY }
    });

    const cities = response.data.map(c => ({
      name:    c.name,
      country: c.country,
      state:   c.state || '',
      lat:     c.lat,
      lon:     c.lon,
      label:   `${c.name}${c.state ? ', ' + c.state : ''}, ${c.country}`
    }));

    res.json({ success: true, data: cities });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Search failed.' });
  }
};

module.exports = { getCurrentWeather, getForecast, searchCities };
