---
title: 后端（JavaScript）
description: 在 Node.js 和 Bun 上运行的 Ako TypeScript 后端，以及它与 Web 框架、ORM 的接入方式。
---

# 后端（JavaScript）

[`AkoProject/JavaScript`](https://github.com/AkoProject/JavaScript) 是 Ako 后端的 JavaScript/TypeScript 实验性实现。它实现了 Ako 的 HTTP 接口、模型元数据和数据访问约定，可以运行在 Node.js 或 Bun 上。

它不替你选 Web 框架或 ORM。Express、Fastify、Hono、Koa、Nest、Prisma、Drizzle、TypeORM、Kysely，甚至手写 SQL，都可以接到同一个核心上，只需在交接处做一层转换。

## 为什么用显式 schema

后端（JVM）靠反射、注解和 `AkoAccess` 发现模型。TypeScript 没有一套被所有 Node.js 框架共同采用的运行时反射机制，所以 JavaScript 版改为显式声明 schema：

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

这样做有三点好处：

- 模型字段、显示名称、搜索和编辑配置都能得到 TypeScript 类型检查。
- Ako 不必绑定某个装饰器实现、依赖注入容器或 ORM。
- 这份 schema 可以和已有的 Prisma、Drizzle、TypeORM 模型并存，不用迁移整个数据层。

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

运行时（`AkoRuntime`）只处理 Ako 自己的事情：注册模型、生成元数据、解析分页请求、调用鉴权钩子、查询关联字段信息、返回错误响应。请求生命周期交给 Web 框架，查询、事务和持久化交给 Repository。

## 已有功能

| 功能 | JavaScript 实现 | 说明 |
| --- | --- | --- |
| 请求处理函数 | `createAkoHandler` | 返回 Web 标准的 `Response`，多个 Web 框架可以共用。 |
| 模型定义 | `defineModel` | 显式声明模型、字段、按钮、页面节点和权限钩子。 |
| 字段元数据 | `defineField`、`enumField`、`mappingField`、`timestampField` | 生成与后端（JVM）一致的 `DbField` 结构。 |
| 数据访问 | `AkoRepository`、`createRepository` | 可对接任意 ORM、SQL 构建器、远程 API 或领域服务。 |
| 常用适配器 | Express、Fastify、Hono、Koa、Prisma、Drizzle、TypeORM、Sequelize | 各自是独立的包，框架和 ORM 不会进入核心包的依赖。 |
| 原型数据层 | `createMemoryRepository` | 用于测试、演示，以及没有数据库时的接口联调。 |
| Node.js | `@ako-dev/ako-js-node` | 桥接 `node:http` 的 `IncomingMessage` 和 `ServerResponse`。 |
| Bun | `@ako-dev/ako-js-bun` | 桥接 `Bun.serve`，在 Node 中导入时不会加载 Bun 专用模块。 |

## 与后端（JVM）的对应关系

| JVM | JavaScript |
| --- | --- |
| `DbModel` | `defineModel` 返回的模型定义与 `protocolModel` |
| `DbField` | `defineField` 等辅助函数返回的字段定义 |
| `AkoRuntime` / `ModelContext` | `AkoRuntime` + `AkoRepository` |
| `AkoAccess` / Spring Data Repository | `createRepository` 或直接实现 `AkoRepository` |
| `@DbName`、`@Mapping`、`@DbEnum` | schema 中的 `name`、`mappingField`、`enumField` |
| Rain/SmartWeb、Spring MVC | Node、Bun 和各 Web 框架的适配器 |
| JPA 事务、软删除 | Repository 或宿主应用的事务、领域服务 |

JavaScript 版对齐的是接口行为，并不照搬 JVM 的类名和生命周期。字段 JSON 和请求体的格式仍以 [交互规则](/protocol/http-api)、[模型定义](/protocol/metadata) 和 [字段类型与选项](/protocol/types) 为准。

## 阅读顺序

1. [Monorepo 与包结构](/backend/javascript/monorepo)：核心包和各适配器之间的依赖关系。
2. [项目创建与启动](/backend/javascript/project)：安装依赖，用 Node 或 Bun 启动，挂载第一个请求处理函数。
3. [模型与元数据](/backend/javascript/models)：声明字段、枚举、关联、时间、按钮，以及控制返回哪些字段。
4. [Repository 与数据访问](/backend/javascript/data-access)：对接 ORM，实现查询、保存、删除和事务。
5. [适配器总览](/backend/javascript/adapters)：接入 Express、Fastify、Hono、Koa、Prisma、Drizzle、TypeORM 和 Sequelize。
6. [Web 框架、鉴权与安全](/backend/javascript/controllers)：接入现有 Web 应用，配置认证、授权和错误处理。

确定技术栈后，可以直接从左侧进入对应框架的接入指南。这些页面只讲该框架怎么接 Ako，通用的接口内容不再重复。

## 实现状态

这是一个能跑起来的实验性实现，并不打算把 Node.js 生态统一封装成一个框架：

- 核心包没有运行时依赖，不创建 session、cookie、JWT 或数据库连接。
- Node `http` 和 Bun `serve` 只是可选的桥接。支持 Fetch 风格请求处理函数的框架可以直接调用核心包。
- Repository 需要业务应用自己实现，事务、软删除、多租户和审计策略都由它按所用 ORM 处理。
- `edit.validate`、按钮的 `eval` 和字段的 `options` 都在前端使用，不能代替服务端的权限检查和业务校验。
- 目前优先覆盖 Ako 的标准增删改查接口。复杂业务仍可以保留手写的 Controller 和页面。
