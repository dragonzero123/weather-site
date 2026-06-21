const SOURCE_NAME = "高德天气 API";
const HOURLY_SOURCE_NAME = "Open-Meteo Forecast API";
const AMAP_REGEOCODE_URL = "https://restapi.amap.com/v3/geocode/regeo";
const AMAP_WEATHER_URL = "https://restapi.amap.com/v3/weather/weatherInfo";
const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const AUTO_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const REFRESH_BUTTON_TEXT = "刷新";
const REFRESHING_BUTTON_TEXT = "刷新中...";

const elements = {
  cityTitle: document.querySelector("#cityTitle"),
  sourceLabel: document.querySelector("#sourceLabel"),
  temperature: document.querySelector("#temperature"),
  temperatureText: document.querySelector("#temperatureText"),
  currentLocation: document.querySelector("#currentLocation"),
  city: document.querySelector("#city"),
  weatherArea: document.querySelector("#weatherArea"),
  condition: document.querySelector("#condition"),
  humidity: document.querySelector("#humidity"),
  windDirection: document.querySelector("#windDirection"),
  wind: document.querySelector("#wind"),
  locationAccuracy: document.querySelector("#locationAccuracy"),
  dataSource: document.querySelector("#dataSource"),
  currentTime: document.querySelector("#currentTime"),
  dataUpdatedAt: document.querySelector("#dataUpdatedAt"),
  lastRefreshTime: document.querySelector("#lastRefreshTime"),
  nextRefreshTime: document.querySelector("#nextRefreshTime"),
  tip: document.querySelector("#tip"),
  status: document.querySelector("#status"),
  hourly24: document.querySelector("#hourly24"),
  forecast24: document.querySelector("#forecast24"),
  refreshWeather: document.querySelector("#refreshWeather")
};

const defaultWeather = JSON.parse(document.querySelector("#initialWeatherData").textContent);
const publicConfig = JSON.parse(document.querySelector("#publicConfig").textContent);

let lastSuccessfulWeather = defaultWeather;
let lastPlace = null;
let autoRefreshTimer = null;
let lastRefreshAt = null;
let nextAutoRefreshAt = null;
let isRefreshing = false;

function getAmapKey() {
  return publicConfig.mapApiKey || "";
}

function formatAccuracy(value) {
  const accuracy = Number(value);
  if (!Number.isFinite(accuracy) || accuracy <= 0) {
    return "暂无";
  }

  return `约 ${Math.round(accuracy)} 米`;
}

function compactParts(parts) {
  return [...new Set(parts.map((part) => String(part || "").trim()).filter(Boolean))];
}

function firstValue(...values) {
  for (const value of values) {
    if (Array.isArray(value)) continue;
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function pickObject(...values) {
  return values.find((value) => value && typeof value === "object" && !Array.isArray(value)) || {};
}

function addNearby(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.endsWith("附近") ? text : `${text}附近`;
}

function isDistrictName(value) {
  return /区$|县$|市辖区$|自治县$|旗$/.test(String(value || "").trim());
}

function isTownName(value) {
  return /镇$|乡$|街道$|苏木$|办事处$/.test(String(value || "").trim());
}

function normalizeAdministrativeOrder(district, town) {
  if (isTownName(district) && isDistrictName(town)) {
    return { district: town, town: district };
  }

  return { district, town };
}

function formatLocation(parts) {
  const text = compactParts(parts).join(" ");
  return text ? addNearby(text) : "当前位置附近";
}

function parseAmapLocation(regeocode) {
  const component = pickObject(regeocode.addressComponent);
  const streetNumber = pickObject(component.streetNumber);
  const streetNumberAlt = pickObject(component.street_number);
  const roads = regeocode.roads || [];
  const pois = regeocode.pois || [];

  const province = firstValue(component.province);
  const city = firstValue(component.city);
  const district = firstValue(component.district);
  const town = firstValue(component.township, component.town, component.street);
  const road = firstValue(streetNumber.street, streetNumberAlt.street, roads[0]?.name, pois[0]?.name);
  const number = firstValue(streetNumber.number, streetNumberAlt.number);
  const ordered = normalizeAdministrativeOrder(district, town);
  const formattedAddress = firstValue(regeocode.formatted_address);
  const administrativeAddress = formatLocation([province, city, ordered.district, ordered.town, road, number]);
  const shouldUseAdministrative = compactParts([province, city, ordered.district, ordered.town]).length >= 3;
  const detailAddress = shouldUseAdministrative ? administrativeAddress : addNearby(formattedAddress) || "当前位置附近";

  return {
    detailAddress,
    province,
    cityName: compactParts([province, city, ordered.district]).join(" ") || city || ordered.district || "当前位置附近",
    district: ordered.district,
    town: ordered.town,
    road,
    adcode: firstValue(component.adcode)
  };
}

function buildRegeocodeUrl(latitude, longitude) {
  const url = new URL(AMAP_REGEOCODE_URL);
  url.searchParams.set("key", getAmapKey());
  url.searchParams.set("location", `${longitude},${latitude}`);
  url.searchParams.set("extensions", "all");
  url.searchParams.set("roadlevel", "0");
  url.searchParams.set("output", "json");
  return url;
}

function buildWeatherUrl(adcode, extensions) {
  const url = new URL(AMAP_WEATHER_URL);
  url.searchParams.set("key", getAmapKey());
  url.searchParams.set("city", adcode);
  url.searchParams.set("extensions", extensions);
  url.searchParams.set("output", "json");
  return url;
}

function buildOpenMeteoUrl(latitude, longitude) {
  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("hourly", [
    "temperature_2m",
    "weather_code",
    "precipitation_probability",
    "wind_speed_10m",
    "wind_direction_10m"
  ].join(","));
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "auto");
  return url;
}

async function fetchAmapJson(url, label) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${label}请求失败，HTTP 状态码：${response.status}`);
  }

  const data = await response.json();
  if (data.status !== "1") {
    throw new Error(`${label}请求失败：${data.info || "未知错误"}`);
  }

  return data;
}

async function fetchOpenMeteoHourly(latitude, longitude) {
  const response = await fetch(buildOpenMeteoUrl(latitude, longitude));
  if (!response.ok) {
    throw new Error(`Open-Meteo 24小时趋势请求失败，HTTP 状态码：${response.status}`);
  }

  const data = await response.json();
  return normalizeHourly24(data);
}

async function getLocationDetail(latitude, longitude, accuracy) {
  if (!getAmapKey()) {
    throw new Error("缺少高德前端 Key，请配置 AMAP_BROWSER_KEY 或 AMAP_KEY");
  }

  const result = await fetchAmapJson(buildRegeocodeUrl(latitude, longitude), "高德逆地理编码 API");
  const regeocode = result.regeocode;
  if (!regeocode) {
    throw new Error("高德逆地理编码 API 未返回位置结果");
  }

  const detail = parseAmapLocation(regeocode);
  if (!detail.adcode) {
    throw new Error("高德逆地理编码 API 未返回 adcode");
  }

  return {
    ...detail,
    locationAccuracy: formatAccuracy(accuracy)
  };
}

function formatDateTime(value) {
  if (!value) return "暂无更新时间";

  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value);

  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai",
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

function forecastLabel(index) {
  if (index === 0) return "今天";
  if (index === 1) return "明天";
  if (index === 2) return "后天";
  return `${index}天后`;
}

function weatherCodeText(code) {
  const value = Number(code);
  if (value === 0) return "晴";
  if ([1, 2].includes(value)) return "少云";
  if (value === 3) return "阴";
  if ([45, 48].includes(value)) return "雾";
  if ([51, 53, 55, 56, 57].includes(value)) return "毛毛雨";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return "雨";
  if ([71, 73, 75, 77, 85, 86].includes(value)) return "雪";
  if ([95, 96, 99].includes(value)) return "雷雨";
  return "未知天气";
}

function formatHourTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function formatWindDirection(value) {
  const direction = Number(value);
  if (!Number.isFinite(direction)) return "暂无";

  const labels = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  return labels[Math.round(direction / 45) % 8];
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

function formatWind(direction, power) {
  return `${direction || "暂无"}风 ${power || "暂无"}级`;
}

function normalizeForecast(allWeather) {
  const casts = allWeather.forecasts?.[0]?.casts || [];

  return casts.map((cast, index) => {
    const dayCondition = cast.dayweather || "暂无";
    const nightCondition = cast.nightweather || "暂无";
    const condition = dayCondition === nightCondition ? dayCondition : `${dayCondition}转${nightCondition}`;

    return {
      label: forecastLabel(index),
      time: cast.date || "",
      condition,
      temperature: `${cast.nighttemp || "暂无"}-${cast.daytemp || "暂无"}`,
      rainChance: null,
      wind: `白天${cast.daywind || "暂无"}风 ${cast.daypower || "暂无"}级 / 夜间${cast.nightwind || "暂无"}风 ${cast.nightpower || "暂无"}级`
    };
  });
}

function normalizeHourly24(openMeteoWeather) {
  const hourly = openMeteoWeather?.hourly || {};
  const times = hourly.time || [];
  if (!Array.isArray(times) || times.length === 0) {
    return [];
  }

  const now = Date.now();
  const firstFutureIndex = times.findIndex((time) => new Date(time).getTime() >= now);
  const startIndex = firstFutureIndex === -1 ? 0 : firstFutureIndex;

  return times.slice(startIndex, startIndex + 24).map((time, offset) => {
    const index = startIndex + offset;
    const temperature = hourly.temperature_2m?.[index];
    const weatherCode = hourly.weather_code?.[index];
    const rainChance = hourly.precipitation_probability?.[index];
    const windSpeed = hourly.wind_speed_10m?.[index];
    const windDirection = hourly.wind_direction_10m?.[index];
    const windDirectionText = formatWindDirection(windDirection);

    return {
      time: formatHourTime(time),
      rawTime: time,
      condition: weatherCodeText(weatherCode),
      temperature,
      rainChance: rainChance ?? null,
      wind: Number.isFinite(Number(windSpeed)) ? `${windDirectionText}风 ${windSpeed} km/h` : `${windDirectionText}风`,
      source: HOURLY_SOURCE_NAME
    };
  });
}

function normalizeWeather(baseWeather, allWeather, hourly24, place) {
  const live = baseWeather.lives?.[0];
  if (!live) {
    throw new Error("高德天气 API 未返回实况天气");
  }

  const forecast = allWeather.forecasts?.[0] || {};
  const reporttime = live.reporttime || forecast.reporttime || "";
  const city = live.city || forecast.city || place.cityName;
  const adcode = live.adcode || forecast.adcode || place.adcode;

  return {
    siteName: publicConfig.siteName || "天气预报",
    city,
    weatherArea: place.district || city,
    adcode,
    detailAddress: place.detailAddress,
    temperature: live.temperature,
    condition: live.weather,
    humidity: live.humidity,
    windDirection: live.winddirection || "",
    windPower: live.windpower || "",
    wind: formatWind(live.winddirection, live.windpower),
    updatedAt: reporttime,
    fetchedAt: new Date().toISOString(),
    source: SOURCE_NAME,
    sourceLabel: `当前位置：${place.detailAddress}`,
    dataSourceLabel: `数据来源：${SOURCE_NAME}`,
    locationAccuracy: place.locationAccuracy || "",
    hourlySource: HOURLY_SOURCE_NAME,
    hourly24,
    forecast24: normalizeForecast(allWeather),
    units: {
      temperature: "°C",
      humidity: "%",
      wind: "级"
    }
  };
}

async function fetchWeatherByAdcode(place) {
  const baseWeather = await fetchAmapJson(buildWeatherUrl(place.adcode, "base"), "高德实况天气 API");
  const allWeather = await fetchAmapJson(buildWeatherUrl(place.adcode, "all"), "高德天气预报 API");
  let hourly24 = Array.isArray(lastSuccessfulWeather.hourly24) ? lastSuccessfulWeather.hourly24 : [];
  try {
    hourly24 = await fetchOpenMeteoHourly(place.latitude, place.longitude);
  } catch {
    hourly24 = Array.isArray(lastSuccessfulWeather.hourly24) ? lastSuccessfulWeather.hourly24 : [];
  }
  return normalizeWeather(baseWeather, allWeather, hourly24, place);
}

function renderHourlyTrend(hourly) {
  const items = Array.isArray(hourly) ? hourly : [];
  if (items.length === 0) {
    elements.hourly24.innerHTML = '<p class="empty">暂未获取到 24 小时逐小时天气数据，请查看未来几天天气预报。</p>';
    return;
  }

  elements.hourly24.innerHTML = items.map((item) => `
    <article class="trend-card hourly-card">
      <time>${item.time || "暂无时间"}</time>
      <div class="weather-icon" aria-hidden="true">☁</div>
      <strong>${item.condition || "未知天气"}</strong>
      <span>${item.temperature ?? "暂无"}°C</span>
      <small>${item.rainChance === null || item.rainChance === undefined ? "降雨 暂无" : `降雨 ${item.rainChance}%`}</small>
      <small>${item.wind || "暂无风力"}</small>
    </article>
  `).join("");
}

function renderTrend(forecast) {
  const items = Array.isArray(forecast) ? forecast : [];
  if (items.length === 0) {
    elements.forecast24.innerHTML = '<p class="empty">暂无未来几天天气预报</p>';
    return;
  }

  elements.forecast24.innerHTML = items.map((item, index) => `
    <article class="trend-card">
      <span class="forecast-label">${item.label || forecastLabel(index)}</span>
      <time>${item.time || "暂无日期"}</time>
      <div class="weather-icon" aria-hidden="true">☁</div>
      <strong>${item.condition || "未知天气"}</strong>
      <span>${item.temperature ?? "暂无"}°C</span>
      <small>${item.wind || "暂无风力"}</small>
    </article>
  `).join("");
}

function renderRefreshTimes(lastRefreshAt = null) {
  if (elements.lastRefreshTime) {
    elements.lastRefreshTime.textContent = lastRefreshAt ? formatDateTime(lastRefreshAt) : "暂无刷新记录";
  }

  if (elements.nextRefreshTime) {
    elements.nextRefreshTime.textContent = nextAutoRefreshAt ? formatDateTime(nextAutoRefreshAt) : "正在计算";
  }
}

function renderWeather(weather) {
  const temperatureUnit = weather.units?.temperature || "°C";
  const humidityUnit = weather.units?.humidity || "%";
  const currentLocation = weather.detailAddress || weather.city || "当前位置附近";

  lastSuccessfulWeather = weather;
  elements.cityTitle.textContent = weather.siteName || "天气预报";
  elements.sourceLabel.textContent = weather.sourceLabel || `当前位置：${currentLocation}`;
  elements.temperature.textContent = `${weather.temperature ?? "暂无"}${temperatureUnit}`;
  elements.temperatureText.textContent = `${weather.temperature ?? "暂无"}${temperatureUnit}`;
  elements.currentLocation.textContent = currentLocation;
  if (elements.city) elements.city.textContent = weather.city || "暂无";
  if (elements.weatherArea) elements.weatherArea.textContent = weather.weatherArea || weather.city || "暂无";
  elements.condition.textContent = weather.condition || "暂无";
  elements.humidity.textContent = `${weather.humidity ?? "暂无"}${humidityUnit}`;
  elements.windDirection.textContent = weather.windDirection || "暂无";
  elements.wind.textContent = weather.wind || "暂无";
  if (elements.locationAccuracy) elements.locationAccuracy.textContent = weather.locationAccuracy || "暂无";
  elements.dataUpdatedAt.textContent = formatDateTime(weather.updatedAt || weather.fetchedAt);
  elements.dataSource.textContent = `${weather.source || SOURCE_NAME} - 实况天气`;
  elements.tip.textContent = weather.tip || createTip(weather);
  renderHourlyTrend(weather.hourly24);
  renderTrend(weather.forecast24);
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

function updateCurrentTime() {
  elements.currentTime.textContent = formatDateTime(new Date().toISOString());
}

function setButtonLoading(isLoading) {
  elements.refreshWeather.disabled = isLoading;
  elements.refreshWeather.textContent = isLoading ? REFRESHING_BUTTON_TEXT : REFRESH_BUTTON_TEXT;
}

function markRefreshSuccess() {
  const refreshedAt = new Date().toISOString();
  lastRefreshAt = refreshedAt;
  nextAutoRefreshAt = new Date(Date.now() + AUTO_REFRESH_INTERVAL_MS).toISOString();
  renderRefreshTimes(refreshedAt);
}

function scheduleAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
  }

  nextAutoRefreshAt = new Date(Date.now() + AUTO_REFRESH_INTERVAL_MS).toISOString();
  renderRefreshTimes(lastRefreshAt);
  autoRefreshTimer = setInterval(() => {
    refreshWeather({ silent: true });
  }, AUTO_REFRESH_INTERVAL_MS);
}

function createDefaultPlace() {
  return {
    adcode: defaultWeather.adcode || publicConfig.defaultAdcode,
    detailAddress: defaultWeather.detailAddress || defaultWeather.city || publicConfig.defaultCity || "广州",
    cityName: defaultWeather.city || publicConfig.defaultCity || "广州",
    district: defaultWeather.weatherArea || defaultWeather.city || publicConfig.defaultCity || "广州",
    locationAccuracy: "暂无",
    latitude: publicConfig.defaultLatitude,
    longitude: publicConfig.defaultLongitude
  };
}

async function refreshDefaultWeather(message = "已显示默认城市广州天气") {
  if (!getAmapKey()) {
    useDefaultWeather("缺少高德前端 Key，请配置 AMAP_BROWSER_KEY 或 AMAP_KEY，已显示默认城市广州天气");
    return false;
  }

  const weather = await fetchWeatherByAdcode(createDefaultPlace());
  lastPlace = null;
  renderWeather(weather);
  markRefreshSuccess();
  setStatus(message);
  return true;
}

function useDefaultWeather(message = "定位失败，已显示默认城市广州天气") {
  renderWeather({
    ...defaultWeather,
    source: defaultWeather.source || SOURCE_NAME
  });
  lastPlace = null;
  setStatus(message);
}

async function locateUser(options = {}) {
  if (!navigator.geolocation) {
    return refreshDefaultWeather("当前浏览器不支持定位，已刷新默认城市广州天气");
  }

  if (!getAmapKey()) {
    useDefaultWeather("缺少高德前端 Key，请配置 AMAP_BROWSER_KEY 或 AMAP_KEY，已显示默认城市广州天气");
    return false;
  }

  if (!options.silent) setStatus("正在获取当前位置...");

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude, accuracy } = position.coords;
        const detail = await getLocationDetail(latitude, longitude, accuracy);
        detail.latitude = latitude;
        detail.longitude = longitude;
        const weather = await fetchWeatherByAdcode(detail);
        lastPlace = detail;
        renderWeather(weather);
        markRefreshSuccess();
        if (!options.silent) setStatus("天气已更新。");
        resolve(true);
      } catch (error) {
        if (String(error.message).includes("逆地理编码") || String(error.message).includes("adcode")) {
          try {
            await refreshDefaultWeather("定位失败，已刷新默认城市广州天气");
          } catch (fallbackError) {
            renderWeather(lastSuccessfulWeather);
            setStatus(`定位失败，默认城市天气刷新失败：${fallbackError.message}。已保留上一次成功数据。`, true);
          }
        } else {
          renderWeather(lastSuccessfulWeather);
          setStatus(`当前位置天气获取失败：${error.message}。已保留上一次成功数据。`, true);
        }
        resolve(false);
      }
    },
    () => {
      refreshDefaultWeather("定位失败，已刷新默认城市广州天气")
        .then(resolve)
        .catch((error) => {
          useDefaultWeather(`定位失败，默认城市天气刷新失败：${error.message}。已保留上一次成功数据。`);
          resolve(false);
        });
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
    );
  });
}

async function refreshWeather(options = {}) {
  if (isRefreshing) return false;

  isRefreshing = true;
  if (!options.silent) {
    setButtonLoading(true);
    setStatus("正在刷新天气...");
  }

  try {
    if (lastPlace) {
      const weather = await fetchWeatherByAdcode(lastPlace);
      renderWeather(weather);
      markRefreshSuccess();
      if (!options.silent) setStatus("天气已更新。");
      return true;
    }

    return await locateUser(options);
  } catch (error) {
    renderWeather(lastSuccessfulWeather);
    setStatus(`天气刷新失败：${error.message}。已保留上一次成功数据。`, true);
    return false;
  } finally {
    isRefreshing = false;
    if (!options.silent) setButtonLoading(false);
  }
}

renderWeather(defaultWeather);
updateCurrentTime();
markRefreshSuccess();
scheduleAutoRefresh();
setInterval(updateCurrentTime, 1000);
elements.refreshWeather.addEventListener("click", () => refreshWeather());
locateUser({ silent: true });
