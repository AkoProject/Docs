---
title: 适配器总览
description: Ako JavaScript 的 Web 框架与 ORM 适配边界，以及各框架接入指南索引。
---

# 适配器总览

Ako JavaScript 把适配器拆成两个方向：Web adapter 负责把框架请求交给 Ako handler，ORM adapter 负责把 `AkoPageQuery` 翻译成 ORM 查询。所有适配器都不把对应框架或 ORM 加入 Ako 核心运行时依赖。

## 先选择你的技术栈

| 类型 | 入口 | 接入指南 |
| --- | --- | --- |
| Node 原生 HTTP | `@ako-dev/ako-js-node` | [Node HTTP](/backend/javascript/project#nodejs-最小服务) |
| Express | `@ako-dev/ako-js-express` | [Express 接入](/backend/javascript/express) |
| Fastify | `@ako-dev/ako-js-fastify` | [Fastify 接入](/backend/javascript/fastify) |
| Hono | `@ako-dev/ako-js-hono` | [Hono 接入](/backend/javascript/hono) |
| Koa | `@ako-dev/ako-js-koa` | [Koa 接入](/backend/javascript/koa) |
| Bun Fetch | `@ako-dev/ako-js-bun` | [Bun 启动](/backend/javascript/project#bun-启动) |
| Prisma | `@ako-dev/ako-js-prisma` | [Prisma 接入](/backend/javascript/prisma) |
| Drizzle | `@ako-dev/ako-js-drizzle` | [Drizzle 接入](/backend/javascript/drizzle) |
| TypeORM | `@ako-dev/ako-js-typeorm` | [TypeORM 接入](/backend/javascript/typeorm) |
| Sequelize | `@ako-dev/ako-js-sequelize` | [Sequelize 接入](/backend/javascript/sequelize) |

ORM adapter 现在各自是独立 workspace package；为了避免 Node 标准库进入核心入口，Express、Fastify 和 Node HTTP adapter 也各自从独立 package 导入。

## 两个边界

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

核心 handler 的类型是：

```ts
type AkoHandler = (request: Request) => Promise<Response>
```

repository 的最小合约是：

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

Web adapter 不应该知道数据库表结构；ORM adapter 也不应该知道 HTTP headers、session 或浏览器组件。

## canonical 查询

客户端请求中的 `params` 与 `sort` 先由 runtime 按模型字段白名单解析，再变成统一查询计划：

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

适配器可以把它翻译成 Prisma `where`、Drizzle expression、TypeORM Find Operator 或 Sequelize `Op` 对象，但不能把客户端字符串直接拼接为 SQL。

## 选择与扩展原则

- Fetch 风格框架优先直接复用 `createAkoHandler`；不需要为了 Hono、Elysia 或 Bun 再复制一套核心路由。
- Node 风格框架只负责把 stream 和 response 写回；Express/Fastify 的 body parser 应由宿主框架管理。
- Prisma、TypeORM、Sequelize 的默认 adapter 可以处理常见过滤；复杂关系、租户条件和特殊 SQL 应通过扩展 callback 接入。
- Drizzle 的列和 operator 与 SQL 方言强相关，因此 adapter 注入 `columns`、`operators`、`select` 和 `count`，不隐藏方言差异。
- 事务、软删除、审计、字段级权限和行级权限必须留在 repository 或领域 service。

继续阅读：

- [项目创建与启动](/backend/javascript/project)
- [模型与元数据](/backend/javascript/models)
- [Repository 与数据访问](/backend/javascript/data-access)
- [Web 框架、鉴权与安全](/backend/javascript/controllers)
