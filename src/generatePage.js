import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createWeatherText } from "./weatherText.js";

const DATA_FILE = "data/weather.json";
const OUTPUT_FILE = "public/index.html";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createSafeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function createSourceLabel(weather) {
  const label = weather.sourceLabel || `当前位置：${weather.detailAddress || weather.city}`;
  return String(label)
    .replace(/^默认城市：/, "当前位置：")
    .replace(/^城市：/, "当前位置：");
}

function parseEnv(content) {
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

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
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function readPublicConfig() {
  const env = {
    ...process.env,
    ...(await loadLocalEnv())
  };

  return {
    mapProvider: env.MAP_PROVIDER || "amap",
    mapApiKey: env.AMAP_BROWSER_KEY || env.AMAP_KEY || "",
    defaultAdcode: env.DEFAULT_ADCODE || "440100",
    defaultCity: env.DEFAULT_CITY || "广州",
    defaultLatitude: env.DEFAULT_LATITUDE || "23.1291",
    defaultLongitude: env.DEFAULT_LONGITUDE || "113.2644",
    siteName: env.SITE_NAME || "天气预报",
    mapSecurityNote: env.MAP_SECURITY_NOTE || ""
  };
}

function renderPage(weather, publicConfig) {
  const displayWeather = {
    ...weather,
    tip: createWeatherText(weather),
    sourceLabel: createSourceLabel(weather),
    locationAccuracy: weather.locationAccuracy || ""
  };
  const temperatureUnit = weather.units?.temperature || "°C";
  const humidityUnit = weather.units?.humidity || "%";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>天气预报</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main>
    <section class="weather-panel" aria-label="天气预报信息">
    <div class="hero" aria-labelledby="cityTitle">
      <div>
        <p class="source-label" id="sourceLabel">${escapeHtml(displayWeather.sourceLabel)}</p>
        <h1 id="cityTitle">天气预报</h1>
        <p class="temperature" id="temperature">${escapeHtml(weather.temperature)}${escapeHtml(temperatureUnit)}</p>
        <p class="tip" id="tip">${escapeHtml(displayWeather.tip)}</p>
      </div>
      <div class="actions">
        <button id="refreshWeather" type="button">刷新</button>
      </div>
    </div>

    <div class="location-details" aria-labelledby="locationTitle">
      <h2 id="locationTitle">天气详情</h2>
      <dl>
        <dt>当前位置</dt>
        <dd id="currentLocation">${escapeHtml(displayWeather.sourceLabel.replace(/^当前位置：/, ""))}</dd>
        <dt>天气状况</dt>
        <dd id="condition">${escapeHtml(weather.condition)}</dd>
        <dt>温度</dt>
        <dd id="temperatureText">${escapeHtml(weather.temperature)}${escapeHtml(temperatureUnit)}</dd>
        <dt>湿度</dt>
        <dd id="humidity">${escapeHtml(weather.humidity ?? "暂无")}${escapeHtml(humidityUnit)}</dd>
        <dt>风向</dt>
        <dd id="windDirection">${escapeHtml(weather.windDirection || "暂无")}</dd>
        <dt>风力</dt>
        <dd id="wind">${escapeHtml(weather.wind || "暂无")}</dd>
        <dt>数据更新时间</dt>
        <dd id="dataUpdatedAt">暂无更新时间</dd>
        <dt>当前时间</dt>
        <dd id="currentTime">正在读取当前时间</dd>
        <dt>当前天气数据来源</dt>
        <dd id="dataSource">${escapeHtml(weather.source ? `${weather.source} - 实况天气` : "暂无")}</dd>
      </dl>
    </div>

    <div class="hourly-trend" aria-labelledby="hourlyTitle">
      <div class="section-heading">
        <h2 id="hourlyTitle">24小时天气趋势</h2>
        <p>24小时趋势来源：Open-Meteo Forecast API</p>
      </div>
      <div class="trend-list hourly-list" id="hourly24" tabindex="0"></div>
    </div>

    <div class="trend" aria-labelledby="trendTitle">
      <div class="section-heading">
        <h2 id="trendTitle">未来几天天气预报</h2>
        <p>未来几天天气来源：高德天气 API</p>
      </div>
      <div class="trend-list" id="forecast24" tabindex="0"></div>
    </div>

    <p class="status" id="status" aria-live="polite"></p>
    </section>
  </main>
  <script id="initialWeatherData" type="application/json">${createSafeJson(displayWeather)}</script>
  <script id="publicConfig" type="application/json">${createSafeJson(publicConfig)}</script>
  <script src="app.js" defer></script>
</body>
</html>
`;
}

export async function generatePage(weather) {
  const publicConfig = await readPublicConfig();
  await mkdir("public", { recursive: true });
  await writeFile(OUTPUT_FILE, renderPage(weather, publicConfig), "utf8");
  return OUTPUT_FILE;
}

async function readWeatherData() {
  const content = await readFile(DATA_FILE, "utf8");
  return JSON.parse(content);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const weather = await readWeatherData();
    await generatePage(weather);
    console.log(`网页已生成：${OUTPUT_FILE}`);
  } catch (error) {
    console.error(`生成网页失败：${error.message}`);
    process.exitCode = 1;
  }
}
