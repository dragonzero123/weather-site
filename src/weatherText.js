export function createWeatherText(weather) {
  const condition = String(weather.condition || "");
  const temperature = Number(weather.temperature);

  if (condition.includes("雨")) {
    return "今天可能下雨，出门记得带伞。";
  }

  if (condition.includes("雪")) {
    return "今天有降雪，注意保暖和路面湿滑。";
  }

  if (Number.isFinite(temperature) && temperature >= 32) {
    return "今天气温较高，注意防晒和补水。";
  }

  if (Number.isFinite(temperature) && temperature <= 5) {
    return "今天气温较低，出门请多穿一点。";
  }

  if (condition.includes("晴")) {
    return "今天天气不错，适合安排户外活动。";
  }

  return "天气变化要留意，出门前再看一眼最新预报。";
}
