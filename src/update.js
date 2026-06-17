import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { fetchWeather } from "./fetchWeather.js";
import { generatePage } from "./generatePage.js";
import { checkSite } from "./checkSite.js";

const DATA_FILE = "data/weather.json";
const LOG_FILE = "logs/update-log.md";

async function writeLog(entry) {
  await mkdir("logs", { recursive: true });
  await appendFile(LOG_FILE, entry, "utf8");
}

function createLogEntry(result) {
  const lines = [
    `## ${new Date().toISOString()}`,
    "",
    `- 获取天气成功：${result.fetchOk ? "是" : "否"}`,
    `- 生成网页成功：${result.pageOk ? "是" : "否"}`,
    `- 检查通过：${result.checkOk ? "是" : "否"}`
  ];

  if (result.error) {
    lines.push(`- 失败原因：${result.error}`);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

export async function updateWeatherSite() {
  const result = {
    fetchOk: false,
    pageOk: false,
    checkOk: false,
    error: ""
  };

  try {
    await mkdir("data", { recursive: true });
    const weather = await fetchWeather();
    result.fetchOk = true;

    await writeFile(DATA_FILE, `${JSON.stringify(weather, null, 2)}\n`, "utf8");
    await generatePage(weather);
    result.pageOk = true;

    await checkSite();
    result.checkOk = true;

    await writeLog(createLogEntry(result));
    return result;
  } catch (error) {
    result.error = error.message;
    await writeLog(createLogEntry(result));
    throw error;
  }
}

try {
  const result = await updateWeatherSite();
  console.log(result.checkOk ? "天气网站更新完成。" : "天气网站更新未完全通过。");
} catch (error) {
  console.error(`天气网站更新失败：${error.message}`);
  process.exitCode = 1;
}
