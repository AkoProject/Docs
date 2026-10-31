---
title: 实现状态
description: Ako 各部分的实现进度、推荐阅读顺序和已知限制。
---

# 实现状态

Ako 仍在持续开发。下表列出哪些部分已经能用、哪些只有协议可以参照，方便你判断能不能直接上手。

## 各部分进度

| 方向 | 状态 | 说明 |
| --- | --- | --- |
| Vue 3 前端 | 可用 | `@ako-dev/ako` 提供默认管理后台、内置字段类型和扩展入口。 |
| Ako 协议 | 可实现 | HTTP 接口与后端语言无关，字段细节以本站协议文档为准。 |
| JVM 核心 | 已实现 | 模型元数据、字段类型、按钮和分页响应都在 `ako-core` 中。 |
| JVM + JPA | 已实现 | `ako-jpa` 提供 JPA 基础模型、查询和软删除。 |
| `ako-rain` | 已实现 | 已接入 Rain、SmartWeb 和 SmartAccess。 |
| `ako-spring` | 已实现 | 已接入 Spring Boot 2/3/4 自动配置。Boot 3/4 可以用 Spring Data JPA 适配器；Boot 2 需要自己实现数据库访问。 |
| 后端（JavaScript） | 实验性实现 | [`AkoProject/JavaScript`](https://github.com/AkoProject/JavaScript) 提供 TypeScript 核心、Node.js 和 Bun 启动适配器、Express/Fastify/Hono/Koa 接入、Prisma/Drizzle/TypeORM/Sequelize 适配器，以及内存 Repository。事务和认证由宿主应用负责。仓库自述为快速验证原型，不保证后续可用性。 |
| 其他语言和框架 | 可按协议实现 | 暂无官方适配器，需要自己实现 HTTP 接口、元数据和数据访问。 |

## 推荐阅读顺序

### 只想用管理后台

1. [安装与挂载](/frontend/quick-start)
2. [前端配置](/frontend/configuration)
3. [运行时与工具](/frontend/tools)
4. [使用 Ako View 构建页面](/frontend/views)

### 使用 JVM 后端

1. [项目创建](/backend/rain/project)：选择 `ako-rain` 或 `ako-spring`。
2. [快速开始](/backend/rain/quick-start)
3. [实体模型](/backend/rain/models)
4. [注解功能](/backend/rain/annotations)
5. [前端联动](/backend/rain/frontend)

### 自己实现后端

1. [Ako 协议](/protocol/overview)
2. [交互规则](/protocol/http-api)
3. [模型定义](/protocol/metadata)
4. [字段类型与选项](/protocol/types)
5. [按钮与操作](/protocol/buttons)

如果要在 Node.js 或 Bun 上运行，可以直接看 [后端（JavaScript）](/backend/javascript/)。它把上面这些协议步骤封装成了可复用的 TypeScript 运行时（`AkoRuntime`）。

## 已知限制

- 默认前端从第 1 页开始请求，适配器要把 `page` 当作从 1 开始的页码来处理。
- JVM 两套适配器的删除接口都以字符串传输 ID，以支持非整数主键。但前端 `ModelApi.delete` 的参数类型仍写作 `number[]`，接入 UUID 时要自己修正类型，或确保序列化不丢精度。
- `menu/list/{channel}` 的路径里带有 channel，但 JVM 核心的 `Menu.list(channel)` 不会按 channel 过滤，总是返回全部模型。需要多后台隔离时，在适配器或前端 `mixin` 中处理。后端（JavaScript）会把 channel 传给模型的 `authorize` 钩子，可以在那里过滤。
- JVM 的模型发现依赖 Access（或 Repository）和扫描范围。模型类写好了，但没有对应的 Access，或者不在扫描范围内，就不会出现在 `models` 中。
- `@DefaultSort` 只有注解定义，元数据转换和查询都不读取它，不能靠它改变首次排序。请求没有带排序时，Spring Data 适配器按主键升序排列。
- Spring Boot 2/3/4 的依赖和 JPA 技术栈不同，要选对对应的 `ako-springboot-*` 模块。同一个应用里不要混用 `javax.persistence` 和 `jakarta.persistence`。

更多排查方法见 [常见问题与限制](/reference/limitations)。

## 版本说明

源码里的版本号仍会变化，撰写本文时 JVM 根项目版本为 `0.0.17`。复制依赖时，不要把示例里的占位符当成已发布的版本号，请同时查看 JVM 根项目、Rain 模块和 Spring 模块的构建文件。应用启动、扫描、SmartWeb、SmartAccess 和 Spring Boot 的配置，以各自的官方文档为准。
