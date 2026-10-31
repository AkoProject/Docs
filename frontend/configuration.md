---
title: 前端配置
description: AkoOptions 的默认值，以及固定菜单、mixin 和自定义 API 的配置方法。
---

# 前端配置

所有配置都作为 `new Ako()` 的插件选项传入，默认值定义在前端源码的 `defaultOptions` 中。

## AkoOptions

| 配置 | 默认值 | 作用 |
| --- | --- | --- |
| `baseUrl` | `/api/ako/` | Ako API 的基地址，可以是相对或绝对地址。 |
| `channel` | `manager` | 请求菜单时使用的 channel。 |
| `registerElementIcon` | `true` | 是否把 Element Plus 图标注册为全局组件。 |
| `api` | `ako => new DefaultAkoApi(ako)` | 创建 `AkoApi` 的工厂函数，可用来替换请求库或错误处理。 |
| `dashboard` | 名为“仪表盘”的空白页 | 主界面默认打开、不可关闭的页面。 |
| `menuItems` | `[]` | 前端固定菜单，可以放报表、设置等自定义页面。 |
| `types` | 无 | 自定义字段 TypeProvider，追加在内置类型之后。 |
| `authLogo` | Ako 登录页 Logo | 登录页 Logo，可以是组件或 VNode。 |
| `mainLogo` | Ako 主界面 Logo | 侧边栏 Logo，可以是组件或 VNode。 |
| `mixin` | 原样返回响应 | 修改菜单和模型元数据的函数。 |
| `loginCallback` | 空的异步函数 | 登录成功后，或启动时发现已登录时执行。 |

合并默认值时，凡是值为假（`false`、空字符串、`undefined` 等）的配置项都会被默认值替换。所以 `registerElementIcon: false` 目前不起作用，图标仍会注册。

## 基础配置

```ts
import { createApp } from 'vue'
import { Ako, AkoBootView } from '@ako-dev/ako'

createApp(AkoBootView)
  .use(new Ako(), {
    baseUrl: '/gateway/ako/',
    channel: 'backoffice',
    registerElementIcon: true,
    loginCallback: async () => {
      // 读取当前用户、初始化租户或加载权限缓存
    },
  })
  .mount('#app')
```

`loginCallback` 只做前端初始化，不代表后端已经完成授权。每个模型请求仍要由后端校验当前用户。

## 固定菜单

`menuItems` 用来放后端模型之外的页面：

```ts
import { createVNode } from 'vue'
import { Ako, AkoBootView } from '@ako-dev/ako'
import ReportsPage from './pages/ReportsPage.vue'

const options = {
  menuItems: [
    {
      id: 'reports',
      name: '报表',
      index: 30,
      closeable: true,
      icon: createVNode('span', null, '▣'),
      page: createVNode(ReportsPage),
    },
  ],
}

createApp(AkoBootView).use(new Ako(), options).mount('#app')
```

每一项要符合 `MenuItem`（有 `page`）或 `MenuGroup`（有 `children`）的结构，`icon` 和 `page` 按类型定义传 VNode。固定菜单和后端菜单放在同一棵菜单树里，按 `index` 排序。

## 修改元数据

后端接口统一，但某个前端项目需要改名、隐藏字段或替换页面节点时，可以用 `mixin`。源码提供了辅助构造器 `menuRespMixin`：

```ts
import { menuRespMixin } from '@ako-dev/ako'

const mixin = menuRespMixin()
  .model('Student', model => {
    model.name = '成员'
    model.fields = model.fields.filter(field => field.id !== 'internalNote')
  })
  .menu('reports', menu => {
    menu.name = '经营报表'
  })

new Ako().install(app, { mixin })
```

`.menu()` 只匹配后端返回的菜单（按 `identifier`），不会作用于 `menuItems`。`mixin` 适合做展示上的调整；数据权限、字段脱敏和可见范围必须在后端处理。详细用法见 [使用 mixin](/frontend/mixins)。

## 自定义 API

默认实现基于全局 `axios` 实例，提供 `menu`、`model`、`auth` 三组 API。如果只是想统一加 Token，直接给全局 `axios` 注册拦截器就够了。需要特殊的错误格式或接入 GraphQL 网关时，再实现自己的 `AkoApi`：

```ts
import type { AkoApi } from '@ako-dev/ako'

const api = (_ako): AkoApi => ({
  menu: {
    all: () => gateway.getMenu(),
  },
  model: {
    page: (model, search, sort, page, size) => gateway.page(model, search, sort, page, size),
    save: (model, data) => gateway.save(model, data),
    delete: (model, ids) => gateway.remove(model, ids),
  },
  auth: {
    isAuth: () => gateway.isAuthenticated(),
    login: (username, password) => gateway.login(username, password),
  },
})

new Ako().install(app, { api })
```

`model.page()` 要返回 `ModelPage` 结构。`menu.all()` 的返回值不是原始的 `MenuResp`，而是已经转换好的菜单树（`MenuItem` / `MenuGroup` 数组）。默认的 `DefaultAkoMenu` 在这一步还会做三件事：调用 `options.mixin`、把模型写入 `ako.models`、用 `createEntityView` 生成模型页面。自己实现 `menu.all()` 时，这些都要自己完成，否则 `mixin` 不生效，依赖 `ako.models` 的关联选择也找不到模型。

## Logo 与外观

`authLogo` 和 `mainLogo` 接受 Vue 组件、VNode 或返回 VNode 的函数。默认外观基于 Element Plus；想替换整套页面，可以从 [使用 Ako View 构建页面](/frontend/views) 和 [自定义页面与类型](/frontend/customization) 开始。
