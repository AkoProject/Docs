---
title: Ako 是什么
description: Ako 业务快速启动框架的定位、核心概念与适用场景。
---

# Ako 是什么

Ako 是一个面向业务管理后台的快速启动框架。它把“后台页面长什么样”从前端手工编写，移动到后端的模型与字段声明中：后端暴露模型元数据，前端根据元数据生成菜单、搜索区、数据表格、编辑表单和操作按钮。

一句话理解：

> 后端声明业务模型，Ako 前端把声明渲染成管理页面。

## 它解决什么问题

大多数内部管理后台会反复出现相同的页面结构：查询条件、分页表格、新增/编辑表单、删除按钮、枚举显示和关联选择。Ako 把这部分重复工作抽成协议和默认渲染器，让业务代码主要关注模型、权限和业务操作。

<div class="ako-status-grid">
  <div class="ako-status-card">
    <strong>后端负责事实</strong>
    <span>模型、字段类型、显示名称、查询能力、校验规则与业务按钮。</span>
  </div>
  <div class="ako-status-card">
    <strong>协议负责边界</strong>
    <span>菜单、元数据、分页查询、保存、删除和鉴权接口的 JSON 形状。</span>
  </div>
  <div class="ako-status-card">
    <strong>前端负责体验</strong>
    <span>把元数据组合成 Vue 页面，并允许替换组件、类型提供者与视觉细节。</span>
  </div>
</div>

## 核心概念

| 概念 | 含义 |
| --- | --- |
| Model | 一个可被 Ako 识别的业务模型，例如“学生”“订单”或“商品”。 |
| Field | 模型中的字段，同时携带名称、类型、查询、列表和编辑信息。 |
| Metadata | Model 与 Field 的协议表示，前端不需要知道后端使用什么 ORM。 |
| Node | 前端注册的页面或字段组件名称，元数据用字符串引用它。 |
| Type provider | 一种字段类型在搜索、表格、编辑三个场景下的前端渲染器，以及后端产生的选项数据。 |
| Adapter | 把某种语言、数据库或 Web 框架接入 Ako 协议的后端实现。 |

## 页面是怎样生成的

默认前端会沿着下面的关系组装页面：

```text
GET /menu/list/{channel}
        │
        ├── menus  → 侧边栏分组与自定义页面
        └── models
              │
              ├── modelButtons  → 页面级按钮
              ├── fields.search  → 搜索表单
              ├── fields.column  → 表格列
              ├── fields.edit    → 编辑表单
              └── operateButtons → 行级按钮
```

每次进入模型页面后，前端再调用 `model/page/{model}` 读取数据与字段关联信息；用户保存或删除时调用同一模型的 `save` 与 `delete` 接口。完整的接口形状见 [交互规则](/protocol/http-api)。

## Ako 不是什么

- Ako 不是数据库 ORM。ORM、事务和查询实现属于后端适配器。
- Ako 不是固定的 JVM 框架。当前官方仓库只提供 JVM 方向的实现，协议本身不限制语言。
- Ako 不是无条件的低代码平台。复杂业务仍然需要后端控制器、权限和领域逻辑；Ako 主要消除标准管理页面的样板代码。
- Ako 的前端校验和按钮脚本不能替代后端安全校验。任何来自浏览器的参数都必须在后端重新验证。

## 当前实现

当前文档以两个源码仓库为依据：

- 前端：[`AkoProject/Frontend`](https://github.com/AkoProject/Frontend)，Vue 3 + Element Plus，包名为 `@ako-dev/ako`。
- JVM：[`AkoProject/JVM`](https://github.com/AkoProject/JVM)，包含协议核心、JPA 基础模型、`ako-rain` 和 `ako-spring` 框架适配。
- Rain：[`Rain JVM 文档`](https://rain.icecreamqaq.com/)，负责 `ako-rain` 所依赖的应用生命周期、控制器、SmartWeb 与 SmartAccess 生态。
- Spring：[`Spring Boot 文档`](https://docs.spring.io/spring-boot/docs/current/reference/html/)，`ako-spring` 已提供 Boot 2/3/4 自动配置和 Spring Data JPA 适配；具体模块组合见 [后端（JVM）项目创建](/backend/rain/project)。

## 下一步

- 想快速看到完整链路：阅读 [快速开始](/guide/quick-start)。
- 想实现自己的后端：先读 [Ako 协议](/protocol/overview)，再看 [后端实现概览](/backend/overview)。
- 已经使用 Rain 或 Spring Boot：直接进入 [后端（JVM）项目创建](/backend/rain/project)。
- 想改造页面：阅读 [前端配置](/frontend/configuration)、[mixin 使用方法](/frontend/mixins) 与 [使用 Ako View 构建页面](/frontend/views)。
