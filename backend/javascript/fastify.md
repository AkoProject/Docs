---
title: Fastify 接入
description: 用 @ako-dev/ako-js-fastify 把 Ako 请求处理函数注册为 Fastify 路由，沿用 Fastify 的请求体解析和响应流程。
---

# Fastify 接入

`@ako-dev/ako-js-fastify` 提供两个函数：`createFastifyHandler` 通过 Fastify 的 `reply` 写出状态码、响应头和响应体，一般场景用它；`createFastifyRawHandler` 直接写原始 Node response，只在需要操作 `reply.raw` 时使用。

## 安装

```bash
yarn add fastify
```

适配器在运行时不导入 Fastify，也不依赖 Fastify 的类型，业务项目可以使用自己的 Fastify 版本（4 及以上）和 TypeScript 配置：

```ts
import Fastify from 'fastify'
import { createAkoHandler } from '@ako-dev/ako-js'
import { createFastifyHandler } from '@ako-dev/ako-js-fastify'
```

## 挂载

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

也可以为每个 Ako 接口单独注册一条 Fastify 路由。同一个请求上不要既调用 `reply.send` 又调用 `reply.raw.end`。

## 请求体与选项

Fastify 默认会解析 JSON 请求体。`createFastifyHandler` 发现 `request` 上有 `body` 属性时，直接把它作为 Web `Request` 的请求体：

```ts
const akoHandler = createFastifyHandler(createAkoHandler(runtime), {
    maxBodyBytes: 1024 * 1024,
})
```

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `maxBodyBytes` | `1048576`（1 MiB） | 适配器自己读取原始 stream 时允许的最大字节数 |

`maxBodyBytes` 只在请求对象上没有 `body` 属性、需要读取原始 stream 时生效。Fastify 已经解析过的请求体，大小由 Fastify 自己的 `bodyLimit` 控制；之后 `AkoRuntime` 还会按自己的 `maxBodyBytes` 再检查一次。

`createFastifyRawHandler` 接受同样的选项，处理请求体的方式也和 `createFastifyHandler` 相同，区别只在于它把响应直接写进 `reply.raw`：

```ts
const rawAkoHandler = createFastifyRawHandler(createAkoHandler(runtime))
```

普通 JSON 接口优先使用 `createFastifyHandler`，这样 Fastify 的 serializer 和生命周期钩子仍然有效。

## 以插件组织

如果应用按 Fastify 插件拆分模块，可以把运行时和请求处理函数放在插件内部：

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

运行时在应用启动时创建一次即可，不要在每个请求里重新注册模型或连接数据库。

## 错误处理

请求处理函数返回的 `Response` 已经带有协议状态码和 JSON 响应体。适配器自身的错误（例如读取 stream 时请求体过大，会抛出状态码为 `413` 的 `AkoError`）会抛给 Fastify，由 `setErrorHandler` 统一处理：

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

## 在 Nest 中使用

Nest 使用 Fastify 适配器时，把 Ako 请求处理函数注册到底层 Fastify 实例的路由上。认证和模型授权仍然放在 `AkoRuntime` 和 Repository 中；Nest guard 可以提前拒绝请求，但不能代替模型级授权。

## 常见问题

- `request.body` 已解析但内容为空：检查 Fastify 的 content type parser 和请求的 `Content-Type`。
- 响应内容被二次 JSON 编码：不要在外面再对 Ako 的 `Response` 调用 `JSON.stringify`。`createFastifyHandler` 会把已经编码好的 JSON 当作文本发送。
- 使用 `reply.raw` 后响应挂起：确认用的是 `createFastifyRawHandler`，并且没有再调用 `reply.send`。

## 延伸阅读

- [Express 接入](/backend/javascript/express)
- [Web 框架、鉴权与安全](/backend/javascript/controllers)
- [Prisma 接入](/backend/javascript/prisma)
