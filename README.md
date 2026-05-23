# 加油小小鱼

一个为“三分钟热度但想长期坚持”的考研二战学习者做的自我管理网站。目标日期默认是 2026 年 12 月 19 日。

## 使用方式

本地预览：

```bash
npm start
```

然后打开 `http://localhost:5173`。

服务端运行时，数据会保存到服务器的 `data/state.json`。如果直接双击打开 `index.html`，也能使用，但数据只会保存在当前浏览器的 `localStorage` 中。

## 部署到服务器

1. 安装 Node.js 18 或更新版本。
2. 把整个项目目录上传到服务器。
3. 在项目目录运行：

```bash
npm start
```

4. 用服务器 IP 或域名访问对应端口，例如 `http://你的服务器:5173`。

可选环境变量：

```bash
PORT=3000 npm start
SELF_FISH_USER=yourname SELF_FISH_PASSWORD=yourpassword npm start
SELF_FISH_DATA_FILE=/path/to/state.json npm start
```

如果设置了 `SELF_FISH_USER` 和 `SELF_FISH_PASSWORD`，访问网站时会要求输入用户名和密码。

## 免费云同步（推荐 Railway）

下面这套流程是为了“一个网址，多设备同步同一份数据”：

1. 把这个项目上传到 GitHub 仓库。
2. 登录 Railway，新建项目，选择 `Deploy from GitHub repo`，连接这个仓库。
   - 仓库里已经包含 `railway.json`，默认启动命令和健康检查已配好。
3. 在 Railway 里给这个服务挂载一个 Volume，挂载路径填 `/app/data`。
   - 当前项目默认会把数据写到 `./data/state.json`，在 Railway 的运行目录下会变成 `/app/data/state.json`，正好落在持久化卷里。
4. 在服务 Variables 里设置：

```bash
SELF_FISH_DATA_FILE=/app/data/state.json
SELF_FISH_USER=你的用户名
SELF_FISH_PASSWORD=你的密码
```

5. 在服务的 Networking -> Public Networking 里点击 `Generate Domain`，拿到形如 `xxxx.up.railway.app` 的网址。
6. 用这个新网址打开网站，所有设备都访问同一个网址。

### 把你现在本地数据迁移到云端

1. 在旧地址（例如 `http://localhost:5173`）打开「周复盘」页面，点「导出数据」。
2. 在新云端网址打开同一页面，点「导入数据」，选择刚导出的 JSON。
3. 导入后会自动写入服务器，之后手机、平板、电脑访问这个网址都会同步。

### 成本说明

- Railway Free 是 `0 美元月费 + 每月 1 美元免费资源额度`。
- 如果使用量超过免费额度，平台会按实际资源计费。

## 已有功能

- 今日驾驶舱：倒计时、状态选择、三档任务、学习分钟记录
- 倒数日：记录考研、模考、阶段目标等重要日期
- 全科进度：408 四科、数一、英一知识点状态追踪
- 刷题记录：记录数一、英一、408 的题数、正确数、用时和备注
- 长难句：每天至少记录一句，可上传截图，旧单词记录会自动迁移为历史记录
- 番茄钟：支持倒计时、正计时和非学习计时，完成后同步到驾驶舱，并按 06:00 到次日 06:00 生成 Done List
- 学习记录：驾驶舱里的手动记录、刷题记录、计时记录都可以手动删除，非学习计时会灰色区分
- 分心记录：专注时把飘走的念头先停车，休息后再处理
- 错题复盘中心：错因分类、复习日期、到期筛选
- 灵感停车场：把跑偏冲动先排队，再转成限时奖励任务
- 周复盘：本周学习时间、投入科目、错因、下周建议

## 后续可以加

- 多用户账号
- 每日自动生成计划
- 错题图片上传
- 复习间隔算法
- 月度趋势图
