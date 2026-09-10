---
title: 前端配置
description: AkoOptions 的默认值、菜单扩展和 API 替换方式。
---

# 前端配置

所有配置都通过 `new Ako()` 的插件选项传入。默认值来自前端源码中的 `defaultOptions`。

## AkoOptions

| 配置 | 默认值 | 作用 |
| --- | --- | --- |
| `baseUrl` | `/api/ako/` | Ako API 的相对或绝对基地址。 |
| `channel` | `manager` | 菜单请求使用的 channel。 |
| `registerElementIcon` | `true` | 是否把 Element Plus 图标注册为组件。 |
| `api` | `DefaultAkoApi` | 自定义 API 工厂，可替换请求库或错误处理。 |
| `dashboard` | 默认仪表盘项 | 主界面默认打开的不可关闭页面。 |
| `menuItems` | `[]` | 前端固定菜单，可放报表、设置和自定义页面。 |
| `types` | `[]` | 自定义字段 TypeProvider。 |
| `authLogo` | Ako 登录 Logo | 登录页 Logo 组件或 VNode。 |
| `mainLogo` | Ako 主界面 Logo | 侧边栏 Logo 组件或 VNode。 |
| `mixin` | 原样返回响应 | 修改菜单和模型元数据的函数。 |
| `loginCallback` | 空异步函数 | 登录成功或启动时已认证后执行。 |

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

`loginCallback` 只用于前端初始化，不代表后端已经完成授权。每一个模型请求仍需要由后端验证当前用户。

## 固定菜单

`menuItems` 可以放在后端模型之外：

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

`menuItems` 的项需要符合 `MenuItem` 或 `MenuGroup` 结构；图标和页面可以直接传 VNode，也可以使用注册后的组件。

## 修改元数据

如果后端协议统一，但某个前端项目需要改名、隐藏字段或替换节点，可以使用 `mixin`。源码提供了 `menuRespMixin` 辅助构造器：

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

这适合做展示层调整。涉及数据权限、字段脱敏和可见范围时，必须在后端处理，不要只依赖 `mixin`。

## 自定义 API

默认实现使用 Axios，并提供 `menu`、`model`、`auth` 三组 API。如果请求需要统一注入 Token、特殊错误格式或 GraphQL 网关，可以实现 `AkoApi`：

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

自定义 API 仍然应该返回与 `MenuResp`、`ModelPage` 相同的数据结构，这样默认视图和自定义视图才能复用。

## Logo 与视觉

`authLogo` 和 `mainLogo` 接受 Vue 组件、VNode 或返回 VNode 的函数。默认主题使用 Element Plus；如果需要替换整套页面，可以从 [使用 Ako View 构建页面](/frontend/views) 和 [自定义页面与类型](/frontend/customization) 开始。
