---
title: Koa 接入
description: 用 @ako-dev/ako-js-koa 把 Ako 请求处理函数挂到 Koa 应用上，复用 Koa 的 body parser 和响应流程。
---

# Koa 接入

`@ako-dev/ako-js-koa` 提供 `createKoaMiddleware`，把 Ako 请求处理函数包装成 Koa 中间件。适配器在运行时不导入 Koa，只用到 Koa context 上的 `req`、`res`、`request.body`、`status`、`set` 和 `body`，可以配合 Koa 2 及以上版本使用。

## 安装

```bash
yarn add koa koa-bodyparser
yarn add -D @types/koa @types/koa-bodyparser
```

## 挂载

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

这个中间件不接收 `next`，总会写出响应。路径不在 `basePath`（默认 `/api/ako`）下时，请求处理函数返回 `404`，后面的中间件不会再执行。因此要把它限定在 `/api/ako` 范围内：可以先按 `ctx.path` 判断，其他路径直接 `await next()`；也可以用路由工具挂载。如果挂载方式会从 URL 中去掉 `/api/ako` 前缀（例如 `koa-mount`），要把 `AkoRuntime` 的 `basePath` 设为空字符串，因为适配器是按 `ctx.req.url` 构造请求地址的。

## 请求体与选项

`koa-bodyparser` 会先读取请求 stream，把结果放到 `ctx.request.body`。适配器发现 `ctx.request` 上有 `body` 属性时，会把这个对象重新序列化成 Web `Request` 的请求体：

```ts
app.use(bodyParser({
    enableTypes: ['json'],
    jsonLimit: '1mb',
}))
app.use(createKoaMiddleware(handler, {
    maxBodyBytes: 1024 * 1024,
}))
```

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `maxBodyBytes` | `1048576`（1 MiB） | 适配器自己读取原始 stream 时允许的最大字节数 |

使用自定义 parser 时，要保证它在 Ako 中间件之前运行。没有经过解析的请求，由适配器按 `maxBodyBytes` 读取原始 stream；已经解析过的请求体，大小由 parser 限制（如上面的 `jsonLimit`）。之后 `AkoRuntime` 还会按自己的 `maxBodyBytes` 再检查一次。

## 中间件与认证

日志、认证、CORS 和限流中间件都可以放在 Ako 中间件之前：

```ts
app.use(async (context, next) => {
    context.state.requestId = createRequestId()
    await next()
})

app.use(createKoaMiddleware(handler))
```

认证结果不要写进前端提交的模型 JSON。可以让 `AkoRuntime` 的 `auth.isAuthenticated` 读取 `Authorization` 请求头，或者通过应用自己的请求级存储关联 Koa 的 `ctx.state`。

## 错误处理

协议错误由 Ako 请求处理函数转换成 `Response`。适配器转换请求时出的错（例如请求体超过 `maxBodyBytes`，会抛出状态码为 `413` 的 `AkoError`）以及宿主代码的错误，都按 Koa 的方式向上抛出，交给上游的错误处理：

```ts
app.on('error', (error, context) => {
    logger.error({ error, path: context.path }, 'Koa request failed')
})
```

生产响应中不要包含异常堆栈、SQL、数据库路径或认证凭据。

## Node 与 Bun

Koa 是 Node 风格的框架，需要经过 Node 请求转换。如果项目使用 Hono 等 Fetch 风格框架，请看 [Hono 接入](/backend/javascript/hono)，或者直接调用 `createAkoHandler`。Bun 可以通过 Node 兼容层运行 Koa，但如果已经用了 `Bun.serve`，就不要再套一层 Koa。

## 常见问题

- 请求体为空：检查 `koa-bodyparser` 是否注册在 Ako 中间件之前。
- 非 Ako 路径返回 `404`：按[挂载](#挂载)一节把中间件限定到 `/api/ako`。
- 响应被二次 JSON 编码：不要在 `createKoaMiddleware` 外面再对 Ako 的响应调用 `JSON.stringify`。

## 延伸阅读

- [适配器总览](/backend/javascript/adapters)
- [Express 接入](/backend/javascript/express)
- [Web 框架、鉴权与安全](/backend/javascript/controllers)
