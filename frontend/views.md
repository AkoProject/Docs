---
title: 使用 Ako View 构建页面
description: 组合 Ako 提供的 View、面板和运行时，构建标准页、嵌入页与自定义页。
---

# 使用 Ako View 构建页面

Ako 的默认管理后台由一组可以组合和替换的 Vue View 组成。你不必从空白页面重新实现菜单、分页、编辑和关联选择；可以先使用标准 View，再在需要的层级替换组件。

## 先选择页面入口

| 目标 | 入口 |
| --- | --- |
| 独立运行完整管理后台 | `AkoBootView` |
| 嵌入已有布局 | `AkoApp` + `AkoBootView` 或自己的 slot 内容 |
| 只显示一个模型的标准页 | `Ako.createEntityView(model)` 或 `EntityView` |
| 在弹窗中选择关联实体 | `dialog` + `Ako.createEntityView(model, selectFun)` |
| 完全自定义业务页 | 注册自己的 View，再通过 `menuItems` 或模型节点接入 |

## 独立运行

最小入口是 `AkoBootView`：它先检查认证状态，再显示登录页或主界面。

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

`AkoBootView` 内部会使用 `AkoAuthView` 和 `AkoMainView`。这条路径适合把 Ako 作为一个独立的业务管理后台。

## 嵌入已有布局

`AkoApp` 会把同一个 `Ako` 实例提供给内部 View。可以让它直接渲染默认启动页：

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

也可以通过 slot 包住自己的布局：

```vue
<template>
  <AkoApp :ako="ako">
    <YourLayout />
  </AkoApp>
</template>
```

外层 App 仍然要先执行：

```ts
const ako = new Ako()
app.use(ako, { baseUrl: '/api/ako/' })
```

在自定义布局中，使用 `inject(AkoSymbol)`、`inject(AkoApiSymbol)` 取得已安装的运行时，不要在子组件内创建第二个 `Ako`。

## 标准模型页

`Ako.createEntityView` 根据模型的 `pageNode` 创建页面，并把搜索、表格和编辑节点传给它：

```ts
const model = ako.models.find(it => it.id === 'Student')
if (model) {
  const page = ako.createEntityView(model)
  // 把 page 交给自己的路由、VNode 容器或 dialog
}
```

默认 `EntityView` 包含：

1. 搜索区域：加载字段搜索组件和页面级按钮。
2. 表格区域：加载字段列、选择状态和行级按钮。
3. 分页器：使用 1-based page 调用 `model.page`。
4. 编辑弹窗：调用 `createEditView` 和 `createSaveFun`。

模型的 `searchNode`、`tableNode`、`editNode` 可以逐模型替换；默认节点清单见 [前端参考](/frontend/reference)。

## 在弹窗中选择模型

关联字段的内置组件就是用这条方式打开选择页的。业务页面也可以复用：

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

传入 `selectFun` 后，标准页的 `viewMode` 会变成 `search`，表格行选择会回调选中的实体。它适合复用模型的查询、分页和关联信息。

## 自定义菜单页

不属于通用模型的报表、工作台和配置页面，可以通过 `menuItems` 加入主界面：

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

这类页面不需要伪装成 `DbModel`，也不会自动获得 CRUD。需要模型能力时，可以在页面中注入 `AkoApiSymbol`，或者把某个模型 View 作为子内容组合进去。

## 替换模型的完整页面

当一个模型需要特殊布局时，注册一个页面组件，并让后端或 `mixin` 返回它的节点名：

```ts
app.component('sales-order-page', SalesOrderPage)

const mixin = menuRespMixin().model('Order', model => {
  model.pageNode = 'sales-order-page'
})

app.use(new Ako(), { mixin })
```

页面组件可以接收标准页面属性，并从注入的运行时调用接口：

```vue
<script setup lang="ts">
import { inject } from 'vue'
import { AkoApiSymbol, AkoSymbol } from '@ako-dev/ako'

const ako = inject(AkoSymbol)!
const api = inject(AkoApiSymbol)!
const props = defineProps<{
  model: any
  searchFun?: () => void
  editFun?: (data: any, options?: any) => void
}>()

async function refresh() {
  await api.model.page(props.model.id, {}, {}, 1, 20)
  props.searchFun?.()
}
</script>
```

页面节点不是 API 路由；它只是前端组件名称。后端仍然需要提供模型接口，组件也要自行处理加载、错误和权限失败后的交互。

## 从默认面板开始替换

如果只需要替换一层，不要复制整个 `EntityView`：

- 换一个字段输入：注册 TypeProvider。
- 换一个字段外层：使用 `EditPropertyNode`、`SearchPropertyNode` 等节点名。
- 换整张表：替换 `tableNode`。
- 增加通用按钮：使用协议按钮或自定义按钮组件。
- 只改一个模型：用 `mixin` 改该模型的节点。

节点和 TypeProvider 的详细 props 见 [前端参考](/frontend/reference)，实现复杂页面时再阅读 [自定义页面与类型](/frontend/customization)。
