---
title: 项目创建与启动
description: 安装 Ako JavaScript 后端，并用 Node.js 或 Bun 启动请求处理函数。
---

# 项目创建与启动

JavaScript 版的代码在独立仓库 [`AkoProject/JavaScript`](https://github.com/AkoProject/JavaScript) 中，是一个基于 Yarn workspaces 的 TypeScript Monorepo。核心运行时、Web 适配器、ORM 适配器和内存 Repository 都是独立的包，可以单独安装。

## 环境要求

- Node.js 18 或更高版本。
- Yarn 1.x，锁文件为 `yarn.lock`。
- 可选：Bun 1.1 或更高版本。

进入项目目录，安装 workspace 依赖：

```bash
cd JavaScript
yarn install
```

根项目只负责 workspace 管理和构建。业务项目只需安装自己用到的 Ako 包，其他 Web 框架和 ORM 不会进入依赖树。

## 选择需要的包

| 需求 | Ako 包 |
| --- | --- |
| 核心运行时、schema 和接口处理 | `@ako-dev/ako-js` |
| Node 原生 HTTP | `@ako-dev/ako-js-node` |
| Bun 原生服务 | `@ako-dev/ako-js-bun` |
| Express / Fastify / Hono / Koa | `@ako-dev/ako-js-express` / `@ako-dev/ako-js-fastify` / `@ako-dev/ako-js-hono` / `@ako-dev/ako-js-koa` |
| Prisma / Drizzle / TypeORM / Sequelize | `@ako-dev/ako-js-prisma` / `@ako-dev/ako-js-drizzle` / `@ako-dev/ako-js-typeorm` / `@ako-dev/ako-js-sequelize` |
| 测试和原型 | `@ako-dev/ako-js-memory` |

例如只用 Express 和 Sequelize：

```bash
yarn add @ako-dev/ako-js @ako-dev/ako-js-express @ako-dev/ako-js-sequelize express sequelize
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `yarn typecheck` | 检查所有包的类型。为了解析跨包的类型声明，会先构建核心包和 Node 桥接。 |
| `yarn build` | 按依赖顺序构建核心包和其余所有包。 |
| `yarn workspace @ako-dev/ako-js-sequelize build` | 只构建指定的一个适配器包。 |
| `yarn test` | 按依赖顺序依次运行每个包自己的测试，各包测试前会先构建自身。 |

## Node.js 最小服务

下面的例子用自带的内存 Repository，先确认菜单、分页、编辑和删除都能走通。换成真实项目时，只需替换 Repository，请求处理函数和前端接口都不用改。

```ts
import {
    AkoRuntime,
    createAkoHandler,
    defineField,
    defineModel,
} from '@ako-dev/ako-js'
import { createMemoryRepository } from '@ako-dev/ako-js-memory'
import { createNodeServer } from '@ako-dev/ako-js-node'

type Student = {
    id: number
    name: string
}

const studentModel = defineModel<Student, number>({
    id: 'Student',
    name: '学生',
    repository: createMemoryRepository<Student, number>([
        { id: 1, name: 'Alice' },
    ]),
    fields: [
        defineField({
            id: 'id',
            name: '编号',
            nullable: false,
            editable: false,
        }),
        defineField({
            id: 'name',
            name: '姓名',
            nullable: false,
        }),
    ],
})

const runtime = new AkoRuntime({
    models: [studentModel],
})
const handler = createAkoHandler(runtime)
const server = createNodeServer(handler)

server.listen(3000)
```

启动后可以这样验证：

```bash
curl http://localhost:3000/api/ako/auth/isAuth
curl http://localhost:3000/api/ako/menu/list/manager
curl -X POST http://localhost:3000/api/ako/model/page/Student \
    -H 'Content-Type: application/json' \
    -d '{"page":1,"size":20,"params":{},"sort":{}}'
```

`basePath` 默认为 `/api/ako`，和 Vue 前端默认的 `baseUrl` 一致。也可以在创建运行时时修改：

```ts
const runtime = new AkoRuntime({
    basePath: '/admin/ako',
    models: [studentModel],
})
```

如果反向代理已经去掉了路径前缀，可以把 `basePath` 设为空字符串，请求处理函数会直接按完整请求路径匹配。

## Bun 启动

Bun 原生支持 Fetch API，直接接收 `Request`、返回 `Response`，不需要 Node `http` 桥接：

```ts
import { serveWithBun } from '@ako-dev/ako-js-bun'

serveWithBun(handler, {
    port: 3000,
})
```

`@ako-dev/ako-js-bun` 只在调用 `serveWithBun` 时才读取 `globalThis.Bun`，所以在 Node 中导入它不会加载任何 Bun 专用模块。

## 接入 Fetch 风格的 Web 框架

只要框架能提供 Web 标准的 `Request`、并接受 `Response` 作为返回值，就可以直接调用：

```ts
const response = await handler(request)
return response
```

日志、CORS、压缩、限流和错误上报仍交给框架自己的中间件，不要写进模型定义。Ako 的请求处理函数只处理 `/api/ako` 下的路由。

如果框架只提供 Node 风格的 `req`/`res`，有以下几种做法：

1. 用 `createNodeServer(handler)` 单独起一个服务。
2. 在框架的适配器中把请求转换成 Web `Request`，再把 `Response` 写回。
3. 让框架自己的认证中间件先解析 cookie 或 token，`auth.isAuthenticated` 和 `authorize` 只读取解析结果。

Express、Fastify、Hono、Koa 以及 Prisma、Drizzle、TypeORM、Sequelize 的具体用法见 [适配器总览](/backend/javascript/adapters)。

## 请求路由

核心请求处理函数提供以下路由：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `auth/isAuth` | 返回当前请求是否已认证。 |
| POST | `auth/login` | 调用宿主应用提供的登录钩子。 |
| GET | `menu/list/{channel}` | 返回自定义菜单和有权访问的模型。 |
| POST | `model/page/{model}` | 解析分页、过滤和排序，然后调用 Repository。 |
| POST | `model/save/{model}` | 鉴权，执行保存前后的钩子，调用 Repository 保存。 |
| POST | `model/delete/{model}` | 鉴权，转换 ID，调用 Repository 删除。 |

各接口完整的 JSON 结构见 [交互规则](/protocol/http-api)。

## 开发建议

建议先用 `createMemoryRepository` 把前端接口跑通，再把 `repository` 换成实际的 ORM 适配器。这样出了问题，很容易分清是接口用法不对，还是数据库查询有误：

- 菜单不显示：检查模型的 `expose`、`authorize`，以及 `defineModel` 中的字段。
- 分页返回 400：检查请求体中的字段名、操作符、排序方向和分页大小。
- 分页返回 500：检查 Repository 是否返回了 `{ total, entities }`，以及实体序列化是否出错。
- 关联字段不显示名称：检查 `mappingField` 的目标模型、目标字段，以及 Repository 的 `list` 实现。
