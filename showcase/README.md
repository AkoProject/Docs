# Ako 能力展示演示工程

文档页 `/guide/showcase` 的截图全部来自这里。这是两个独立的小项目，只依赖已发布的 Ako 制品，不需要 `repos/` 下的源码。本目录不参与 VitePress 构建（见 `.vitepress/config.mts` 的 `srcExclude`）。

| 路径 | 内容 |
| --- | --- |
| `jvm/` | 演示后端：独立 Gradle 项目，依赖 `com.ako-dev:ako-rain`（来自 `maven.cnb.cool`），H2 文件数据库 |
| `jvm/src/main/kotlin/showcase/` | 5 个演示模型、Ako 控制器和 3 个自定义业务接口 |
| `jvm/seed.py` | 通过 Ako 标准的 `model/save` 接口写入演示数据 |
| `web/` | 演示前端：最小 Vite 项目，依赖 npm 上的 `@ako-dev/ako`，`/api` 代理到 17777 端口 |
| `capture.mjs` | 用本机 Chrome（无头模式 + CDP）截图，1600×900 视口、2 倍像素密度，输出到 `public/showcase/` |

## 复现步骤

```bash
# 1. 启动演示后端（Gradle 8.14 需要 JDK 17～21）
cd showcase/jvm && ./gradlew run

# 2. 写入演示数据（只需一次）
python3 showcase/jvm/seed.py

# 3. 启动演示前端，然后打开 http://localhost:7777
cd showcase/web && bun install && bun run dev

# 4. 重新截图（在文档仓库根目录执行；SCENES 可只截部分场景）
node showcase/capture.mjs
SCENES=orders,panel node showcase/capture.mjs
```

演示数据库写在 `jvm/run/h2db/`，已加入 `.gitignore`。想重置数据，停掉后端、删除该目录后重新执行第 1、2 步。

Ako 版本升级时，修改 `jvm/build.gradle.kts` 里的 `akoVersion` 和 `web/package.json` 里的 `@ako-dev/ako` 即可。
