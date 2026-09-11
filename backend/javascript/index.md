---
title: 后端（JavaScript）
description: Ako 在 Node.js 与 Bun 上的 TypeScript 后端适配器，以及与 Web 框架和 ORM 的接入方式。
---

# 后端（JavaScript）

[`AkoProject/JavaScript`](https://github.com/AkoProject/JavaScript) 是 Ako 的 JavaScript/TypeScript 后端实验实现。它把 Ako 的 HTTP 协议、模型元数据和数据访问边界组合成一个可以运行在 Node.js 或 Bun 上的服务端适配器。

它不试图选择 Node.js 生态中的 Web 框架或 ORM。Express、Fastify、Hono、Koa、Nest、Prisma、Drizzle、TypeORM、Kysely 以及手写 SQL 都可以接入同一个核心，只需要在边界处实现转换。

## 它解决什么问题

Ako JVM 侧可以通过反射、注解和 `AkoAccess` 发现模型；TypeScript 没有一个被所有 Node.js 框架共同采用的运行时反射模型，因此 JavaScript 侧采用显式 schema：

```ts
const studentModel = defineModel({
    id: 'Student',
    name: '学生',
    repository,
    fields: [
        defineField({ id: 'id', name: '编号' }),
        defineField({ id: 'name', name: '姓名' }),
    ],
})
```

这样做有三个好处：

- 模型字段、展示名称、搜索能力和编辑能力可以被 TypeScript 检查。
- Ako 不需要把模型绑定到某个装饰器实现、依赖注入容器或 ORM。
- 业务应用可以把同一份 schema 与 Prisma/Drizzle/TypeORM 等已有模型并存，而不是迁移整套数据层。

## 分层关系

```text
业务模型 / ORM / SQL
          │
          ▼
   AkoRepository adapter
          │  AkoPageQuery / save / delete
          ▼
      AkoRuntime
          │  Web Request / Response
          ▼
Node http · Bun · Express · Fastify · Hono · Koa · Nest
          │
          ▼
      @ako-dev/ako-js
```

`AkoRuntime` 只负责 Ako 语义：模型注册、元数据、分页请求解析、鉴权钩子、关联字段信息和错误响应。Web 框架负责请求生命周期，repository 负责查询、事务和持久化。

## 当前提供的能力

| 能力 | JavaScript 实现 | 说明 |
| --- | --- | --- |
| 协议 handler | `createAkoHandler` | 返回 Web 标准 `Response`，可被多个 Web 框架复用。 |
| 模型定义 | `defineModel` | 显式声明模型、字段、按钮、节点和权限钩子。 |
| 字段元数据 | `defineField`、`enumField`、`mappingField`、`timestampField` | 生成与 JVM 前端协议兼容的 `DbField` 结构。 |
| 数据访问 | `AkoRepository`、`createRepository` | 适配任意 ORM、SQL builder、远程 API 或领域服务。 |
| 常见适配器 | Express、Fastify、Hono、Koa、Prisma、Drizzle、TypeORM、Sequelize | 通过子路径导入，不把对应框架或 ORM 放进核心运行时。 |
| 原型数据层 | `createMemoryRepository` | 用于测试、演示和没有数据库的协议联调。 |
| Node.js | `@ako-dev/ako-js-node` | 桥接 `node:http` 的 `IncomingMessage`/`ServerResponse`。 |
| Bun | `@ako-dev/ako-js-bun` | 桥接 `Bun.serve`，不向 Node 导入 Bun 专用模块。 |

## 与 JVM 的对应关系

| JVM | JavaScript |
| --- | --- |
| `DbModel` | `defineModel` 返回的模型定义与 `protocolModel` |
| `DbField` | `defineField` 等 helper 返回的字段定义 |
| `AkoRuntime` / `ModelContext` | `AkoRuntime` + `AkoRepository` |
| `AkoAccess` / Spring Data Repository | `createRepository` 或直接实现 `AkoRepository` |
| `@DbName`、`@Mapping`、`@DbEnum` | schema 中的 `name`、`mappingField`、`enumField` |
| Rain/SmartWeb、Spring MVC | Node/Bun/Web 框架适配器 |
| JPA 事务、软删除 | repository 或宿主应用的事务/领域服务 |

JavaScript 实现复用的是协议行为，不复刻 JVM 的类名和生命周期。需要了解字段 JSON 或接口请求体时，仍应以 [交互规则](/protocol/http-api)、[模型定义](/protocol/metadata) 和 [字段类型与选项](/protocol/types) 为准。

## 阅读顺序

1. [Monorepo 与 package](/backend/javascript/monorepo)：了解核心与各 adapter 的依赖边界。
2. [项目创建与启动](/backend/javascript/project)：安装依赖，运行 Node/Bun，并挂载第一个 handler。
3. [模型与元数据](/backend/javascript/models)：声明字段、枚举、关联、时间、按钮和安全投影。
4. [Repository 与数据访问](/backend/javascript/data-access)：适配 ORM、查询、保存、删除和事务。
5. [适配器总览](/backend/javascript/adapters)：接入 Express、Fastify、Hono、Koa、Prisma、Drizzle、TypeORM 和 Sequelize，并读取 Sequelize schema metadata。
6. [Web 框架、鉴权与安全](/backend/javascript/controllers)：接入现有 Web 应用，配置认证、授权和错误处理。

选择具体技术栈后，可以直接从左侧进入对应的一级接入指南；每一页只说明该框架与 Ako 的边界，不重复通用协议内容。

## 实现状态与边界

这是一个可运行的实验性后端适配器，不是对 Node.js 生态的统一框架封装：

- 核心包没有运行时依赖，不创建 session、cookie、JWT 或数据库连接。
- Node `http` 和 Bun `serve` 只是可选桥接；支持 Fetch handler 的框架可以直接调用核心 handler。
- repository 必须由业务应用根据 ORM 的事务、软删除、租户和审计策略实现。
- `edit.validate`、按钮 `eval` 和字段 `options` 会被前端消费，不能替代服务端权限与业务校验。
- 当前实现优先覆盖 Ako 的标准 CRUD 协议；复杂业务仍然可以保留手写控制器和页面。
