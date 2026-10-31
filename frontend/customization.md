---
title: 自定义页面与类型
description: 注册页面节点、字段类型提供者 和按钮组件，替换默认渲染。
---

# 自定义页面与类型

Ako 的默认页面可以逐层替换。后端元数据里只有节点名和类型名这样的字符串，前端注册对应的组件，就能替换其中任意一层。

## 替换页面节点

模型元数据中的 `pageNode`、`searchNode`、`tableNode`、`editNode` 和 `iconNode` 都通过 `ako.findComponent(name)` 查找组件。先在 Vue App 中注册组件：

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

只想替换一个模型时，推荐让后端按模型输出节点名，或者在前端 `mixin` 里按模型 ID 修改。希望所有模型都换掉时，再统一替换默认节点名。

## 自定义字段类型提供者

一个 TypeProvider 要分别为搜索、表格、编辑提供组件，`name` 必须和后端的 `type` 完全一致：

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
    note: '自定义类型的 name 不会自动加 ako: 前缀，请自己加上命名空间。',
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
    note: '后端只输出 type 和可序列化的 options，怎么渲染由前端组件决定。',
  },
]
</script>

<CodeSwitch :variants="typeExamples" />

`types` 中的类型追加在内置类型之后，查找时按名称取第一个匹配项，所以用自定义类型覆盖同名的内置类型不会生效。

## 组件会收到什么

默认的分发组件会把这些属性传给字段组件：

| 场景 | 常用属性 |
| --- | --- |
| 搜索输入 | `model`、`field`、`entry`、`options`、`placeholder`、`data`（整个搜索条件对象）、`v-model` |
| 表格单元格 | `model`、`field`、`row`、`data`、`page`、`information`、`options` |
| 编辑输入 | `model`、`field`、`data`（正在编辑的对象）、`page`、`information`、`options`、`placeholder`、`v-model` |
| 页面节点（`pageNode`） | `model`、`searchNode`、`tableNode`、`editNode`、`selectFun` |

字段组件通过 `v-model` 读写当前值，不要直接修改只读的 `page` 或 `model` 元数据。搜索节点和表格节点会额外收到 `searchFun`、`editFun` 等函数，完整列表见 [前端参考](/frontend/reference)。

## 自定义按钮

按钮怎么执行，由后端返回的按钮字段决定。最常用的是下面三种：

1. 返回 `url`：使用通用的请求按钮。
2. 返回 `eval`：在浏览器里执行一段脚本，可以快速组合已有 API。
3. 返回 `component`：前端注册一个按钮组件，实现复杂交互。

此外还有打开弹窗组件的 `dialog`、打开编辑面板的 `edit` 和 `panel`，字段定义见 [按钮与操作](/protocol/buttons)。

页面级的按钮组件会收到 `model`、`searchData`、`single`、`multi`；行级的按钮组件会收到 `model`、`page`、`row`。两者都可以触发 `search` 事件刷新列表、触发 `edit` 事件打开编辑面板。涉及权限、金额、批量数据或审计要求的操作，建议用后端 URL 实现，脚本只用来触发。

## 实践建议

- 组件名加上命名空间，如 `sales:order-page`、`sales:money-table`。
- 接口数据和组件样式分开，不要把 CSS class 当作和后端的约定。
- 在运行时校验 `options`，遇到无法识别的数据要给出看得懂的错误提示。
- 新增类型时，同时写一个最小的 JSON 示例数据和前端组件测试。
- 需要后端改变数据行为时，做成新的 API，不要通过 `eval` 拼接 SQL 或绕过鉴权。

## 前端扩展还是协议扩展

只改变显示方式的需求，优先用前端节点或类型提供者实现。要改变查询方式、保存事务或权限模型时，先扩展后端协议，再让前端读取新字段，这样前后端才能继续各自独立演进。
