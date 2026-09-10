---
title: 快速开始
description: 用 Vue 3 前端和 JVM 后端跑通 Ako 的最小链路。
---

# 快速开始

本页目标是跑通一条最小闭环：前端启动 Ako、后端提供协议接口、菜单读取模型、模型页面完成分页查询。新增模型和字段后的页面变化，见 [实体模型](/backend/rain/models)。

完成后你会得到一个带菜单分组、搜索、关联选择、枚举显示、分页、编辑和行操作的管理页面。日常使用建议按“前端 → 后端（JVM） → 实体模型”的顺序阅读；协议和其他框架适配放在 [扩展参考](/extension/overview)。

## 准备工作

- Node.js 与一个 Vue 3 项目。
- 一个能提供 Ako HTTP 协议的后端。当前 JVM 可直接使用 `ako-rain` 或 `ako-spring`，其他后端需要自行实现 [交互规则](/protocol/http-api)。
- 前后端通过同源路径或 CORS 互通。默认前端基地址是 `/api/ako/`。

## 1. 接入前端

安装前端包：

```bash
npm install @ako-dev/ako
```

在应用入口挂载 Ako。下面的代码块支持在语言和框架之间切换；协议实现示例只展示接口边界，具体后端接入方式见 JVM 后端文档。

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
    note: '如果直接使用 AkoBootView 作为根组件，也可以 createApp(AkoBootView)。AkoBootView 会先检查 auth/isAuth，再决定显示登录页还是主界面。',
  },
  {
    language: 'HTTP',
    framework: '任意后端',
    code: `GET  /api/ako/auth/isAuth
GET  /api/ako/menu/list/manager
POST /api/ako/model/page/Student
POST /api/ako/model/save/Student
POST /api/ako/model/delete/Student`,
    note: 'HTTP 只是协议视图。路由如何注册、如何查库和如何开启事务，由后端框架决定。',
  },
]
</script>

<CodeSwitch :variants="bootstrapExamples" />

如果你的应用没有额外的根组件，最小入口也可以写成：

```ts
import { createApp } from 'vue'
import { Ako, AkoBootView } from '@ako-dev/ako'

createApp(AkoBootView)
  .use(new Ako(), { baseUrl: '/api/ako/' })
  .mount('#app')
```

`@ako-dev/ako` 当前默认使用 Element Plus，并自动注册内置图标、页面节点和字段类型。自定义入口与组件注册见 [前端开始方式](/frontend/quick-start)。

## 2. 接入后端

当前 JVM 有两条最短路径：

- `ako-rain`：使用 Rain 创建 JVM 应用，添加 SmartWeb/SmartAccess 依赖，把模型包加入扫描范围，并实现 `IMenuController` 与 `IModelController`。
- `ako-spring`：使用 Spring Boot 创建应用，引入对应 Boot 自动配置和 Spring Data JPA，扫描 Repository，并用 Spring MVC Controller 调用 Ako 核心服务。

两条路径都要提供 `auth/isAuth`；如果需要 Ako 自带登录页，再提供 `auth/login`。

详细的依赖、配置和控制器代码在 [后端（JVM）项目创建](/backend/rain/project) 和 [开始](/backend/rain/quick-start)。Rain 本身的应用启动、扫描和 Web 配置请以 [Rain 快速开始](https://rain.icecreamqaq.com/guide/getting-started)、[SmartWeb 快速开始](https://rain.icecreamqaq.com/smartweb/getting-started) 为准。

## 3. 验证接口

假设前端配置的是 `baseUrl: '/api/ako/'`，后端服务运行在同一域名下，可以依次检查：

```bash
curl http://localhost:17777/api/ako/auth/isAuth
curl http://localhost:17777/api/ako/menu/list/manager
curl -X POST http://localhost:17777/api/ako/model/page/Student \
  -H 'Content-Type: application/json' \
  -d '{"page":1,"size":20,"params":{},"sort":{}}'
```

第三个请求应该返回 `total`、`entities` 和 `information`。`entities` 是当前页数据，`information` 用于关联字段等类型在前端展示时补充信息。

## 4. 看见第一个页面

前端启动后的请求顺序通常是：

1. `GET auth/isAuth`：判断是否进入主界面。
2. `GET menu/list/manager`：获取菜单和模型元数据。
3. 用户打开模型菜单时，`POST model/page/{model}`：获取分页数据。
4. 点击新增、编辑、删除时，调用对应的 `save` 或 `delete`。

如果第二步返回了模型但页面没有列或输入框，先检查字段元数据的 `column`、`edit`、`search` 是否为 `null`，以及 `type` 对应的前端组件是否已注册。

## 5. 真实运行效果

下面的截图来自本仓库实际启动的 Frontend 开发项目和 `ako-rain` 测试应用，不是静态 mock。测试模型中声明了 `@MenuGroup`、`@Mapping`、`@DbEnum`、`@Description`、`@Required`、`@SearchType`、`@TableColumnWidth` 和 `@ColumnIndex`，这些声明最终反映在菜单、搜索项和表格中。

![Ako 自动生成的学生管理页面](/ako-demo.png)

*真实运行效果：左侧为 `学校管理` 菜单分组，右侧由模型元数据生成搜索表单、枚举/关联字段、分页表格和操作按钮。*

## 6. 接下来

- [前端开始方式](/frontend/quick-start)：把自动生成后台嵌入现有 Vue 应用。
- [后端（JVM）项目创建](/backend/rain/project)：准备 Rain 项目的依赖和目录。
- [开始](/backend/rain/quick-start)：完善配置、控制器并检查接口。
- [实体模型](/backend/rain/models)：使用 JVM + Rain/Spring 声明第一个模型。
- [扩展参考](/extension/overview)：只有在实现其他语言/框架或自定义协议时再阅读。
