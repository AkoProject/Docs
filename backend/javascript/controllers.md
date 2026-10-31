---
title: Web 框架、鉴权与安全
description: 把 Ako JavaScript 的请求处理函数接入 Node 或 Bun 上的 Web 应用，并配置认证、授权、错误处理和安全措施。
---

# Web 框架、鉴权与安全

Ako JavaScript 把整个 Web 层归结为一个函数：

```ts
type AkoHandler = (request: Request) => Promise<Response>
```

所以核心包不管端口、路由表、session 和中间件。请求怎样进入请求处理函数由宿主应用决定，处理完后再把 Ako 的响应交还给宿主。

## Node `http`

Node 适配器负责在 `IncomingMessage`、`ServerResponse` 和 Web 标准对象之间转换：

```ts
import { createNodeServer } from '@ako-dev/ako-js-node'

const server = createNodeServer(handler, {
    maxBodyBytes: 1024 * 1024,
})

server.listen(3000)
```

运行时本身也有一个 `maxBodyBytes` 限制，两者默认都是 1 MiB。如果改了运行时的限制，Node 适配器也要传入相同的值：

```ts
const maxBodyBytes = 4 * 1024 * 1024
const runtime = new AkoRuntime({
    models,
    maxBodyBytes,
})
const server = createNodeServer(createAkoHandler(runtime), {
    maxBodyBytes,
})
```

Node 适配器读取请求体，构造出 Web `Request`，再把 Web `Response` 的状态码、响应头和响应体写回 Node 响应。只有这个适配器会用到 `node:http`，模型和 Repository 都不需要导入 Node 模块。

## Bun

Bun 原生使用 Fetch 风格的请求处理函数：

```ts
import { serveWithBun } from '@ako-dev/ako-js-bun'

serveWithBun(handler, {
    hostname: '127.0.0.1',
    port: 3000,
})
```

Bun 适配器在调用时才通过 `globalThis.Bun` 获取 Bun 运行时，不会把 Bun 的类型或模块带进核心包的构建产物。Node 项目保留这个 import 也没问题，只要不在 Node 中调用 `serveWithBun`。

Express、Fastify、Hono、Koa 和 Nest 的接入方式见 [适配器总览](/backend/javascript/adapters)。Nest 通常直接复用它底层的 Express 或 Fastify 适配器；Hono 则可以直接返回 Ako 请求处理函数生成的 `Response`。

## 认证

认证逻辑由宿主应用通过 `auth` 提供：

```ts
const runtime = new AkoRuntime({
    models,
    auth: {
        async isAuthenticated(request) {
            return request.headers.get('authorization') === 'Bearer demo-token'
        },
        async login({ data }) {
            if (data.username !== 'demo' || data.password !== 'demo') {
                throw unauthorized('用户名或密码错误')
            }
            // 真实应用应在这里交由宿主框架创建 session 或 token。
        },
    },
})
```

`auth/isAuth` 返回一个布尔值。`menu`、`page`、`save`、`delete` 在未通过认证时返回 `401`。`login` 没有返回值时响应 `204`，有返回值时把它作为 JSON 返回。Ako 不保存登录状态，也不会去猜 cookie、JWT 或 OAuth 的格式。

如果 Express、Fastify 或 Nest 的中间件已经完成了认证，`isAuthenticated` 只需读取请求头或宿主附加的上下文。要把用户对象传给 Repository，可以用闭包、按请求创建的上下文，或宿主框架提供的请求级存储（request-local storage）。用户信息不要放进前端的请求体。

## 模型授权

每个模型都可以声明 `authorize`，菜单、分页、保存、删除这四种操作都会调用它：

```ts
const studentModel = defineModel<Student, number>({
    id: 'Student',
    name: '学生',
    repository: studentRepository,
    authorize: async ({ action, request }) => {
        const user = await currentUser(request)
        if (!user) {
            return false
        }
        if (action === 'menu' || action === 'page') {
            return user.permissions.includes('student:read')
        }
        return user.permissions.includes('student:write')
    },
    fields: studentFields,
})
```

返回 `false` 时请求得到 `403`。抛出 `status` 为 `401` 或 `403` 的错误，效果和返回 `false` 相同。菜单接口会把无权访问的模型过滤掉；分页、保存和删除则直接拒绝请求。`authorize` 只判断能否执行某个 Ako 操作，行级、租户级和字段级的权限仍要在 Repository 或领域服务里再检查一遍。

## 错误响应

核心包的错误响应格式统一如下：

```json
{
    "error": {
        "code": "bad_request",
        "message": "Unknown query field 'password' for model 'Student'"
    }
}
```

常见状态码：

| 状态码 | 场景 |
| --- | --- |
| `400` | JSON、分页参数、字段、操作符、排序或 ID 无效。 |
| `401` | `auth.isAuthenticated` 返回 `false`。 |
| `403` | 模型的 `authorize` 拒绝了当前操作。 |
| `404` | 路由、模型或关联目标不存在。 |
| `405` | 路径存在，但 HTTP 方法不对。 |
| `413` | 请求体超过 `maxBodyBytes`。 |
| `500` | Repository 或业务代码抛出了未处理的异常。 |

对于未知异常，默认只返回 `Internal server error`，不会把堆栈、SQL、数据库路径或凭据暴露给浏览器。`onError` 可以用来接入宿主应用的日志和错误上报。它只处理 `AkoError` 以外的异常，上表中的 4xx 错误不会经过它：

```ts
const runtime = new AkoRuntime({
    models,
    onError(error, request) {
        logger.error({ error, url: request.url }, 'Ako request failed')
        return new Response(
            JSON.stringify({ error: { code: 'internal_error', message: '服务暂时不可用' } }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            },
        )
    },
})
```

## 安全检查清单

上线到生产环境前，至少确认以下几点：

- `expose: false` 的内部模型不出现在菜单中，也无法通过模型路由访问。
- `serializeEntity` 不会返回密码、密钥、租户内部信息或数据库对象。
- Repository 对模型、字段、操作符、排序方向和 ID 都有白名单。
- `page`、`save`、`delete` 每个请求都做认证和授权，而不只是在菜单里隐藏入口。
- `save` 在服务端重新校验数据，不把 `edit.validate` 当作业务规则。
- `delete` 限制批量删除的数量，检查每个 ID 的权限，并正确处理软删除。
- `parseId` 能拒绝格式错误的 UUID、大整数或 ORM ID。
- `like`、`in`、日期和 `NULL` 的行为已经针对所用的 ORM 适配器测试过。
- 事务、审计、限流、CORS、CSRF 和 session 生命周期由宿主 Web 应用负责。
- 按钮的 URL 和 `eval` 即使来自可信的后端元数据，服务端也必须照常授权。

## 相关文档

这里介绍的只是后端的一种 JavaScript 实现。需要和其他语言的后端互通时，先读 [交互规则](/protocol/http-api)；需要设计新的字段结构时，读 [模型定义](/protocol/metadata) 和 [字段类型与选项](/protocol/types)。
