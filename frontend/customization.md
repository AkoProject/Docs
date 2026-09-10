---
title: 自定义页面与类型
description: 注册页面节点、字段 TypeProvider、按钮组件和自定义渲染器。
---

# 自定义页面与类型

Ako 的默认页面不是黑盒。后端元数据只传递字符串节点名和类型名，前端可以通过注册组件替换任意一层。

## 替换页面节点

模型元数据中的 `pageNode`、`searchNode`、`tableNode`、`editNode` 和 `iconNode` 都会通过 `ako.findComponent(name)` 查找。先在 Vue App 注册组件：

```ts
import { createApp } from 'vue'
import { Ako, AkoBootView } from '@ako-dev/ako'
import OrderPage from './components/OrderPage.vue'

const app = createApp(AkoBootView)
app.component('orders-page', OrderPage)

app.use(new Ako(), {
  // 这里也可以通过 mixin 把后端返回的 pageNode 改成 orders-page
})
app.mount('#app')
```

然后让后端返回：

```json
{
  "id": "Order",
  "name": "订单",
  "pageNode": "orders-page",
  "searchNode": "default-entity-search-node",
  "tableNode": "default-entity-table-node",
  "editNode": "default-entity-edit-node"
}
```

如果只想替换一个模型，推荐后端按模型输出节点，或在前端 `mixin` 中按模型 ID 修改；如果希望所有模型都改变，再替换默认节点名。

## 自定义字段 TypeProvider

一个 TypeProvider 需要为搜索、表格、编辑提供组件，并使用与后端 `type` 完全相同的 `name`：

<script setup lang="ts">
const typeExamples = [
  {
    language: 'TypeScript',
    framework: 'Vue 3 · TypeProvider',
    code: `import MoneySearch from './money/MoneySearch.vue'
import MoneyTable from './money/MoneyTable.vue'
import MoneyEdit from './money/MoneyEdit.vue'

const moneyType = {
  name: 'billing:money',
  search: MoneySearch,
  table: MoneyTable,
  edit: MoneyEdit,
}

app.use(new Ako(), {
  types: [moneyType],
})`,
    note: 'name 不会自动添加 ako: 前缀；自定义类型请自行使用命名空间。',
  },
  {
    language: 'JSON',
    framework: '任意后端',
    code: `{
  "id": "amount",
  "name": "金额",
  "type": "billing:money",
  "options": {
    "currency": "CNY",
    "precision": 2
  }
}`,
    note: '后端只负责输出 type 和可序列化的 options；渲染细节由前端组件决定。',
  },
]
</script>

<CodeSwitch :variants="typeExamples" />

## 组件会收到什么

默认包装器会把这些属性传给字段组件：

| 场景 | 常用属性 |
| --- | --- |
| 搜索属性 | `model`、`field`、`searchData`、`entry`、`options`、`v-model` |
| 表格列 | `model`、`field`、`row`、`data`、`page`、`information`、`options` |
| 编辑输入 | `model`、`field`、`edit`、`data`、`page`、`options`、`v-model` |
| 页面节点 | `model`、`page`、`searchFun`、`editFun`、`selectFun`、`viewMode` |

字段组件应该把当前值当作 `v-model`，不要直接修改只读的 `page` 或 `model` 元数据。需要刷新数据时调用页面传入的 `searchFun`。

## 自定义按钮

按钮有三种常用扩展方式：

1. 后端返回 `url`，使用通用请求按钮。
2. 后端返回 `eval`，快速组合已有 API，但脚本在浏览器执行。
3. 后端返回 `component`，前端注册复杂交互按钮。

自定义按钮组件通常会收到 `model`、`row`、`page`、`search` 和 `edit`。如果操作包含权限、金额、批量数据或审计要求，建议使用后端 URL，并把脚本只当作触发器。

## 自定义页面节点的实践建议

- 组件名使用命名空间，如 `sales:order-page`、`sales:money-table`。
- 保持协议数据和组件视觉解耦；不要把 CSS class 当作后端契约。
- 对 `options` 做运行时校验，未知版本的数据应给出可读错误。
- 新增类型时同时写一个最小 JSON fixture 和前端组件测试。
- 把需要后端改变的数据行为做成新 API，不要通过 `eval` 拼接 SQL 或绕过鉴权。

## 前端扩展与协议扩展

如果一个需求只改变显示方式，优先做前端节点或 TypeProvider；如果改变查询语义、保存事务或权限模型，应先扩展后端协议，再让前端消费新字段。这样才能继续保持前后端分离。
