# 加油小小鱼

一个粉色 Hello Kitty 风格的考研自我管理网站，支持账号登录、云端同步和多设备访问。默认目标日期是 2026 年 12 月 19 日。

## 本地开发

安装依赖：

```bash
npm install
```

启动前端开发服务器：

```bash
npm run dev
```

另开一个终端启动后端 API：

```bash
npm start
```

开发时前端由 Vite 提供，生产时由 `server.js` 托管 `dist` 里的 Vue 构建产物。

## 生产运行

```bash
npm run build
npm start
```

默认访问地址是 `http://localhost:5173`。登录后数据会保存到服务器的用户数据目录。

## 账号配置

推荐用 `SELF_FISH_USERS` 配置账号。示例：

```bash
SELF_FISH_USERS='[
  {"id":"fish","name":"小小鱼","username":"fish","password":"请改成强密码"},
  {"id":"kitty","name":"Kitty","username":"kitty","password":"也请改成强密码"}
]' npm start
```

也可以使用 `passwordHash` 替代 `password`。服务器内部验证密码时使用 PBKDF2 哈希，不会把学习数据和账号数据混在一起。

如果没有配置账号，开发环境会提供两个默认账号：

- `fish` / `fish1234`
- `kitty` / `kitty1234`

正式部署前一定要配置自己的强密码。

## 云端同步

同一个公网链接可以在手机、平板、电脑上打开。登录同一个账号后，设备会通过 `/api/state` 同步同一份云端数据；登录不同账号时数据相互隔离。

默认数据目录：

```bash
./data/users/<userId>/state.json
```

可以用环境变量指定持久化目录：

```bash
SELF_FISH_DATA_DIR=/app/data npm start
```

## Railway 部署

1. 把项目上传到 GitHub。
2. 在 Railway 选择 `Deploy from GitHub repo`。
3. 给服务挂载 Volume，路径建议填 `/app/data`。
4. 在 Variables 设置：

```bash
SELF_FISH_DATA_DIR=/app/data
SELF_FISH_USERS=[{"id":"fish","name":"小小鱼","username":"fish","password":"你的强密码"},{"id":"kitty","name":"Kitty","username":"kitty","password":"另一个强密码"}]
```

5. 在 Networking 里生成公网域名。
6. 用生成的 HTTPS 链接打开网站并登录。

`railway.json` 已配置：

- 构建命令：`npm run build`
- 启动命令：`npm start`
- 健康检查：`/api/health`

## 已有功能

- 今日驾驶舱：倒计时、状态选择、三档任务、学习分钟记录
- 倒数日：记录考研、模考、阶段目标等重要日期
- 全科进度：408 四科、数一、英一知识点状态追踪
- 刷题记录：记录题源、题数、正确数、用时和备注
- 长难句：每天至少记录一句，可上传截图
- 番茄钟：倒计时、正计时、非学习计时和学习记录同步
- 分心记录：专注时把飘走的念头先停车
- 错题复盘中心：错因分类、复习日期、到期筛选
- 灵感停车场：把跑偏冲动先排队，再转成限时奖励任务
- 周复盘：本周学习时间、投入科目、错因和下周建议
- 设置：自适应界面开关和云端同步说明
