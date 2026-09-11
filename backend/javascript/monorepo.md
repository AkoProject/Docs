---
title: Monorepo 与 package
description: Ako JavaScript Monorepo 的 workspace 结构、依赖边界和单包构建方式。
---

# Monorepo 与 package

JavaScript 侧在独立仓库 [`AkoProject/JavaScript`](https://github.com/AkoProject/JavaScript) 中采用 Yarn Monorepo，把协议核心与各个适配器拆为独立 package。用户只安装自己使用的 Web 框架、ORM 和对应 Ako adapter，避免一个集成包把其他生态带入应用。

## Workspace 结构

```text
JavaScript/
├── modules/
│   ├── core/       @ako-dev/ako-js
│   ├── memory/     @ako-dev/ako-js-memory
│   ├── node/       @ako-dev/ako-js-node
│   ├── bun/        @ako-dev/ako-js-bun
│   ├── express/    @ako-dev/ako-js-express
│   ├── fastify/    @ako-dev/ako-js-fastify
│   ├── hono/       @ako-dev/ako-js-hono
│   ├── koa/        @ako-dev/ako-js-koa
│   ├── prisma/     @ako-dev/ako-js-prisma
│   ├── drizzle/    @ako-dev/ako-js-drizzle
│   ├── typeorm/    @ako-dev/ako-js-typeorm
│   └── sequelize/  @ako-dev/ako-js-sequelize
├── test/
└── package.json
```

## 依赖关系

```text
@ako-dev/ako-js
├── @ako-dev/ako-js-memory
├── @ako-dev/ako-js-node
│   ├── @ako-dev/ako-js-express
│   ├── @ako-dev/ako-js-fastify
│   └── @ako-dev/ako-js-koa
├── @ako-dev/ako-js-bun
├── @ako-dev/ako-js-hono
├── @ako-dev/ako-js-prisma
├── @ako-dev/ako-js-drizzle
├── @ako-dev/ako-js-typeorm
└── @ako-dev/ako-js-sequelize
```

Web 框架和 ORM 都是对应 adapter 的可选 peer dependency。core 不导入 Node、Express、Fastify、数据库驱动或 ORM；Fetch 风格的 Hono/Bun 也不会因为使用 core 而得到 Node bridge。

## 应用项目的安装方式

按实际技术栈安装：

```bash
# Express + Sequelize
yarn add @ako-dev/ako-js @ako-dev/ako-js-express @ako-dev/ako-js-sequelize express sequelize

# Fastify + Prisma
yarn add @ako-dev/ako-js @ako-dev/ako-js-fastify @ako-dev/ako-js-prisma fastify @prisma/client

# Hono + Drizzle + Bun
bun add @ako-dev/ako-js @ako-dev/ako-js-hono @ako-dev/ako-js-drizzle @ako-dev/ako-js-bun hono drizzle-orm
```

业务项目从独立入口导入：

```ts
import { AkoRuntime, createAkoHandler } from '@ako-dev/ako-js'
import { createFastifyHandler } from '@ako-dev/ako-js-fastify'
import { createPrismaRepository } from '@ako-dev/ako-js-prisma'
```

不要从 Monorepo 相对路径导入 `modules/*/src`；发布后应用只依赖 package 的 `exports` 和声明文件。

## 本地开发命令

克隆 JavaScript 仓库后，在仓库根目录执行：

```bash
yarn install
yarn typecheck
yarn build
yarn test
```

根 `build` 会先构建 `@ako-dev/ako-js`，再按依赖顺序构建所有 adapter。可以只构建或检查一个包：

```bash
yarn workspace @ako-dev/ako-js build
yarn workspace @ako-dev/ako-js-sequelize typecheck
yarn workspace @ako-dev/ako-js-express build
```

每个 package 都有独立的 `test/` 和 `test` script，可以单独运行：

```bash
yarn workspace @ako-dev/ako-js test
yarn workspace @ako-dev/ako-js-memory test
yarn workspace @ako-dev/ako-js-sequelize test
```

根 `yarn test` 只负责按依赖顺序汇总调用这些独立测试，不再维护一个集中的根测试目录。测试从 workspace package 名称或包自己的入口导入，确保解析方式与用户安装发布包后的方式一致。

## 发布边界

每个 package 都有自己的 `package.json`、`exports`、版本号和依赖声明，可以独立发布。发布时应保持同一版本线，并先发布 core 或确保各 adapter 的 core 依赖版本已经存在。

应用如果只使用 `@ako-dev/ako-js-sequelize`，仍然需要显式安装 `@ako-dev/ako-js`，因为 adapter 的 core 依赖属于协议运行时；但不需要安装 Prisma、Drizzle、TypeORM 或其他 Web adapter。

## 为什么不做一个全量包

Node.js Web 框架和 ORM 的版本、运行时、打包方式和 peer 依赖差异很大。拆包可以让：

- Fetch runtime 不携带 `node:http` 类型和实现。
- Express/Fastify/Koa 共享 Node bridge，但不互相依赖。
- Prisma/Drizzle/TypeORM/Sequelize 的适配器可以独立演进。
- 用户在升级某个 ORM adapter 时，不会无意升级整个 Ako 生态。
- 自定义 ORM 只需要依赖 core，实现自己的 `AkoRepository`。

各 package 的使用方式见 [适配器总览](/backend/javascript/adapters)，具体框架页面在左侧以一级入口列出。
