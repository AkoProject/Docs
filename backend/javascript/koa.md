---
title: Koa 接入
description: 在 Koa 应用中挂载 Ako JavaScript middleware，并复用 Koa 的 body parser 与响应生命周期。
---

# Koa 接入

Koa 使用 Node 的 request/response，并通过 middleware 链组织请求。Ako 提供 `createKoaMiddleware`，不在运行时导入 Koa，只依赖 Koa context 中的 `req`、`res`、`request.body`、`status`、`set` 和 `body`。

## 安装

```bash
yarn add koa koa-bodyparser
yarn add -D @types/koa @types/koa-bodyparser
```

## 最小挂载

```ts
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import { createAkoHandler } from '@ako-dev/ako-js'
import { createKoaMiddleware } from '@ako-dev/ako-js-koa'

const app = new Koa()
const handler = createAkoHandler(runtime)

app.use(bodyParser({ jsonLimit: '1mb' }))
app.use(createKoaMiddleware(handler, {
    maxBodyBytes: 1024 * 1024,
}))

app.listen(3000)
```

middleware 应该挂在明确的 `/api/ako` 路由范围内，或者在进入 middleware 前用 Koa router 过滤路径；否则 Ako handler 会对其他路径返回 `404` 并结束链路。

## Body parser

`koa-bodyparser` 先消费请求 stream，并把结果放在 `ctx.request.body`。Ako adapter 检测到这个属性后，会把对象重新编码为 Web `Request` body：

```ts
app.use(bodyParser({
    enableTypes: ['json'],
    jsonLimit: '1mb',
}))
app.use(createKoaMiddleware(handler, {
    maxBodyBytes: 1024 * 1024,
}))
```

如果使用自定义 parser，应保证 parser 在 Ako middleware 之前运行。未解析的请求会由 Node bridge 读取原始 stream。

## 路由与其他 middleware

应用可以在 Ako 前后放置日志、认证、CORS 和限流 middleware：

```ts
app.use(async (context, next) => {
    context.state.requestId = createRequestId()
    await next()
})

app.use(createKoaMiddleware(handler))
```

认证结果不要写进前端模型 JSON。可以让 `AkoRuntime.auth.isAuthenticated` 读取 authorization header，或者通过应用自己的 request-local storage 关联 Koa `ctx.state`。

## 错误处理

Ako handler 自己会将协议错误转换为 `Response`。Node stream 转换或宿主代码错误继续交给 Koa 的上游错误处理：

```ts
app.on('error', (error, context) => {
    logger.error({ error, path: context.path }, 'Koa request failed')
})
```

不要把异常堆栈、SQL、数据库路径或认证凭据放进生产响应。

## Node 与 Bun

Koa 是 Node 风格框架，需要 Node adapter；如果项目使用 Hono 或其他 Fetch 风格框架，应改用 [Hono 接入](/backend/javascript/hono) 或直接调用 `createAkoHandler`。Bun 可以运行 Node 兼容层，但若使用 `Bun.serve`，不应再包一层 Koa。

## 常见问题

- 请求 body 为空：检查 `koa-bodyparser` 是否在 Ako middleware 之前。
- 非 Ako 路径被 404：使用 Koa router/mount 将 middleware 限定到 `/api/ako`。
- 响应被二次 JSON 编码：不要在 `createKoaMiddleware` 外再次 `JSON.stringify` Ako response。

## 下一步

- [适配器总览](/backend/javascript/adapters)
- [Express 接入](/backend/javascript/express)
- [Web 框架、鉴权与安全](/backend/javascript/controllers)
