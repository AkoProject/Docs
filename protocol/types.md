---
title: 字段类型与选项
description: Ako 内置字段类型、options 结构和自定义 TypeProvider 约定。
---

# 字段类型与选项

字段的 `type` 决定它在搜索、表格和编辑三个场景使用什么组件；`options` 是后端传给这些组件的类型专属配置。

## 当前内置类型

| `type` | 典型来源 | 搜索 | 表格 | 编辑 |
| --- | --- | --- | --- | --- |
| `ako:text` | 字符串或未识别类型 | 文本输入 | 原样文本 | 文本输入 |
| `ako:enum` | 布尔值、枚举、`DbEnum` | 下拉选择 | label 显示 | 下拉选择 |
| `ako:mapping` | 关联模型、`Mapping` | 关联选择 | 关联名称 | 关联选择 |
| `ako:timestamp` | `Timestamp`、`DateOnly`、`TimeOnly`、`Datetime` | 日期/时间范围 | 按格式显示 | 当前默认编辑器沿用类型组件约定 |
| `ako:binary_size` | `BinarySize` | 数值 + 单位 | 格式化字节大小 | 由前端类型组件提供 |

前端目前随包提供这些类型的默认组件。后端实现新类型时，需要同时提供一个前端 TypeProvider，或将该字段降级为 `ako:text`。

## 枚举

`ako:enum` 的 `options` 形状：

```json
{
  "cascader": null,
  "values": {
    "__blank__": [
      { "value": "0", "label": "男" },
      { "value": "1", "label": "女" }
    ]
  }
}
```

布尔值也会被转换成枚举选项，默认显示“是/否”。带级联关系时，`cascader` 是控制字段 ID，`values` 的键对应控制字段的值。

JVM 的 `DbEnum("待处理", "已完成")` 会按下标生成值；如果需要固定值，可以使用 `值:显示名` 的形式。原生枚举的显示名默认取常量名，也可以用 `@DbName` 覆盖。

## 关联映射

`ako:mapping` 的 `options` 形状：

```json
{
  "cascader": null,
  "values": {
    "__blank__": {
      "model": "Group",
      "field": "id",
      "display": "name"
    }
  }
}
```

分页响应需要在 `information` 中提供关联模型数据：

```json
{
  "total": 1,
  "entities": [{ "id": 1, "group": 7 }],
  "information": {
    "ako:mapping": {
      "Group": [{ "id": 7, "name": "A 组" }]
    }
  }
}
```

这样表格才能把 `group: 7` 显示成 “A 组”，搜索弹窗也可以复用 `Group` 模型页面。级联映射时，`cascader` 和 `values` 会根据当前行或当前表单值选择目标模型。

## 时间

`ako:timestamp` 的 `options` 是 dayjs 格式字符串，例如：

```json
{
  "type": "ako:timestamp",
  "options": "YYYY-MM-DD HH:mm:ss"
}
```

时间字段的默认搜索会生成 `gte` 和 `lte` 两个输入。前端提交的值格式是时间戳，适配器应统一时区和精度。

## 自定义类型协议

后端只需要输出一个稳定的 `type` 和可 JSON 序列化的 `options`；前端注册同名 TypeProvider：

```ts
const moneyType = {
  name: 'billing:money',
  search: MoneySearch,
  table: MoneyTable,
  edit: MoneyEdit,
}

createApp(App).use(new Ako(), {
  types: [moneyType],
})
```

组件会收到 `model`、`field`、`data`、`row`、`page`、`options` 等属性，编辑和搜索组件还会通过 `v-model` 读写当前值。完整的组件扩展方式见 [自定义页面与类型](/frontend/customization)。

## 类型设计建议

- 类型 ID 使用命名空间，例如 `billing:money`，避免与 `ako:` 内置类型冲突。
- `options` 只放渲染必需的数据，不放密钥、内部查询语句或权限信息。
- 表格和搜索可能复用同一页的 `information`，后端应按当前页数据限制关联查询规模。
- 自定义编辑器仍然只负责体验；保存接口必须在后端重新验证值。
