---
title: 字段类型与选项
description: Ako 内置字段类型、options 结构和自定义类型提供者的约定。
---

# 字段类型与选项

字段的 `type` 决定它在搜索、表格和编辑三处用什么组件；`options` 是后端传给这些组件的类型专属配置。

## 内置类型

| `type` | 典型来源 | 搜索 | 表格 | 编辑 |
| --- | --- | --- | --- | --- |
| `ako:text` | 字符串或未识别的类型 | 文本输入 | 原样显示 | 文本输入 |
| `ako:enum` | 布尔值、枚举、`DbEnum` | 下拉选择 | 显示 label | 下拉选择 |
| `ako:mapping` | 关联模型、`Mapping` | 关联选择 | 显示关联名称 | 关联选择 |
| `ako:timestamp` | `Timestamp`、`DateOnly`、`TimeOnly`、`Datetime` | 开始/结束时间 | 按格式显示 | 日期时间选择 |
| `ako:binary_size` | `BinarySize` | 数值 + 单位 | 格式化的字节大小 | 数值 + 单位 |

这些类型的默认组件随前端包一起提供。内置类型没有单独的编辑组件时，编辑表单直接复用它的搜索组件，目前只有 `ako:binary_size` 有独立的编辑组件。

后端新增类型时，要么同时提供一个前端类型提供者，要么把字段降级为 `ako:text`。

## 枚举

`ako:enum` 的 `options` 结构：

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

没有级联时，选项都放在 `__blank__` 下。有级联时，`cascader` 是控制字段的 ID，`values` 的键对应控制字段的取值；控制字段没有值时，下拉框处于禁用状态。

后端（JVM）中，`DbEnum("待处理", "已完成")` 按下标生成值，需要固定值时可以写成 `值:显示名`。原生枚举的值是常量名，显示名默认也是常量名，可以用 `@DbName` 覆盖。布尔字段会被转换成值为 `"true"`、`"false"` 的选项，显示为“是”“否”。需要注意，默认前端的表格组件会先把布尔值转成 `"1"`、`"0"` 再匹配选项，所以布尔字段在表格中目前显示的是原始的 `true`/`false`。

## 关联

`ako:mapping` 的 `options` 结构：

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

分页响应要在 `information` 中带上关联模型的数据，键是关联模型的 `id`：

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

有了这些数据，表格才能把 `group: 7` 显示成“A 组”。点击搜索按钮时，前端会在弹窗里打开 `Group` 模型的页面供用户选择，因此关联的目标模型也必须出现在菜单响应的 `models` 中。级联关联时，前端根据当前行或当前表单中 `cascader` 字段的值，从 `values` 里选出目标模型。

## 时间

`ako:timestamp` 的 `options` 是一个 dayjs 格式字符串，例如：

```json
{
  "type": "ako:timestamp",
  "options": "YYYY-MM-DD HH:mm:ss"
}
```

时间字段默认生成 `gte` 和 `lte` 两个搜索输入框，分别对应开始时间和结束时间。前端提交的是毫秒时间戳，适配器需要统一处理时区和精度。

## 自定义类型

后端只需要输出一个稳定的 `type` 和能序列化为 JSON 的 `options`，前端注册一个同名的类型提供者：

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

三个组件都会收到 `model`、`field`、`options` 等属性。表格组件还会收到 `row`、`data`、`page` 和 `information`；编辑组件收到 `data`、`page` 和 `information`；搜索组件收到 `entry` 和当前的搜索条件 `data`。搜索和编辑组件通过 `v-model` 读写字段的值。完整的扩展方式见 [自定义页面与类型](/frontend/customization)。

## 设计建议

- 类型 ID 加上命名空间，例如 `billing:money`，避免和内置的 `ako:` 类型冲突。
- `options` 只放渲染需要的数据，不要放密钥、内部查询语句或权限信息。
- 同一页的表格和编辑表单共用 `information`，后端应只查询当前页数据涉及的关联记录。
- 自定义编辑器只负责交互体验，保存接口仍然要在后端重新校验。
