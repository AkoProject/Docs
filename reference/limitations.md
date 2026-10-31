---
title: 常见问题与限制
description: Ako 开发版本的已知限制、问题排查顺序和安全提醒。
---

# 常见问题与限制

Ako 还处在开发阶段。遇到问题时，先看接口返回了什么，再判断问题出在前端渲染、后端适配器还是数据访问。

## 页面没有菜单

按顺序检查：

1. `auth/isAuth` 是否返回 JSON 布尔值。
2. `menu/list/{channel}` 是否返回 `{ "menus": [], "models": [] }` 这样的结构。
3. `baseUrl` 和后端路由拼起来后，是否多了或少了 `/`。
4. Rain 应用是否注册了 `AkoRain`，Spring 应用是否注册了 `AkoSpringRuntime`。
5. 模型的 Access 或 Repository，以及模型所在的包，是否在宿主框架的扫描范围内。
6. 当前用户是否有权限读取菜单和模型。

## 菜单里有模型，页面却没有字段

检查模型响应中的 `fields`：

- `column` 为 `null` 时，不显示表格列。
- `search` 为 `null` 时，不显示搜索项。
- `edit` 为 `null` 时，不显示编辑项。
- `type` 找不到对应的前端类型提供者时，会显示“无法定位 TypeProvider: {type}。”的提示。
- 自定义的 `pageNode`、`tableNode` 等组件必须已经注册到 Vue App。

## 分页数据不对

默认前端请求第 1 页时发送 `page: 1`，第 2 页发送 `page: 2`。后端适配器应把 `page` 当作从 1 开始的页码，再换算成自己的偏移量或页序号。每页条数由前端分页器决定，可选 10、20、50、100。

## 关联字段只显示 ID

关联类型除了字段上的 `type: "ako:mapping"` 和 `options`，还需要分页响应里的 `information`：

```json
{
  "information": {
    "ako:mapping": {
      "Group": [{ "id": 7, "name": "A 组" }]
    }
  }
}
```

如果只在实体里返回关联 ID，前端就拿不到展示名称所需的数据。

## JVM 后端没有发现模型

根据你用的实现逐项检查：

- Rain：Access 继承了 `AkoAccess<T, PK>` 或 `SoftDeleteAccess<T, PK>`，模型和 Access 都在 `rain.scanPackages` 范围内。
- Spring Data：Repository 继承了 `AkoJpaRepository` 或 `SoftDeleteAccess`，并且被 Spring Data 的 Repository 扫描到。
- Spring 自定义数据库：`AkoSpringDatabase.modelTypes` 包含该模型，且数据库实现已注册为 Spring Bean。
- 模型有可以识别的 ID 字段。
- Rain 的 `AkoRain` 能从 SmartAccess 拿到 JPA 服务；Spring 的 `AkoSpringRuntime` 能拿到 JPA 和事务相关的 Bean，或自定义数据库 Bean。
- 宿主框架版本与源码要求的版本一致。

Rain 的扫描、Bean 和启动生命周期见 [Rain 快速开始](https://rain.icecreamqaq.com/guide/getting-started) 和 [DI 与配置](https://rain.icecreamqaq.com/modules/di)；Spring 的 Bean、Repository 和 Boot 自动配置见 [项目创建](/backend/rain/project)。

## 保存或删除失败

检查实际发出的请求：

- 保存请求体就是模型对象本身，没有包成 `{ data: ... }`，除非你的适配器另有约定。
- 删除请求体是 ID 数组。
- UUID 和大整数不要在 JavaScript 里先转成 Number，否则会丢精度。
- 后端是否对该模型做了类型转换、授权、校验，并开启了事务。
- 默认 API 遇到非 2xx 状态码会抛出异常，遇到 `401` 会刷新页面。

## 已知限制

下面几条以撰写本文时的源码为准：

- `ako-rain` 和 `ako-spring` 是官方的两套 JVM 实现，两者接入数据访问和控制器的方式不同。
- `ako-springboot-springdata` 面向 Boot 3/4，使用 Jakarta Persistence。Boot 2 需要自己实现 `AkoSpringDatabase`，或使用其他兼容的数据实现。
- JVM 核心的 `@Permission`、`@Scene` 只有注解定义，元数据转换不会读取它们，`DbModel.permission` 始终为 `null`。授权要在后端自行实现。
- Rain 的 `ako.rain.access.SoftDeleteAccess` 在重写删除语句时，匹配的字符串是 `delete form`（源码中的拼写），标准的 `delete from ...` 语句不会被替换成 `update`。使用 Rain 软删除前，务必用集成测试确认实际执行的 SQL/HQL。Spring Data 版本则是显式写入 `deleteTime` 再保存，查询时自动过滤 `deleteTime` 不为 0 的记录。
- `@DefaultSort` 只有注解定义，元数据转换和查询都不读取它，无法改变首次查询的排序。请求没有带排序时，Spring Data 适配器按主键升序排列。
- `Menu.list(channel)` 在核心层不按 channel 过滤，总是返回全部模型。需要多后台隔离时，在适配器、网关或 `mixin` 中处理。
- 前端默认 UI 基于 Element Plus。不用 Element Plus 时，需要替换默认页面节点和相关样式。

## 安全提醒

下面这些能力会在浏览器中执行代码或发起请求：

- `FunctionValidate` 的 JavaScript 函数体
- `FetchValidate` 的远程校验 URL
- 按钮 `eval`
- 按钮 URL、Dialog 和自定义组件

只有元数据来源可信时，才应该启用这些能力。它们拿不到服务端的机密，也替代不了后端鉴权。涉及多租户、金额、批量删除和审计的操作，一律以服务端的判断为准。

## 如何报告问题

提交问题时，尽量附上：

1. 前端实际请求的 URL、状态码和脱敏后的响应。
2. `models` 中对应模型的元数据。
3. `model/page` 的请求体和响应体。
4. 所用的 Ako、Rain、SmartWeb、SmartAccess 和 JDK 版本。
5. 是否用了自定义类型提供者、页面节点或 `mixin`。

请勿上传密码、Cookie、Token、生产数据或未脱敏的用户信息。
