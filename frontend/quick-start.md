---
title: 安装与挂载
description: 在 Vue 3 应用中安装 @ako-dev/ako，并把管理后台挂载为根视图或嵌入现有布局。
---

# 安装与挂载

Ako 前端由一个 Vue 插件和一组可替换的视图组件组成，默认基于 Element Plus。你可以把它直接作为根视图，也可以嵌进已有的 Vue 应用。

## 安装

```bash
npm install @ako-dev/ako
```

包的基本信息：

- 包名：`@ako-dev/ako`
- 依赖：Vue 3、Element Plus（含 `@element-plus/icons-vue`）、Axios、dayjs
- 默认基地址：`/api/ako/`
- 默认 channel：`manager`

## 挂载根视图

`AkoBootView` 启动时先检查登录状态，再决定显示登录页还是主界面。几种写法如下：

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
    note: 'install 会以中文 locale 安装 Element Plus，并把 Element Plus 图标注册为全局组件；内置页面节点由 findComponent 直接查找，不需要注册。',
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
    note: '在 App.vue 里渲染 <AkoBootView />，就能把管理后台嵌进现有布局。',
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
    note: '已有 App.vue 时，把 AkoBootView 当作普通页面组件嵌入即可，插件的安装方式不变。',
  },
]
</script>

<CodeSwitch :variants="entryExamples" />

如果想保留自己的根组件，可以用 `AkoApp` 包住页面：

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

这段代码假设 `main.ts` 已经执行过 `.use(new Ako(), options)`。`AkoApp` 不传插槽时会直接渲染 `AkoBootView`；传了插槽就渲染插槽内容，并把 `ako` 实例、配置和 API 提供给其中的组件。

## 不调用 install

从 0.0.1-DEV10 起，`Ako` 也可以不通过 `app.use()` 安装。做法是先给实例设置 `app`，再给 `options` 赋值，然后用 `AkoApp` 把实例传给页面：

```ts
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import { Ako } from '@ako-dev/ako'
import App from './App.vue'

const app = createApp(App)
app.use(ElementPlus)

export const ako = new Ako()
ako.app = app                          // 必须先设置 app，否则给 options 赋值会报错
ako.options = { baseUrl: '/api/ako/' } // 合并默认值、创建 API、注册图标和自定义字段类型

app.mount('#app')
```

```vue
<template>
  <AkoApp :ako="ako" />
</template>
```

这种方式下 Element Plus 要自己安装，需要中文界面时自行传入 locale。依赖注入由 `AkoApp` 在组件层级提供，所以 Ako 的页面都要放在 `AkoApp` 内部渲染。

`install(app, options?)` 只在实例还没有配置、或者调用时显式传入了新配置时才设置 `options`（0.0.1-DEV13 起）。因此先给 `ako.options` 赋值、再执行 `app.use(ako)` 也可以，已有配置不会被默认值覆盖。

## 连接后端

开发时可以用 Vite proxy 把 `/api` 转发到后端；生产环境最好由网关或 Web 服务器提供同源路径。如果前后端不同源，需要配置 CORS，并让 Cookie 或 Token 的传递方式和你的 API 实现保持一致。

`baseUrl` 只用来拼接 Ako 的相对接口：

```ts
new Ako().install(app, {
  baseUrl: 'https://api.example.com/ako/',
})
```

请求地址会拼成：

```text
https://api.example.com/ako/menu/list/manager
```

## 启动流程

页面加载后，前端按下面的顺序工作：

1. 调用 `GET {baseUrl}/auth/isAuth`。
2. 未登录时显示登录页，登录成功后调用 `loginCallback`。
3. 已登录时直接调用 `loginCallback`，然后进入主界面。
4. 主界面调用 `GET {baseUrl}/menu/list/{channel}`。
5. 用户打开某个模型的页面时，调用分页接口。

所以后端至少要实现 `auth/isAuth` 和 `menu/list/{channel}`，前端才能启动。完整接口见 [交互规则](/protocol/http-api)。

## 加入自己的菜单和页面

页面不必都由后端模型生成。用 `menuItems` 可以加入固定的仪表盘、报表或业务页面，它们会和后端返回的菜单合并显示。具体写法见 [前端配置](/frontend/configuration)。

## 下一步

- [前端配置](/frontend/configuration)：修改基地址、菜单、Logo、登录回调和 API。
- [运行时与工具](/frontend/tools)：使用运行时对象、弹窗、字段类型工具和按钮工具。
- [使用 mixin](/frontend/mixins)：不改后端，调整菜单和模型的展示。
- [使用 Ako View 构建页面](/frontend/views)：组合内置 View，构建嵌入页或自定义页面。
