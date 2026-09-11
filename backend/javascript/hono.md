---
title: Hono 接入
description: 在 Hono 应用中直接复用 Ako Fetch handler，并运行在 Bun、Node 或其他 Web runtime。
---

# Hono 接入

Hono 原生采用 Fetch API，Ako 不需要转换 Node stream。`@ako-dev/ako-js-hono` 提供一个命名适配器，方便在项目中明确表达这条边界。

## 安装

```bash
yarn add hono
```

## Bun/Fetch 服务

```ts
import { Hono } from 'hono'
import { createAkoHandler } from '@ako-dev/ako-js'
import { createHonoHandler } from '@ako-dev/ako-js-hono'

const app = new Hono()
const akoHandler = createHonoHandler(createAkoHandler(runtime))

app.all('/api/ako/*', (context) => akoHandler(context.req.raw))

export default app
```

Bun 项目可以直接导出 Hono app；Hono 负责 `Bun.serve` 的生命周期，Ako 只处理协议路径。

## Node adapter

如果 Hono 使用 Node adapter，仍然可以让 Hono 提供 `Request`：

```ts
import { serve } from '@hono/node-server'

serve({
    fetch: app.fetch,
    port: 3000,
})
```

这种情况下不需要再调用 `createNodeServer`；`@hono/node-server` 已经负责 Node 到 Fetch 的转换。

## 中间件与认证

Hono 中间件可以先解析 token，再由 Ako runtime 做模型动作授权：

```ts
app.use('/api/ako/*', async (context, next) => {
    const token = context.req.header('authorization')
    if (token) context.set('ako.user', await verifyToken(token))
    await next()
})
```

`AkoRuntime.auth.isAuthenticated` 读取 request headers；如果需要 request-local 用户对象，建议让业务的 Hono middleware 和 repository 使用同一套上下文传递机制。不要在 `model/page` body 中信任用户 ID。

## CORS、错误与响应

Hono 的 CORS、压缩、日志和错误中间件仍然属于宿主应用。Ako handler 返回的 `Response` 不要再次包成 `{ data: response }`，否则前端无法识别协议字段：

```ts
app.all('/api/ako/*', (context) => {
    return akoHandler(context.req.raw)
})
```

如果需要统一错误页，应通过 `AkoRuntime.onError` 或 Hono 的错误处理约定完成，同时保持 `401`、`403`、`404` 和 `500` 状态码。

## Deno 与其他 Fetch runtime

Hono 可以运行在其他 Fetch runtime。只要宿主可以调用：

```ts
const response = await handler(request)
```

就不需要导入 Node adapter。Bun 的专用启动入口 [Bun 启动](/backend/javascript/project#bun-启动) 只适用于直接使用 `Bun.serve` 的场景。

## 下一步

- [适配器总览](/backend/javascript/adapters)
- [模型与元数据](/backend/javascript/models)
- [Web 框架、鉴权与安全](/backend/javascript/controllers)
