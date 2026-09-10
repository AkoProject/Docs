---
title: 后端实现概览
description: Ako 后端适配器的分层方式，以及如何接入任意语言和框架。
---

# 后端实现概览

Ako 后端不是一个固定的 Controller + ORM 模板，而是一层协议适配。当前仓库提供 JVM 核心、`ako-rain` 和 `ako-spring` 实现；协议设计允许其他语言和框架提供同样的 HTTP 响应。

## 推荐分层

| 层 | 应该负责什么 | 是否属于 Ako 协议 |
| --- | --- | --- |
| 业务模型 | 字段、关系、业务规则、生命周期 | 否，适配器读取它 |
| 数据访问 | 查询、分页、保存、删除、事务 | 否 |
| Web/框架适配 | 路由、参数绑定、序列化、认证 | 否 |
| Ako adapter | 将上面能力转成 `menu` 与 `model` 接口 | 是连接点 |
| 前端渲染器 | 读取元数据并生成页面 | 协议消费者 |

一个适配器的核心不是复制 JVM 类名，而是稳定地产出：

```text
模型定义 ──> 元数据生成器 ──> menu/list
查询请求 ──> 字段/操作符白名单 ──> 数据访问层 ──> model/page
表单对象 ──> 权限 + 业务校验 + 事务 ──> save
ID 列表 ──> 权限 + 主键转换 + 事务 ──> delete
```

## 当前 JVM 组成

### `ako-core`

定义协议数据结构和模型元数据转换的基础接口，包括：

- `DbModel`、`DbField`。
- 搜索、表格、编辑信息。
- 枚举、关联、时间和自定义类型的 TypeProvider 接口。
- 模型按钮、行级按钮和操作面板。
- `ModelPageReq` 与 `ModelPageResp`。

### `ako-jpa`

提供 JPA 模型基础类和查询辅助。`CompleteModel` 组合了 ID、创建/更新时间和软删除字段；它是 JVM + JPA 方向的便利基类，不是协议要求。

### `ako-rain`

当前 JVM 主适配器。它通过 Rain 的扫描与 Bean 容器发现 `AkoAccess`，通过 SmartAccess/JPA 执行分页、查询、保存和删除，并把 Rain 控制器映射到 Ako 接口。

### `ako-spring`

当前实现由公共 Runtime、Boot 2/3/4 自动配置和可选的 Spring Data JPA 数据库模块组成。Boot 3/4 可使用 `ako-springboot-springdata`；Boot 2 由于 `javax.persistence` 与 `ako-jpa` 的 Jakarta API 不同，应使用公共 SPI 自定义 `AkoSpringDatabase`。

## 实现其他语言/框架

不需要实现 JVM 的 `Class`、注解或 `AkoAccess`。可以采用：

- 显式 schema 文件生成元数据。
- 结构体/类上的装饰器或注解生成元数据。
- 数据库 schema + 配置生成元数据。
- 手写 `models` JSON 和模型处理器。

最低可用路径是先只支持 `ako:text`：

1. `menu/list/{channel}` 返回一个模型和一个文本字段。
2. `model/page/{model}` 返回空分页或真实数据。
3. `model/save/{model}` 和 `model/delete/{model}` 返回 2xx。
4. 前端页面跑通后，再增加枚举、关联、校验和按钮。

协议详情见 [交互规则](/protocol/http-api)、[模型定义](/protocol/metadata) 和 [字段类型与选项](/protocol/types)。

## 后端适配器的安全基线

- 对模型、字段、操作符和排序方向建立白名单。
- 在 `page`、`save`、`delete` 每次请求中独立执行权限判断。
- 把前端传入的 ID 当作不可信数据，并按模型主键类型转换。
- 对 `save` 做服务端校验和审计；前端 `validate` 只改善交互。
- 对自定义按钮 URL 做同样的认证与授权，不因按钮来自元数据而放宽权限。
- 统一错误格式，避免返回 SQL、堆栈、凭据和内部路径。

## 与 Rain 的关系

`ako-rain` 依赖 Rain 的应用、控制器和数据访问生态。Rain 不绑定一种 HTTP 服务器或数据库，Ako 只在其上增加模型元数据与管理后台协议。需要理解扫描、启动、控制器和事务时，请参考 [Rain 框架介绍](https://rain.icecreamqaq.com/guide/introduction)、[SmartWeb](https://rain.icecreamqaq.com/smartweb/) 与 [SmartAccess](https://rain.icecreamqaq.com/smartaccess/)。
