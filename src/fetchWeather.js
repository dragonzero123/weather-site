import { readFile } from "node:fs/promises";

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

function nowIso() {
  return new Date().toISOString();
}

function createMockWeather(env) {
  return {
    city: env.WEATHER_CITY || "上海",
    temperature: 24,
    condition: "多云",
    humidity: 68,
    wind: "东南风 3 级",
    updatedAt: nowIso(),
    source: "mock"
  };
}

function normalizeApiWeather(data, env) {
  return {
    city: data.city || data.name || env.WEATHER_CITY || "未知城市",
    temperature: data.temperature ?? data.temp ?? data.main?.temp,
    condition: data.condition || data.weather?.[0]?.description || data.weatherText || "未知天气",
    humidity: data.humidity ?? data.main?.humidity ?? null,
    wind: data.wind || data.windText || data.wind?.speed || "",
    updatedAt: nowIso(),
    source: "api"
  };
}

export async function fetchWeather() {
  const env = {
    ...process.env,
    ...(await loadLocalEnv())
  };

  if (!env.WEATHER_API_URL || env.WEATHER_API_URL.includes("example.com")) {
    return createMockWeather(env);
  }

  if (!env.WEATHER_API_KEY) {
    throw new Error("已配置 WEATHER_API_URL，但缺少 WEATHER_API_KEY。请把真实 Key 放到 .env。");
  }

  const url = new URL(env.WEATHER_API_URL);
  url.searchParams.set("key", env.WEATHER_API_KEY);
  if (env.WEATHER_CITY) {
    url.searchParams.set("city", env.WEATHER_CITY);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`天气 API 请求失败，状态码：${response.status}`);
  }

  const data = await response.json();
  return normalizeApiWeather(data, env);
}
