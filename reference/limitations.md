---
title: 常见问题与限制
description: Ako 当前开发版本的运行限制、排查顺序和安全提醒。
---

# 常见问题与限制

Ako 目前仍是开发版本。遇到问题时，先确认协议响应，再判断是前端渲染、后端适配还是数据访问问题。

## 页面没有菜单

按顺序检查：

1. `auth/isAuth` 是否返回 JSON 布尔值。
2. `menu/list/{channel}` 是否返回 `{ "menus": [], "models": [] }`。
3. `baseUrl` 和后端路由拼接后是否多了或少了 `/`。
4. Rain 应用的 `AkoRain`，或 Spring 应用的 `AkoSpringRuntime`，是否已注册。
5. 模型 Access/Repository 和模型包是否在宿主扫描范围内。
6. 当前用户是否有权限读取菜单和模型。

## 菜单有模型，但页面没有字段

检查模型响应中的 `fields`：

- `column` 为 `null` 时不会显示表格列。
- `search` 为 `null` 时不会显示搜索项。
- `edit` 为 `null` 时不会显示编辑项。
- `type` 没有对应的前端 TypeProvider 时，会显示无法定位类型的提示。
- 自定义 `pageNode`、`tableNode` 等必须已注册到 Vue App。

## 分页数据不对

默认前端第一页发送 `page: 1`，第二页发送 `page: 2`。后端适配器应保持 1-based 语义，再转换成自己的 offset/page index。默认页面大小来自前端分页器，常用值是 10、20、50、100。

## 关联字段显示 ID

关联类型不仅需要字段上的 `type: "ako:mapping"` 和 `options`，还需要分页响应中的 `information`：

```json
{
  "information": {
    "ako:mapping": {
      "Group": [{ "id": 7, "name": "A 组" }]
    }
  }
}
```

如果只返回实体中的关联 ID，前端没有展示名称所需的数据。

## JVM 后端下模型没有被发现

按所选实现检查：

- Rain：Access 继承了 `AkoAccess<T, PK>` 或 `SoftDeleteAccess<T, PK>`，模型和 Access 都处于 `rain.scanPackages` 范围。
- Spring Data：Repository 继承了 `AkoJpaRepository`/`SoftDeleteAccess`，并被 Spring Data Repository 扫描。
- Spring 自定义数据库：`AkoSpringDatabase.modelTypes` 包含模型，且数据库实现是 Spring Bean。
- 模型有可识别的 ID 字段。
- Rain 的 `AkoRain` 能从 SmartAccess 找到 JPA 服务；Spring 的 `AkoSpringRuntime` 能取得 JPA/事务或自定义数据库 Bean。
- 使用了和当前源码相匹配的宿主框架版本。

Rain 的扫描、Bean 与启动生命周期请参考 [Rain 快速开始](https://rain.icecreamqaq.com/guide/getting-started) 和 [DI 与配置](https://rain.icecreamqaq.com/modules/di)；Spring 的 Bean、Repository 与 Boot 自动配置请参考 [项目创建](/backend/rain/project)。

## 删除或保存失败

检查实际请求：

- 保存请求体是一个模型对象，不是包装成 `{ data: ... }` 的对象，除非你的适配器另有约定。
- 删除请求体是 ID 数组。
- UUID/大整数不要在 JavaScript 中先转换为不安全的 Number。
- 后端是否在对应模型上完成类型转换、授权、校验和事务。
- 默认 API 遇到非 2xx 会抛错；`401` 会刷新页面。

## 当前实现限制

- `ako-rain` 和 `ako-spring` 都是当前仓库的 JVM 实现；二者的数据访问和控制器接入方式不同。
- `ako-springboot-springdata` 面向 Boot 3/4 的 Jakarta Persistence；Boot 2 需要公共 SPI 或其他兼容的数据实现。
- JVM 核心的 `permission`、`Scene` 注解还不能替代实际授权系统。
- Rain 的 `ako.rain.access.SoftDeleteAccess` 当前源码重写规则包含 `delete form` 拼写，使用 Rain 软删除前必须用集成测试确认实际 SQL/HQL 行为；Spring Data 版本使用显式更新 `deleteTime` 的实现。
- `@DefaultSort` 已声明，但当前元数据转换没有把它应用到初次查询。
- `Menu.list(channel)` 当前不会在核心层按 channel 过滤；需要多后台隔离时，应在适配器、网关或 `mixin` 层明确处理。
- 当前前端默认 UI 基于 Element Plus；不使用 Element Plus 时，需要替换默认节点和相关样式。

## 安全提醒

以下能力会在浏览器中执行或发起请求：

- `FunctionValidate` 的 JavaScript 函数体。
- `FetchValidate` 的远程校验 URL。
- 按钮 `eval`。
- 按钮 URL、Dialog 和自定义组件。

只有在元数据来源可信时才启用这些能力。它们不能访问服务端秘密，也不能替代后端鉴权。对多租户、金额、批量删除和审计操作，始终以服务端判断为准。

## 如何报告问题

提交问题时尽量附上：

1. 前端实际请求 URL、状态码和脱敏后的响应。
2. `models` 中对应模型的元数据。
3. `model/page` 的请求体与响应体。
4. 使用的 Ako、Rain、SmartWeb、SmartAccess 和 JDK 版本。
5. 是否使用了自定义 TypeProvider、节点或 `mixin`。

不要上传密码、Cookie、Token、生产数据或未脱敏的用户信息。
