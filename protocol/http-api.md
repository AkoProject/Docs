---
title: 交互规则
description: Ako auth、menu、model 接口的请求与响应约定。
---

# 交互规则

以下路径都相对于 `baseUrl`。默认值为 `/api/ako/`，所以 `menu/list/manager` 的完整路径是 `/api/ako/menu/list/manager`。

## 接口清单

| 方法 | 相对路径 | 请求体 | 成功响应 |
| --- | --- | --- | --- |
| GET | `auth/isAuth` | 无 | JSON 布尔值，`true` 进入主界面，`false` 显示登录页 |
| POST | `auth/login` | `{ "username": "...", "password": "..." }` | HTTP 2xx；前端不依赖响应体 |
| GET | `menu/list/{channel}` | 无 | `{ "menus": [], "models": [] }` |
| POST | `model/page/{model}` | 分页、查询、排序 | `{ "total": 0, "entities": [], "information": {} }` |
| POST | `model/save/{model}` | 一个模型 JSON 对象 | HTTP 2xx；通常返回空体即可 |
| POST | `model/delete/{model}` | ID 数组 | HTTP 2xx；通常返回空体即可 |

## 鉴权

`AkoBootView` 启动时先调用 `GET auth/isAuth`。状态码在 2xx 范围内时，前端读取响应 JSON：

- `true`：调用 `loginCallback`，然后显示主界面。
- `false`：显示 Ako 自带登录页；点击登录会 POST 到 `auth/login`，成功后再次进入主界面。

未授权的其他接口建议返回 HTTP `401`。默认 API 客户端遇到 `401` 会刷新页面，让鉴权流程重新开始。登录态可以使用 Cookie、Session、Token 或其他方式，但不要让前端协议绑定其中一种。

## 菜单接口

请求：

```http
GET /api/ako/menu/list/manager
```

响应最小形状：

```json
{
  "menus": [],
  "models": [
    {
      "id": "Student",
      "name": "学生",
      "previous": null,
      "permission": null,
      "index": 100,
      "displayAble": false,
      "pageNode": "default-entity-page-node",
      "searchNode": "default-entity-search-node",
      "tableNode": "default-entity-table-node",
      "editNode": "default-entity-edit-node",
      "iconNode": "default-entity-icon-node",
      "modelButtons": [],
      "operateButtons": [],
      "fields": []
    }
  ]
}
```

`previous` 是父菜单标识；没有父级时为 `null`。`permission` 预留给权限集成，后端仍必须在每个数据接口上执行授权判断。

## 分页接口

请求：

```http
POST /api/ako/model/page/Student
Content-Type: application/json

{
  "page": 1,
  "size": 20,
  "params": {
    "name_like": "%Alice%",
    "age_gte": 18
  },
  "sort": {
    "age": "desc",
    "id": "asc"
  }
}
```

默认前端使用 1-based 页码：第一页是 `page: 1`。`params` 的键通常由 `字段名_操作符` 组成；`eq` 可以省略，直接使用字段名。

响应：

```json
{
  "total": 1,
  "entities": [
    {
      "id": 12,
      "name": "Alice",
      "age": 20
    }
  ],
  "information": {}
}
```

`information` 的键是字段 `type`，值由类型提供者决定。例如关联字段会在 `information` 中携带关联模型的实体列表，供表格展示名称和搜索弹窗使用。

## 查询操作符

当前 JVM 查询实现使用以下操作符：

| 操作符 | 示例键 | 语义 |
| --- | --- | --- |
| `eq` | `name_eq` 或 `name` | 等于 |
| `like` | `name_like` | 模糊匹配；默认前端会把输入值包装成 `%...%` |
| `gt` | `age_gt` | 大于 |
| `gte` | `age_gte` | 大于等于 |
| `lt` | `age_lt` | 小于 |
| `lte` | `age_lte` | 小于等于 |
| `ne` | `status_ne` | 不等于 |
| `in` | `id_in` | 在数组或集合中 |
| `isNull` | `deletedAt_isNull` | 是否为空；按适配器约定读取值 |

这是当前实现支持的起点，不是鼓励直接拼接 SQL 的接口。其他语言实现应该对字段名、操作符、值类型和排序方向做明确白名单，避免把客户端字符串当作查询语言直接执行。

## 保存与删除

保存：

```http
POST /api/ako/model/save/Student
Content-Type: application/json

{
  "id": 12,
  "name": "Alice",
  "age": 20
}
```

新增时通常不带 `id` 或带空 ID，编辑时带已有 ID。如何区分新增与更新由后端模型和持久化层决定。

删除：

```http
POST /api/ako/model/delete/Student
Content-Type: application/json

[12, 13]
```

虽然前端默认示例常见的是数字 ID，协议应允许字符串 ID，以支持 UUID、雪花 ID 或其他主键。适配器负责把 JSON 标量转换成对应模型的主键类型。

## 错误处理建议

推荐约定：

- 认证失败：`401`。
- 无权限：`403`。
- 模型或字段不存在：`404` 或业务错误码。
- 参数、校验或业务规则失败：`400` 或统一业务错误响应。
- 未处理异常：`500`，不要把堆栈和数据库细节返回给浏览器。

当前默认 API 客户端对非 2xx 会抛出异常；自定义 API 可以在保持接口形状的前提下补充统一错误提示。
