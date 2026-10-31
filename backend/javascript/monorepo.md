---
title: Monorepo 与包结构
description: Ako JavaScript 仓库的 workspace 结构、包之间的依赖关系和单包构建方式。
---

# Monorepo 与包结构

JavaScript 版放在独立仓库 [`AkoProject/JavaScript`](https://github.com/AkoProject/JavaScript) 中，用 Yarn workspaces 管理。核心包和各个适配器拆成独立的包，应用只需安装自己用到的 Web 框架、ORM 和对应的 Ako 适配器，不会因为一个大而全的集成包把其他生态也带进来。

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
├── tsconfig.base.json
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

Web 框架和 ORM 都声明为对应适配器的可选 peer dependency。核心包不导入 Node、Express、Fastify、数据库驱动或 ORM。Hono 和 Bun 走 Fetch 风格的接口，只依赖核心包，不会顺带引入 Node 桥接。

## 在应用中安装

按实际技术栈选择：

```bash
# Express + Sequelize
yarn add @ako-dev/ako-js @ako-dev/ako-js-express @ako-dev/ako-js-sequelize express sequelize

# Fastify + Prisma
yarn add @ako-dev/ako-js @ako-dev/ako-js-fastify @ako-dev/ako-js-prisma fastify @prisma/client

# Hono + Drizzle + Bun
bun add @ako-dev/ako-js @ako-dev/ako-js-hono @ako-dev/ako-js-drizzle @ako-dev/ako-js-bun hono drizzle-orm
```

业务代码从各包的入口导入：

```ts
import { AkoRuntime, createAkoHandler } from '@ako-dev/ako-js'
import { createFastifyHandler } from '@ako-dev/ako-js-fastify'
import { createPrismaRepository } from '@ako-dev/ako-js-prisma'
```

请始终按包名导入，不要用相对路径引用 `modules/*/src`。发布后，应用只能依赖各包 `exports` 中声明的入口和类型声明文件。

## 本地开发

克隆仓库后，在根目录执行：

```bash
yarn install
yarn typecheck
yarn build
yarn test
```

根目录的 `build` 会先构建 `@ako-dev/ako-js`，再按依赖顺序构建其余适配器。也可以只构建或检查某一个包：

```bash
yarn workspace @ako-dev/ako-js build
yarn workspace @ako-dev/ako-js-sequelize typecheck
yarn workspace @ako-dev/ako-js-express build
```

每个包都有自己的 `test/` 目录和 `test` 脚本，可以单独运行：

```bash
yarn workspace @ako-dev/ako-js test
yarn workspace @ako-dev/ako-js-memory test
yarn workspace @ako-dev/ako-js-sequelize test
```

根目录的 `yarn test` 只是按依赖顺序依次调用这些测试，仓库根部没有集中的测试目录。测试代码通过 workspace 包名或包自身的入口导入，模块解析方式和用户安装发布包后一致。

## 发布

每个包都有自己的 `package.json`、`exports`、版本号和依赖声明，可以单独发布。目前所有包的版本都是 `0.0.0-dev.1`。发布时应保持同一版本线，并先发布核心包，或者确认各适配器依赖的核心包版本已经存在。

即使应用只用 `@ako-dev/ako-js-sequelize`，也要显式安装 `@ako-dev/ako-js`，因为接口逻辑和运行时都在核心包里。但不需要安装 Prisma、Drizzle、TypeORM 或其他 Web 适配器。

## 为什么不做一个全量包

Node.js 生态里的 Web 框架和 ORM 在版本、运行环境、打包方式和 peer 依赖上差别很大。拆包之后：

- Fetch 风格的运行环境不会带上 `node:http` 的类型和实现。
- Express、Fastify、Koa 共用 Node 桥接，但彼此不依赖。
- Prisma、Drizzle、TypeORM、Sequelize 的适配器可以各自演进。
- 升级某个 ORM 适配器时，不会连带升级整个 Ako 生态。
- 自定义 ORM 只需依赖核心包，自己实现 `AkoRepository`。

各包的用法见 [适配器总览](/backend/javascript/adapters)，具体框架的接入指南在左侧导航中列出。
