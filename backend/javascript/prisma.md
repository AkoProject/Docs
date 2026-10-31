---
title: Prisma 接入
description: 用 Prisma Client 的 model delegate 创建 Ako Repository，支持分页、过滤、排序、保存和删除。
---

# Prisma 接入

`@ako-dev/ako-js-prisma` 提供 `createPrismaRepository`，用一个 Prisma model delegate（如 `prisma.student`）创建 Ako Repository。适配器不导入 `@prisma/client`，Prisma schema、生成目录和 client 实例都由应用自己管理，支持 Prisma 5 及以上版本。

## 安装与创建 Repository

```bash
yarn add @prisma/client
yarn add -D prisma
```

```ts
import { PrismaClient } from '@prisma/client'
import { createPrismaRepository } from '@ako-dev/ako-js-prisma'

const prisma = new PrismaClient()

const repository = createPrismaRepository<Student, number>({
    delegate: prisma.student,
    idField: 'id',
})
```

把 Repository 交给 `defineModel`：

```ts
const studentModel = defineModel<Student, number>({
    id: 'Student',
    name: '学生',
    repository,
    fields: studentFields,
})
```

## 选项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `delegate` | 必填 | Prisma model delegate，需要有 `findMany`、`count`、`create`、`update`、`deleteMany` |
| `idField` | `'id'` | 主键字段，用于区分新增和更新，以及默认删除 |
| `fieldMap` | 无 | Ako 字段 ID 到 Prisma 属性名的映射，可以是对象或函数 |
| `toWhere` | 默认转换 | `(filters) => where`，自定义过滤条件 |
| `toOrderBy` | 默认转换 | `(sort) => orderBy`，自定义排序 |
| `save` | 默认保存 | `(data, delegate) => ...`，替换默认的新增/更新逻辑 |
| `remove` | 默认删除 | `(ids, delegate) => ...`，替换默认的批量删除逻辑 |

## 查询转换

分页时适配器并行调用 `findMany` 和 `count`。默认转换规则如下：

| Ako | Prisma |
| --- | --- |
| `eq` | 字段直接使用值 |
| `like` | 按首尾 `%` 转换为 `contains`、`startsWith` 或 `endsWith`；不含通配符时为 `contains` |
| `gt`/`gte`/`lt`/`lte` | 同名比较条件 |
| `ne` | `{ not: value }` |
| `in` | `{ in: values }` |
| `isNull` | `{ equals: null }` 或 `{ not: null }` |
| sort | `orderBy` 数组 |
| page | `skip` + `take`，同时执行 `count` |

默认转换由包中导出的 `toPrismaWhere` 和 `toPrismaOrderBy` 完成，自定义 `toWhere`、`toOrderBy` 时可以复用。

Prisma 同时支持 offset 分页和 cursor 分页。Ako 前端使用从 1 开始的页码，所以适配器用 `skip`/`take`。如果业务需要 cursor 分页，请在自定义页面或接口中单独设计，不要把 cursor 塞进标准的 `model/page` 请求体。

## 字段映射

Ako 字段 ID 与 Prisma 属性名不一致时，用 `fieldMap` 映射：

```ts
const repository = createPrismaRepository({
    delegate: prisma.student,
    fieldMap: {
        createdAt: 'created_at',
    },
})
```

Prisma Client 中通常直接使用 schema 暴露的属性名，只有 delegate 比较特殊或者需要自定义映射时才用这个选项。`fieldMap` 同样作用于 `idField`。

## 复杂过滤条件

默认的 `like` 只处理首尾的 `%`。下面几种模式无法用 Prisma 的普通字符串条件准确表达 SQL LIKE：

- 中间含有 `%`。
- 使用 `_` 单字符通配符。
- 需要数据库方言特有的大小写或正则匹配。

前两种情况适配器会直接抛出错误，提示改用 `toWhere`。这时自己提供转换：

```ts
const repository = createPrismaRepository({
    delegate: prisma.student,
    toWhere(filters) {
        return {
            AND: filters.map((filter) => toStudentWhere(filter)),
        }
    },
})
```

`toWhere` 收到的过滤条件已经过 Ako 的字段白名单检查，但字段名到 Prisma 属性的映射仍要自己完成，`fieldMap` 不会作用于自定义的 `toWhere`。不要把 `filter.field` 直接拼进 raw SQL。

## 保存与删除

默认保存逻辑是：数据中没有 ID（`undefined`、`null` 或空字符串）时调用 `delegate.create({ data })`，有 ID 时调用 `delegate.update({ where, data })`。默认删除调用 `delegate.deleteMany`。需要附加条件时，用 `remove` 替换：

```ts
const repository = createPrismaRepository<Account, bigint>({
    delegate: prisma.account,
    idField: 'id',
    remove: async (ids, delegate) => {
        await delegate.deleteMany({
            where: {
                id: { in: ids },
                // 额外的租户条件应从服务端上下文取得。
            },
        })
    },
})
```

`bigint` 主键要在模型上配置 `parseId`，并在 Repository 的 Prisma 类型中保持 `bigint`。返回给前端时，Ako 会把 `bigint` 序列化成字符串。

## 事务与租户

Prisma 的交互式 `$transaction` 应由应用的 service 或 Repository 回调管理。不要为了接入 Ako 在每次 `page` 查询时隐式开启事务。

行级和租户级条件也应由 Repository 统一加上：

```ts
function toStudentWhere(filters, userId: string) {
    return {
        AND: [
            { ownerId: userId },
            ...filters.map(toAllowedStudentCondition),
        ],
    }
}
```

前端看到的菜单、`permission` 和按钮不是权限控制。Repository 必须在 `page`、`save` 和 `delete` 中再次检查当前用户。

## 延伸阅读

- [适配器总览](/backend/javascript/adapters)
- [Repository 与数据访问](/backend/javascript/data-access)
- [Prisma pagination](https://www.prisma.io/docs/orm/v6/prisma-client/queries/pagination)
- [Prisma filtering and sorting](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/filtering-and-sorting)
