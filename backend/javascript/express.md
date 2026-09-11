---
title: Express 接入
description: 在 Express 应用中挂载 Ako JavaScript handler，并处理 body parser、认证和错误。
---

# Express 接入

Express 是 Node.js 风格的 middleware 框架。Ako 提供 `createExpressMiddleware`，不在运行时导入 Express，只要求宿主提供标准的 `req`、`res` 和可选的 `next`。

## 安装

Ako 项目本身不强制安装 Express。在业务应用中安装：

```bash
yarn add express
yarn add -D @types/express
```

然后从两个包入口导入：

```ts
import express from 'express'
import { createAkoHandler } from '@ako-dev/ako-js'
import { createExpressMiddleware } from '@ako-dev/ako-js-express'
```

## 最小挂载

```ts
const app = express()
const handler = createAkoHandler(runtime)

app.use(express.json())
app.use(createExpressMiddleware(handler))

app.listen(3000)
```

这个 middleware 可以挂在整个应用上，因为 Ako handler 只响应自己的 `basePath`，默认是 `/api/ako`。如果应用需要明确限制范围，也可以挂在 `/api/ako` 路由下，但要注意 Express 的 wildcard 路由写法和版本差异。

## Body parser 顺序

推荐让 `express.json()` 在 Ako middleware 之前：

```ts
app.use(express.json({ limit: '1mb' }))
app.use(createExpressMiddleware(handler, {
    maxBodyBytes: 1024 * 1024,
}))
```

adapter 检测到 `req.body` 后，会把已经解析的对象重新转换成 Web `Request` body，不会再次读取已经结束的 Node stream。如果使用自定义 parser，也可以显式声明：

```ts
app.use(createExpressMiddleware(handler, {
    bodyAlreadyParsed: true,
}))
```

`bodyAlreadyParsed: true` 时，body 大小应由 Express parser 自己限制；如果没有 parser，保持默认值，让 adapter 读取原始 stream。

## 认证与 session

Express 的 session、JWT 或 OAuth middleware 仍然由应用负责。Ako 只读取当前 `Request`：

```ts
const runtime = new AkoRuntime({
    models,
    auth: {
        isAuthenticated(request) {
            return request.headers.get('authorization') === 'Bearer demo-token'
        },
    },
})
```

如果需要使用 `req.user`，可以在 Express adapter 中扩展请求上下文，或让 `auth` 和 repository 通过应用自己的 request-local storage 读取用户。不要把用户身份放进前端提交的模型 JSON 中。

## 错误处理

`createExpressMiddleware` 的核心协议错误已经由 `createAkoHandler` 转成 JSON `Response`。只有 Node stream 转换失败时才会进入 Express 的 `next(error)`：

```ts
app.use(createExpressMiddleware(handler))

app.use((error, request, response, next) => {
    logger.error({ error, url: request.originalUrl }, 'Ako bridge failed')
    if (response.headersSent) {
        next(error)
        return
    }
    response.status(500).json({
        error: {
            code: 'internal_error',
            message: '服务暂时不可用',
        },
    })
})
```

生产环境不要把 Express 默认错误页或异常堆栈直接暴露给浏览器。

## 常见问题

### 请求一直没有响应

通常是 body parser 已经消费了 stream，但 Ako middleware 没有看到 `req.body` 属性。确认 parser 顺序，或者传入 `bodyAlreadyParsed: true` 并确保 parser 已经生成 JSON 对象。

### 分页收到 `400`

检查 `basePath`、`model` ID、字段白名单和 `sort` 方向。Ako 不把未知字段或未知操作符传给 ORM，而是直接返回 `bad_request`。

### 想使用 Fastify 或 Nest

Fastify 应使用 [Fastify 接入](/backend/javascript/fastify)。Nest 如果运行在 Express 上，可以在底层 HTTP middleware 中复用本页 adapter；如果运行在 Fastify 上，则使用 Fastify adapter。

## 下一步

- [项目创建与启动](/backend/javascript/project)
- [模型与元数据](/backend/javascript/models)
- [Web 框架、鉴权与安全](/backend/javascript/controllers)
