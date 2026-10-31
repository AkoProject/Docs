---
title: 后端实现概览
description: Ako 后端适配器如何分层，现有的 JVM 与 JavaScript 实现，以及如何接入其他语言和框架。
---

# 后端实现概览

Ako 后端不是一套固定的 Controller + ORM 模板，而是一层协议适配：把已有的模型和数据访问能力转换成 Ako 协议要求的 HTTP 接口。现有的实现有两套：

- 后端（JVM）：`ako-core` 加上 `ako-rain`、`ako-spring` 两个适配器。
- 后端（JavaScript）：一个独立仓库中的 TypeScript 实验性实现。

只要能返回同样的 HTTP 响应，其他语言和框架也可以实现自己的后端。

## 推荐分层

| 层 | 负责什么 | 和 Ako 协议的关系 |
| --- | --- | --- |
| 业务模型 | 字段、关系、业务规则、生命周期 | 不属于协议，由适配器读取 |
| 数据访问 | 查询、分页、保存、删除、事务 | 不属于协议 |
| Web 框架 | 路由、参数绑定、序列化、认证 | 不属于协议 |
| Ako 适配器 | 把上面几层的能力转换成 `menu` 和 `model` 接口 | 与协议对接的地方 |
| 前端 | 读取元数据并生成页面 | 协议的使用方 |

适配器不需要照搬 JVM 的类名，关键是稳定地完成下面四件事：

```text
模型定义 ──> 元数据生成器 ──> menu/list
查询请求 ──> 字段/操作符白名单 ──> 数据访问层 ──> model/page
表单对象 ──> 权限 + 业务校验 + 事务 ──> save
ID 列表 ──> 权限 + 主键转换 + 事务 ──> delete
```

## JVM 实现

### `ako-core`

定义协议的数据结构，以及从模型类生成元数据的基础接口，包括：

- `DbModel`、`DbField`。
- 搜索、表格、编辑三处的展示信息。
- 枚举、关联、时间和自定义类型使用的类型提供者接口 `AkoTypeProvider`。
- 页面级按钮、行级按钮和操作面板。
- `ModelPageReq` 和 `ModelPageResp`。

### `ako-jpa`

提供 JPA 模型基类和查询辅助函数。`CompleteModel` 组合了 ID、创建/更新时间和软删除字段，是 JVM + JPA 场景下的便利基类，协议并不要求使用它。

### `ako-rain`

基于 Rain 的适配器。它通过 Rain 的类扫描和 Bean 容器找到业务中的 `AkoAccess` 接口，用 SmartAccess/JPA 完成分页、查询、保存和删除，并提供 `IMenuController`、`IModelController` 两个控制器接口，业务控制器实现它们就能暴露 Ako 接口。

### `ako-spring`

基于 Spring Boot 的适配器，由公共运行时模块、Boot 2/3/4 各自的自动配置模块，以及可选的 Spring Data JPA 数据库模块组成。Boot 3/4 可以直接使用 `ako-springboot-springdata`；Boot 2 使用的是 `javax.persistence`，与 `ako-jpa` 依赖的 Jakarta API 不兼容，需要通过公共 SPI 自己实现 `AkoSpringDatabase`。

## JavaScript 实现

[`AkoProject/JavaScript`](https://github.com/AkoProject/JavaScript) 是运行在 Node.js 和 Bun 上的 TypeScript 实验性实现，采用 Yarn Monorepo 组织。核心包 `@ako-dev/ako-js` 用显式 schema 生成 `DbModel`/`DbField`，并通过 `AkoRepository` 接口对接数据层。Web 框架和 ORM 的接入都拆成独立的包：

- Web 框架：Node `http`、Bun、Express、Fastify、Hono、Koa。
- 数据访问：Prisma、Drizzle、TypeORM、Sequelize，以及用于测试和原型的内存 Repository。

核心包本身不包含 ORM、Session 或事务实现，这些交给宿主应用。

建议按以下顺序阅读：[后端（JavaScript）](/backend/javascript/) → [Monorepo 与包结构](/backend/javascript/monorepo) → [项目创建与启动](/backend/javascript/project) → [模型与元数据](/backend/javascript/models) → [Repository 与数据访问](/backend/javascript/data-access) → [适配器总览](/backend/javascript/adapters)。

## 用其他语言或框架实现

不需要模仿 JVM 的 `Class`、注解或 `AkoAccess`。JavaScript 实现用的就是显式 schema 加 Repository 的方式。生成元数据的方式可以任选：

- 用显式的 schema 文件生成。
- 用结构体或类上的装饰器、注解生成。
- 用数据库 schema 加配置生成。
- 直接手写 `models` JSON 和对应的处理逻辑。

最快的做法是先只支持 `ako:text`：

1. `menu/list/{channel}` 返回一个模型，模型里只有一个文本字段。
2. `model/page/{model}` 返回空分页或真实数据。
3. `model/save/{model}` 和 `model/delete/{model}` 返回 2xx。
4. 前端页面能正常打开后，再逐步加上枚举、关联、校验和按钮。

协议细节见 [交互规则](/protocol/http-api)、[模型定义](/protocol/metadata) 和 [字段类型与选项](/protocol/types)。

## 安全基线

- 对模型、字段、操作符和排序方向建立白名单。
- `page`、`save`、`delete` 每次请求都单独做权限判断。
- 前端传来的 ID 一律视为不可信数据，并按模型的主键类型转换。
- `save` 要在服务端校验并记录审计日志；前端的 `validate` 只用来改善交互。
- 自定义按钮的 URL 同样要做认证和授权，不能因为按钮来自元数据就放宽权限。
- 统一错误格式，不要返回 SQL、堆栈、凭据和内部路径。

## 与 Rain 的关系

`ako-rain` 依赖 Rain 的应用、控制器和数据访问生态。Rain 本身不绑定某种 HTTP 服务器或数据库，Ako 只是在它之上增加了模型元数据和管理后台协议。想了解扫描、启动、控制器和事务，请参考 [Rain 框架介绍](https://rain.icecreamqaq.com/guide/introduction)、[SmartWeb](https://rain.icecreamqaq.com/smartweb/) 和 [SmartAccess](https://rain.icecreamqaq.com/smartaccess/)。
