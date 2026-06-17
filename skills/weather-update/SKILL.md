# weather-update Skill

## 目标

固定执行天气预报网站的更新流程，确认真实天气数据、网页和日志都正常，并且只用中文输出总结。

## 适用项目结构

本 Skill 适用于当前项目结构：

- `AGENTS.md`：项目工作规则
- `.env`：本地真实配置，包含城市、经纬度和天气 API 地址
- `.env.example`：环境变量示例，不允许包含真实密钥
- `.gitignore`：必须忽略 `.env`
- `package.json`：包含 `update`、`check`、`build` 命令
- `src/fetchWeather.js`：读取配置并获取真实天气数据
- `src/generatePage.js`：生成天气网页
- `src/checkSite.js`：检查天气数据和网页
- `src/update.js`：串联更新流程并写入日志
- `public/index.html`：最终天气网页
- `data/weather.json`：最新天气数据
- `logs/update-log.md`：更新日志

## 执行流程

1. 读取项目顶层 `AGENTS.md`，确认工作规则。
2. 检查 `.env` 是否存在，并确认包含：
   - `WEATHER_CITY`
   - `WEATHER_LATITUDE`
   - `WEATHER_LONGITUDE`
   - `WEATHER_API_URL`
3. 检查 `.env.example` 是否存在，并确认只包含示例值，不包含真实密钥。
4. 检查 `.gitignore` 是否包含 `.env`。
5. 检查代码中没有写死 API Key、Token、密码等敏感信息。
6. 执行：

```bash
npm run update
```

7. 执行：

```bash
npm run check
```

8. 执行：

```bash
npm run build
```

9. 检查 `data/weather.json` 是否存在，并确认至少包含：
   - `city`
   - `temperature`
   - `condition`
   - `humidity`
   - `wind`
   - `updatedAt`
   - `source`
10. 检查 `data/weather.json` 中的 `source` 不能是 `mock`。
11. 检查 `public/index.html` 是否存在，并确认页面包含：
   - 城市
   - 温度
   - 天气
   - 更新时间
   - 数据来源
12. 检查 `public/index.html` 中的数据来源不能显示 `mock`。
13. 检查 `logs/update-log.md` 是否存在，并确认写入了本次更新结果。
14. 输出中文总结，说明：
   - 更新是否成功
   - 当前城市
   - 数据来源
   - 网页是否生成
   - 检查是否通过
   - 日志是否写入

## 失败处理

如果任一步失败，必须停止继续假装成功，并用中文说明：

- 失败发生在哪一步
- 看到的错误原因
- 哪个文件或配置可能需要修复
- 建议用户下一步怎么处理

常见失败处理：

- `.env` 不存在：提示用户根据 `.env.example` 创建 `.env`。
- 经纬度缺失：提示用户补充 `WEATHER_LATITUDE` 和 `WEATHER_LONGITUDE`。
- `npm run update` 失败：检查网络、天气 API 地址和 `.env` 配置。
- `npm run check` 失败：检查 `data/weather.json` 和 `public/index.html` 是否缺少必要字段。
- 日志未写入：检查 `logs/update-log.md` 和 `src/update.js` 的日志流程。
- 数据来源为 `mock`：说明当前没有使用真实天气 API，需要检查 `src/fetchWeather.js` 和 `.env`。

## 输出要求

- 必须使用中文。
- 说明要简单清楚，避免技术黑话。
- 不要输出真实 API Key、Token、密码。
- 不要删除文件。
- 如果需要修改文件，必须先说明修改计划。
