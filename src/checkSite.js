import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const DATA_FILE = "data/weather.json";
const PAGE_FILE = "public/index.html";

function assertValue(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export async function checkSite() {
  const dataContent = await readFile(DATA_FILE, "utf8");
  const pageContent = await readFile(PAGE_FILE, "utf8");
  const weather = JSON.parse(dataContent);

  assertValue(weather.city, "weather.json 缺少城市信息");
  assertValue(weather.temperature !== undefined && weather.temperature !== null, "weather.json 缺少温度信息");
  assertValue(weather.condition, "weather.json 缺少天气信息");
  assertValue(weather.updatedAt, "weather.json 缺少更新时间");
  assertValue(weather.source && weather.source !== "mock", "weather.json 的数据来源不能是 mock");

  const requiredTexts = [
    String(weather.city),
    String(weather.temperature),
    String(weather.condition),
    String(weather.updatedAt),
    String(weather.source)
  ];

  for (const text of requiredTexts) {
    assertValue(pageContent.includes(text), `网页缺少必要内容：${text}`);
  }

  return {
    ok: true,
    message: "检查通过：网页和真实天气数据正常。"
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
