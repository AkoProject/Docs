---
title: Ako 是什么
description: Ako 业务快速启动框架的定位、核心概念与适用场景。
---

# Ako 是什么

Ako 是一个帮你快速搭建管理后台的框架。管理页面长什么样，不再由前端一页页手写，而是由后端的模型和字段声明决定：后端返回模型元数据，前端据此生成菜单、搜索区、数据表格、编辑表单和操作按钮。

一句话概括：

> 后端声明业务模型，Ako 前端把声明渲染成管理页面。

## 它解决什么问题

内部管理后台里，同样的页面结构总在反复出现：查询条件、分页表格、新增和编辑表单、删除按钮、枚举显示、关联选择。Ako 把这些重复工作收进协议和默认渲染器，业务代码只需要关心模型、权限和业务操作。

<div class="ako-status-grid">
  <div class="ako-status-card">
    <strong>后端：描述业务</strong>
    <span>模型、字段类型、显示名称、查询方式、校验规则和业务按钮。</span>
  </div>
  <div class="ako-status-card">
    <strong>协议：约定接口</strong>
    <span>菜单、元数据、分页查询、保存、删除和鉴权接口的 JSON 结构。</span>
  </div>
  <div class="ako-status-card">
    <strong>前端：渲染页面</strong>
    <span>把元数据组合成 Vue 页面，组件、类型提供者和样式都可以替换。</span>
  </div>
</div>

## 核心概念

| 概念 | 含义 |
| --- | --- |
| 模型（Model） | Ako 能识别的一个业务对象，例如“学生”“订单”“商品”。 |
| 字段（Field） | 模型中的一个属性，带有名称、类型，以及它在搜索、列表和编辑中的配置。 |
| 元数据 | 模型和字段在协议中的 JSON 表示。前端只读元数据，不关心后端用的是什么 ORM。 |
| 页面节点 | 前端注册的页面或字段组件名，元数据用字符串引用它。 |
| 类型提供者 | 一种字段类型在搜索、表格、编辑三处的前端渲染组件，以及后端为它准备的选项数据。 |
| 适配器 | 把某种语言、数据库或 Web 框架接入 Ako 协议的后端实现。 |

## 页面是怎样生成的

默认前端按下面的结构组装页面：

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

进入某个模型页面后，前端调用 `model/page/{model}` 读取数据和关联字段的展示信息。用户保存或删除时，调用同一模型的 `save` 和 `delete` 接口。各接口的请求和响应格式见 [交互规则](/protocol/http-api)。

## Ako 管什么、不管什么

Ako 不提供 ORM。数据访问、事务和查询都由后端适配器负责。

Ako 也不绑定某种语言。前端的 Vue 3 实现已经可用；后端（JVM）有 `ako-rain` 和 `ako-spring` 两套实现；后端（JavaScript）是一个实验性实现。其他语言可以按协议自行实现。

Ako 主要消除标准管理页面的样板代码，并不是什么都能配置的低代码平台。复杂业务仍然要靠后端 Controller、权限和领域逻辑来完成。

最后，前端校验和按钮脚本只是交互上的便利。浏览器传来的任何参数，后端都必须重新校验。

## 源码仓库

本站内容以下列源码仓库和协议文档为准：

- 前端：[`AkoProject/Frontend`](https://github.com/AkoProject/Frontend)，基于 Vue 3 和 Element Plus，包名 `@ako-dev/ako`。
- 后端（JVM）：[`AkoProject/JVM`](https://github.com/AkoProject/JVM)，包含协议核心、JPA 基础模型，以及 `ako-rain`、`ako-spring` 两套框架适配。
- 后端（JavaScript）：[`AkoProject/JavaScript`](https://github.com/AkoProject/JavaScript)，使用 TypeScript 和 Yarn 编写，运行在 Node.js 或 Bun 上，通过适配器接入各种 ORM 和 Web 框架。
- Rain：[Rain JVM 文档](https://rain.icecreamqaq.com/)。`ako-rain` 依赖 Rain 提供的应用生命周期、控制器、SmartWeb 和 SmartAccess。
- Spring：[Spring Boot 文档](https://docs.spring.io/spring-boot/docs/current/reference/html/)。`ako-spring` 提供 Boot 2/3/4 自动配置和 Spring Data JPA 适配，模块怎么组合见 [后端（JVM）项目创建](/backend/rain/project)。

## 下一步

- 想尽快看到完整效果：阅读 [快速开始](/guide/quick-start)。
- 想实现自己的后端：先读 [Ako 协议](/protocol/overview)，再看 [后端实现概览](/backend/overview)。
- 已经在用 Rain 或 Spring Boot：直接进入 [后端（JVM）项目创建](/backend/rain/project)。
- 想用 Node.js 或 Bun 写后端：进入 [后端（JavaScript）](/backend/javascript/)。
- 想改造页面：阅读 [前端配置](/frontend/configuration)、[使用 mixin](/frontend/mixins) 和 [使用 Ako View 构建页面](/frontend/views)。
