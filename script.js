/* ============================================================================
   Weather App (Production-ready)
   - Requires HTTPS or http://localhost for geolocation
   - OpenWeather endpoints: /weather, /forecast, /air_pollution
   ========================================================================== */

/**
 * IMPORTANT:
 * If you deploy publicly, do NOT ship your API key in frontend JS.
 * Use a small server/proxy (Netlify Functions / Vercel / Express) to hide it.
 */
const API_KEY = "...";

// --- Configuration ----------------------------------------------------------

const OPENWEATHER = {
  base: "https://api.openweathermap.org/data/2.5",
  units: "metric",
  timeoutMs: 12000
};

const WEATHER_CONFIG = {
  cold:   { frames: 7, animationPath: "Animations/cold/Frame",   bgClass: "night-bg" },
  cloudy: { frames: 6, animationPath: "Animations/cloudy/Cloudy", bgClass: "cloudy-bg" },
  rainy:  { frames: 4, animationPath: "Animations/rainy/rain",   bgClass: "rainy-bg" },
  sunny:  { frames: 6, animationPath: "Animations/sunny/fun",    bgClass: "sunny-bg" },
  night:  { frames: 6, animationPath: "Animations/sunny/fun",    bgClass: "night-bg" }
};

const CLOTHING_RECOMMENDATIONS = {
  freezing: { items: ["Heavy winter coat", "Thick scarf", "Gloves", "Warm boots", "Thermal layers"], title: "Bundle up warmly" },
  cold:     { items: ["Warm jacket", "Sweater", "Long pants", "Closed shoes", "Light scarf"], title: "Dress warmly" },
  cool:     { items: ["Light jacket", "Long sleeves", "Jeans", "Sneakers"], title: "Light layers" },
  mild:     { items: ["Light sweater", "T-shirt", "Comfortable pants", "Any shoes"], title: "Comfortable clothing" },
  warm:     { items: ["T-shirt", "Shorts or light pants", "Sandals or sneakers", "Sunglasses"], title: "Light clothing" },
  hot:      { items: ["Light breathable clothes", "Shorts", "Sandals", "Sunglasses", "Hat for sun protection"], title: "Stay cool" }
};

// --- State ------------------------------------------------------------------

let animationIntervalId = null;
let requestController = null;

// --- DOM helpers ------------------------------------------------------------

function $(id) {
  return document.getElementById(id);
}

function setText(el, text) {
  if (el) el.textContent = text;
}

function setHTML(el, html) {
  if (el) el.innerHTML = html;
}

function safeClassName(el, className) {
  if (el) el.className = className;
}

function setDisplay(el, show) {
  if (el) el.style.display = show ? "block" : "none";
}

function setColor(el, color) {
  if (el) el.style.color = color;
}

// --- Network helpers --------------------------------------------------------

function withTimeout(ms, controller) {
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return () => clearTimeout(timeoutId);
}

async function fetchJSON(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const msg = `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return res.json();
}

function buildUrl(path, params) {
  const u = new URL(`${OPENWEATHER.base}${path}`);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  return u.toString();
}

// --- Weather logic ----------------------------------------------------------

function isNightNow() {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
}

/**
 * Priority:
 * 1) Rain/Drizzle/Snow/Thunder -> rainy (you can split these later if you add animations)
 * 2) Cold by temperature
 * 3) Night background
 * 4) Cloudy
 * 5) Default sunny
 */
function determineWeatherCondition(data, nightFlag) {
  const temp = Number(data?.main?.temp ?? 0);
  const weatherMain = String(data?.weather?.[0]?.main ?? "").toLowerCase();

  // Precipitation first
  if (weatherMain.includes("rain") || weatherMain.includes("drizzle") || weatherMain.includes("snow") || weatherMain.includes("thunder")) {
    return "rainy";
  }

  // Cold by temperature
  if (temp < 15) return "cold";

  // Night background (only if not precipitation/cold overriding)
  if (nightFlag) return "night";

  // Clouds
  if (weatherMain.includes("cloud") || weatherMain.includes("mist") || weatherMain.includes("fog") || weatherMain.includes("haze")) {
    return "cloudy";
  }

  return "sunny";
}

function getClothingRecommendation(temp, weatherMainLower) {
  let category;

  if (temp < 0) category = "freezing";
  else if (temp < 10) category = "cold";
  else if (temp < 15) category = "cool";
  else if (temp < 20) category = "mild";
  else if (temp < 25) category = "warm";
  else category = "hot";

  const rec = { ...CLOTHING_RECOMMENDATIONS[category] };

  if (weatherMainLower.includes("rain") || weatherMainLower.includes("drizzle") || weatherMainLower.includes("thunder")) {
    rec.items = ["Umbrella", "Rain jacket", ...rec.items];
    rec.title = "Rain protection needed";
  }

  return rec;
}

function getWeatherMessage(temp, weatherMainLower, nightFlag) {
  if (nightFlag) return temp < 15 ? "It's a cold night..." : "It's a lovely night...";

  if (weatherMainLower.includes("rain") || weatherMainLower.includes("drizzle")) {
    return temp < 15 ? "It's cold and raining..." : "It's raining today!";
  }
  if (weatherMainLower.includes("cloud")) {
    return temp < 15 ? "It's cold and cloudy..." : "It's a cloudy day...";
  }
  if (temp > 25) return "It's a hot day!";
  return "It's a nice day!";
}

// --- UI updates -------------------------------------------------------------

function applyTheme(weatherCondition) {
  const container = $("weatherContainer");
  const weatherContent = document.querySelector(".weather-content");

  const config = WEATHER_CONFIG[weatherCondition] || WEATHER_CONFIG.sunny;
  safeClassName(container, `container ${config.bgClass}`);

  // Sunny -> black text, else -> white text
  const color = weatherCondition === "sunny" ? "#000" : "#fff";
  setColor(weatherContent, color);
  setColor($("weatherMessage"), color);
  setColor($("temperature"), color);
  setColor($("feelsLike"), color);
  setColor($("humidity"), color);
  setColor($("aqi"), color);
  setColor($("tomorrowForecast"), color);
  setColor($("recommendation"), color);
}

function startCharacterAnimation(config) {
  const character = $("character");
  const characterContainer = document.querySelector(".character-container");
  if (!character || !characterContainer) return;

  // Always position character on right side
  characterContainer.style.left = "auto";
  characterContainer.style.right = "10px";
  character.style.transform = "scaleX(-1)";

  // stop existing
  if (animationIntervalId) clearInterval(animationIntervalId);

  const frames = Array.from({ length: config.frames }, (_, i) => i + 1);
  let idx = 0;

  // initial frame
  character.style.backgroundImage = `url('${config.animationPath}1.png')`;

  animationIntervalId = setInterval(() => {
    const frameNumber = frames[idx % frames.length];
    character.style.backgroundImage = `url('${config.animationPath}${frameNumber}.png')`;
    idx = (idx + 1) % frames.length;
  }, 1500);
}

function displayError(mainMessage, subMessage) {
  setText($("weatherMessage"), mainMessage);
  setText($("tempMessage"), subMessage);

  // hide optional widgets
  const clothingEl = $("clothingRecommendations");
  if (clothingEl) clothingEl.style.display = "none";
}

function showLocationError(mainMessage, subMessage) {
  setText($("weatherMessage"), mainMessage);
  setText($("tempMessage"), subMessage);

  let retryBtn = $("locationRetryBtn");
  if (!retryBtn) {
    retryBtn = document.createElement("button");
    retryBtn.id = "locationRetryBtn";
    retryBtn.textContent = "Retry";
    retryBtn.style.cssText =
      "position: absolute; bottom: 12px; right: 12px; z-index: 10; padding: 6px 10px; font-family: LoRes12, monospace; font-size: 12px; cursor: pointer; border-radius: 4px; background: #fff8; border: 1px solid rgba(0,0,0,0.2);";
    retryBtn.addEventListener("click", () => window.location.reload());
    document.body.appendChild(retryBtn);
  }
}

// --- Data updates -----------------------------------------------------------

function updateAQIUI(aqiData) {
  const aqiEl = $("aqi");
  if (!aqiEl) return;

  const aqiIndex = Number(aqiData?.list?.[0]?.main?.aqi ?? 0); // 1..5
  const pm25 = Math.round(Number(aqiData?.list?.[0]?.components?.pm2_5 ?? 0));

  const labels = {
    1: "Good",
    2: "Fair",
    3: "Moderate",
    4: "Poor",
    5: "Very Poor"
  };

  const label = labels[aqiIndex] || "Unknown";
  // Show both label and pm2.5 (more informative)
  aqiEl.textContent = `Air Quality: ${label} (PM2.5 ${pm25})`;
}

function updateForecastUI(forecastData) {
  const forecastEl = $("tomorrowForecast");
  const recommendationEl = $("recommendation");
  if (!forecastEl) return;

  if (!forecastData?.list || forecastData.list.length === 0) return;

  const now = new Date();
  const tomorrowNoon = new Date(now);
  tomorrowNoon.setDate(now.getDate() + 1);
  tomorrowNoon.setHours(12, 0, 0, 0);

  // Find closest forecast to tomorrow noon that is actually tomorrow's date
  let closest = null;
  let bestDiff = Infinity;

  for (const item of forecastData.list) {
    const t = new Date(item.dt * 1000);
    const isTomorrow = t.getDate() === tomorrowNoon.getDate() && t.getMonth() === tomorrowNoon.getMonth() && t.getFullYear() === tomorrowNoon.getFullYear();
    if (!isTomorrow) continue;

    const diff = Math.abs(t - tomorrowNoon);
    if (diff < bestDiff) {
      bestDiff = diff;
      closest = item;
    }
  }

  // Fallback: if no “tomorrow” entry found (rare), use first available
  if (!closest) closest = forecastData.list[0];

  const condRaw = String(closest?.weather?.[0]?.main ?? "Unknown");
  const condLower = condRaw.toLowerCase();
  const temp = Math.round(Number(closest?.main?.temp ?? 0));

  let readable;
  if (condLower.includes("rain") || condLower.includes("drizzle")) readable = "Rainy";
  else if (condLower.includes("cloud")) readable = "Cloudy";
  else if (condLower.includes("clear")) readable = "Sunny";
  else if (condLower.includes("snow")) readable = "Snowy";
  else if (condLower.includes("thunder")) readable = "Stormy";
  else readable = condRaw;

  forecastEl.textContent = `Tomorrow: ${readable} (${temp}°C)`;
  setDisplay(forecastEl, true);

  if (recommendationEl) {
    const clothing = getClothingRecommendation(temp, condLower);
    const clothingText = clothing.items.slice(0, 2).join(", ");
    setHTML(recommendationEl, `Recommendation:<br>${clothingText}`);
  }
}

function updateCurrentWeatherUI(currentData) {
  const temp = Math.round(Number(currentData?.main?.temp ?? 0));
  const feelsLike = Math.round(Number(currentData?.main?.feels_like ?? temp));
  const humidity = Number(currentData?.main?.humidity ?? 0);
  const weatherMainLower = String(currentData?.weather?.[0]?.main ?? "").toLowerCase();

  const nightFlag = isNightNow();

  const condition = determineWeatherCondition(currentData, nightFlag);
  const config = WEATHER_CONFIG[condition] || WEATHER_CONFIG.sunny;

  applyTheme(condition);

  setText($("weatherMessage"), getWeatherMessage(temp, weatherMainLower, nightFlag));
  setText($("temperature"), `${temp}°C`);

  const feelsEl = $("feelsLike");
  if (feelsEl) {
    if (Math.abs(temp - feelsLike) >= 3) {
      feelsEl.textContent = `Feels like ${feelsLike}°C`;
      feelsEl.style.display = "block";
    } else {
      feelsEl.style.display = "none";
    }
  }

  const humidityEl = $("humidity");
  if (humidityEl) humidityEl.textContent = `Humidity: ${humidity}%`;

  startCharacterAnimation(config);
}

// --- Main flow --------------------------------------------------------------

async function loadWeatherForCoords(lat, lon) {
  if (!API_KEY || API_KEY === "YOUR_KEY_HERE") {
    displayError("Missing API key", "Set API_KEY in script.js");
    return;
  }

  // Abort previous request batch
  if (requestController) requestController.abort();
  requestController = new AbortController();

  const clearTimeoutFn = withTimeout(OPENWEATHER.timeoutMs, requestController);

  const weatherUrl = buildUrl("/weather", {
    lat,
    lon,
    appid: API_KEY,
    units: OPENWEATHER.units
  });

  const forecastUrl = buildUrl("/forecast", {
    lat,
    lon,
    appid: API_KEY,
    units: OPENWEATHER.units
  });

  const aqiUrl = buildUrl("/air_pollution", {
    lat,
    lon,
    appid: API_KEY
  });

  try {
    // Fetch in parallel
    const [current, forecast, aqi] = await Promise.all([
      fetchJSON(weatherUrl, requestController.signal),
      fetchJSON(forecastUrl, requestController.signal),
      fetchJSON(aqiUrl, requestController.signal)
    ]);

    updateCurrentWeatherUI(current);
    updateForecastUI(forecast);
    updateAQIUI(aqi);
  } catch (err) {
    if (err?.name === "AbortError") return;
    console.error("Weather load failed:", err);
    displayError("Failed to load weather", "Please try again later");
  } finally {
    clearTimeoutFn();
  }
}

function requestLocationAndLoad() {
  if (!("geolocation" in navigator)) {
    displayError("Geolocation not available", "Please enable location services");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      loadWeatherForCoords(lat, lon);
    },
    (error) => {
      console.warn("Geolocation error:", error?.code, error?.message);

      if (!error) {
        showLocationError("Location unavailable", "Unable to determine your location");
        return;
      }

      switch (error.code) {
        case error.PERMISSION_DENIED:
          showLocationError("Location access denied", "Allow location access in your browser settings.");
          break;
        case error.POSITION_UNAVAILABLE:
          showLocationError(
            "Location unavailable",
            "Run a local server: python -m http.server 8000, then open http://localhost:8000/"
          );
          break;
        case error.TIMEOUT:
          showLocationError("Location request timed out", "Please try again.");
          break;
        default:
          showLocationError("Location error", "Unable to determine your location.");
          break;
      }
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}

// Public refresh hook (optional button)
window.refreshWeather = function refreshWeather() {
  requestLocationAndLoad();
};

// Boot
document.addEventListener("DOMContentLoaded", () => {
  requestLocationAndLoad();
});
