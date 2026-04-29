// routes/weatherRoutes.js — RESTful API routes for weather data

const express = require('express');
const router  = express.Router();
const {
  getCurrentWeather,
  getForecast,
  searchCities
} = require('../controllers/weatherController');

// GET /api/weather?city=Chennai        — current weather
// GET /api/weather?lat=13.08&lon=80.27 — by coordinates
router.get('/weather', getCurrentWeather);

// GET /api/forecast?city=Chennai       — 5-day forecast
router.get('/forecast', getForecast);

// GET /api/search?q=Chen               — city autocomplete
router.get('/search', searchCities);

module.exports = router;
