# 天气预报网站自动化项目

这是一个 Node.js 天气预报网站自动化项目。项目使用高德 Web 服务获取天气数据，生成静态天气网页，并记录每次更新日志。

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

请参考 `.env.example` 创建本地 `.env` 文件：

```text
AMAP_KEY=请填写你的高德Web服务API Key
AMAP_BROWSER_KEY=请填写允许当前网站域名调用的高德Web服务API Key
DEFAULT_ADCODE=440100
DEFAULT_CITY=广州
DEFAULT_LATITUDE=23.1291
DEFAULT_LONGITUDE=113.2644
SITE_NAME=天气预报
WECOM_WEBHOOK_URL=
SITE_URL=https://dragonzero123.github.io/weather-site/
```

注意：

- `AMAP_KEY` 是高德 Web 服务 API Key，只能放在 `.env` 或 GitHub Secrets 中。
- `AMAP_BROWSER_KEY` 是前端定位用的高德 Key，会进入生成后的网页，请在高德后台限制域名白名单。
- 如果没有单独配置 `AMAP_BROWSER_KEY`，生成网页时会临时使用 `AMAP_KEY` 作为前端定位 Key；更推荐单独配置 `AMAP_BROWSER_KEY`。
- 不允许把 `AMAP_KEY` 写死在代码里。
- 默认城市为广州，`DEFAULT_ADCODE=440100`，`DEFAULT_LATITUDE=23.1291`，`DEFAULT_LONGITUDE=113.2644`。
- `.env` 不要提交到公开仓库。

## 高德天气和定位

网站使用高德 Web 服务：

- 默认天气：用 `DEFAULT_ADCODE` 调用高德天气 API。
- 浏览器定位：用户允许定位后，用同一组经纬度调用高德逆地理编码 API，并显示定位精度。
- 位置解析：优先显示省、市、区/县、镇/街道、道路/附近。
- 天气查询：定位成功后，使用高德逆地理编码返回的 `adcode` 查询天气。
- 数据来源：页面显示“高德天气 API”。

页面标题固定为“天气预报”。当前位置示例：

```text
当前位置：广东省 佛山市 顺德区 陈村镇 天河路附近
```

高德天气普通接口返回的是区域级实况和未来几天预报，不提供真正的未来 24 小时逐小时趋势。当前项目使用双数据源兼容方案：高德天气 API 继续负责定位、实况天气和未来几天天气预报；Open-Meteo Forecast API 只负责 24 小时逐小时趋势。页面会分别标注“高德天气 API”和“Open-Meteo Forecast API”，不会用未来几天预报伪造逐小时数据。因为当前天气和未来几天天气来自高德，24 小时趋势来自 Open-Meteo，两边可能存在轻微差异，页面会标注“仅供趋势参考”，并提示“当前天气以高德实况为准”。24 小时趋势会保存 Open-Meteo 原始 `weatherCode` 方便排查，降雨概率只代表下雨概率，不会用来推断雷雨。

页面打开后会每 10 分钟自动刷新一次天气，也可以点击“刷新”手动更新。页面中的“当前时间”是浏览器本地时钟，会每秒变化；“数据更新时间”来自高德天气 API 返回的 `reporttime`，只在天气数据成功更新后变化。

## 企业微信推送说明

企业微信推送运行在 GitHub Actions 中，无法获取用户浏览器定位，所以消息里发送的是固定默认城市天气。默认城市由 `DEFAULT_CITY` 和 `DEFAULT_ADCODE` 控制。

企业微信消息会显示“默认推送城市”。用户点开天气网页后，浏览器端仍会自动请求定位权限，并显示用户所在位置天气。

## 隐私说明

- 用户经纬度只在浏览器当前页面临时使用。
- 用户详细位置不会写入 `data/weather.json`。
- 用户详细位置不会写入 `logs/update-log.md`。
- 用户详细位置不会发送到企业微信群。
- `AMAP_KEY` 不会写入日志。

## GitHub Pages 上线

项目使用 GitHub Actions 部署到 GitHub Pages，配置文件是：

```text
.github/workflows/pages.yml
```

自动更新和企业微信推送时间为北京时间每天下午 3 点，对应 GitHub Actions cron：`0 7 * * *`。

工作流会执行：

```bash
npm install
npm run update
npm run check
npm run build
npm run notify
```

然后发布 `public` 文件夹到 GitHub Pages，并把更新结果发送到企业微信群。

### GitHub 后台设置

1. 打开 GitHub 仓库页面。
2. 进入 `Settings`。
3. 进入 `Pages`。
4. 在 `Build and deployment` 里，把 `Source` 选择为 `GitHub Actions`。
5. 进入 `Settings` -> `Actions` -> `Secrets and variables`。
6. 在 `Secrets` 中添加：
   - `AMAP_KEY`
   - `AMAP_BROWSER_KEY`
   - `WECOM_WEBHOOK_URL`
7. 在 `Variables` 中添加或修改：
   - `DEFAULT_ADCODE=440100`
   - `DEFAULT_CITY=广州`
   - `SITE_NAME=天气预报`
   - `SITE_URL=https://dragonzero123.github.io/weather-site/`

如果前端页面也要调用高德接口，请在高德控制台给 `AMAP_BROWSER_KEY` 设置域名白名单，只允许当前 GitHub Pages 域名调用。

## 文件说明

- `public/index.html`：最终展示给用户看的天气网页。
- `public/app.js`：处理浏览器定位、高德逆地理编码、高德天气刷新和页面交互。
- `public/style.css`：网页样式和手机端适配。
- `src/fetchWeather.js`：获取默认城市高德天气数据。
- `src/generatePage.js`：生成网页。
- `src/weatherText.js`：生成天气提醒文案。
- `src/checkSite.js`：检查网页和数据是否正常。
- `src/update.js`：串联完整更新流程并写入日志。
- `src/sendWeCom.js`：发送企业微信群通知。
- `data/weather.json`：保存默认城市最新天气数据。
- `logs/update-log.md`：记录每次默认城市更新结果。
- `skills/weather-update/SKILL.md`：天气更新 Skill 规则。
