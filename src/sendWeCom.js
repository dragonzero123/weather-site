import { readFile } from "node:fs/promises";

const DATA_FILE = "data/weather.json";

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少环境变量 ${name}，请在 GitHub Secrets 或本地 .env 中配置。`);
  }

  return value;
}

function createMessage(weather) {
  const siteUrl = process.env.SITE_URL || "";
  const lines = [
    "## 天气预报已更新",
    "",
    `城市：${weather.city}`,
    `温度：${weather.temperature}${weather.units?.temperature || "°C"}`,
    `天气：${weather.condition}`,
    `湿度：${weather.humidity}${weather.units?.humidity || "%"}`,
    `风力：${weather.wind || "暂无"}`,
    `更新时间：${weather.updatedAt}`,
    `数据来源：${weather.source}`
  ];

  if (siteUrl) {
    lines.push("", `[查看天气网页](${siteUrl})`);
  }

  return lines.join("\n");
}

async function sendWeComMessage(content) {
  const webhookUrl = getRequiredEnv("WECOM_WEBHOOK_URL");
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      msgtype: "markdown",
      markdown: {
        content
      }
    })
  });

  if (!response.ok) {
    throw new Error(`企业微信通知发送失败，HTTP 状态码：${response.status}`);
  }

  const result = await response.json();
  if (result.errcode !== 0) {
    throw new Error(`企业微信通知发送失败：${result.errmsg || "未知错误"}`);
  }
}

export async function notifyWeatherUpdate() {
  const content = await readFile(DATA_FILE, "utf8");
  const weather = JSON.parse(content);
  await sendWeComMessage(createMessage(weather));
}

try {
  await notifyWeatherUpdate();
  console.log("企业微信通知发送成功。");
} catch (error) {
  console.error(`企业微信通知发送失败：${error.message}`);
  process.exitCode = 1;
}
