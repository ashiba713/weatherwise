// ============================================
//  WEATHERWISE — main.js
//  Fetches weather data from backend proxy API
// ============================================

const searchInput  = document.getElementById('searchInput');
const searchBtn    = document.getElementById('searchBtn');
const locateBtn    = document.getElementById('locateBtn');
const suggestions  = document.getElementById('suggestions');
const searchError  = document.getElementById('searchError');
const loading      = document.getElementById('loading');
const weatherWrap  = document.getElementById('weatherWrap');
const emptyState   = document.getElementById('emptyState');

let searchTimer = null;

// ============================================
//  STATE HELPERS
// ============================================
function showLoading() {
  loading.style.display     = 'block';
  weatherWrap.style.display = 'none';
  emptyState.style.display  = 'none';
  searchError.textContent   = '';
}
function showWeather() {
  loading.style.display     = 'none';
  weatherWrap.style.display = 'block';
  emptyState.style.display  = 'none';
  weatherWrap.classList.add('fade-in');
}
function showEmpty() {
  loading.style.display     = 'none';
  weatherWrap.style.display = 'none';
  emptyState.style.display  = 'block';
}
function showError(msg) {
  loading.style.display   = 'none';
  emptyState.style.display = 'block';
  searchError.textContent = msg;
}

// ============================================
//  SEARCH — AUTOCOMPLETE
// ============================================
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = searchInput.value.trim();
  if (q.length < 2) { suggestions.classList.remove('open'); return; }
  searchTimer = setTimeout(() => fetchSuggestions(q), 350);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { suggestions.classList.remove('open'); searchCity(); }
});

searchBtn.addEventListener('click', () => { suggestions.classList.remove('open'); searchCity(); });

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrap')) suggestions.classList.remove('open');
});

async function fetchSuggestions(q) {
  try {
    const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!data.success || !data.data.length) { suggestions.classList.remove('open'); return; }

    suggestions.innerHTML = data.data.map(c => `
      <div class="suggestion-item" onclick="selectCity('${c.name}, ${c.country}')">
        📍 ${c.name}${c.state ? ', ' + c.state : ''}
        <span>${c.country}</span>
      </div>
    `).join('');
    suggestions.classList.add('open');
  } catch {
    suggestions.classList.remove('open');
  }
}

function selectCity(name) {
  searchInput.value = name;
  suggestions.classList.remove('open');
  searchCity();
}

function quickSearch(city) {
  searchInput.value = city;
  searchCity();
}

// ============================================
//  FETCH WEATHER
// ============================================
async function searchCity() {
  const city = searchInput.value.trim();
  if (!city) { searchError.textContent = 'Please enter a city name.'; return; }
  showLoading();
  await Promise.all([fetchCurrentWeather({ city }), fetchForecast({ city })]);
}

async function fetchCurrentWeather({ city, lat, lon }) {
  try {
    const query = city
      ? `/api/weather?city=${encodeURIComponent(city)}`
      : `/api/weather?lat=${lat}&lon=${lon}`;

    const res  = await fetch(query);
    const data = await res.json();

    if (!res.ok || !data.success) {
      showError(data.error || 'City not found.');
      return;
    }

    renderCurrentWeather(data.data);
    showWeather();
  } catch {
    showError('Network error. Please check your connection.');
  }
}

async function fetchForecast({ city, lat, lon }) {
  try {
    const query = city
      ? `/api/forecast?city=${encodeURIComponent(city)}`
      : `/api/forecast?lat=${lat}&lon=${lon}`;

    const res  = await fetch(query);
    const data = await res.json();
    if (data.success) renderForecast(data.data.forecast);
  } catch {
    document.getElementById('forecastGrid').innerHTML = '<p style="color:#888;font-size:.85rem">Could not load forecast.</p>';
  }
}

// ============================================
//  RENDER CURRENT WEATHER
// ============================================
function renderCurrentWeather(d) {
  document.getElementById('wLocation').textContent = `${d.city}, ${d.country}`;
  document.getElementById('wDate').textContent     = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  document.getElementById('wTemp').textContent    = `${d.temperature}°C`;
  document.getElementById('wDesc').textContent    = d.description;
  document.getElementById('wIcon').src            = d.icon;
  document.getElementById('wIcon').alt            = d.description;
  document.getElementById('wFeels').textContent   = `Feels like ${d.feelsLike}°C`;
  document.getElementById('wHumidity').textContent = `${d.humidity}%`;
  document.getElementById('wWind').textContent    = `${d.windSpeed} m/s ${d.windDir}`;
  document.getElementById('wVis').textContent     = `${d.visibility} km`;
  document.getElementById('wPressure').textContent = `${d.pressure} hPa`;
  document.getElementById('wCloud').textContent   = `${d.cloudiness}%`;
  document.getElementById('wSunrise').textContent = d.sunrise;
  document.getElementById('wSunset').textContent  = d.sunset;

  // Temp range bar
  document.getElementById('trMin').textContent = `${d.tempMin}°C`;
  document.getElementById('trMax').textContent = `${d.tempMax}°C`;
  const range   = d.tempMax - d.tempMin || 1;
  const percent = ((d.temperature - d.tempMin) / range) * 100;
  document.getElementById('rangeFill').style.left = `${Math.min(Math.max(percent, 5), 95)}%`;

  // Hero background by weather
  styleHeroByWeather(d.iconCode);

  // Details grid
  document.getElementById('detailsGrid').innerHTML = `
    <div class="detail-card"><div class="d-icon">🌡️</div><div class="d-label">Min Temp</div><div class="d-val">${d.tempMin}°C</div></div>
    <div class="detail-card"><div class="d-icon">🔥</div><div class="d-label">Max Temp</div><div class="d-val">${d.tempMax}°C</div></div>
    <div class="detail-card"><div class="d-icon">💧</div><div class="d-label">Humidity</div><div class="d-val">${d.humidity}%</div></div>
    <div class="detail-card"><div class="d-icon">🌬️</div><div class="d-label">Wind Speed</div><div class="d-val">${d.windSpeed} m/s</div></div>
    <div class="detail-card"><div class="d-icon">☁️</div><div class="d-label">Cloud Cover</div><div class="d-val">${d.cloudiness}%</div></div>
    <div class="detail-card"><div class="d-icon">📊</div><div class="d-label">Pressure</div><div class="d-val">${d.pressure} hPa</div></div>
  `;
}

function styleHeroByWeather(iconCode) {
  const hero = document.getElementById('weatherHero');
  if (iconCode.includes('01')) {
    hero.style.background = 'linear-gradient(135deg, #f7941d 0%, #f9a825 100%)'; // clear
  } else if (iconCode.includes('02') || iconCode.includes('03')) {
    hero.style.background = 'linear-gradient(135deg, #1a6eb5 0%, #4a9fd5 100%)'; // partly cloudy
  } else if (iconCode.includes('09') || iconCode.includes('10')) {
    hero.style.background = 'linear-gradient(135deg, #2c3e50 0%, #3d6b8e 100%)'; // rain
  } else if (iconCode.includes('11')) {
    hero.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; // thunderstorm
  } else if (iconCode.includes('13')) {
    hero.style.background = 'linear-gradient(135deg, #74b9ff 0%, #a29bfe 100%)'; // snow
  } else {
    hero.style.background = 'linear-gradient(135deg, #1a3a6b 0%, #1a6eb5 60%, #0e9aa7 100%)';
  }
}

// ============================================
//  RENDER FORECAST
// ============================================
function renderForecast(forecast) {
  document.getElementById('forecastGrid').innerHTML = forecast.map(f => `
    <div class="forecast-card">
      <p class="fc-day">${f.day}</p>
      <img class="fc-icon" src="${f.icon}" alt="${f.description}"/>
      <p class="fc-temp">${f.temp}°C</p>
      <p class="fc-range">${f.tempMin}° / ${f.tempMax}°</p>
      <p class="fc-desc">${f.description}</p>
      ${f.pop > 0 ? `<p class="fc-pop">🌧 ${f.pop}%</p>` : ''}
    </div>
  `).join('');
}

// ============================================
//  GEOLOCATION
// ============================================
locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    searchError.textContent = 'Geolocation not supported by your browser.';
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      Promise.all([
        fetchCurrentWeather({ lat, lon }),
        fetchForecast({ lat, lon })
      ]);
    },
    () => showError('Location access denied. Please search manually.')
  );
});

// ============================================
//  INIT
// ============================================
showEmpty();
