---
title: Web 框架、鉴权与安全
description: 将 Ako JavaScript handler 接入 Node/Bun Web 应用，并配置认证、授权、错误和安全边界。
---

# Web 框架、鉴权与安全

Ako JavaScript 把 Web 层收敛为一个函数：

```ts
type AkoHandler = (request: Request) => Promise<Response>
```

因此核心不拥有端口、路由表、session 或中间件。宿主应用决定请求如何进入 handler，handler 再把 Ako 协议响应交回宿主。

## Node `http`

Node adapter 封装 `IncomingMessage` 和 `ServerResponse` 的差异：

```ts
import { createNodeServer } from '@ako-dev/ako-js-node'

const server = createNodeServer(handler, {
    maxBodyBytes: 1024 * 1024,
})

server.listen(3000)
```

核心 runtime 也有同样的 `maxBodyBytes` 限制。若修改了 runtime 的限制，Node adapter 应传入相同值：

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

Node adapter 会读取请求体、构造 Web `Request`，再将 Web `Response` 的状态码、headers 和 body 写回 Node 响应。`node:http` 只出现在这个 adapter 中，模型和 repository 不需要导入 Node 模块。

## Bun

Bun 原生使用 Fetch handler：

```ts
import { serveWithBun } from '@ako-dev/ako-js-bun'

serveWithBun(handler, {
    hostname: '127.0.0.1',
    port: 3000,
})
```

Bun adapter 通过 `globalThis.Bun` 延迟获取运行时，不把 Bun 类型或模块导入核心构建产物。Node 项目可以安全地保留这个 import，只要不在 Node 中调用 `serveWithBun`。

Express、Fastify、Hono、Koa 和 Nest 的接入方式见 [适配器总览](/backend/javascript/adapters)。Nest 通常复用它底层使用的 Express 或 Fastify adapter；Hono 则可以直接返回 Ako handler 的 `Response`。

## 认证边界

`auth` 是宿主应用提供的认证边界：

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
            // 真实应用在这里交给宿主框架创建 session 或 token。
        },
    },
})
```

`auth/isAuth` 会返回布尔值；`menu`、`page`、`save`、`delete` 在认证失败时返回 `401`。Ako 不保存登录状态，也不会猜测 cookie、JWT 或 OAuth 的格式。

如果认证已经由 Express/Fastify/Nest 中间件完成，`isAuthenticated` 可以读取请求头或宿主附加的上下文。需要把用户对象传给 repository 时，建议通过闭包、请求上下文 adapter 或宿主框架的 request-local storage 实现，而不是把用户信息写进前端请求体。

## 模型授权

每个模型都可以声明 `authorize`。它会在菜单、分页、保存和删除动作中分别执行：

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

返回 `false` 会产生 `403`。菜单会过滤掉不可访问模型；分页、保存和删除会直接拒绝。授权钩子只解决“是否可以执行 Ako 动作”，行级、租户级和字段级权限仍应在 repository/领域服务中再次检查。

## 协议错误

核心错误响应使用统一形状：

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
| `400` | JSON、分页、字段、操作符、排序或 ID 无效。 |
| `401` | `auth.isAuthenticated` 返回 `false`。 |
| `403` | 模型 `authorize` 拒绝当前动作。 |
| `404` | 路由、模型或关联目标不存在。 |
| `405` | 路径存在但 HTTP 方法不匹配。 |
| `413` | 请求体超过 `maxBodyBytes`。 |
| `500` | repository 或业务代码出现未处理异常。 |

未知异常默认只返回 `Internal server error`，不会把堆栈、SQL、数据库路径或凭据返回浏览器。可以通过 `onError` 接入宿主日志和错误上报：

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

接入生产应用前至少确认：

- `expose: false` 的内部模型不会出现在菜单，也不能通过模型路由访问。
- `serializeEntity` 不会返回密码、密钥、内部租户信息或数据库对象。
- repository 对模型、字段、操作符、排序方向和 ID 建立白名单。
- `page`、`save`、`delete` 都执行逐请求认证和授权，不只依赖菜单隐藏。
- `save` 重新执行服务端校验，不把 `edit.validate` 当作业务规则。
- `delete` 限制批量数量，检查每个 ID 的权限，并正确处理软删除。
- `parseId` 能拒绝格式错误的 UUID、大整数或 ORM ID。
- `like`、`in`、日期和 `NULL` 的语义已经在当前 ORM adapter 中测试。
- 事务、审计、限流、CORS、CSRF 和 session 生命周期由宿主 Web 应用负责。
- 按钮 URL 和 `eval` 即使来自可信后端元数据，也不能跳过服务端授权。

## 与现有协议文档的关系

本实现只提供一种 JavaScript 后端落地方式。需要跨语言互操作时，优先阅读 [交互规则](/protocol/http-api)；需要设计新的字段结构时，阅读 [模型定义](/protocol/metadata) 和 [字段类型与选项](/protocol/types)。
