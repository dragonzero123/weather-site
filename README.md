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
MAP_PROVIDER=amap
MAP_API_KEY=
WECOM_WEBHOOK_URL=
SITE_URL=https://dragonzero123.github.io/weather-site/
```

注意：

- 默认使用 Open-Meteo 真实天气 API，不需要 API Key。
- 如果以后换成需要 Key 的天气服务，真实 API Key 只能写在 `.env` 或 GitHub Secrets 中。
- 地图逆地理编码默认优先使用高德地图。`MAP_API_KEY` 不允许写死在代码中。
- 如果高德 Key 用在前端页面，请在高德后台设置域名白名单，只允许当前 GitHub Pages 域名调用。
- 企业微信群机器人 Webhook 只能写在 `.env` 或 GitHub Secrets 中。
- `.env` 不要提交到公开仓库。

## 详细定位天气

网页打开后会请求浏览器定位权限：

- 用户允许定位后，网页会获取当前位置经纬度和定位精度。
- 网页会优先用高德地图逆地理编码，把经纬度转换成省、市、区/县、街道、道路或附近地标。
- 如果没有配置 `MAP_API_KEY`，网页会降级使用无 Key 逆地理编码服务，详细度可能低一些。
- 页面会显示“当前位置详情”，包括详细位置、定位精度、当前城市、当前街道/道路、数据更新时间和天气状况。
- 页面位置会带“附近”字样，避免误导为绝对精确门牌。
- 用户拒绝定位或定位失败时，网页继续显示默认广州天气。
- 用户可以点击“重新定位”“刷新当前位置天气”“使用默认广州天气”。

隐私说明：

- 用户精确经纬度只在浏览器当前页面临时使用。
- 用户详细位置只在浏览器当前页面显示。
- 用户位置不会写入 `data/weather.json`。
- 用户位置不会写入 `logs/update-log.md`。
- 用户位置不会发送到企业微信群。
- 用户位置不会上传到 GitHub。

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
npm run notify
```

然后发布 `public` 文件夹到 GitHub Pages，并把更新结果发送到企业微信群。

### GitHub 网页后台设置

1. 打开 GitHub 仓库页面。
2. 进入 `Settings`。
3. 进入 `Pages`。
4. 在 `Build and deployment` 里，把 `Source` 选择为 `GitHub Actions`。
5. 进入 `Settings` -> `Actions` -> `General`，确认允许 GitHub Actions 运行。
6. 如果要改默认城市，进入 `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`，添加或修改：
   - `WEATHER_CITY`
   - `WEATHER_LATITUDE`
   - `WEATHER_LONGITUDE`
   - `WEATHER_API_URL`
7. 如果要启用高德详细地址识别，进入 `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`，添加：
   - `MAP_PROVIDER=amap`
   - `MAP_API_KEY`
8. 如果以后使用需要 API Key 的天气服务，进入 `Settings` -> `Secrets and variables` -> `Actions` -> `Secrets`，添加：
   - `WEATHER_API_KEY`
9. 如果要发送到企业微信群，进入 `Settings` -> `Secrets and variables` -> `Actions` -> `Secrets`，添加：
   - `WECOM_WEBHOOK_URL`
10. 进入 `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`，添加网站地址：
   - `SITE_URL`

当前 Open-Meteo 不需要 API Key，所以可以不添加 `WEATHER_API_KEY`。

## 文件说明

- `public/index.html`：最终展示给用户看的天气网页
- `public/app.js`：处理浏览器定位、逆地理编码、天气刷新和页面交互
- `public/style.css`：网页样式和手机端适配
- `src/fetchWeather.js`：获取默认城市真实天气数据
- `src/generatePage.js`：生成网页
- `src/weatherText.js`：生成天气提醒文案
- `src/checkSite.js`：检查网页和数据是否正常
- `src/update.js`：串联完整更新流程
- `src/sendWeCom.js`：发送企业微信群通知
- `data/weather.json`：保存默认城市最新天气数据
- `logs/update-log.md`：记录每次默认城市更新结果
- `skills/weather-update/SKILL.md`：后续自动更新 Skill 规则
