---
title: Express 接入
description: 用 @ako-dev/ako-js-express 把 Ako 请求处理函数挂到 Express 应用上，并处理请求体解析、认证和错误。
---

# Express 接入

`@ako-dev/ako-js-express` 提供 `createExpressMiddleware`，把 `createAkoHandler` 返回的请求处理函数包装成 Express 中间件。适配器在运行时不导入 Express，只用到标准的 `req`、`res` 和可选的 `next`，因此可以配合 Express 4 及以上版本使用。

## 安装

Ako 不强制依赖 Express，在业务应用中自行安装：

```bash
yarn add express
yarn add -D @types/express
```

然后从两个包中导入：

```ts
import express from 'express'
import { createAkoHandler } from '@ako-dev/ako-js'
import { createExpressMiddleware } from '@ako-dev/ako-js-express'
```

## 挂载

```ts
const app = express()
const handler = createAkoHandler(runtime)

app.use(express.json())
app.use(createExpressMiddleware(handler))

app.listen(3000)
```

这个中间件收到请求后总会写出响应，不会调用 `next()` 把请求交给后面的路由。路径不在 `basePath`（默认 `/api/ako`）下时，请求处理函数返回 `404`。所以挂在整个应用上时，要把它注册在其他路由之后。

也可以只在 `/api/ako` 下挂载。注意 `app.use('/api/ako', ...)` 会从 `req.url` 中去掉挂载前缀，而适配器是按 `req.url` 构造请求地址的，这时要把 `AkoRuntime` 的 `basePath` 设为空字符串。

## 请求体与选项

建议把 `express.json()` 放在 Ako 中间件之前：

```ts
app.use(express.json({ limit: '1mb' }))
app.use(createExpressMiddleware(handler, {
    maxBodyBytes: 1024 * 1024,
}))
```

适配器发现 `req` 上有 `body` 属性时，会把已解析的对象重新序列化成 Web `Request` 的请求体，不会再去读已经结束的 Node stream。使用自定义 parser 时，也可以显式声明：

```ts
app.use(createExpressMiddleware(handler, {
    bodyAlreadyParsed: true,
}))
```

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `maxBodyBytes` | `1048576`（1 MiB） | 适配器自己读取原始 stream 时允许的最大字节数，超出时抛出状态码为 `413` 的 `AkoError` |
| `bodyAlreadyParsed` | `req` 上存在 `body` 属性时为 `true` | 为 `true` 时直接使用 `req.body`，不读取 stream |

`maxBodyBytes` 只在适配器读取原始 stream 时生效。请求体已经由 parser 解析时，大小限制交给 parser（例如 `express.json({ limit })`）；没有 parser 时保持默认，让适配器读取 stream。无论哪种情况，`AkoRuntime` 还会按自己的 `maxBodyBytes` 再检查一次 JSON 文本长度。

## 中间件与认证

session、JWT 或 OAuth 中间件仍由应用自己配置。Ako 只读取传进来的 `Request`：

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

如果要用 `req.user`，可以通过应用自己的请求级存储（例如 `AsyncLocalStorage`）把用户传给 `auth` 和 Repository。用户身份必须来自服务端，不能从前端提交的模型 JSON 中读取。

## 错误处理

Ako 的协议错误已经由 `createAkoHandler` 转成 JSON `Response`。只有适配器在转换 Node 请求时出错，才会进入 Express 的 `next(error)`，例如请求体超过 `maxBodyBytes`：

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

请求体过大时传入的是状态码为 `413` 的 `AkoError`，可以按 `error.status` 区分处理。如果调用中间件时没有传 `next`，适配器会自己写出 JSON 错误响应。生产环境不要把 Express 默认错误页或异常堆栈返回给浏览器。

## 常见问题

### 请求一直没有响应

通常是 body parser 已经消费了 stream，但 Ako 中间件没有在 `req` 上看到 `body` 属性。检查 parser 的注册顺序，或者传入 `bodyAlreadyParsed: true`，并确认 parser 已经生成 JSON 对象。

### 其他路由都返回 `404`

Ako 中间件注册在了这些路由之前。把它移到其他路由之后，或者按[挂载](#挂载)一节限定路径。

### 分页请求返回 `400`

检查 `basePath`、模型 ID、查询字段和 `sort` 方向。未知字段或不支持的操作符不会传给 ORM，而是直接返回 `bad_request`。

### 使用 Fastify 或 Nest

Fastify 请看 [Fastify 接入](/backend/javascript/fastify)。Nest 运行在 Express 上时，可以在底层 HTTP 层复用这个中间件；运行在 Fastify 上时，改用 Fastify 适配器。

## 延伸阅读

- [项目创建与启动](/backend/javascript/project)
- [模型与元数据](/backend/javascript/models)
- [Web 框架、鉴权与安全](/backend/javascript/controllers)
