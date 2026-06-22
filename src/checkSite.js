import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const DATA_FILE = "data/weather.json";
const PAGE_FILE = "public/index.html";
const APP_FILE = "public/app.js";
const STYLE_FILE = "public/style.css";
const FETCH_FILE = "src/fetchWeather.js";
const GENERATE_FILE = "src/generatePage.js";

function assertValue(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export async function checkSite() {
  const dataContent = await readFile(DATA_FILE, "utf8");
  const pageContent = await readFile(PAGE_FILE, "utf8");
  const appContent = await readFile(APP_FILE, "utf8");
  const fetchContent = await readFile(FETCH_FILE, "utf8");
  const generateContent = await readFile(GENERATE_FILE, "utf8");
  const weather = JSON.parse(dataContent);

  await access(STYLE_FILE);

  assertValue(weather.city, "weather.json 缺少城市信息");
  assertValue(weather.temperature !== undefined && weather.temperature !== null, "weather.json 缺少温度信息");
  assertValue(weather.condition, "weather.json 缺少天气信息");
  assertValue(weather.fetchedAt, "weather.json 缺少天气数据最后成功获取时间 fetchedAt");
  assertValue(weather.source === "高德天气 API", "weather.json 的数据来源必须是高德天气 API");
  assertValue(weather.adcode, "weather.json 缺少高德 adcode");
  assertValue(weather.weatherArea, "weather.json 缺少天气区域 weatherArea");
  assertValue(weather.updatedAt, "weather.json 缺少高德 reporttime 数据更新时间 updatedAt");
  assertValue(Array.isArray(weather.forecast24), "weather.json 缺少未来几天天气预报 forecast24");
  assertValue(weather.forecast24.length > 0, "weather.json 的未来几天天气预报不能为空");
  assertValue(weather.forecast24[0]?.label === "今天", "第一个预报卡片必须标注今天");
  assertValue(weather.forecast24[1]?.label === "明天", "第二个预报卡片必须标注明天");
  assertValue(Array.isArray(weather.hourly24), "weather.json 缺少 24 小时天气趋势 hourly24");
  assertValue(weather.hourlySource === "Open-Meteo Forecast API", "24 小时趋势来源必须标注 Open-Meteo Forecast API");
  assertValue(weather.hourly24.length === 0 || weather.hourly24.every((item) => item.weatherCode !== undefined), "24 小时趋势必须保存 Open-Meteo 原始 weatherCode 方便排查");
  assertValue(weather.hourly24.every((item) => item.condition !== "雷雨" || [95, 96, 99].includes(Number(item.weatherCode))), "只有 weatherCode 为 95、96、99 时才允许显示雷雨");
  assertValue(weather.hourly24.length === 0 || weather.hourly24.every((item) => item.trendText), "24 小时趋势必须使用弱提示 trendText");
  assertValue(pageContent.includes("Open-Meteo Forecast API") && dataContent.includes("Open-Meteo Forecast API"), "页面和数据必须标注 24 小时趋势来源 Open-Meteo Forecast API");
  assertValue(pageContent.includes("仅供趋势参考"), "页面必须说明 24 小时趋势仅供参考");
  assertValue(pageContent.includes("当前天气以高德实况为准"), "页面必须说明当前天气以高德实况为准");
  assertValue(fetchContent.includes('timezone", "Asia/Shanghai"'), "fetchWeather.js 请求 Open-Meteo 必须使用北京时间 Asia/Shanghai");
  assertValue(appContent.includes('timezone", "Asia/Shanghai"'), "app.js 请求 Open-Meteo 必须使用北京时间 Asia/Shanghai");
  assertValue(appContent.includes("weatherIcon") && appContent.includes("weatherCodeInfo"), "app.js 必须根据天气文字和 Open-Meteo weather_code 映射图标");
  assertValue(fetchContent.includes("weatherIcon") && fetchContent.includes("weatherCodeInfo"), "fetchWeather.js 必须根据天气文字和 Open-Meteo weather_code 映射图标");
  assertValue(appContent.includes("weatherCode") && fetchContent.includes("weatherCode"), "前端和数据生成必须保留 Open-Meteo 原始 weatherCode");
  assertValue(appContent.includes("trendText") && fetchContent.includes("trendText"), "24 小时趋势必须使用 trendText 降低强结论");
  assertValue(appContent.includes("createHourlyTrendText") && fetchContent.includes("createHourlyTrendText"), "必须通过 createHourlyTrendText 生成趋势参考文案");
  assertValue(!appContent.includes('<div class="weather-icon" aria-hidden="true">☁</div>'), "天气卡片不能固定显示云图标");
  assertValue(!pageContent.includes("mock") && !dataContent.includes("mock"), "页面和数据不能显示 mock");
  assertValue(!pageContent.includes("未来24小时趋势") && !pageContent.includes("未来 24 小时"), "页面不能显示误导性的未来 24 小时趋势");
  assertValue(fetchContent.includes("AMAP_KEY"), "fetchWeather.js 必须通过 AMAP_KEY 读取高德 Key");
  assertValue(fetchContent.includes("weatherInfo"), "fetchWeather.js 必须调用高德天气 API");
  assertValue(generateContent.includes("AMAP_BROWSER_KEY") && generateContent.includes("AMAP_KEY"), "generatePage.js 必须支持 AMAP_BROWSER_KEY || AMAP_KEY 前端定位配置");

  const requiredPageTexts = [
    "<title>天气预报</title>",
    ">天气预报</h1>",
    String(weather.city),
    String(weather.temperature),
    String(weather.condition),
    "weather-panel",
    "天气详情",
    "当前位置",
    "天气状况",
    "温度",
    "湿度",
    "风向",
    "风力",
    "数据更新时间",
    "当前时间",
    "当前天气数据来源",
    "高德天气 API",
    "高德天气 API - 实况天气",
    "未来几天天气来源：高德天气 API",
    "24小时天气趋势",
    "24小时趋势来源：Open-Meteo Forecast API，仅供趋势参考",
    "Open-Meteo Forecast API",
    "仅供趋势参考",
    "当前天气以高德实况为准",
    "刷新",
    "未来几天天气预报",
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
    "accuracy",
    "locationAccuracy",
    "AUTO_REFRESH_INTERVAL_MS",
    "刷新中...",
    "天气已更新",
    "lastRefreshTime",
    "nextRefreshTime",
    "forecastLabel",
    "OPEN_METEO_FORECAST_URL",
    "fetchOpenMeteoHourly",
    "renderHourlyTrend",
    "hourly24",
    "weatherCode",
    "trendText",
    "Open-Meteo Forecast API",
    "今天",
    "明天",
    "currentLocation",
    "restapi.amap.com",
    "geocode/regeo",
    "weatherInfo",
    "AMAP_WEATHER_URL",
    "adcode",
    "formatted_address",
    "addressComponent",
    "district",
    "township",
    "town",
    "normalizeAdministrativeOrder",
    "isDistrictName",
    "isTownName",
    "streetNumber",
    "street_number",
    "pois",
    "roads",
    "当前位置附近",
    "locateUser"
  ];

  for (const text of requiredAppTexts) {
    assertValue(appContent.includes(text), `前端定位逻辑缺少必要内容：${text}`);
  }

  return {
    ok: true,
    message: "检查通过：网页、真实天气数据、当前位置天气和今日天气趋势正常。"
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
