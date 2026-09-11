---
title: 项目创建与启动
description: 安装 Ako JavaScript 后端实验项目，并使用 Node.js 或 Bun 启动协议 handler。
---

# 项目创建与启动

本页介绍独立仓库 [`AkoProject/JavaScript`](https://github.com/AkoProject/JavaScript) 中的 TypeScript/Yarn Monorepo；核心运行时、Web adapter、ORM adapter 和内存 repository 都是可以单独安装的 package。

## 环境要求

- Node.js 18 或更高版本。
- Yarn 1.x；项目锁文件使用 `yarn.lock`。
- Bun 1.1 或更高版本是可选运行时。

进入项目并安装 workspace 依赖：

```bash
cd JavaScript
yarn install
```

根项目只负责 workspace 管理和构建；实际业务项目可以只安装自己使用的 Ako package，不需要把其他 Web 框架或 ORM 带进依赖树。

## 选择需要的 package

| 需求 | Ako package |
| --- | --- |
| 核心 Runtime、schema 和协议 | `@ako-dev/ako-js` |
| Node 原生 HTTP | `@ako-dev/ako-js-node` |
| Bun 原生 server | `@ako-dev/ako-js-bun` |
| Express / Fastify / Hono / Koa | `@ako-dev/ako-js-express` / `@ako-dev/ako-js-fastify` / `@ako-dev/ako-js-hono` / `@ako-dev/ako-js-koa` |
| Prisma / Drizzle / TypeORM / Sequelize | `@ako-dev/ako-js-prisma` / `@ako-dev/ako-js-drizzle` / `@ako-dev/ako-js-typeorm` / `@ako-dev/ako-js-sequelize` |
| 测试和原型 | `@ako-dev/ako-js-memory` |

例如只使用 Express 与 Sequelize：

```bash
yarn add @ako-dev/ako-js @ako-dev/ako-js-express @ako-dev/ako-js-sequelize express sequelize
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `yarn typecheck` | 检查所有 workspace package；为解析跨包声明会先构建 core 和 Node bridge。 |
| `yarn build` | 按依赖顺序构建 core 和所有 workspace package。 |
| `yarn workspace @ako-dev/ako-js-sequelize build` | 只构建一个指定 adapter package。 |
| `yarn test` | 构建所有 package 和根级集成测试，并运行 Node 测试用例。 |

## Node.js 最小服务

下面的例子使用项目自带的内存 repository，目的是先验证菜单、分页、编辑和删除链路。真实项目中只需要替换 repository，handler 和前端协议不变。

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

启动后可以检查：

```bash
curl http://localhost:3000/api/ako/auth/isAuth
curl http://localhost:3000/api/ako/menu/list/manager
curl -X POST http://localhost:3000/api/ako/model/page/Student \
    -H 'Content-Type: application/json' \
    -d '{"page":1,"size":20,"params":{},"sort":{}}'
```

默认 `basePath` 是 `/api/ako`，与现有 Vue 前端的默认 `baseUrl` 对应。也可以在 runtime 中修改：

```ts
const runtime = new AkoRuntime({
    basePath: '/admin/ako',
    models: [studentModel],
})
```

如果反向代理已经处理了路径前缀，可以将 `basePath` 设为空字符串，让 handler 按完整请求路径匹配。

## Bun 启动

Bun 通过 Fetch API 原生接收 `Request` 并返回 `Response`，因此不需要 Node `http` 桥接：

```ts
import { serveWithBun } from '@ako-dev/ako-js-bun'

serveWithBun(handler, {
    port: 3000,
})
```

`@ako-dev/ako-js-bun` 只在函数被调用时检查 `globalThis.Bun`，不会在 Node 导入核心包时加载 Bun 专用模块。

## 接入 Fetch 风格的 Web 框架

只要框架可以提供 Web 标准 `Request` 并接收 `Response`，就可以直接调用：

```ts
const response = await handler(request)
return response
```

框架自己的中间件仍然负责日志、CORS、压缩、限流和错误上报。不要把这些能力塞进模型定义；Ako handler 只处理 `/api/ako` 下的协议路由。

对于只提供 Node 风格 `req`/`res` 的框架，可以：

1. 使用 `createNodeServer(handler)` 作为独立服务。
2. 在框架 adapter 中把请求转换成 Web `Request`，再把 `Response` 写回去。
3. 让框架自己的认证中间件先完成 cookie/token 解析，`auth.isAuthenticated` 和 `authorize` 只读取解析结果。

Express、Fastify、Hono、Koa 以及 Prisma、Drizzle、TypeORM、Sequelize 的具体导入方式见 [适配器总览](/backend/javascript/adapters)。

## 请求路由

核心 handler 提供以下路径：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `auth/isAuth` | 返回当前请求是否已认证。 |
| POST | `auth/login` | 调用宿主提供的登录钩子。 |
| GET | `menu/list/{channel}` | 返回自定义菜单和可访问模型。 |
| POST | `model/page/{model}` | 解析分页、过滤、排序并调用 repository。 |
| POST | `model/save/{model}` | 执行鉴权、保存前后钩子和 repository 保存。 |
| POST | `model/delete/{model}` | 执行鉴权、ID 转换和 repository 删除。 |

协议字段的完整 JSON 形状见 [交互规则](/protocol/http-api)。

## 开发建议

先使用 `createMemoryRepository` 跑通前端协议，再把 `repository` 替换为实际 ORM adapter。这样可以把“协议错误”和“数据库查询错误”分开诊断：

- 菜单不显示：检查模型 `expose`、`authorize` 和 `defineModel` 的字段。
- 分页返回 400：检查请求体的字段名、操作符、排序方向和分页大小。
- 分页返回 500：检查 repository 是否返回 `{ total, entities }`，以及实体序列化是否安全。
- 关联字段没有名称：检查 `mappingField` 的目标模型、目标字段和 repository `list` 实现。
