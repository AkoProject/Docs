---
title: 模型与元数据
description: 用 TypeScript schema 声明 Ako JavaScript 的模型、字段类型、关联信息和页面配置。
---

# 模型与元数据

JavaScript 版用 `defineModel` 和一组字段辅助函数显式声明模型。它们生成的元数据前端可以直接使用，业务实体本身不需要加装饰器，也不需要继承 Ako 的基类。

## 第一个模型

一个模型至少需要以下几项：

- `id`：要保持稳定，菜单和 `model/{model}` 路由都用它。
- `name`：显示在菜单和页面标题上。
- `repository`：负责分页、列表、保存和删除。
- `fields`：字段列表，其中必须包含主键字段。

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

`defineModel` 会把主键字段移到 `fields` 的第一位，并默认生成和后端（JVM）一样的按钮：页面上方的“查询”“新增”“批量删除”，以及每行的“编辑”“删除”。传入 `modelButtons: []` 或 `operateButtons: []` 可以去掉这些默认按钮。

主键字段不叫 `id` 时，要通过 `idField` 指明：

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

`idField` 决定哪个字段作为接口中的 `idField` 返回给前端，也是请求没有指定排序时的默认排序字段。删除请求中的 ID 类型转换由 `parseId` 负责，与它无关。另外，默认按钮的脚本读取的是实体的 `id` 属性，所以返回给前端的实体最好仍带上 `id`，否则就要自己改写按钮脚本。

## 字段默认值

`defineField` 默认会让字段出现在三个地方：搜索表单、表格列和编辑表单。把对应配置设为 `null` 就能去掉其中一处：

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
| `type` | `ako:text` | 前端类型提供者的名称。 |
| `options` | `null` | 该类型专属的配置，只能放可以公开的 JSON。 |
| `search` | 等值查询 | 设为 `null` 时不出现在搜索表单。 |
| `edit` | 可编辑 | 设为 `null` 时不出现在编辑表单。 |
| `column` | 宽度 `200` | 设为 `null` 时不出现在表格中。 |
| `nullable` | `true` | 决定 `edit.require` 的默认值。 |
| `editable` | `true` | 用于生成 `edit.editable`。 |
| `searchOpt` | `eq` | 默认的搜索操作符。 |

`DbField` 的完整字段说明见 [模型定义](/protocol/metadata)。这些辅助函数只是补上常用的默认值，字段名称和接口中的保持一致。

## 枚举

用 `enumField` 生成 `ako:enum` 类型的字段：

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

生成的 `options` 如下：

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

级联枚举按控制字段的取值分别提供选项：

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

单级关联直接写目标模型、匹配字段和显示字段，`mappingField` 会自动补上接口要求的 `values.__blank__`：

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

查询 `Student` 分页时，运行时会收集当前页所有的 `groupId`，调用 `Group` 模型 Repository 的 `list`，然后生成：

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

前端内置的 mapping 类型提供者正是按这个结构读取数据。目标模型必须注册在同一个 `AkoRuntime` 中，并实现 `list`。如果目标模型配置了 `authorize`，运行时读取关联信息前也会检查它。

需要根据另一个字段决定关联目标时，使用级联写法。`cascader` 指当前实体上的控制字段，`values` 的键是控制字段的取值：

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

`values: { __blank__: ... }` 的完整写法依然可用，旧配置不用改。只有单级关联才能省略这个内部键。

## 时间字段

`timestampField` 的 `format` 使用前端 dayjs 的格式写法，并默认提供 `gte`、`lte` 两个范围搜索项：

```ts
timestampField({
    id: 'createdAt',
    name: '创建时间',
    format: 'YYYY-MM-DD HH:mm:ss',
    editable: false,
})
```

时间值在数据库中用什么类型存储、按哪个时区处理，都由 Repository 决定。接口只规定显示格式和搜索操作符，不负责时区。

## 自定义类型、页面节点和按钮

没有现成辅助函数的类型，可以直接写一个带命名空间的类型名：

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

前端需要注册同名的类型提供者。模型上也可以覆盖默认的页面节点：

```ts
defineModel({
    id: 'Report',
    name: '报表',
    pageNode: 'report-page-node',
    repository: reportRepository,
    fields: reportFields,
})
```

按钮配置和接口中的 `ButtonEntry` 一一对应，可以描述自定义 URL、确认提示、Dialog 或编辑 Panel。按钮的 `eval` 在浏览器中执行，里面不能放密钥、数据库操作，也不能当作最终的权限判断。

## 隐藏模型与控制返回字段

设置了 `expose: false` 的模型不会出现在 `menu/list/{channel}` 的结果里，也无法通过 `model/page`、`model/save`、`model/delete` 路由访问：

```ts
defineModel({
    id: 'AuditRecord',
    name: '审计记录',
    expose: false,
    repository: auditRepository,
    fields: auditFields,
})
```

实体默认原样返回给前端。实际业务中建议用 `serializeEntity` 明确列出要返回的字段：

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

密码哈希、租户内部字段、数据库版本号和审计信息，不应该仅仅因为是实体对象上的可枚举属性，就跟着进了 HTTP 响应。
