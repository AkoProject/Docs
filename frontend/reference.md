---
title: 前端参考
description: Ako 前端的公开导出、元数据类型、组件 props 和默认节点速查。
---

# 前端参考

这一页供开发时速查。`@ako-dev/ako` 的公开导出都从包根入口提供，业务代码请从包根导入，不要依赖 `src` 下的内部路径。

## 公开导出

| 分组 | 常用导出 |
| --- | --- |
| 运行时 | `Ako`、`AkoSymbol`、`AkoOptionsSymbol`、`AkoApiSymbol` |
| API | `DefaultAkoApi`、`DefaultAkoMenu`、`DefaultModelApi`、`DefaultAuthApi` |
| 响应类型 | `MenuResp`、`RespMenuItem`、`ModelPage` |
| 模型类型 | `DbModel`、`DbField`、`BaseModel`、`MenuItem`、`MenuGroup` |
| 字段类型 | `TypeProvider`、`EnumOptions`、`MappingOptions` |
| 按钮类型 | `ButtonEntry`、`ButtonDialogInfo`、`ButtonPanelInfo` |
| 工具函数 | `dialog`、`dialogList`、`menuRespMixin`、枚举/关联/数字/字节工具、`toProButton` |
| View | `AkoApp`、`AkoBootView`、`AkoAuthView`、`AkoMainView`、`EntityView`、`DialogManager` |
| 面板 | `AkoEntitySearchPanel`、`AkoEntityTablePanel`、`AkoEntityEditPanel` 及字段级面板 |
| 基础组件 | `AuthLogo`、`MainLogo`、`Panel`、`AkoTabButton`、`h10`、`h15`、`h20` |

配置项和默认值见 [前端配置](/frontend/configuration)，工具的用法见 [运行时与工具](/frontend/tools)。

## 模型元数据的最小结构

默认 View 至少需要模型 ID、节点名和字段信息：

```ts
interface DbModel {
  id: string
  name: string
  previous: string | null
  index: number
  pageNode: string
  searchNode: string
  tableNode: string
  editNode: string
  iconNode?: string
  fields: DbField[]
  modelButtons: ButtonEntry[]
  operateButtons: ButtonEntry[]
}

interface ModelPage {
  total: number
  entities: any[]
  information: Record<string, any>
}
```

分页请求的页码从 1 开始。`information` 按字段类型名分组，表格和编辑组件收到的是 `page.information[field.type]`；关联字段要显示的数据通常放在这里，由 `ako:mapping` 的 TypeProvider 读取。后端响应的完整定义见 [模型定义](/protocol/metadata)。

## 默认节点

后端没有指定其他节点时，`Ako` 按下面的名称查找内置组件：

| 节点名 | 默认组件 | 作用 |
| --- | --- | --- |
| `default-entity-page-node` | `EntityView` | 搜索、表格、分页和编辑组合成的页面。 |
| `default-entity-icon-node` | Element Plus 的 `Menu` 图标 | 菜单图标。 |
| `default-entity-search-node` | `AkoEntitySearchPanel` | 搜索字段和页面级按钮。 |
| `default-entity-table-node` | `AkoEntityTablePanel` | 表格、选择和行级按钮。 |
| `default-entity-edit-node` | `AkoEntityEditPanel` | 标准编辑表单。 |
| `default-entity-search-property-node` | `AkoEntitySearchProperty` | 单个搜索字段的外层。 |
| `default-entity-search-input-node` | `AkoEntitySearchColumnPanel` | 按字段类型分发搜索输入组件。 |
| `default-entity-table-column-node` | `AkoEntityTableColumnPanel` | 按字段类型分发单元格组件。 |
| `default-entity-edit-property-node` | `AkoEntityEditPropertyPanel` | 编辑字段的外层，包括描述和校验。 |
| `default-entity-edit-input-node` | `AkoEntityEditColumnPanel` | 按字段类型分发编辑输入组件。 |
| `default-entity-table-hide-column-node` | `AkoEntityTableHideColumn` | 隐藏内容的提示。 |

节点名只是一个字符串，不是组件本身。`findComponent` 先查上表，查不到再查 Vue App 中注册的组件。所以替换时要先在同一个 Vue App 中注册组件：

```ts
app.component('sales-order-page', SalesOrderPage)
```

然后让后端元数据或 [mixin](/frontend/mixins) 返回 `pageNode: 'sales-order-page'`。组件名写错时，后端照样能返回元数据，但前端渲染不出对应节点。

## 组件会收到的属性

自定义字段 TypeProvider 要提供 `search`、`table`、`edit` 三个组件，`name` 必须和后端的 `type` 完全一致：

```ts
const moneyType = {
  name: 'billing:money',
  search: MoneySearch,
  table: MoneyTable,
  edit: MoneyEdit,
}
```

默认的分发组件和 View 会传入以下属性：

| 场景 | 常用属性 |
| --- | --- |
| 搜索输入 | `model`、`field`、`entry`、`options`、`placeholder`、`data`（整个搜索条件对象）、`v-model` |
| 表格单元格 | `model`、`field`、`row`、`data`、`page`、`information`、`options` |
| 编辑输入 | `model`、`field`、`data`（正在编辑的对象）、`page`、`information`、`options`、`placeholder`、`v-model` |
| 页面节点（`pageNode`） | `model`、`searchNode`、`tableNode`、`editNode`、`selectFun` |
| 搜索 / 表格节点 | `model`、`searchFun`、`editFun`、`selectFun`、`saveOne`、`deleteOne`、`viewMode`；表格节点另有 `page` |
| 编辑节点（`editNode`） | `model`、`data`、`page`、`save` |

字段组件通过 `v-model` 更新值，不要直接改只读的 `model`、`field` 和 `page`。`searchFun`、`editFun` 只传给搜索和表格节点；字段组件需要刷新列表时，要由外层节点处理。

## 该用哪种方式

| 需求 | 推荐方式 |
| --- | --- |
| 只改标题、隐藏一列 | `mixin` 或后端字段注解 |
| 改某个字段在搜索、表格或编辑中的渲染 | 类型提供者或字段节点 |
| 改一个模型的整个页面布局 | `@ModelNode` 加注册的页面组件，或在 `EntityView` 外再包一层 |
| 加报表、工作台等固定页面 | `menuItems` 加自定义 View |
| 复杂业务操作 | 后端按钮 URL 或按钮组件，前端只负责触发 |

组合内置页面、做关联选择和嵌入已有布局的示例见 [使用 Ako View 构建页面](/frontend/views)。
