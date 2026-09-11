---
title: Sequelize 接入
description: 读取 Sequelize schema、生成 Ako 字段元数据，并接入查询、保存、删除和自定义标记。
---

# Sequelize 接入

Sequelize 的 Model 本身已经保存了字段 schema；Ako adapter 可以在模型初始化后读取这些信息，再补充页面层 metadata。这样数据库字段声明仍然由 Sequelize 负责，Ako 只增加管理后台需要的显示、搜索、编辑和关联配置。

## 安装与 repository

```bash
yarn add sequelize
```

Ako adapter 不直接导入 Sequelize。业务应用负责创建 Model，并把 `Model` 与 `Op` 符号注入：

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

默认 repository 使用 Sequelize 的 `findAndCountAll`、`findAll`、`create`/`update` 和 `destroy`。如果模型启用了 `paranoid`，删除会沿用 Sequelize 的软删除行为；需要物理删除时显式设置 `force`。

## 查询映射

| Ako | Sequelize |
| --- | --- |
| `eq` | 字段直接使用值；同字段有多个条件时使用 `Op.eq` |
| `like` | `Op.like` |
| `gt`/`gte`/`lt`/`lte` | 对应 `Op` 符号 |
| `ne` | `Op.ne` |
| `in` | `Op.in` |
| `isNull` | `Op.is: null` 或 `Op.not: null` |
| sort | `order: [[field, 'ASC'/'DESC']]` |
| page | `offset` + `limit` |

字段 ID 已经由 Ako runtime 按模型 schema 白名单检查；`fieldMap` 可以把 Ako 字段映射到 Sequelize attribute/column 名称。

## 从 Sequelize schema 生成字段

Sequelize v6 可以通过 `getAttributes()` 或 `rawAttributes` 读取属性配置。Sequelize v7 的 `modelDefinition` 同时提供规范化 `attributes` 和原始 `rawAttributes`。项目中的 `sequelizeFields` 按以下顺序读取：

1. `model.getAttributes()`。
2. `model.rawAttributes`。
3. `model.modelDefinition.rawAttributes`。
4. `model.modelDefinition.attributes`，兼容 object、Map 和 Map-like `entries()`。

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

当前自动推断：

| Sequelize 属性 | Ako 结果 |
| --- | --- |
| `primaryKey`/`autoIncrement` | ID 字段，默认不可编辑。 |
| `allowNull: false` | `nullable: false`，默认编辑必填。 |
| `comment` | 字段 `description` 的默认来源。 |
| `type.key: 'ENUM'` + `values` | `ako:enum`。 |
| `type.key: 'BOOLEAN'` | “是/否”枚举。 |
| `type.key: 'DATE'` | `ako:timestamp`，默认格式 `YYYY-MM-DD HH:mm:ss`。 |
| `type.key: 'DATEONLY'` | `ako:timestamp`，格式 `YYYY-MM-DD`。 |
| `type.key: 'TIME'` | `ako:timestamp`，格式 `HH:mm:ss`。 |
| `type.key: 'VIRTUAL'` | 默认跳过；`sequelizeFields({ includeVirtual: true })` 可显式包含。 |

数据库 `references`、association 和 Sequelize validator 不会被擅自变成 Ako mapping 或浏览器校验。它们带有数据库和领域语义，应通过 Ako metadata 或服务端规则显式表达。

## 直接添加属性级 metadata

Ako 提供 `withAkoAttributeMetadata`，给 Sequelize attribute object 增加一个命名空间内的 `ako` 标记：

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

属性标记适合让页面配置靠近字段声明。由于不同 Sequelize 版本对属性规范化和 TypeScript 类型的暴露方式不同，不能只依赖未知 `ako` 键一定会被保留。

## 使用 metadata plugin

更稳妥的方式是使用项目提供的 plugin facade：

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

模型 metadata 保存在 WeakMap 中，不会进入 SQL、Sequelize attribute 或 HTTP 响应。然后用 `defineModelFromSequelize` 合成 Ako model：

```ts
const model = defineModelFromSequelize(StudentModel, {
    repository,
    parseId: (value) => Number(value),
})
```

`defineModelFromSequelize` 会合并注册的模型 metadata、属性上的 `ako` metadata 和调用处的显式 options；调用处的 model options 优先，字段级 metadata 会覆盖相同字段的推断默认值。

## 显式 `metadata` 选项

不想使用全局 WeakMap 时，也可以在合成模型时传入 metadata：

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

这样可以把 Sequelize schema 和 Ako 页面 schema 分开维护，同时仍然从 Sequelize 原生模型推断字段列表。

## `sequelize-typescript`

如果业务使用 `sequelize-typescript`，可以继续使用 `@Table`、`@Column`、`@Comment`、`@AllowNull` 等装饰器。模型初始化后，adapter 仍然从同一个 Sequelize Model 读取属性；额外 Ako metadata 可以通过 `registerSequelizeModelMetadata` 注册：

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

装饰器推断出的 TypeScript 属性类型只解决编译期类型检查，不能自动决定 Ako 页面组件、关联显示字段或权限；这些信息仍建议显式声明。

## 主键、BigInt 与响应安全

Sequelize 的 `BIGINT` 可能需要按字符串或 `bigint` 处理。Ako model 可以显式转换删除请求的 ID：

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

不要依赖 Sequelize Model instance 的所有可枚举属性自动成为 HTTP 响应；生产模型应使用 `serializeEntity` 投影公开字段。

## 事务与 paranoid

Ako runtime 不隐式创建 Sequelize transaction。推荐在应用 service 或 repository callback 中传入并复用 transaction：

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

`paranoid` 模型默认由 Sequelize 排除已删除记录；Ako adapter 不改变这个语义。租户过滤、审计、锁和业务校验仍应在 repository/领域 service 中实现。

## 下一步

- [适配器总览](/backend/javascript/adapters)
- [模型与元数据](/backend/javascript/models)
- [Repository 与数据访问](/backend/javascript/data-access)
- [Sequelize Model Basics](https://sequelize.org/docs/v6/core-concepts/model-basics/)
- [Sequelize TypeScript](https://sequelize.org/docs/v6/other-topics/typescript/)
- [Sequelize v7 ModelDefinition](https://sequelize.org/api/v7/classes/_sequelize_core.index.modeldefinition)
