import { readFile } from "node:fs/promises";

const AMAP_WEATHER_URL = "https://restapi.amap.com/v3/weather/weatherInfo";
const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_ADCODE = "440100";
const DEFAULT_CITY = "广州";
const DEFAULT_LATITUDE = "23.1291";
const DEFAULT_LONGITUDE = "113.2644";
const SITE_NAME = "天气预报";
const SOURCE_NAME = "高德天气 API";
const HOURLY_SOURCE_NAME = "Open-Meteo Forecast API";

function parseEnv(content) {
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = value;
  }

  return env;
}

async function loadLocalEnv() {
  try {
    const content = await readFile(".env", "utf8");
    return parseEnv(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

function requireAmapKey(env) {
  const key = (env.AMAP_KEY || "").trim();
  if (!key || key.includes("请填写") || key.includes("你的高德") || key.includes("YOUR_")) {
    throw new Error("缺少 AMAP_KEY，请在 GitHub Secrets 中配置");
  }

  return key;
}

function readConfig(env) {
  return {
    amapKey: requireAmapKey(env),
    defaultAdcode: env.DEFAULT_ADCODE || DEFAULT_ADCODE,
    defaultCity: env.DEFAULT_CITY || DEFAULT_CITY,
    defaultLatitude: env.DEFAULT_LATITUDE || DEFAULT_LATITUDE,
    defaultLongitude: env.DEFAULT_LONGITUDE || DEFAULT_LONGITUDE,
    siteName: env.SITE_NAME || SITE_NAME
  };
}

function buildAmapWeatherUrl(config, extensions) {
  const url = new URL(AMAP_WEATHER_URL);
  url.searchParams.set("key", config.amapKey);
  url.searchParams.set("city", config.defaultAdcode);
  url.searchParams.set("extensions", extensions);
  url.searchParams.set("output", "json");
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

async function fetchOpenMeteoJson(latitude, longitude) {
  const response = await fetch(buildOpenMeteoUrl(latitude, longitude));
  if (!response.ok) {
    throw new Error(`Open-Meteo 24小时趋势请求失败，HTTP 状态码：${response.status}`);
  }

  return response.json();
}

function formatWind(direction, power) {
  const windDirection = direction || "暂无";
  const windPower = power || "暂无";
  return `${windDirection}风 ${windPower}级`;
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

function normalizeAmapForecast(allWeather) {
  const casts = allWeather.forecasts?.[0]?.casts || [];

  return casts.map((cast, index) => {
    const dayCondition = cast.dayweather || "暂无";
    const nightCondition = cast.nightweather || "暂无";
    const condition = dayCondition === nightCondition ? dayCondition : `${dayCondition}转${nightCondition}`;
    const dayTemp = cast.daytemp || "暂无";
    const nightTemp = cast.nighttemp || "暂无";

    return {
      label: forecastLabel(index),
      time: cast.date || "",
      condition,
      temperature: `${nightTemp}-${dayTemp}`,
      rainChance: null,
      wind: `白天${cast.daywind || "暂无"}风 ${cast.daypower || "暂无"}级 / 夜间${cast.nightwind || "暂无"}风 ${cast.nightpower || "暂无"}级`
    };
  });
}

function normalizeAmapWeather(baseWeather, allWeather, hourlyWeather, config, fetchedAt) {
  const live = baseWeather.lives?.[0];
  if (!live) {
    throw new Error("高德天气 API 未返回实况天气");
  }

  const forecast = allWeather.forecasts?.[0] || {};
  const reporttime = live.reporttime || forecast.reporttime || "";
  const city = live.city || forecast.city || config.defaultCity;
  const adcode = live.adcode || forecast.adcode || config.defaultAdcode;

  return {
    siteName: config.siteName,
    city,
    weatherArea: city,
    adcode,
    temperature: live.temperature,
    condition: live.weather,
    humidity: live.humidity,
    windDirection: live.winddirection || "",
    windPower: live.windpower || "",
    wind: formatWind(live.winddirection, live.windpower),
    updatedAt: reporttime,
    fetchedAt,
    source: SOURCE_NAME,
    sourceLabel: `当前位置：${city}`,
    dataSourceLabel: `数据来源：${SOURCE_NAME}`,
    hourlySource: HOURLY_SOURCE_NAME,
    hourly24: normalizeHourly24(hourlyWeather),
    forecast24: normalizeAmapForecast(allWeather),
    units: {
      temperature: "°C",
      humidity: "%",
      wind: "级"
    }
  };
}

export async function fetchWeather() {
  const env = {
    ...process.env,
    ...(await loadLocalEnv())
  };
  const config = readConfig(env);
  const baseWeather = await fetchAmapJson(buildAmapWeatherUrl(config, "base"), "高德实况天气 API");
  const allWeather = await fetchAmapJson(buildAmapWeatherUrl(config, "all"), "高德天气预报 API");
  let hourlyWeather = null;
  try {
    hourlyWeather = await fetchOpenMeteoJson(config.defaultLatitude, config.defaultLongitude);
  } catch {
    hourlyWeather = null;
  }

  return normalizeAmapWeather(baseWeather, allWeather, hourlyWeather, config, new Date().toISOString());
}
