---
title: Ako 协议
description: Ako 管理后台协议的资源、路由和后端适配职责。
---

# Ako 协议

Ako 协议是一组面向管理后台的 HTTP + JSON 约定。它不规定后端使用什么语言、Web 框架、数据库或认证方案，只规定前端需要什么数据。

## 资源模型

协议可以看成三个资源域：

| 资源域 | 作用 | 默认前端调用 |
| --- | --- | --- |
| `auth` | 告诉前端当前会话是否可用，以及登录入口。 | `GET auth/isAuth`、`POST auth/login` |
| `menu` | 返回菜单分组和模型元数据。 | `GET menu/list/{channel}` |
| `model` | 对某个模型执行分页、保存和删除。 | `POST model/page/{model}` 等 |

默认基地址是 `/api/ako/`，可通过前端 `baseUrl` 改变。下面是完整请求路径的概念视图：

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
    note: '真实响应还会包含节点、字段展示信息和类型 options；字段定义见模型定义。',
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
    note: '适配器可以把这些路径映射到任意路由系统；不要让前端直接依赖 ORM 或语言类型。',
  },
]
</script>

<CodeSwitch :variants="protocolViews" />

## 后端适配器要做什么

一个可用的适配器至少要完成以下工作：

1. 从自己的模型定义或配置生成 `models` 元数据。
2. 将字段类型、选项和展示规则编码为协议 JSON。
3. 解析分页、查询条件和排序，并对字段与操作符做白名单校验。
4. 将 `save` 和 `delete` 映射到领域服务或数据访问层。
5. 在合适的边界执行认证、授权、事务和错误转换。
6. 保持响应形状稳定，让前端不需要知道后端技术栈。

## 什么不属于协议

- 数据库表名、SQL、ORM Repository 接口。
- 用户、角色、Session 或 JWT 的具体实现。
- Web 框架的控制器注解与参数绑定语法。
- 领域校验、审计日志和业务流程的内部实现。

这些内容可以出现在后端适配器文档中，但不应写进协议本身。当前 JVM 页面中的注解示例是 `ako-rain` 与 `ako-spring` 共享的模型声明写法，Access、Repository 和控制器仍属于适配器。

## 响应风格

菜单和分页响应是前端直接消费的对象：

- 菜单响应需要 `menus` 与 `models`。
- 分页响应需要 `total`、`entities` 与 `information`。
- `save`、`delete` 当前只要求成功时返回 2xx；响应体可为空。
- 自定义按钮请求由业务自己定义，但前端默认会读取 `code` 和 `message`，建议使用 `code: 0` 表示成功。

## 从哪里开始实现

- 先按 [交互规则](/protocol/http-api) 写出接口契约测试。
- 再按 [模型定义](/protocol/metadata) 生成一个只包含文本字段的模型。
- 接着实现模型定义中的字段类型、枚举和关联。
- 最后接入按钮定义和你自己的权限层。
