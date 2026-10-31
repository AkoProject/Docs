---
title: Ako 协议
description: Ako 管理后台协议包含哪些接口，以及后端适配器需要做什么。
---

# Ako 协议

Ako 协议是一组面向管理后台的 HTTP + JSON 约定。它只规定前端需要什么数据，不限定后端用什么语言、Web 框架、数据库或认证方案。

## 三组接口

协议的接口分成三组：

| 分组 | 作用 | 前端默认调用 |
| --- | --- | --- |
| `auth` | 告诉前端当前会话是否已登录，并提供登录入口。 | `GET auth/isAuth`、`POST auth/login` |
| `menu` | 返回菜单分组和模型元数据。 | `GET menu/list/{channel}` |
| `model` | 对某个模型做分页查询、保存和删除。 | `POST model/page/{model}` 等 |

所有路径都拼在前端的 `baseUrl` 之后，默认是 `/api/ako/`。下面是一个响应示例和完整的路径列表：

<script setup lang="ts">
const protocolViews = [
  {
    language: 'JSON',
    framework: '协议响应',
    code: `{
  "menus": [],
  "models": [
    {
      "id": "Student",
      "name": "学生",
      "fields": [],
      "modelButtons": [],
      "operateButtons": []
    }
  ]
}`,
    note: '实际响应还会包含页面节点名、字段的展示配置和类型 options，字段结构见“模型定义”。',
  },
  {
    language: 'HTTP',
    framework: '任意 Web 框架',
    code: `GET  {baseUrl}/auth/isAuth
POST {baseUrl}/auth/login
GET  {baseUrl}/menu/list/{channel}
POST {baseUrl}/model/page/{model}
POST {baseUrl}/model/save/{model}
POST {baseUrl}/model/delete/{model}`,
    note: '适配器可以把这些路径挂到任意路由系统上。返回给前端的只有协议 JSON，不要暴露 ORM 实体或语言层面的类型。',
  },
]
</script>

<CodeSwitch :variants="protocolViews" />

## 适配器要做的事

一个可用的后端适配器至少要做到以下几点：

1. 根据自己的模型定义或配置生成 `models` 元数据。
2. 把字段类型、选项和展示规则编码成协议 JSON。
3. 解析分页、查询条件和排序，并用白名单校验字段名和操作符。
4. 把 `save` 和 `delete` 交给领域服务或数据访问层。
5. 在合适的位置做认证、授权、事务和错误转换。
6. 保持响应结构稳定，前端不需要知道后端用的是什么技术栈。

## 协议不管的事

- 数据库表名、SQL、ORM 的 Repository 接口。
- 用户、角色、Session 或 JWT 的具体实现。
- Web 框架的控制器注解和参数绑定写法。
- 领域校验、审计日志和业务流程。

这些内容写在各后端的文档里，不属于协议本身。后端（JVM）文档中的注解是 `ako-rain` 和 `ako-spring` 共用的模型声明方式；Access、Repository 和控制器则由各自的适配器提供。

## 响应约定

菜单和分页接口的响应由前端直接读取：

- 菜单响应包含 `menus` 和 `models`。
- 分页响应包含 `total`、`entities` 和 `information`。
- `save`、`delete` 成功时返回任意 2xx 状态码即可，响应体可以为空。
- 自定义按钮请求的格式由业务决定。前端会读取响应体里的 `code`：没有 `code` 或 `code` 为 `0` 时提示成功，其他值提示失败。

## 实现顺序

1. 按 [交互规则](/protocol/http-api) 写出接口的契约测试。
2. 按 [模型定义](/protocol/metadata) 输出一个只有文本字段的模型。
3. 补上字段类型、枚举和关联。
4. 最后接入按钮和自己的权限体系。
