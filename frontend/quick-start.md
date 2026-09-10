---
title: 前端开始方式
description: 在 Vue 3 应用中安装并挂载 @ako-dev/ako。
---

# 前端开始方式

Ako 前端是一个 Vue 插件和一组可替换的视图组件，默认使用 Element Plus。它可以直接作为根视图，也可以嵌入你已有的 Vue 应用。

## 安装

```bash
npm install @ako-dev/ako
```

Ako 当前源码的包信息：

- 包名：`@ako-dev/ako`
- 运行时：Vue 3、Element Plus、Axios、dayjs
- 默认基地址：`/api/ako/`
- 默认 channel：`manager`

## 挂载根视图

`AkoBootView` 会在启动时检查认证状态，然后选择登录页或主界面。下面的两个版本使用同一套协议，只是语言不同：

<script setup lang="ts">
const entryExamples = [
  {
    language: 'TypeScript',
    framework: 'Vue 3',
    code: `import { createApp } from 'vue'
import { Ako, AkoBootView } from '@ako-dev/ako'

createApp(AkoBootView)
  .use(new Ako(), {
    baseUrl: '/api/ako/',
    channel: 'manager',
  })
  .mount('#app')`,
    note: '默认组件会加载 Element Plus 中文 locale，并注册内置图标和页面节点。',
  },
  {
    language: 'TypeScript',
    framework: 'Vue 3 · 现有布局',
    code: `import { createApp } from 'vue'
import { Ako, AkoBootView } from '@ako-dev/ako'
import App from './App.vue'

const app = createApp(App)
app.use(new Ako(), { baseUrl: '/api/ako/' })
app.component('AkoBootView', AkoBootView)
app.mount('#app')`,
    note: '在 App.vue 中渲染 <AkoBootView />，即可把自动生成后台嵌入现有布局。',
  },
  {
    language: 'JavaScript',
    framework: 'Vue 3',
    code: `import { createApp } from 'vue'
import { Ako, AkoBootView } from '@ako-dev/ako'

createApp(AkoBootView)
  .use(new Ako(), {
    baseUrl: '/api/ako/',
    channel: 'manager',
  })
  .mount('#app')`,
    note: '如果应用已有 App.vue，把 AkoBootView 作为页面组件嵌入即可；插件安装方式不变。',
  },
]
</script>

<CodeSwitch :variants="entryExamples" />

如果要保留自己的根组件，可以通过 `AkoApp` 提供的插槽包裹页面：

```vue
<script setup lang="ts">
import { inject } from 'vue'
import { AkoApp, AkoSymbol } from '@ako-dev/ako'

const ako = inject(AkoSymbol)!
</script>

<template>
  <AkoApp :ako="ako">
    <YourLayout />
  </AkoApp>
</template>
```

这段代码假设外层 `main.ts` 已经通过 `.use(new Ako(), options)` 安装插件。更常见的方式是直接把 `AkoBootView` 放在你的布局路由中；无论采用哪种方式，页面组件都必须在同一个 Vue App 中安装 Ako 插件。

## 前后端连接

开发环境可以通过 Vite proxy 把 `/api` 转到后端；生产环境建议由网关或 Web Server 提供同源路径。若前后端不同源，需要配置 CORS，并确保 Cookie 或 Token 的传递策略与自己的 API 实现一致。

`baseUrl` 只负责拼接 Ako 相对接口：

```ts
new Ako().install(app, {
  baseUrl: 'https://api.example.com/ako/',
})
```

请求会被拼成：

```text
https://api.example.com/ako/menu/list/manager
```

## 启动流程

前端加载后会按以下顺序工作：

1. 调用 `GET {baseUrl}/auth/isAuth`。
2. 未认证时显示登录页，登录成功后调用 `loginCallback`。
3. 已认证时直接调用 `loginCallback` 并进入主界面。
4. 主界面调用 `GET {baseUrl}/menu/list/{channel}`。
5. 用户打开模型菜单时调用分页接口。

因此后端至少需要实现 `auth/isAuth` 和 `menu/list/{channel}`，否则前端无法完成启动。完整接口见 [交互规则](/protocol/http-api)。

## 使用已有菜单和页面

Ako 不要求所有页面都由后端模型生成。通过 `menuItems` 可以添加固定的仪表盘、报表或业务页面；它们会和后端返回的菜单合并。具体配置见 [前端配置](/frontend/configuration)。

## 下一步

- [前端配置](/frontend/configuration)：修改基地址、菜单、Logo、鉴权回调和 API。
- [前端工具](/frontend/tools)：使用运行时、弹窗、类型工具和按钮工具。
- [mixin 使用方法](/frontend/mixins)：在不修改后端的情况下调整菜单和模型展示。
- [使用 Ako View 构建页面](/frontend/views)：组合内置 View，构建嵌入式或自定义页面。
