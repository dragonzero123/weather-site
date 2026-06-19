import { readFile } from "node:fs/promises";

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_CITY = "上海";
const DEFAULT_LATITUDE = "31.2304";
const DEFAULT_LONGITUDE = "121.4737";

const WEATHER_CODE_TEXT = new Map([
  [0, "晴"],
  [1, "大部晴朗"],
  [2, "局部多云"],
  [3, "阴"],
  [45, "雾"],
  [48, "霜雾"],
  [51, "小毛毛雨"],
  [53, "中等毛毛雨"],
  [55, "大毛毛雨"],
  [61, "小雨"],
  [63, "中雨"],
  [65, "大雨"],
  [71, "小雪"],
  [73, "中雪"],
  [75, "大雪"],
  [80, "小阵雨"],
  [81, "中等阵雨"],
  [82, "强阵雨"],
  [95, "雷雨"],
  [96, "雷雨伴小冰雹"],
  [99, "雷雨伴大冰雹"]
]);

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

function normalizeCityName(city) {
  if (city === "广州") {
    return "广州市";
  }

  return city;
}

function readConfig(env) {
  return {
    city: normalizeCityName(env.WEATHER_CITY || DEFAULT_CITY),
    latitude: env.WEATHER_LATITUDE || DEFAULT_LATITUDE,
    longitude: env.WEATHER_LONGITUDE || DEFAULT_LONGITUDE,
    apiUrl: env.WEATHER_API_URL || OPEN_METEO_FORECAST_URL,
    apiKey: env.WEATHER_API_KEY || ""
  };
}

function getWeatherText(code) {
  return WEATHER_CODE_TEXT.get(Number(code)) || "未知天气";
}

function formatWind(speed, unit = "km/h") {
  if (speed === undefined || speed === null) {
    return "暂无";
  }

  return `${speed} ${unit}`;
}

function buildOpenMeteoUrl(config) {
  const url = new URL(config.apiUrl);
  url.searchParams.set("latitude", config.latitude);
  url.searchParams.set("longitude", config.longitude);
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m");
  url.searchParams.set("hourly", "temperature_2m,weather_code,precipitation_probability,wind_speed_10m");
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "auto");

  if (config.apiKey) {
    url.searchParams.set("apikey", config.apiKey);
  }

  return url;
}

function normalizeHourlyForecast(data) {
  const hourly = data.hourly || {};
  const units = data.hourly_units || {};
  const times = hourly.time || [];
  const currentTime = data.current?.time || times[0] || "";
  const startIndex = Math.max(0, times.findIndex((time) => time >= currentTime));

  return times.slice(startIndex, startIndex + 24).map((time, index) => {
    const sourceIndex = startIndex + index;
    const windSpeed = hourly.wind_speed_10m?.[sourceIndex];
    const rainChance = hourly.precipitation_probability?.[sourceIndex];

    return {
      time,
      condition: getWeatherText(hourly.weather_code?.[sourceIndex]),
      temperature: hourly.temperature_2m?.[sourceIndex],
      rainChance,
      wind: formatWind(windSpeed, units.wind_speed_10m || "km/h")
    };
  });
}

function normalizeOpenMeteoWeather(data, config, fetchedAt) {
  const current = data.current || {};
  const units = data.current_units || {};

  return {
    city: config.city,
    latitude: Number(config.latitude),
    longitude: Number(config.longitude),
    temperature: current.temperature_2m,
    condition: getWeatherText(current.weather_code),
    humidity: current.relative_humidity_2m,
    wind: formatWind(current.wind_speed_10m, units.wind_speed_10m || "km/h"),
    updatedAt: current.time || "",
    fetchedAt,
    source: "Open-Meteo API",
    sourceLabel: `城市：${config.city}`,
    forecast24: normalizeHourlyForecast(data),
    units: {
      temperature: units.temperature_2m || "°C",
      humidity: units.relative_humidity_2m || "%",
      wind: units.wind_speed_10m || "km/h"
    }
  };
}

export async function fetchWeather() {
  const env = {
    ...process.env,
    ...(await loadLocalEnv())
  };
  const config = readConfig(env);
  const url = buildOpenMeteoUrl(config);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`天气 API 请求失败，状态码：${response.status}`);
  }

  const data = await response.json();
  return normalizeOpenMeteoWeather(data, config, new Date().toISOString());
}
