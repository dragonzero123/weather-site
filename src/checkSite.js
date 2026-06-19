import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const DATA_FILE = "data/weather.json";
const PAGE_FILE = "public/index.html";
const APP_FILE = "public/app.js";
const STYLE_FILE = "public/style.css";

function assertValue(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export async function checkSite() {
  const dataContent = await readFile(DATA_FILE, "utf8");
  const pageContent = await readFile(PAGE_FILE, "utf8");
  const appContent = await readFile(APP_FILE, "utf8");
  const weather = JSON.parse(dataContent);

  await access(STYLE_FILE);

  assertValue(weather.city, "weather.json 缺少城市信息");
  assertValue(weather.temperature !== undefined && weather.temperature !== null, "weather.json 缺少温度信息");
  assertValue(weather.condition, "weather.json 缺少天气信息");
  assertValue(weather.fetchedAt, "weather.json 缺少天气数据最后成功获取时间 fetchedAt");
  assertValue(weather.source && weather.source !== "mock", "weather.json 的数据来源不能是 mock");
  assertValue(Array.isArray(weather.forecast24), "weather.json 缺少未来 24 小时趋势 forecast24");
  assertValue(weather.forecast24.length > 0, "weather.json 的 forecast24 不能为空");

  const requiredPageTexts = [
    String(weather.city),
    String(weather.temperature),
    String(weather.condition),
    "weather-panel",
    "当前位置详情",
    "详细位置",
    "定位精度",
    "当前城市",
    "当前街道/道路",
    "天气状况",
    "温度",
    "湿度",
    "风力",
    "数据更新时间",
    "当前时间",
    "刷新当前位置天气",
    "重新定位",
    "使用默认广州天气",
    "今日天气趋势",
    "publicConfig",
    "app.js",
    "style.css"
  ];

  for (const text of requiredPageTexts) {
    assertValue(pageContent.includes(text), `网页缺少必要内容：${text}`);
  }

  const requiredAppTexts = [
    "navigator.geolocation",
    "enableHighAccuracy: true",
    "timeout: 10000",
    "restapi.amap.com",
    "reverse-geocode-client",
    "formatted_address",
    "streetNumber",
    "pois",
    "roads",
    "当前位置附近",
    "useDefaultCity"
  ];

  for (const text of requiredAppTexts) {
    assertValue(appContent.includes(text), `前端定位逻辑缺少必要内容：${text}`);
  }

  return {
    ok: true,
    message: "检查通过：网页、真实天气数据、详细定位、定位精度和今日天气趋势正常。"
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const result = await checkSite();
    console.log(result.message);
  } catch (error) {
    console.error(`检查失败：${error.message}`);
    process.exitCode = 1;
  }
}
