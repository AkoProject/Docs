---
title: 模型与元数据
description: 使用 TypeScript schema 声明 Ako JavaScript 模型、字段类型、关联信息和页面配置。
---

# 模型与元数据

JavaScript 侧用 `defineModel` 和字段 helper 显式声明模型。它们生成的是前端可以直接消费的 Ako 元数据，不要求业务实体本身使用装饰器或继承 Ako 基类。

## 第一个模型

模型至少需要：

- 稳定的 `id`，用于 `menu` 和 `model/{model}` 路由。
- `name`，用于菜单和页面标题。
- `repository`，用于分页、列表、保存和删除。
- 包含主键字段的 `fields`。

```ts
type Student = {
    id: number
    name: string
    age: number | null
}

const studentModel = defineModel<Student, number>({
    id: 'Student',
    name: '学生',
    repository: studentRepository,
    fields: [
        defineField({
            id: 'id',
            name: '编号',
            nullable: false,
            editable: false,
            column: { width: 100 },
        }),
        defineField({
            id: 'name',
            name: '姓名',
            nullable: false,
            searchOpt: 'like',
        }),
        defineField({
            id: 'age',
            name: '年龄',
            nullable: true,
        }),
    ],
})
```

默认情况下，`defineModel` 会让 `id` 字段排在 `fields` 第一位，并生成与 JVM 默认实现一致的页面级“查询/新增/批量删除”和行级“编辑/删除”按钮。传入 `modelButtons: []` 或 `operateButtons: []` 可以显式关闭默认按钮。

如果主键字段不是 `id`，必须同时声明模型的 `idField`：

```ts
const orderModel = defineModel<Order, string>({
    id: 'Order',
    name: '订单',
    idField: 'orderNo',
    repository: orderRepository,
    fields: [
        defineField({ id: 'orderNo', name: '订单号', nullable: false }),
        defineField({ id: 'status', name: '状态' }),
    ],
})
```

`idField` 只决定 Ako 查询默认排序和 ID 转换；实体返回给前端时，仍建议保留前端按钮脚本使用的 `id` 字段，或者覆盖自己的按钮脚本。

## 字段默认值

`defineField` 默认生成三个显示区域：搜索、表格列和编辑项。通过传入 `null` 可以关闭其中一个区域：

```ts
defineField({
    id: 'internalNote',
    name: '内部备注',
    search: null,
    column: null,
    edit: {
        editable: false,
    },
})
```

| 配置 | 默认值 | 作用 |
| --- | --- | --- |
| `type` | `ako:text` | 前端 TypeProvider 的名称。 |
| `options` | `null` | 类型专属配置，只应放可公开的 JSON。 |
| `search` | 等于查询 | `null` 时不显示在搜索表单。 |
| `edit` | 可编辑 | `null` 时不显示在编辑表单。 |
| `column` | 宽度 `200` | `null` 时不显示在表格。 |
| `nullable` | `true` | 影响默认 `edit.require`。 |
| `editable` | `true` | 生成 `edit.editable`。 |
| `searchOpt` | `eq` | 默认搜索操作符。 |

完整的 `DbField` 协议仍见 [模型定义](/protocol/metadata)。JavaScript helper 的目标是提供便捷默认值，而不是改变协议字段名称。

## 枚举

使用 `enumField` 生成 `ako:enum`：

```ts
enumField({
    id: 'status',
    name: '状态',
    values: [
        { value: 'pending', label: '待处理' },
        { value: 'done', label: '已完成' },
    ],
})
```

它会生成如下 `options`：

```json
{
    "cascader": null,
    "values": {
        "__blank__": [
            { "value": "pending", "label": "待处理" },
            { "value": "done", "label": "已完成" }
        ]
    }
}
```

级联枚举可以按控制字段的值提供多组选项：

```ts
enumField({
    id: 'city',
    name: '城市',
    cascader: 'province',
    values: {
        beijing: [{ value: 'chaoyang', label: '朝阳' }],
        shanghai: [{ value: 'pudong', label: '浦东' }],
    },
})
```

## 关联字段

单级关联直接传目标模型、匹配字段和显示字段；helper 会自动生成协议要求的 `values.__blank__`：

```ts
mappingField({
    id: 'groupId',
    name: '分组',
    nullable: true,
    mapping: {
        model: 'Group',
        field: 'id',
        display: 'name',
    },
})
```

分页 `Student` 时，runtime 会收集当前页的 `groupId`，调用 `Group.repository.list`，再生成：

```json
{
    "information": {
        "ako:mapping": {
            "Group": [
                { "id": 1, "name": "A 组" }
            ]
        }
    }
}
```

这与前端内置 mapping TypeProvider 的读取方式一致。目标模型必须注册到同一个 `AkoRuntime`，并实现 `list`。如果目标模型有自己的 `authorize`，runtime 也会在读取关联信息时检查它。

如果存在控制字段，则使用级联形式；这时 `values` 的键表示控制字段值，`cascader` 表示当前实体的控制字段：

```ts
mappingField({
    id: 'districtId',
    name: '区域',
    mapping: {
        cascader: 'city',
        values: {
            beijing: { model: 'BeijingDistrict', field: 'id', display: 'name' },
            shanghai: { model: 'ShanghaiDistrict', field: 'id', display: 'name' },
        },
    },
})
```

底层协议仍然保留 `values: { __blank__: ... }` 的完整写法，因此旧配置可以继续使用；只有单级关联可以省略这个内部键。

## 时间字段

`timestampField` 的 `format` 遵循前端 dayjs 格式，并默认提供 `gte`/`lte` 两个范围搜索项：

```ts
timestampField({
    id: 'createdAt',
    name: '创建时间',
    format: 'YYYY-MM-DD HH:mm:ss',
    editable: false,
})
```

时间值的实际存储类型和时区由 repository 决定。协议只约定格式选项和搜索操作符，不能替代数据库时区策略。

## 自定义类型、节点和按钮

没有 helper 的类型可以直接指定稳定的命名空间：

```ts
defineField({
    id: 'amount',
    name: '金额',
    type: 'billing:money',
    options: {
        currency: 'CNY',
        precision: 2,
    },
})
```

前端必须注册名称相同的 TypeProvider。页面节点也可以在模型上覆盖：

```ts
defineModel({
    id: 'Report',
    name: '报表',
    pageNode: 'report-page-node',
    repository: reportRepository,
    fields: reportFields,
})
```

按钮配置直接对应协议中的 `ButtonEntry`，适合描述自定义 URL、确认提示、Dialog 或编辑 Panel。按钮里的 `eval` 在浏览器执行，不能放入密钥、数据库操作或最终权限判断。

## 隐藏模型与安全投影

`expose: false` 的模型不会出现在 `menu/list/{channel}`，也不能通过 `model/page`、`save`、`delete` 路由访问：

```ts
defineModel({
    id: 'AuditRecord',
    name: '审计记录',
    expose: false,
    repository: auditRepository,
    fields: auditFields,
})
```

默认实体序列化是原样返回。实际业务模型建议明确投影：

```ts
const userModel = defineModel<User, string>({
    id: 'User',
    name: '用户',
    repository: userRepository,
    serializeEntity: (user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
    }),
    fields: userFields,
})
```

密码哈希、租户内部字段、数据库版本号和审计上下文不应因为实体对象可枚举就自动进入 HTTP 响应。
