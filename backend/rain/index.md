---
title: 后端（JVM）
description: ako-rain 的运行机制、项目组成和完整使用路线。
---

# 后端（JVM）

`ako-rain` 是当前 Ako 唯一完整接通的 JVM 框架适配器。它把 Ako 核心协议接到 Rain 的应用生命周期、SmartWeb 控制器和 SmartAccess/JPA 数据访问上。

## 适合谁

- 已经使用 Rain，希望快速得到标准管理后台。
- 使用 Kotlin/JVM + JPA，需要统一的模型 CRUD 页面。
- 想参考一个完整适配器，按协议实现其他语言或框架。

Spring Boot 方向的目录仍在推进中，当前根构建没有启用；本组文档只把 `ako-rain` 当作可运行入口。

## 运行时如何工作

```text
Rain 启动
   │
   ├── 加载 ako-rain 模块配置
   ├── 注册 AkoRain ApplicationService / ClassRegister
   ├── 扫描并收集 AkoAccess 接口
   ├── 从 SmartAccess Bean 获取 Access 实例
   ├── Access → 模型类型 → DbModel 元数据
   └── IMenuController / IModelController 暴露 Ako HTTP 接口
```

`AkoRain` 初始化时把自己注册为 `AkoRuntime`，并在模型映射第一次使用时建立 `modelMap`。模型发现是惰性的，因此扫描包、Access 注册和 JPA 服务必须在第一次访问菜单/模型前完成。

## 一个业务模块由什么组成

```text
业务模型
  ├── JPA Entity + Ako 注解
  ├── AkoAccess / SoftDeleteAccess
  ├── 可选：普通 SmartWeb 业务控制器
  └── 由 AkoRain 转成 Model/Field/Button 元数据
```

推荐按下面顺序阅读：

1. [项目创建](/backend/rain/project)：依赖、目录和第一个 Rain 应用。
2. [开始](/backend/rain/quick-start)：启动器、配置、控制器和运行检查。
3. [实体模型](/backend/rain/models)：Entity、Access、字段和模型节点。
4. [注解功能](/backend/rain/annotations)：每个 Ako 注解的参数和实际效果。
5. [前端联动](/backend/rain/frontend)：模型声明如何变成前端页面。
6. [数据访问与事务](/backend/rain/data-access)：查询、保存、删除、软删除和基类。
7. [接入控制器](/backend/rain/controllers)：挂载菜单、模型和鉴权接口。
8. [内置工具](/backend/rain/tools)：应用代码可调用的 Rain/Ako 工具函数。

## 与 Rain 的职责边界

| 能力 | Rain/生态 | Ako/ako-rain |
| --- | --- | --- |
| 应用启动、扫描、DI、生命周期 | Rain Application、DI | 注册 `AkoRain` 服务 |
| HTTP 路由和参数绑定 | SmartWeb | 提供 `IMenuController`、`IModelController` |
| 数据库、JPA、查询、事务 | SmartAccess + Hibernate | `AkoRainModelContext` 映射分页和 CRUD |
| 管理后台页面描述 | — | `DbModel`、`DbField` 和按钮元数据 |
| Vue 页面渲染 | — | 前端 `@ako-dev/ako` |

需要理解 Rain 本身时，优先阅读 [Rain 快速开始](https://rain.icecreamqaq.com/guide/getting-started)、[DI 与配置](https://rain.icecreamqaq.com/modules/di)、[SmartWeb](https://rain.icecreamqaq.com/smartweb/) 和 [SmartAccess](https://rain.icecreamqaq.com/smartaccess/)。

## 当前版本注意

Ako 和 Rain 仍处于开发版本。版本号、包坐标和 SmartAccess 实现可能变化；使用前请以 JVM 根项目和 `framework/rain/build.gradle.kts` 的组合为准。不要把本页的示例占位符当成固定发布版本。
