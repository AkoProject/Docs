---
title: 交互规则
description: Ako 的 auth、menu、model 接口的请求与响应格式。
---

# 交互规则

以下路径都相对于 `baseUrl`。`baseUrl` 默认为 `/api/ako/`，所以 `menu/list/manager` 的完整路径是 `/api/ako/menu/list/manager`。

## 接口清单

| 方法 | 相对路径 | 请求体 | 成功响应 |
| --- | --- | --- | --- |
| GET | `auth/isAuth` | 无 | JSON 布尔值。`true` 进入主界面，`false` 显示登录页 |
| POST | `auth/login` | `{ "username": "...", "password": "..." }` | HTTP 2xx，前端不读取响应体 |
| GET | `menu/list/{channel}` | 无 | `{ "menus": [], "models": [] }` |
| POST | `model/page/{model}` | 分页、查询、排序 | `{ "total": 0, "entities": [], "information": {} }` |
| POST | `model/save/{model}` | 一个模型 JSON 对象 | HTTP 2xx，返回空体即可 |
| POST | `model/delete/{model}` | ID 数组 | HTTP 2xx，返回空体即可 |

## 鉴权

`AkoBootView` 启动时先调用 `GET auth/isAuth`，状态码为 2xx 时读取响应 JSON：

- 为 `true` 时，先调用 `loginCallback`，再显示主界面。
- 为 `false` 时，显示 Ako 自带的登录页。用户点击登录后，前端把用户名和密码 POST 到 `auth/login`；返回 2xx 后同样先调用 `loginCallback`，再进入主界面。

其他接口在未登录时建议返回 HTTP `401`。默认 API 客户端遇到 `401` 会刷新整个页面，重新走一遍上面的流程。因此 `auth/login` 登录失败时应返回 `400` 或 `403` 这类状态码，前端会提示“登录失败，请检查用户名和密码”；如果返回 `401`，页面会直接刷新。

登录状态可以用 Cookie、Session、Token 或其他方式维持，协议不绑定其中任何一种。

## 菜单接口

请求：

```http
GET /api/ako/menu/list/manager
```

路径最后一段是 channel，取自前端的 `channel` 选项，默认为 `manager`。后端可以据此返回不同的菜单，不过现有的两个后端实现都没有按 channel 过滤。

最小响应：

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

`previous` 是父菜单的标识，必须等于 `menus` 中某一项的 `identifier`；没有父级时为 `null`。`permission` 是为权限集成预留的字段，默认前端不读取它，后端仍然要在每个数据接口上做授权判断。各字段的完整说明见 [模型定义](/protocol/metadata)。

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

页码从 1 开始，第一页是 `page: 1`，默认前端每页 20 条。`params` 的键由“字段名_操作符”组成；操作符为 `eq` 时可以省略，直接用字段名作键。`sort` 的值是 `asc` 或 `desc`。

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

`information` 的键是字段的 `type`，值由对应的类型提供者决定。例如关联字段会在 `information["ako:mapping"]` 中带上关联模型的实体列表，表格用它显示名称，搜索框用它回显已选的值。

## 查询操作符

后端（JVM）和后端（JavaScript）支持同一组操作符：

| 操作符 | 示例键 | 含义 |
| --- | --- | --- |
| `eq` | `name_eq` 或 `name` | 等于 |
| `like` | `name_like` | 模糊匹配。默认前端会把输入值包成 `%...%`，输入为空时不提交 |
| `gt` | `age_gt` | 大于 |
| `gte` | `age_gte` | 大于等于 |
| `lt` | `age_lt` | 小于 |
| `lte` | `age_lte` | 小于等于 |
| `ne` | `status_ne` | 不等于 |
| `in` | `id_in` | 在数组或集合中 |
| `isNull` | `deletedAt_isNull` | 为空。后端（JVM）忽略传入的值，始终按 `IS NULL` 处理；后端（JavaScript）按值的真假决定是 `IS NULL` 还是 `IS NOT NULL` |

这组操作符只是起点，不代表可以把查询直接拼成 SQL。自己实现后端时，应该对字段名、操作符、值类型和排序方向都做白名单校验，不要把客户端传来的字符串当作查询语言执行。

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

新增时通常不带 `id` 或带空 ID，编辑时带已有 ID。怎样区分新增和更新，由后端的模型和持久化层决定。

删除：

```http
POST /api/ako/model/delete/Student
Content-Type: application/json

[12, 13]
```

示例中的 ID 是数字，但协议也应接受字符串 ID，以支持 UUID、雪花 ID 等主键。适配器负责把 JSON 里的值转换成模型的主键类型。默认的删除按钮从行数据的 `id` 属性取值，所以实体 JSON 里的主键属性最好就叫 `id`。

## 错误处理

推荐的状态码：

- 未登录：`401`。
- 无权限：`403`。
- 模型或字段不存在：`404` 或业务错误码。
- 参数错误、校验失败或违反业务规则：`400` 或统一的业务错误响应。
- 未处理的异常：`500`。不要把堆栈和数据库细节返回给浏览器。

默认 API 客户端遇到非 2xx 响应会抛出异常。自定义 API 客户端可以在不改变接口格式的前提下加上统一的错误提示。后端（JavaScript）的错误响应体是 `{ "error": { "code": "...", "message": "..." } }`，可以作为参考。
