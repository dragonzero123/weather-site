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

function renderPage(weather) {
  const tip = createWeatherText(weather);
  const updatedAt = weather.updatedAt || new Date().toISOString();
  const temperatureUnit = weather.units?.temperature || "°C";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(weather.city)}天气预报</title>
  <style>
    :root {
      color-scheme: light;
      font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
      background: #f4f7f9;
      color: #1f2933;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
    }

    main {
      width: min(720px, 100%);
      background: #ffffff;
      border: 1px solid #d9e2ec;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
    }

    h1 {
      margin: 0 0 20px;
      font-size: 32px;
      font-weight: 700;
    }

    .temperature {
      font-size: 56px;
      line-height: 1;
      font-weight: 700;
      color: #0f766e;
      margin: 0 0 16px;
    }

    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 12px 18px;
      margin: 24px 0;
    }

    dt {
      color: #52606d;
    }

    dd {
      margin: 0;
      font-weight: 600;
    }

    .tip {
      margin-top: 20px;
      padding: 16px;
      background: #eef8f6;
      border-left: 4px solid #0f766e;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(weather.city)}天气预报</h1>
    <p class="temperature">${escapeHtml(weather.temperature)}${escapeHtml(temperatureUnit)}</p>
    <dl>
      <dt>城市</dt>
      <dd>${escapeHtml(weather.city)}</dd>
      <dt>天气</dt>
      <dd>${escapeHtml(weather.condition)}</dd>
      <dt>湿度</dt>
      <dd>${escapeHtml(weather.humidity ?? "暂无")}%</dd>
      <dt>风力</dt>
      <dd>${escapeHtml(weather.wind || "暂无")}</dd>
      <dt>更新时间</dt>
      <dd>${escapeHtml(updatedAt)}</dd>
      <dt>数据来源</dt>
      <dd>${escapeHtml(weather.source || "unknown")}</dd>
    </dl>
    <p class="tip">${escapeHtml(tip)}</p>
  </main>
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
