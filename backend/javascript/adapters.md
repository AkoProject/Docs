---
title: 适配器总览
description: Ako JavaScript 的 Web 框架适配器与 ORM 适配器，以及各框架接入指南的索引。
---

# 适配器总览

Ako JavaScript 的适配器分两类：Web 适配器把框架收到的请求交给 Ako 的请求处理函数，ORM 适配器把 `AkoPageQuery` 翻译成 ORM 查询。每个适配器都是独立的包，对应的框架或 ORM 不会成为 Ako 核心包的依赖。

## 按技术栈选择

| 类型 | 包 | 接入指南 |
| --- | --- | --- |
| Node 原生 HTTP | `@ako-dev/ako-js-node` | [Node HTTP](/backend/javascript/project#node-js-最小服务) |
| Express | `@ako-dev/ako-js-express` | [Express 接入](/backend/javascript/express) |
| Fastify | `@ako-dev/ako-js-fastify` | [Fastify 接入](/backend/javascript/fastify) |
| Hono | `@ako-dev/ako-js-hono` | [Hono 接入](/backend/javascript/hono) |
| Koa | `@ako-dev/ako-js-koa` | [Koa 接入](/backend/javascript/koa) |
| Bun Fetch | `@ako-dev/ako-js-bun` | [Bun 启动](/backend/javascript/project#bun-启动) |
| Prisma | `@ako-dev/ako-js-prisma` | [Prisma 接入](/backend/javascript/prisma) |
| Drizzle | `@ako-dev/ako-js-drizzle` | [Drizzle 接入](/backend/javascript/drizzle) |
| TypeORM | `@ako-dev/ako-js-typeorm` | [TypeORM 接入](/backend/javascript/typeorm) |
| Sequelize | `@ako-dev/ako-js-sequelize` | [Sequelize 接入](/backend/javascript/sequelize) |

Express、Fastify、Koa 依赖的 Node 桥接也单独放在 `@ako-dev/ako-js-node` 中，这样 `node:http` 不会进入核心包。

## 整体结构

```text
Web 框架 req/res 或 Fetch Request/Response
                    │
                    ▼
              AkoHandler
                    │
             AkoPageQuery
                    │
                    ▼
     ORM / SQL / 远程服务 Repository
```

核心包的请求处理函数类型是：

```ts
type AkoHandler = (request: Request) => Promise<Response>
```

Repository 需要实现的最小接口是：

```ts
interface AkoRepository<TEntity extends object, TId> {
    page(query: AkoPageQuery): Promise<{
        total: number
        entities: readonly TEntity[]
    }>
    list(query: AkoListQuery): Promise<readonly TEntity[]>
    save(data: Readonly<Record<string, unknown>>): Promise<unknown>
    delete(ids: readonly TId[]): Promise<void>
}
```

Web 适配器不需要了解数据库表结构；ORM 适配器也不需要了解 HTTP 请求头、session 或浏览器组件。

## 统一的查询计划

客户端请求中的 `params` 和 `sort` 先由运行时按模型字段白名单解析，转换成统一的查询计划：

```ts
{
    page: 1,
    size: 20,
    filters: [
        { field: 'name', operator: 'like', value: '%Alice%' },
        { field: 'age', operator: 'gte', value: 18 },
    ],
    sort: [
        { field: 'age', direction: 'desc' },
        { field: 'id', direction: 'asc' },
    ],
}
```

ORM 适配器再把它翻译成 Prisma 的 `where`、Drizzle 表达式、TypeORM 的 Find Operator 或 Sequelize 的 `Op` 对象。客户端传来的字符串始终不会直接拼进 SQL。

## 选型与扩展建议

- Fetch 风格的框架直接复用 `createAkoHandler` 即可，不必为 Hono、Elysia 或 Bun 再写一套路由。
- Node 风格框架的适配器只负责转换请求流、写回响应。请求体解析器（body parser）由 Express、Fastify 等宿主框架自己管理。
- Prisma、TypeORM、Sequelize 适配器的默认实现能处理常见的过滤条件。复杂关联、租户条件和特殊 SQL 可以通过扩展回调接入。
- Drizzle 的列和操作符与 SQL 方言紧密相关，所以它的适配器要求注入 `columns`、`operators`、`select` 和 `count`，不去掩盖方言差异。
- 事务、软删除、审计、字段级权限和行级权限，必须留在 Repository 或领域服务中处理。

继续阅读：

- [项目创建与启动](/backend/javascript/project)
- [模型与元数据](/backend/javascript/models)
- [Repository 与数据访问](/backend/javascript/data-access)
- [Web 框架、鉴权与安全](/backend/javascript/controllers)
