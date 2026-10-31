---
title: Hono 接入
description: 在 Hono 应用中直接使用 Ako 的 Fetch 请求处理函数，可运行在 Bun、Node 或其他 Fetch 运行时上。
---

# Hono 接入

Hono 原生使用 Fetch API，Ako 的请求处理函数可以直接接收 Hono 提供的 `Request`，不需要转换 Node stream。`@ako-dev/ako-js-hono` 提供的 `createHonoHandler` 会原样返回传入的请求处理函数，没有任何选项，作用只是让接入代码读起来更明确。

## 安装

```bash
yarn add hono
```

## 挂载

```ts
import { Hono } from 'hono'
import { createAkoHandler } from '@ako-dev/ako-js'
import { createHonoHandler } from '@ako-dev/ako-js-hono'

const app = new Hono()
const akoHandler = createHonoHandler(createAkoHandler(runtime))

app.all('/api/ako/*', (context) => akoHandler(context.req.raw))

export default app
```

Bun 项目可以直接导出 Hono 应用，由 Hono 负责 `Bun.serve` 的生命周期，Ako 只处理自己的接口路径。

## 在 Node 上运行

Hono 通过 `@hono/node-server` 运行在 Node 上时，仍然由 Hono 提供 `Request`：

```ts
import { serve } from '@hono/node-server'

serve({
    fetch: app.fetch,
    port: 3000,
})
```

`@hono/node-server` 已经完成了 Node 到 Fetch 的转换，不需要再调用 `createNodeServer`。

## 中间件与认证

Hono 中间件可以先解析 token，再由 Ako 运行时做模型动作授权：

```ts
app.use('/api/ako/*', async (context, next) => {
    const token = context.req.header('authorization')
    if (token) context.set('ako.user', await verifyToken(token))
    await next()
})
```

`AkoRuntime` 的 `auth.isAuthenticated` 只能读取 `Request` 的请求头。如果需要在 Repository 中拿到当前用户对象，让 Hono 中间件和 Repository 使用同一套请求级上下文传递方式。`model/page` 等请求体里的用户 ID 不可信。

## 响应与错误

CORS、压缩、日志和错误中间件仍由宿主应用配置。请求处理函数返回的 `Response` 要原样返回，不要再包成 `{ data: response }`，否则前端识别不了协议字段：

```ts
app.all('/api/ako/*', (context) => {
    return akoHandler(context.req.raw)
})
```

`401`、`403`、`404` 等协议错误由 Ako 直接返回 JSON 响应。`AkoRuntime` 的 `onError` 只处理其余未预期的异常，可以在这里接入统一的错误响应或日志；Hono 的 `onError` 则处理 Ako 之外抛出的错误。

## 其他 Fetch 运行时

Hono 也能运行在 Deno 等其他 Fetch 运行时上。只要宿主能这样调用：

```ts
const response = await handler(request)
```

就不需要导入 Node 适配器。[Bun 启动](/backend/javascript/project#bun-启动) 中的专用入口只适用于直接使用 `Bun.serve` 的场景。

## 延伸阅读

- [适配器总览](/backend/javascript/adapters)
- [模型与元数据](/backend/javascript/models)
- [Web 框架、鉴权与安全](/backend/javascript/controllers)
