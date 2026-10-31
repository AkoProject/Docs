---
title: Sequelize 接入
description: 读取 Sequelize 模型的属性定义生成 Ako 字段元数据，并接入查询、保存、删除和自定义标记。
---

# Sequelize 接入

Sequelize 的 Model 本身已经保存了字段定义。`@ako-dev/ako-js-sequelize` 可以在模型初始化后读取这些定义，再补充页面需要的元数据。数据库字段仍由 Sequelize 声明，Ako 只补充管理后台需要的显示、搜索、编辑和关联配置。适配器不导入 Sequelize，同时兼容 v6 和 v7 的模型结构。

## 安装与创建 Repository

```bash
yarn add sequelize
```

业务应用负责创建 Model，并把 `Model` 和 `Op` 中的符号传给适配器：

```ts
import { Op } from 'sequelize'
import { createSequelizeRepository } from '@ako-dev/ako-js-sequelize'

const repository = createSequelizeRepository<Student, number>({
    model: StudentModel,
    operators: {
        eq: Op.eq,
        like: Op.like,
        gt: Op.gt,
        gte: Op.gte,
        lt: Op.lt,
        lte: Op.lte,
        ne: Op.ne,
        in: Op.in,
        is: Op.is,
        not: Op.not,
    },
})
```

默认 Repository 使用 Sequelize 的 `findAndCountAll`、`findAll`、`upsert`/`create`、`update` 和 `destroy`。保存时数据中没有 ID，就调用 `upsert`（模型没有 `upsert` 时退回 `create`）；有 ID 时按主键调用 `update`。模型启用了 `paranoid` 时，删除沿用 Sequelize 的软删除；需要物理删除时设置 `force: true`。

## 选项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `model` | 必填 | Sequelize Model 类 |
| `operators` | 必填 | `Op` 中的 `eq`、`like`、`gt`、`gte`、`lt`、`lte`、`ne`、`in`、`is`、`not` |
| `idField` | `'id'` | 主键字段，用于区分新增和更新，以及默认删除 |
| `fieldMap` | 无 | Ako 字段 ID 到 Sequelize 属性或列名的映射，可以是对象或函数 |
| `findOptions` | 无 | 合并进 `findAndCountAll`、`findAll` 的额外参数 |
| `updateOptions` | 无 | 合并进 `update` 的额外参数 |
| `destroyOptions` | 无 | 合并进 `destroy` 的额外参数 |
| `force` | 不设置 | 传给 `destroy` 的 `force`，`paranoid` 模型据此决定是否物理删除 |
| `toWhere` | 默认转换 | `(filters, operators) => where`，自定义过滤条件 |
| `toOrder` | 默认转换 | `(sort, fieldMap) => order`，自定义排序 |
| `save` | 默认保存 | `(data, model) => ...`，替换默认保存逻辑 |
| `remove` | 默认删除 | `(ids, model) => ...`，替换默认删除逻辑 |

## 查询转换

| Ako | Sequelize |
| --- | --- |
| `eq` | 字段直接使用值；同一字段有多个条件时使用 `Op.eq` |
| `like` | `Op.like` |
| `gt`/`gte`/`lt`/`lte` | 对应的 `Op` 符号 |
| `ne` | `Op.ne` |
| `in` | `Op.in` |
| `isNull` | `Op.is: null` 或 `Op.not: null` |
| sort | `order: [[field, 'ASC'/'DESC']]` |
| page | `offset` + `limit` |

默认转换由包中导出的 `toSequelizeWhere` 和 `toSequelizeOrder` 完成。字段 ID 在进入适配器之前，已经由 Ako 运行时按模型字段做过白名单检查；`fieldMap` 再把 Ako 字段映射到 Sequelize 的属性或列名。

## 从 Sequelize 模型生成字段

Sequelize v6 可以通过 `getAttributes()` 或 `rawAttributes` 读取属性定义；v7 的 `modelDefinition` 同时提供规范化后的 `attributes` 和原始的 `rawAttributes`。`sequelizeFields` 按以下顺序读取：

1. `model.getAttributes()`。
2. `model.rawAttributes`。
3. `model.modelDefinition.rawAttributes`。
4. `model.modelDefinition.attributes`，支持普通对象、Map 和带 `entries()` 方法的类 Map 对象。

```ts
import { sequelizeFields } from '@ako-dev/ako-js-sequelize'

const { idField, fields } = sequelizeFields(StudentModel)
const model = defineModel({
    id: 'Student',
    name: '学生',
    idField,
    fields,
    repository,
})
```

ID 字段依次取自 `idField` 选项、已注册的模型元数据和第一个 `primaryKey: true` 的属性，都没有时为 `id`；模型中不存在该属性会直接报错。其余字段按下表推断：

| Sequelize 属性 | Ako 结果 |
| --- | --- |
| `primaryKey` 或 `autoIncrement` | 默认不可编辑 |
| `allowNull: false` | `nullable: false`，编辑时默认必填 |
| `comment` | 字段 `description` 的默认值 |
| `type.key: 'ENUM'` + `values` | `ako:enum` |
| `type.key: 'BOOLEAN'` | “是/否”枚举 |
| `type.key: 'DATE'` | `ako:timestamp`，默认格式 `YYYY-MM-DD HH:mm:ss` |
| `type.key: 'DATEONLY'` | `ako:timestamp`，格式 `YYYY-MM-DD` |
| `type.key: 'TIME'` | `ako:timestamp`，格式 `HH:mm:ss` |
| `type.key: 'VIRTUAL'` | 默认跳过；`sequelizeFields(StudentModel, { includeVirtual: true })` 可以包含进来 |
| 其他类型 | `ako:text` |

字段元数据中声明了 `mapping` 或 `type` 时，以元数据为准，不再按 Sequelize 类型推断；时间类字段的 `options` 写成字符串时会作为显示格式。

数据库的 `references`、association 和 Sequelize validator 不会被自动转换成 Ako 的 mapping 或前端校验。它们涉及数据库约束和业务规则，应通过 Ako 元数据或服务端规则显式声明。

## 在属性上添加元数据

`withAkoAttributeMetadata` 会在 Sequelize 属性定义对象上加一个 `ako` 键，存放 Ako 元数据：

```ts
import { DataTypes, Model } from 'sequelize'
import { withAkoAttributeMetadata } from '@ako-dev/ako-js-sequelize'

class StudentModel extends Model {}

StudentModel.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: withAkoAttributeMetadata(
        { type: DataTypes.STRING, allowNull: false },
        {
            name: '姓名',
            description: '学生姓名',
            searchOpt: 'like',
        },
    ),
}, { sequelize, modelName: 'Student' })
```

这种写法让页面配置紧挨着字段声明。但不同 Sequelize 版本在规范化属性和暴露 TypeScript 类型时处理方式不同，未知的 `ako` 键不一定会被保留，所以不要只依赖这一种方式。

## 使用元数据插件

更稳妥的做法是把元数据注册到模型上：

```ts
import { createSequelizeAkoMetadataPlugin } from '@ako-dev/ako-js-sequelize'

const ako = createSequelizeAkoMetadataPlugin()

ako.model(StudentModel, {
    id: 'Student',
    name: '学生',
    fields: {
        name: {
            name: '姓名',
            description: '学生姓名',
            searchOpt: 'like',
        },
    },
})
```

插件对象只是把两个函数放在一起：`ako.attribute` 等同于 `withAkoAttributeMetadata`，`ako.model` 等同于 `registerSequelizeModelMetadata`。模型元数据保存在 WeakMap 中，不会进入 SQL、Sequelize 属性定义或 HTTP 响应。接着用 `defineModelFromSequelize` 生成 Ako 模型：

```ts
const model = defineModelFromSequelize(StudentModel, {
    repository,
    parseId: (value) => Number(value),
})
```

`defineModelFromSequelize` 会合并三处配置：注册的模型元数据、属性上的 `ako` 元数据和调用时传入的选项。模型级配置的优先级是：调用时的选项 > `metadata` 选项 > 注册的元数据；几处都没有给出模型 ID 时，取 Sequelize 的 `modelName`（或模型类名）。字段元数据会覆盖按类型推断的默认值；同一字段在多处都有元数据时，调用时传入的 `metadata.fields` 优先。传入 `fields` 选项则会整体替换推断出的字段列表。

## 显式传入 `metadata`

不想使用全局 WeakMap 时，可以在生成模型时直接传入元数据：

```ts
const model = defineModelFromSequelize(StudentModel, {
    repository,
    metadata: {
        id: 'Student',
        name: '学生',
        permission: 'student:read',
        fields: {
            name: {
                name: '姓名',
                searchOpt: 'like',
            },
            groupId: {
                name: '分组',
                mapping: {
                    model: 'Group',
                    field: 'id',
                    display: 'name',
                },
            },
        },
    },
})
```

这样 Sequelize 的字段定义和 Ako 的页面配置可以分开维护，字段列表仍然从 Sequelize 模型推断。

## `sequelize-typescript`

使用 `sequelize-typescript` 时，可以继续用 `@Table`、`@Column`、`@Comment`、`@AllowNull` 等装饰器。模型初始化后，适配器照样从同一个 Sequelize Model 读取属性；额外的 Ako 元数据通过 `registerSequelizeModelMetadata` 注册：

```ts
import { registerSequelizeModelMetadata } from '@ako-dev/ako-js-sequelize'

registerSequelizeModelMetadata(StudentModel, {
    fields: {
        name: {
            name: '姓名',
            searchOpt: 'like',
        },
    },
})
```

装饰器推断出的 TypeScript 类型只用于编译期检查，决定不了 Ako 的页面组件、关联显示字段或权限，这些仍建议显式声明。

## 主键、BigInt 与响应字段

Sequelize 的 `BIGINT` 可能需要按字符串或 `bigint` 处理。可以在 Ako 模型上显式转换删除请求中的 ID：

```ts
const model = defineModelFromSequelize(AccountModel, {
    repository,
    parseId: (value) => BigInt(String(value)),
    serializeEntity: (entity) => ({
        id: String(entity.id),
        name: entity.name,
    }),
})
```

`defineModelFromSequelize` 默认调用实例的 `toJSON()` 生成响应，会输出模型的全部属性。生产环境应通过 `serializeEntity` 只返回需要公开的字段。

## 事务与 paranoid

Ako 运行时不会隐式创建 Sequelize 事务。建议在应用 service 或 Repository 回调中传入并复用事务：

```ts
const repository = createSequelizeRepository({
    model: StudentModel,
    operators,
    save: (data, model) => model.upsert(data, { transaction: currentTransaction() }),
    remove: (ids, model) => model.destroy({
        where: { id: { [Op.in]: ids } },
        transaction: currentTransaction(),
    }),
})
```

`paranoid` 模型默认由 Sequelize 排除已删除的记录，适配器不改变这一行为。租户过滤、审计、锁和业务校验仍应放在 Repository 或领域 service 中实现。

## 延伸阅读

- [适配器总览](/backend/javascript/adapters)
- [模型与元数据](/backend/javascript/models)
- [Repository 与数据访问](/backend/javascript/data-access)
- [Sequelize Model Basics](https://sequelize.org/docs/v6/core-concepts/model-basics/)
- [Sequelize TypeScript](https://sequelize.org/docs/v6/other-topics/typescript/)
- [Sequelize v7 ModelDefinition](https://sequelize.org/api/v7/classes/_sequelize_core.index.modeldefinition)
