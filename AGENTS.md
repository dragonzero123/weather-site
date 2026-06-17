# AGENTS.md

## 项目名称

天气预报网站自动化项目

## 项目目标

本项目用于创建一个可以自动更新的天气预报网站。

项目最终目标：

- 每天自动获取天气数据
- 自动生成天气预报网页
- 自动记录更新日志
- 后续使用 Codex Skill 固定更新流程
- 后续使用 Codex Automation 定时执行更新任务

## 工作规则

Codex 在处理本项目时，必须遵守以下规则：

- 修改任何文件前，必须先说明修改计划
- 不允许一次性大范围修改项目
- 每次只完成一个清晰的小任务
- 不允许删除已有文件，除非用户明确要求
- 禁止批量删除文件或目录
- 需要删除文件时，只能一次删除一个明确路径的文件
- 如果需要批量删除文件，应停止操作，并询问用户，让用户手动删除
- 不允许把 API Key、Token、密码等敏感信息写死在代码中
- 所有密钥必须放在 `.env` 文件中
- `.env` 不允许提交到公开仓库
- 修改完成后，必须说明修改了哪些文件
- 修改完成后，必须说明如何测试
- 输出说明尽量使用中文，简单易懂

禁止使用以下批量删除命令：

```powershell
del /s
rd /s
rmdir /s
Remove-Item -Recurse
rm -rf
```

正确删除单个文件示例：

```powershell
Remove-Item "C:\path\to\file.txt"
```

## 技术要求

本项目使用 Node.js 项目结构。

基础要求：

- `public/index.html` 作为最终生成的天气网页
- `src/fetchWeather.js` 用于获取天气数据
- `src/generatePage.js` 用于生成网页
- `src/weatherText.js` 用于生成天气文案
- `src/checkSite.js` 用于检查页面是否正常
- `data/weather.json` 用于保存最新天气数据
- `logs/update-log.md` 用于保存更新日志
- `.env.example` 用于展示环境变量示例
- `README.md` 用于说明项目使用方法

## 推荐项目结构

```text
weather-site/
├─ AGENTS.md
├─ README.md
├─ package.json
├─ .env.example
├─ .gitignore
├─ public/
│  └─ index.html
├─ src/
│  ├─ fetchWeather.js
│  ├─ generatePage.js
│  ├─ weatherText.js
│  ├─ checkSite.js
│  └─ update.js
├─ data/
│  └─ weather.json
├─ logs/
│  └─ update-log.md
└─ skills/
   └─ weather-update/
      └─ SKILL.md
```

## 文件作用说明

- `public/index.html`：最终展示给用户看的天气网页
- `src/fetchWeather.js`：负责请求天气 API，获取天气数据
- `src/generatePage.js`：负责把天气数据生成网页
- `src/weatherText.js`：负责生成天气提醒文案
- `src/checkSite.js`：负责检查网页是否正常生成
- `src/update.js`：负责串联完整更新流程
- `data/weather.json`：保存最新天气数据
- `logs/update-log.md`：记录每次更新结果
- `.env.example`：展示需要配置哪些环境变量
- `README.md`：给用户看的项目说明
- `skills/weather-update/SKILL.md`：天气更新 Skill 规则

## 命令要求

项目至少需要支持以下命令：

- `npm install`
- `npm run update`
- `npm run check`
- `npm run build`

命令含义：

- `npm install`：安装项目依赖
- `npm run update`：获取天气数据、生成网页、写入日志
- `npm run check`：检查网页和数据是否正常
- `npm run build`：生成或构建最终网页

## 天气更新流程

`npm run update` 应该执行以下流程：

1. 读取 `.env` 中的天气 API 配置
2. 获取天气数据
3. 保存天气数据到 `data/weather.json`
4. 根据天气数据生成 `public/index.html`
5. 检查网页是否成功生成
6. 检查网页是否包含城市、温度、天气、更新时间等信息
7. 把本次执行结果写入 `logs/update-log.md`
8. 如果失败，必须记录失败原因

## API Key 规则

- API Key 只能写在 `.env` 文件中
- 代码中只能通过环境变量读取 API Key
- `.env.example` 只能写示例，不允许写真实 Key
- `.gitignore` 必须包含 `.env`

## 日志规则

每次执行更新流程后，都要写入日志。

日志至少包含：

- 执行时间
- 是否获取天气成功
- 是否生成网页成功
- 是否检查通过
- 如果失败，记录失败原因

## Skill 规划

后续需要创建 `weather-update` Skill。

Skill 的目标是让 Codex 固定执行天气更新流程。

Skill 应该包含：

- 检查项目结构
- 检查 `.env`
- 执行 `npm run update`
- 检查 `data/weather.json`
- 检查 `public/index.html`
- 检查 `logs/update-log.md`
- 输出中文总结

## Automation 规划

后续需要配置 Codex Automation。

自动化目标：

- 每天早上 7 点自动执行天气更新任务

自动化流程：

1. 读取 `AGENTS.md`
2. 使用 `weather-update` Skill
3. 执行 `npm run update`
4. 检查网页是否生成
5. 检查日志是否写入
6. 如果成功，输出简短总结
7. 如果失败，说明失败原因和修复建议

## 开发阶段要求

项目开发应按照以下顺序进行：

1. 创建 `AGENTS.md`
2. 制定项目计划
3. 创建基础项目结构
4. 使用模拟天气数据生成网页
5. 接入真实天气 API
6. 完成 `npm run update`
7. 增加检查功能
8. 增加日志功能
9. 创建 `weather-update` Skill
10. 配置 Automation 定时任务
11. 测试完整自动化流程

## 验收标准

项目完成后，必须满足：

- 能成功运行 `npm install`
- 能成功运行 `npm run update`
- 能生成 `public/index.html`
- 能生成或更新 `data/weather.json`
- 能写入 `logs/update-log.md`
- API Key 没有写死在代码中
- 页面能正常显示天气信息
- 失败时能看到明确错误原因
- `README.md` 说明清楚如何使用
- Skill 和 Automation 有清楚的执行规则
