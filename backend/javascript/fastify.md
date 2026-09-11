---
title: Fastify 接入
description: 在 Fastify 应用中挂载 Ako JavaScript handler，并使用 Fastify 的 body 与 response 生命周期。
---

# Fastify 接入

Fastify 使用 Node 请求对象和自己的 reply 封装。Ako 提供 `createFastifyHandler`，默认让 Fastify 管理状态码、headers 和 body；需要直接操作原始 Node response 时再使用 `createFastifyRawHandler`。

## 安装

```bash
yarn add fastify
```

Ako adapter 不在运行时导入 Fastify 类型，业务项目可以使用自己的 Fastify 版本和 TypeScript 配置：

```ts
import Fastify from 'fastify'
import { createAkoHandler } from '@ako-dev/ako-js'
import { createFastifyHandler } from '@ako-dev/ako-js-fastify'
```

## 最小挂载

```ts
const app = Fastify({ logger: true })
const akoHandler = createFastifyHandler(createAkoHandler(runtime))

app.route({
    method: ['GET', 'POST'],
    url: '/api/ako/*',
    handler: akoHandler,
})

await app.listen({
    host: '127.0.0.1',
    port: 3000,
})
```

也可以为每个 Ako 路由注册一个 Fastify route；不要在同一个请求上同时调用 `reply.send` 和 `reply.raw.end`。

## Body 与限制

Fastify 默认会解析 JSON body。`createFastifyHandler` 检测到 `request.body` 后，会把它传给 Web `Request`：

```ts
const akoHandler = createFastifyHandler(createAkoHandler(runtime), {
    maxBodyBytes: 1024 * 1024,
})
```

如果自定义 content type 或 parser 没有生成 body，可以把请求交给 `createFastifyRawHandler`，由 Node bridge 读取原始 stream：

```ts
const rawAkoHandler = createFastifyRawHandler(createAkoHandler(runtime))
```

普通 JSON 协议优先使用 `createFastifyHandler`，这样 Fastify 的 serializer 和生命周期仍然有效。

## Fastify plugin 形式

如果应用以 plugin 组织模块，可以把 runtime 和 handler 放在 plugin 闭包中：

```ts
async function akoPlugin(app) {
    const runtime = new AkoRuntime({
        models,
        auth: {
            isAuthenticated: (request) => Boolean(request.headers.authorization),
        },
    })
    app.route({
        method: ['GET', 'POST'],
        url: '/api/ako/*',
        handler: createFastifyHandler(createAkoHandler(runtime)),
    })
}

app.register(akoPlugin)
```

runtime 应该在应用启动阶段创建一次，不要在每个请求中重新注册模型或连接数据库。

## 错误处理

handler 返回的 Ako `Response` 已经包含协议状态码和 JSON body。adapter 自己的 stream 错误会抛给 Fastify，由 Fastify 的 `setErrorHandler` 统一处理：

```ts
app.setErrorHandler((error, request, reply) => {
    request.log.error(error)
    reply.code(500).send({
        error: {
            code: 'internal_error',
            message: '服务暂时不可用',
        },
    })
})
```

## Nest on Fastify

Nest 使用 Fastify adapter 时，优先把 Ako handler 注册到 Nest/底层 Fastify 实例的 HTTP 路由层。模型授权和认证仍然放在 `AkoRuntime`/repository；Nest guard 可以提前拒绝请求，但不能代替模型级授权。

## 常见问题

- `request.body` 已被解析但内容为空：检查 Fastify content type parser 和 route 的 `Content-Type`。
- 返回内容被二次 JSON 编码：不要在 handler 外再对 Ako `Response` 调用 `JSON.stringify`；`createFastifyHandler` 会以文本发送已编码的 JSON。
- 使用 `reply.raw` 后响应挂起：确认使用的是 `createFastifyRawHandler`，且不要再调用 Fastify 的 `reply.send`。

## 下一步

- [Express 接入](/backend/javascript/express)
- [Web 框架、鉴权与安全](/backend/javascript/controllers)
- [Prisma 接入](/backend/javascript/prisma)
