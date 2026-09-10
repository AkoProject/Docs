---
title: 前端参考
description: Ako 前端公开导出、元数据类型、组件契约和默认节点。
---

# 前端参考

本页是前端开发时的速查入口。`@ako-dev/ako` 的公开导出由包根入口提供；业务代码优先从包根导入，不要依赖 `src` 下的内部路径。

## 公开导出分组

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

配置项和默认值见 [前端配置](/frontend/configuration)，工具的使用方式见 [前端工具](/frontend/tools)。

## 模型元数据最小形状

默认 View 至少需要模型 ID、节点名和字段信息：

```ts
interface DbModel {
  id: string
  name: string
  previous: string | null
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

`ModelPage` 的 `page` 从 1 开始。关联字段的显示数据通常放在 `information` 中，由 `ako:mapping` 的 TypeProvider 消费。后端响应的完整定义见 [模型定义](/protocol/metadata)。

## 默认渲染节点

后端没有覆盖节点时，`Ako` 会按以下名称查找内置 View：

| 节点名 | 默认组件 | 作用 |
| --- | --- | --- |
| `default-entity-page-node` | `EntityView` | 搜索、表格、分页和编辑的组合页面。 |
| `default-entity-search-node` | `AkoEntitySearchPanel` | 搜索字段和页面级按钮。 |
| `default-entity-table-node` | `AkoEntityTablePanel` | 表格、选择和行级按钮。 |
| `default-entity-edit-node` | `AkoEntityEditPanel` | 标准编辑表单。 |
| `default-entity-search-property-node` | `AkoEntitySearchProperty` | 单个搜索字段的外层。 |
| `default-entity-search-input-node` | `AkoEntitySearchColumnPanel` | 单个搜索输入的类型分发器。 |
| `default-entity-table-column-node` | `AkoEntityTableColumnPanel` | 单元格的类型分发器。 |
| `default-entity-edit-property-node` | `AkoEntityEditPropertyPanel` | 编辑字段外层、描述和校验。 |
| `default-entity-edit-input-node` | `AkoEntityEditColumnPanel` | 编辑输入的类型分发器。 |
| `default-entity-table-hide-column-node` | `AkoEntityTableHideColumn` | 隐藏内容提示。 |

节点名称是字符串契约，不是组件本身。替换时先在同一个 Vue App 中注册组件：

```ts
app.component('sales-order-page', SalesOrderPage)
```

然后通过后端元数据或 [mixin](/frontend/mixins) 返回 `pageNode: 'sales-order-page'`。组件名称错误时，后端仍可能正常返回元数据，但前端无法渲染对应节点。

## 字段组件契约

自定义字段 TypeProvider 需要提供 `search`、`table` 和 `edit` 三个组件，并使用与后端完全相同的 `name`：

```ts
const moneyType = {
  name: 'billing:money',
  search: MoneySearch,
  table: MoneyTable,
  edit: MoneyEdit,
}
```

默认包装器会传入以下属性：

| 场景 | 常用属性 |
| --- | --- |
| 搜索 | `model`、`field`、`searchData`、`entry`、`options`、`v-model` |
| 表格 | `model`、`field`、`row`、`data`、`page`、`information`、`options` |
| 编辑 | `model`、`field`、`edit`、`data`、`page`、`options`、`v-model` |
| 页面节点 | `model`、`page`、`searchFun`、`editFun`、`selectFun`、`viewMode` |

字段组件可以更新 `v-model`，不要直接改写只读的 `model`、`field` 和 `page`。需要刷新数据时调用传入的 `searchFun`。

## 页面节点与字段类型的选择

| 需求 | 推荐方式 |
| --- | --- |
| 只改标题、隐藏一列 | `mixin` 或后端字段注解 |
| 改搜索/表格/编辑的单个字段渲染 | TypeProvider 或字段节点 |
| 改一个模型的完整页面布局 | `@ModelNode` + 注册页面组件，或 `EntityView` 外包裹 |
| 添加报表、工作台等固定页面 | `menuItems` + 自定义 View |
| 写复杂业务操作 | 后端按钮 URL/组件；前端只负责触发 |

组合内置页面、做关联选择和嵌入已有布局的示例见 [使用 Ako View 构建页面](/frontend/views)。
