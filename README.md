# 天气预报网站自动化项目

这是一个 Node.js 天气预报网站自动化项目。它会从真实天气 API 获取数据，生成静态天气网页，并记录每次更新日志。

## 本地使用

安装依赖：

```bash
npm install
```

执行完整更新流程：

```bash
npm run update
```

检查网页和数据：

```bash
npm run check
```

生成网页：

```bash
npm run build
```

## 环境变量

请参考 `.env.example` 创建自己的 `.env` 文件。

```text
WEATHER_CITY=广州
WEATHER_LATITUDE=23.1291
WEATHER_LONGITUDE=113.2644
WEATHER_API_URL=https://api.open-meteo.com/v1/forecast
WEATHER_API_KEY=
```

注意：

- 默认使用 Open-Meteo 真实天气 API，不需要 API Key。
- 如果以后换成需要 Key 的服务，真实 API Key 只能写在 `.env` 文件中。
- `.env` 不要提交到公开仓库。

## GitHub Pages 上线

项目已经提供 GitHub Actions 配置：

```text
.github/workflows/pages.yml
```

工作流会执行：

```bash
npm install
npm run update
npm run check
npm run build
```

然后发布 `public` 文件夹到 GitHub Pages。

### GitHub 网页后台设置

1. 打开 GitHub 仓库页面。
2. 进入 `Settings`。
3. 进入 `Pages`。
4. 在 `Build and deployment` 里，把 `Source` 选择为 `GitHub Actions`。
5. 进入 `Settings` -> `Actions` -> `General`，确认允许 GitHub Actions 运行。
6. 如果要改城市，进入 `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`，添加或修改：
   - `WEATHER_CITY`
   - `WEATHER_LATITUDE`
   - `WEATHER_LONGITUDE`
   - `WEATHER_API_URL`
7. 如果你以后使用需要 API Key 的天气服务，进入 `Settings` -> `Secrets and variables` -> `Actions` -> `Secrets`，添加：
   - `WEATHER_API_KEY`

当前 Open-Meteo 不需要 API Key，所以可以不添加 `WEATHER_API_KEY`。

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
