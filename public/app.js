const WEATHER_CODE_TEXT = {
  0: "晴",
  1: "大部晴朗",
  2: "局部多云",
  3: "阴",
  45: "雾",
  48: "霜雾",
  51: "小毛毛雨",
  53: "中等毛毛雨",
  55: "大毛毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  80: "小阵雨",
  81: "中等阵雨",
  82: "强阵雨",
  95: "雷雨",
  96: "雷雨伴小冰雹",
  99: "雷雨伴大冰雹"
};

const elements = {
  cityTitle: document.querySelector("#cityTitle"),
  sourceLabel: document.querySelector("#sourceLabel"),
  temperature: document.querySelector("#temperature"),
  temperatureText: document.querySelector("#temperatureText"),
  city: document.querySelector("#city"),
  condition: document.querySelector("#condition"),
  humidity: document.querySelector("#humidity"),
  wind: document.querySelector("#wind"),
  currentTime: document.querySelector("#currentTime"),
  dataUpdatedAt: document.querySelector("#dataUpdatedAt"),
  tip: document.querySelector("#tip"),
  status: document.querySelector("#status"),
  forecast24: document.querySelector("#forecast24"),
  refreshWeather: document.querySelector("#refreshWeather")
};

const defaultWeather = JSON.parse(document.querySelector("#initialWeatherData").textContent);
const publicConfig = JSON.parse(document.querySelector("#publicConfig").textContent);

function normalizeSourceLabel(label, city) {
  return String(label || `城市：${city}`).replace(/^默认城市：/, "城市：");
}

let lastSuccessfulWeather = defaultWeather;
let currentPlace = {
  city: defaultWeather.city,
  latitude: defaultWeather.latitude,
  longitude: defaultWeather.longitude,
  detailAddress: "当前为默认广州天气",
  streetAddress: "暂无街道/道路",
  sourceLabel: normalizeSourceLabel(defaultWeather.sourceLabel, defaultWeather.city),
  accuracy: null,
  isDefault: true
};

function getWeatherText(code) {
  return WEATHER_CODE_TEXT[Number(code)] || "未知天气";
}

function getWeatherIcon(condition) {
  const text = String(condition || "");

  if (text.includes("雷")) return "⛈";
  if (text.includes("雨")) return "🌧";
  if (text.includes("雪")) return "❄";
  if (text.includes("雾") || text.includes("霜")) return "🌫";
  if (text.includes("云") || text.includes("阴")) return "☁";
  if (text.includes("晴")) return "☀";
  return "🌡";
}

function getDisplayTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";
  } catch {
    return "Asia/Shanghai";
  }
}

function formatDateTime(value) {
  if (!value) return "暂无更新时间";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无更新时间";

  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: getDisplayTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

function formatHour(value) {
  if (!value) return "--:--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(11, 16) || "--:--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: getDisplayTimeZone(),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function formatAccuracy(value) {
  if (!Number.isFinite(Number(value))) {
    return "默认城市";
  }

  return `约 ${Math.round(Number(value))} 米`;
}

function createTip(weather) {
  const condition = String(weather.condition || "");
  const temperature = Number(weather.temperature);

  if (condition.includes("雨")) return "今天可能下雨，出门记得带伞。";
  if (condition.includes("雪")) return "今天有降雪，注意保暖和路面湿滑。";
  if (Number.isFinite(temperature) && temperature >= 32) return "今天气温较高，注意防晒和补水。";
  if (Number.isFinite(temperature) && temperature <= 5) return "今天气温较低，出门请多穿一点。";
  if (condition.includes("晴")) return "今天天气不错，适合安排户外活动。";

  return "天气变化要留意，出门前再看一眼最新预报。";
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

function addNearby(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.endsWith("附近") ? text : `${text}附近`;
}

function compactParts(parts) {
  return [...new Set(parts.map((part) => String(part || "").trim()).filter(Boolean))];
}

function buildAmapLocation(regeocode) {
  const component = regeocode.addressComponent || {};
  const streetNumber = component.streetNumber || {};
  const province = component.province || "";
  const city = Array.isArray(component.city) ? "" : component.city || "";
  const district = component.district || "";
  const township = component.township || "";
  const street = streetNumber.street || "";
  const number = streetNumber.number || "";
  const poi = regeocode.pois?.[0]?.name || "";
  const road = regeocode.roads?.[0]?.name || "";
  const streetText = compactParts([township, street, number || road || poi]).join(" ");
  const cityName = compactParts([province, city, district]).join(" ") || "当前位置附近";
  const formattedAddress = regeocode.formatted_address || "";

  const fallbackWithStreet = compactParts([province, city, district, township, street, number]).join(" ");
  const fallbackWithPoi = compactParts([province, city, district, township, street || road, poi]).join(" ");
  const fallbackDistrict = compactParts([province, city, district]).join(" ");
  const bestAddress = formattedAddress || fallbackWithStreet || fallbackWithPoi || fallbackDistrict || "当前位置";

  return {
    detailAddress: addNearby(bestAddress),
    cityName,
    streetAddress: streetText || road || poi || township || "暂无街道/道路"
  };
}

async function getAmapLocation(latitude, longitude) {
  if (!publicConfig.mapApiKey) {
    return null;
  }

  const url = new URL("https://restapi.amap.com/v3/geocode/regeo");
  url.searchParams.set("key", publicConfig.mapApiKey);
  url.searchParams.set("location", `${longitude},${latitude}`);
  url.searchParams.set("extensions", "all");
  url.searchParams.set("radius", "1000");
  url.searchParams.set("roadlevel", "0");
  url.searchParams.set("output", "json");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("高德逆地理编码请求失败");
  }

  const result = await response.json();
  if (result.status !== "1" || !result.regeocode) {
    throw new Error(result.info || "高德逆地理编码无结果");
  }

  return buildAmapLocation(result.regeocode);
}

function pickAdministrativeName(items, levels) {
  const match = items.find((item) => levels.includes(item.adminLevel) && item.name);
  return match?.name || "";
}

function buildFallbackLocation(location) {
  const administrative = location.localityInfo?.administrative || [];
  const province = location.principalSubdivision || pickAdministrativeName(administrative, [4]);
  const city = location.city || location.locality || pickAdministrativeName(administrative, [5, 6]);
  const district = pickAdministrativeName(administrative, [7, 8, 9, 10]);
  const locality = location.locality || "";
  const parts = compactParts([province, city, district]);
  const streetAddress = district || locality || "暂无街道/道路";
  const bestAddress = parts.length > 0 ? parts.join(" ") : locality || "当前位置";

  return {
    detailAddress: addNearby(bestAddress),
    cityName: parts.join(" ") || "当前位置附近",
    streetAddress
  };
}

async function getFallbackLocation(latitude, longitude) {
  const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("localityLanguage", "zh");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("备用逆地理编码请求失败");
  }

  const location = await response.json();
  return buildFallbackLocation(location);
}

async function getLocationDetail(latitude, longitude) {
  if (publicConfig.mapProvider === "amap" && publicConfig.mapApiKey) {
    try {
      return await getAmapLocation(latitude, longitude);
    } catch {
      // 高德失败时降级到无 Key 服务，不阻断天气获取。
    }
  }

  try {
    return await getFallbackLocation(latitude, longitude);
  } catch {
    return {
      detailAddress: "当前位置附近",
      cityName: "当前位置附近",
      streetAddress: "暂无街道/道路"
    };
  }
}

function renderTrend(forecast) {
  const items = Array.isArray(forecast) ? forecast.slice(0, 24) : [];
  if (items.length === 0) {
    elements.forecast24.innerHTML = '<p class="empty">暂无未来 24 小时趋势</p>';
    return;
  }

  elements.forecast24.innerHTML = items.map((item) => {
    const rainText = item.rainChance === undefined || item.rainChance === null
      ? `风力 ${item.wind || "暂无"}`
      : `降雨 ${item.rainChance}%`;

    return `
      <article class="trend-card">
        <time>${formatHour(item.time)}</time>
        <div class="weather-icon" aria-hidden="true">${getWeatherIcon(item.condition)}</div>
        <strong>${item.condition || "未知天气"}</strong>
        <span>${item.temperature ?? "暂无"}°C</span>
        <small>${rainText}</small>
      </article>
    `;
  }).join("");
}

function renderWeather(weather) {
  const temperatureUnit = weather.units?.temperature || "°C";
  const humidityUnit = weather.units?.humidity || "%";
  const city = weather.city || "当前位置附近";

  lastSuccessfulWeather = weather;
  elements.cityTitle.textContent = `${city}天气预报`;
  elements.sourceLabel.textContent = normalizeSourceLabel(weather.sourceLabel, city);
  elements.temperature.textContent = `${weather.temperature ?? "暂无"}${temperatureUnit}`;
  elements.temperatureText.textContent = `${weather.temperature ?? "暂无"}${temperatureUnit}`;
  elements.city.textContent = city;
  elements.condition.textContent = weather.condition || "暂无";
  elements.humidity.textContent = `${weather.humidity ?? "暂无"}${humidityUnit}`;
  elements.wind.textContent = weather.wind || "暂无";
  elements.dataUpdatedAt.textContent = formatDateTime(weather.fetchedAt);
  elements.tip.textContent = weather.tip || createTip(weather);
  renderTrend(weather.forecast24);
}

function updateCurrentTime() {
  elements.currentTime.textContent = formatDateTime(new Date().toISOString());
}

function buildOpenMeteoUrl(latitude, longitude) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m");
  url.searchParams.set("hourly", "temperature_2m,weather_code,precipitation_probability,wind_speed_10m");
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "auto");
  return url;
}

function normalizeForecast(data) {
  const hourly = data.hourly || {};
  const units = data.hourly_units || {};
  const times = hourly.time || [];
  const currentTime = data.current?.time || times[0] || "";
  const startIndex = Math.max(0, times.findIndex((time) => time >= currentTime));

  return times.slice(startIndex, startIndex + 24).map((time, index) => {
    const sourceIndex = startIndex + index;
    const windSpeed = hourly.wind_speed_10m?.[sourceIndex];

    return {
      time,
      condition: getWeatherText(hourly.weather_code?.[sourceIndex]),
      temperature: hourly.temperature_2m?.[sourceIndex],
      rainChance: hourly.precipitation_probability?.[sourceIndex],
      wind: windSpeed === undefined || windSpeed === null ? "暂无" : `${windSpeed} ${units.wind_speed_10m || "km/h"}`
    };
  });
}

function normalizeWeather(data, place) {
  const current = data.current || {};
  const units = data.current_units || {};
  const windSpeed = current.wind_speed_10m;

  return {
    city: place.city,
    latitude: place.latitude,
    longitude: place.longitude,
    detailAddress: place.detailAddress,
    streetAddress: place.streetAddress,
    temperature: current.temperature_2m,
    condition: getWeatherText(current.weather_code),
    humidity: current.relative_humidity_2m,
    wind: windSpeed === undefined || windSpeed === null ? "暂无" : `${windSpeed} ${units.wind_speed_10m || "km/h"}`,
    updatedAt: current.time || "",
    fetchedAt: new Date().toISOString(),
    source: "Open-Meteo API",
    sourceLabel: place.sourceLabel,
    locationAccuracy: place.accuracy,
    forecast24: normalizeForecast(data),
    units: {
      temperature: units.temperature_2m || "°C",
      humidity: units.relative_humidity_2m || "%",
      wind: units.wind_speed_10m || "km/h"
    }
  };
}

async function fetchWeatherForPlace(place) {
  const response = await fetch(buildOpenMeteoUrl(place.latitude, place.longitude));
  if (!response.ok) {
    throw new Error(`天气 API 请求失败，状态码：${response.status}`);
  }

  const data = await response.json();
  return normalizeWeather(data, place);
}

async function refreshWeather() {
  try {
    elements.refreshWeather.disabled = true;
    setStatus("正在刷新当前位置天气...");
    const weather = await fetchWeatherForPlace(currentPlace);
    renderWeather(weather);
    setStatus("天气已刷新。");
  } catch (error) {
    renderWeather(lastSuccessfulWeather);
    setStatus(`天气刷新失败：${error.message}。已保留上一次成功天气。`, true);
  } finally {
    elements.refreshWeather.disabled = false;
  }
}

function setButtonLoading(isLoading) {
  elements.refreshWeather.disabled = isLoading;
}

function useDefaultCity(silent = false) {
  currentPlace = {
    city: defaultWeather.city,
    latitude: defaultWeather.latitude,
    longitude: defaultWeather.longitude,
    detailAddress: "当前为默认广州天气",
    streetAddress: "暂无街道/道路",
    sourceLabel: normalizeSourceLabel(defaultWeather.sourceLabel, defaultWeather.city),
    accuracy: null,
    isDefault: true
  };
  renderWeather({
    ...defaultWeather,
    detailAddress: "当前为默认广州天气",
    streetAddress: "暂无街道/道路",
    locationAccuracy: ""
  });
  if (!silent) {
    setStatus("已切换为默认广州天气。");
  }
}

function buildLocatedPlace(position, detail) {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  const accuracy = position.coords.accuracy;
  const city = detail.cityName || "当前位置附近";

  return {
    city,
    latitude,
    longitude,
    accuracy,
    detailAddress: detail.detailAddress || "当前位置附近",
    streetAddress: detail.streetAddress || "暂无街道/道路",
    sourceLabel: `当前位置：${detail.detailAddress || city}`,
    isDefault: false
  };
}

function locateUser() {
  if (!navigator.geolocation) {
    setStatus("当前浏览器不支持定位，继续显示默认广州天气。", true);
    return;
  }

  setButtonLoading(true);
  setStatus("正在获取当前位置...");
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const detail = await getLocationDetail(position.coords.latitude, position.coords.longitude);
        currentPlace = buildLocatedPlace(position, detail);
        const weather = await fetchWeatherForPlace(currentPlace);
        renderWeather(weather);
        setStatus(`已显示当前位置附近天气，定位精度约 ${Math.round(position.coords.accuracy)} 米。`);
      } catch (error) {
        renderWeather(lastSuccessfulWeather);
        setStatus(`当前位置天气获取失败：${error.message}。已保留上一次成功天气。`, true);
      } finally {
        setButtonLoading(false);
      }
    },
    (error) => {
      const denied = error.code === error.PERMISSION_DENIED;
      setStatus(denied ? "你拒绝了定位权限，继续显示默认广州天气。" : "定位失败，继续显示默认广州天气。", !denied);
      useDefaultCity(true);
      setButtonLoading(false);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  );
}

useDefaultCity(true);
updateCurrentTime();
setInterval(updateCurrentTime, 1000);
elements.refreshWeather.addEventListener("click", refreshWeather);
locateUser();
