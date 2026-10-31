---
title: 使用 Ako View 构建页面
description: 组合 Ako 提供的 View、面板和运行时，构建标准页、嵌入页和自定义页面。
---

# 使用 Ako View 构建页面

Ako 默认的管理后台由一组可以组合、替换的 Vue View 组成。菜单、分页、编辑和关联选择都不必从空白页面重写：先用标准 View，再在需要的那一层替换组件。

## 选择入口

| 目标 | 入口 |
| --- | --- |
| 独立运行完整的管理后台 | `AkoBootView` |
| 嵌入已有布局 | `AkoApp` + `AkoBootView`，或在 `AkoApp` 插槽里放自己的内容 |
| 只显示一个模型的标准页 | `Ako.createEntityView(model)` 或 `EntityView` |
| 在弹窗中选择关联实体 | `dialog` + `Ako.createEntityView(model, selectFun)` |
| 完全自定义的业务页面 | 注册自己的 View，再通过 `menuItems` 或模型节点接入 |

## 独立运行

最简单的入口是 `AkoBootView`：它先检查登录状态，再显示登录页或主界面。

```ts
import { createApp } from 'vue'
import { Ako, AkoBootView } from '@ako-dev/ako'

const app = createApp(AkoBootView)
app.use(new Ako(), {
  baseUrl: '/api/ako/',
  channel: 'manager',
})
app.mount('#app')
```

`AkoBootView` 内部会用到 `AkoAuthView` 和 `AkoMainView`。想把 Ako 当作一个独立的管理后台来用，这样写就够了。

## 嵌入已有布局

`AkoApp` 会把传入的 `Ako` 实例提供给内部的 View。可以让它直接渲染默认的启动页：

```vue
<script setup lang="ts">
import { inject } from 'vue'
import { AkoApp, AkoSymbol } from '@ako-dev/ako'

const ako = inject(AkoSymbol)!
</script>

<template>
  <AkoApp :ako="ako" />
</template>
```

也可以用插槽包住自己的布局：

```vue
<template>
  <AkoApp :ako="ako">
    <YourLayout />
  </AkoApp>
</template>
```

外层 App 要先安装插件：

```ts
const ako = new Ako()
app.use(ako, { baseUrl: '/api/ako/' })
```

也可以不调用 `install`，手动给实例设置 `app` 和 `options` 后直接传给 `AkoApp`，写法见 [安装与挂载](/frontend/quick-start)。

在自定义布局里，用 `inject(AkoSymbol)`、`inject(AkoApiSymbol)` 取得已有的运行时，不要在子组件里再创建一个 `Ako`。

## 标准模型页

`Ako.createEntityView` 按模型的 `pageNode` 创建页面，并把搜索、表格和编辑节点名传进去：

```ts
const model = ako.models.find(it => it.id === 'Student')
if (model) {
  const page = ako.createEntityView(model)
  // 把 page 交给自己的路由、VNode 容器或 dialog
}
```

默认的 `EntityView` 由四部分组成：

1. 搜索区：加载各字段的搜索组件和页面级按钮。
2. 表格区：加载字段列、选择状态和行级按钮。
3. 分页器：页码从 1 开始，调用 `model.page`。
4. 编辑弹窗：通过 `createEditView` 和 `createSaveFun` 创建。

模型的 `searchNode`、`tableNode`、`editNode` 可以按模型分别替换，默认节点列表见 [前端参考](/frontend/reference)。

## 在弹窗中选择模型

内置的关联字段组件就是这样打开选择页的，业务页面也可以照着用：

```ts
import { createVNode } from 'vue'
import { dialog } from '@ako-dev/ako'

function chooseStudent(ako, onSelected) {
  const model = ako.models.find(it => it.id === 'Student')
  if (!model) return

  dialog({
    title: '选择学生',
    style: { width: '1100px' },
    content: () => ako.createEntityView(model, data => {
      onSelected(data)
      // 选择完成后由外层业务关闭弹窗或更新表单
    }),
  })
}
```

传入 `selectFun` 后，标准页的 `viewMode` 变为 `search`：表格每一行出现“选择”按钮，点击后把这一行的实体传给回调。这样可以直接复用模型的查询、分页和关联信息。

## 自定义菜单页

报表、工作台、配置页这类不属于通用模型的页面，可以通过 `menuItems` 加进主界面：

```ts
import { createVNode } from 'vue'
import { Ako, AkoBootView } from '@ako-dev/ako'
import ReportPage from './pages/ReportPage.vue'

const ako = new Ako()
app.use(ako, {
  menuItems: [
    {
      id: 'reports',
      name: '报表',
      index: 30,
      closeable: true,
      page: createVNode(ReportPage),
    },
  ],
})
```

这类页面不需要伪装成 `DbModel`，但也不会自动获得增删改查。需要调用模型接口时，在页面里注入 `AkoApiSymbol`，或者把某个模型的 View 作为子内容组合进来。

## 替换模型的整个页面

某个模型需要特殊布局时，注册一个页面组件，再让后端或 `mixin` 返回它的节点名：

```ts
app.component('sales-order-page', SalesOrderPage)

const mixin = menuRespMixin().model('Order', model => {
  model.pageNode = 'sales-order-page'
})

app.use(new Ako(), { mixin })
```

页面组件会收到 `createEntityView` 传入的属性，并通过注入的运行时调用接口：

```vue
<script setup lang="ts">
import { inject, ref } from 'vue'
import { AkoApiSymbol, AkoSymbol } from '@ako-dev/ako'
import type { DbModel, ModelPage } from '@ako-dev/ako'

const ako = inject(AkoSymbol)!
const api = inject(AkoApiSymbol)!
const props = defineProps<{
  model: DbModel
  searchNode: string
  tableNode: string
  editNode: string
  selectFun?: (data: any) => void
}>()

const page = ref<ModelPage>()

async function refresh() {
  page.value = await api.model.page(props.model.id, {}, {}, 1, 20)
}
</script>
```

页面节点只是前端组件的名称，不是 API 路由。后端仍然要提供模型接口；组件也要自己处理加载中、出错和无权限时的交互。

## 从默认面板开始替换

只需要换一层时，不必复制整个 `EntityView`：

- 换一个字段的输入组件：注册类型提供者。
- 换一个字段的外层：在后端指定字段级节点名（后端（JVM）中用 `@EditPropertyNode`、`@SearchPropertyNode` 等注解）。
- 换整张表：替换 `tableNode`。
- 加通用按钮：使用接口定义的按钮，或自定义按钮组件。
- 只改一个模型：用 `mixin` 修改这个模型的节点。

节点和类型提供者收到的属性见 [前端参考](/frontend/reference)，实现复杂页面时再看 [自定义页面与类型](/frontend/customization)。
