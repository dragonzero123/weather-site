# 天气预报网站自动化项目

这是一个 Node.js 天气预报网站自动化项目。它会从真实天气 API 获取数据，生成静态天气网页，并记录每次更新日志。

## 使用方法

安装依赖：

```bash
npm install
```

生成网页：

```bash
npm run build
```

执行完整更新流程：

```bash
npm run update
```

检查网页和数据：

```bash
npm run check
```

## 环境变量

请参考 `.env.example` 创建自己的 `.env` 文件。

```text
WEATHER_CITY=上海
WEATHER_LATITUDE=31.2304
WEATHER_LONGITUDE=121.4737
WEATHER_API_URL=https://api.open-meteo.com/v1/forecast
WEATHER_API_KEY=
```

注意：

- 默认使用 Open-Meteo 真实天气 API，不需要 API Key。
- 如果以后换成需要 Key 的服务，真实 API Key 只能写在 `.env` 文件中。
- `.env` 不要提交到公开仓库。

## 文件说明

- `public/index.html`：最终展示给用户看的天气网页
- `src/fetchWeather.js`：获取真实天气数据
- `src/generatePage.js`：生成网页
- `src/weatherText.js`：生成天气提醒文案
- `src/checkSite.js`：检查网页和数据是否正常
- `src/update.js`：串联完整更新流程
- `data/weather.json`：保存最新天气数据
- `logs/update-log.md`：记录每次更新结果
- `skills/weather-update/SKILL.md`：后续自动更新 Skill 规则
