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

function renderPage(weather) {
  const displayWeather = {
    ...weather,
    tip: createWeatherText(weather),
    sourceLabel: weather.sourceLabel || `默认城市：${weather.city}`
  };
  const temperatureUnit = weather.units?.temperature || "°C";
  const humidityUnit = weather.units?.humidity || "%";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(weather.city)}天气预报</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main>
    <section class="hero" aria-labelledby="cityTitle">
      <div>
        <p class="source-label" id="sourceLabel">${escapeHtml(displayWeather.sourceLabel)}</p>
        <h1 id="cityTitle">${escapeHtml(weather.city)}天气预报</h1>
        <p class="temperature" id="temperature">${escapeHtml(weather.temperature)}${escapeHtml(temperatureUnit)}</p>
        <p class="tip" id="tip">${escapeHtml(displayWeather.tip)}</p>
      </div>
      <div class="actions">
        <button id="refreshWeather" type="button">刷新天气</button>
        <button id="useLocation" type="button">使用当前位置</button>
      </div>
    </section>

    <section class="details" aria-label="天气详情">
      <dl>
        <dt>城市</dt>
        <dd id="city">${escapeHtml(weather.city)}</dd>
        <dt>天气</dt>
        <dd id="condition">${escapeHtml(weather.condition)}</dd>
        <dt>湿度</dt>
        <dd id="humidity">${escapeHtml(weather.humidity ?? "暂无")}${escapeHtml(humidityUnit)}</dd>
        <dt>风力</dt>
        <dd id="wind">${escapeHtml(weather.wind || "暂无")}</dd>
        <dt>当前时间</dt>
        <dd id="currentTime">正在读取当前时间</dd>
        <dt>数据更新时间</dt>
        <dd id="dataUpdatedAt">暂无更新时间</dd>
      </dl>
    </section>

    <section class="trend" aria-labelledby="trendTitle">
      <div class="section-heading">
        <h2 id="trendTitle">今日天气趋势</h2>
        <p>未来 24 小时</p>
      </div>
      <div class="trend-list" id="forecast24" tabindex="0"></div>
    </section>

    <p class="status" id="status" aria-live="polite"></p>
  </main>
  <script id="initialWeatherData" type="application/json">${createSafeJson(displayWeather)}</script>
  <script src="app.js" defer></script>
</body>
</html>
`;
}

export async function generatePage(weather) {
  await mkdir("public", { recursive: true });
  await writeFile(OUTPUT_FILE, renderPage(weather), "utf8");
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
