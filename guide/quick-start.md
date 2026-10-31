---
title: 快速开始
description: 用 Vue 3 前端和 JVM 后端跑通 Ako 的最小示例。
---

# 快速开始

这一页带你跑通一个最小示例：前端启动 Ako，后端提供协议接口，菜单里出现模型，打开模型页面能分页查询。之后想新增模型和字段，看 [实体模型](/backend/rain/models)。

跑通后，你会看到一个管理页面，带菜单分组、搜索、关联选择、枚举显示、分页、编辑和行操作。日常使用建议按“前端 → 后端（JVM） → 实体模型”的顺序阅读；协议和其他框架的接入放在 [扩展参考](/extension/overview)。

## 准备工作

- Node.js 和一个 Vue 3 项目。
- 一个实现了 Ako HTTP 协议的后端。JVM 项目可以直接用 `ako-rain` 或 `ako-spring`，其他后端需要按 [交互规则](/protocol/http-api) 自行实现。
- 前后端能互相访问：同源部署，或者配置好 CORS。前端默认的接口基地址是 `/api/ako/`。

## 1. 接入前端

安装前端包：

```bash
npm install @ako-dev/ako
```

在应用入口挂载 Ako。HTTP 一栏列出前端会调用的接口，后端怎么实现见 JVM 后端文档。

<script setup lang="ts">
const bootstrapExamples = [
  {
    language: 'TypeScript',
    framework: 'Vue 3',
    code: `import { createApp } from 'vue'
import { Ako, AkoBootView } from '@ako-dev/ako'
import App from './App.vue'

const ako = new Ako()

createApp(App)
  .use(ako, {
    baseUrl: '/api/ako/',
    channel: 'manager',
  })
  .component('AkoBootView', AkoBootView)
  .mount('#app')`,
    note: '也可以直接把 AkoBootView 当作根组件：createApp(AkoBootView)。AkoBootView 会先请求 auth/isAuth，再决定显示登录页还是主界面。',
  },
  {
    language: 'HTTP',
    framework: '任意后端',
    code: `GET  /api/ako/auth/isAuth
GET  /api/ako/menu/list/manager
POST /api/ako/model/page/Student
POST /api/ako/model/save/Student
POST /api/ako/model/delete/Student`,
    note: '这里只列出接口。路由怎么注册、怎么查库、怎么开事务，由后端框架决定。',
  },
]
</script>

<CodeSwitch :variants="bootstrapExamples" />

如果应用没有自己的根组件，最小入口可以写成：

```ts
import { createApp } from 'vue'
import { Ako, AkoBootView } from '@ako-dev/ako'

createApp(AkoBootView)
  .use(new Ako(), { baseUrl: '/api/ako/' })
  .mount('#app')
```

`@ako-dev/ako` 默认使用 Element Plus，并自动注册内置图标、页面节点和字段类型。自定义入口和组件注册见 [前端安装与挂载](/frontend/quick-start)。

## 2. 接入后端

JVM 后端有两种最快的接法：

- `ako-rain`：用 Rain 创建 JVM 应用，添加 SmartWeb 和 SmartAccess 依赖，把模型所在的包加入扫描范围，再实现 `IMenuController` 和 `IModelController`。
- `ako-spring`：用 Spring Boot 创建应用，引入对应 Boot 版本的自动配置和 Spring Data JPA，扫描 Repository，再用 Spring MVC Controller 调用 Ako 核心服务。

两种方式都要提供 `auth/isAuth`。如果想用 Ako 自带的登录页，还要提供 `auth/login`。

依赖、配置和控制器代码见 [后端（JVM）项目创建](/backend/rain/project) 和 [启动 JVM 后端](/backend/rain/quick-start)。Rain 自身的应用启动、扫描和 Web 配置，以 [Rain 快速开始](https://rain.icecreamqaq.com/guide/getting-started) 和 [SmartWeb 快速开始](https://rain.icecreamqaq.com/smartweb/getting-started) 为准。

## 3. 验证接口

假设前端配置了 `baseUrl: '/api/ako/'`，后端和前端在同一个域名下，可以依次检查：

```bash
curl http://localhost:17777/api/ako/auth/isAuth
curl http://localhost:17777/api/ako/menu/list/manager
curl -X POST http://localhost:17777/api/ako/model/page/Student \
  -H 'Content-Type: application/json' \
  -d '{"page":1,"size":20,"params":{},"sort":{}}'
```

第三个请求应当返回 `total`、`entities` 和 `information`。`entities` 是这一页的数据；`information` 是关联字段等类型在前端显示时需要的补充信息。

## 4. 看见第一个页面

前端启动后，请求顺序一般是：

1. `GET auth/isAuth`：判断是否进入主界面。
2. `GET menu/list/manager`：获取菜单和模型元数据。
3. 用户打开模型菜单时，`POST model/page/{model}`：获取分页数据。
4. 点击新增、编辑、删除时，调用对应的 `save` 或 `delete`。

如果第 2 步返回了模型，页面上却没有列或输入框，先看字段元数据里的 `column`、`edit`、`search` 是不是 `null`，再确认 `type` 对应的前端组件已经注册。

## 5. 实际运行效果

下面的截图来自实际启动的 Frontend 开发项目和 `ako-rain` 测试应用，并非静态示意图。测试模型声明了 `@MenuGroup`、`@Mapping`、`@DbEnum`、`@Description`、`@Required`、`@SearchType`、`@TableColumnWidth` 和 `@ColumnIndex`，这些注解分别体现在菜单、搜索项和表格上。

![Ako 自动生成的学生管理页面](/ako-demo.png)

*实际运行效果：左侧是 `学校管理` 菜单分组，右侧的搜索表单、枚举和关联字段、分页表格和操作按钮都由模型元数据生成。*

## 6. 接下来

- [前端安装与挂载](/frontend/quick-start)：把自动生成的管理后台嵌入现有 Vue 应用。
- [后端（JVM）项目创建](/backend/rain/project)：准备 Rain 或 Spring Boot 项目的依赖和目录。
- [启动 JVM 后端](/backend/rain/quick-start)：完善配置和控制器，检查接口。
- [实体模型](/backend/rain/models)：用 Rain 或 Spring 声明第一个模型。
- [扩展参考](/extension/overview)：要接入其他语言或框架、自定义协议时再读。
