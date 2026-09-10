---
title: 阅读路线与边界
description: Ako 当前实现范围、成熟度和已知限制。
---

# 阅读路线与边界

Ako 仍处于持续开发阶段。本文档把“已经能运行”“协议可以实现”和“正在推进”分开描述，避免把未来设计误读成当前能力。

## 实现状态

| 方向 | 状态 | 说明 |
| --- | --- | --- |
| Vue 3 前端 | 可用 | `@ako-dev/ako` 已提供默认管理后台、内置类型和扩展入口。 |
| Ako 协议 | 可实现 | HTTP 合约独立于后端语言；详细字段以本仓库协议文档为准。 |
| JVM 核心 | 已实现 | 模型元数据、字段类型、按钮和分页响应位于 `ako-core`。 |
| JVM + JPA | 已实现 | 提供 JPA 基础模型、查询与软删除能力。 |
| `ako-rain` | 当前 JVM 主实现 | 已接入 Rain、SmartWeb 与 SmartAccess；本文的 JVM 快速开始以它为准。 |
| `ako-spring` | 推进中 | 源码目录有雏形，但当前根构建未启用，不能按稳定适配器宣传。 |
| 其他语言/框架 | 协议层可实现 | 暂无本仓库提供的官方适配器，需要自行实现 HTTP、元数据和数据访问。 |

## 推荐阅读顺序

### 只想使用管理后台

1. [前端开始方式](/frontend/quick-start)
2. [前端配置](/frontend/configuration)
3. [前端工具](/frontend/tools)
4. [使用 Ako View 构建页面](/frontend/views)

### 使用 `ako-rain`

1. [项目创建](/backend/rain/project)
2. [开始](/backend/rain/quick-start)
3. [实体模型](/backend/rain/models)
4. [注解功能](/backend/rain/annotations)
5. [前端联动](/backend/rain/frontend)

### 实现其他后端

1. [Ako 协议](/protocol/overview)
2. [交互规则](/protocol/http-api)
3. [模型定义](/protocol/metadata)
4. [字段类型与选项](/protocol/types)
5. [按钮与操作](/protocol/buttons)

## 当前限制与容易踩坑的地方

- 当前默认前端从第 1 页开始请求；适配器应按 1-based page 解释分页参数。
- JVM Rain 适配器的删除接口已经按字符串 ID 设计，以支持非整数主键；前端类型声明仍偏向 `number`，接入 UUID 时应自行修正类型或保证序列化安全。
- `menu/list/{channel}` 的路径包含 channel，但当前 JVM 核心的菜单汇总逻辑不会按 channel 过滤；需要多租户或多后台时，应在适配器或前端 `mixin` 层实现隔离。
- 当前 JVM 模型发现依赖 Access 接口和扫描范围；模型类写好但没有对应 Access 或没有被扫描时，不会进入 `models`。
- `@DefaultSort` 已存在于 JVM 注解定义中，但当前元数据转换链路没有把它应用到查询请求默认值，不能依赖它改变首次排序。
- Spring 模块的测试代码不能代表 `ako-spring` 已完成；以根项目是否启用模块和实际构建结果为准。

## 版本策略

源码中的版本仍可能变化。复制依赖时，不要把本文示例中的占位符直接当成发布版本；请同时查看 JVM 根项目和 `framework/rain/build.gradle.kts` 中的版本组合。Rain 自身也会演进，应用启动、扫描、SmartWeb 和 SmartAccess 的配置应以 [Rain 文档](https://rain.icecreamqaq.com/)为准。
