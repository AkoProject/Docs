---
title: Prisma 接入
description: 使用 Prisma Client delegate 接入 Ako JavaScript 分页、过滤、排序、保存和删除。
---

# Prisma 接入

Ako 提供 `createPrismaRepository`，它不导入 `@prisma/client`，只接收一个 Prisma model delegate。这样 Prisma schema、生成目录和业务 client 仍然由应用自己控制。

## 安装与初始化

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

把 repository 交给 `defineModel`：

```ts
const studentModel = defineModel<Student, number>({
    id: 'Student',
    name: '学生',
    repository,
    fields: studentFields,
})
```

## 默认查询映射

adapter 使用 Prisma Client 的 `findMany` 和 `count` 完成分页：

| Ako | Prisma |
| --- | --- |
| `eq` | 字段直接使用值 |
| `like` | 首尾 `%` 映射为 `contains`、`startsWith` 或 `endsWith` |
| `gt`/`gte`/`lt`/`lte` | 同名比较对象 |
| `ne` | `{ not: value }` |
| `in` | `{ in: values }` |
| `isNull` | `{ equals: null }` 或 `{ not: null }` |
| sort | `orderBy` 数组 |
| page | `skip` + `take`，并行执行 `count` |

Prisma 官方同时支持 offset pagination 与 cursor pagination；当前 Ako adapter 对齐前端的 1-based page，使用 `skip`/`take`。如果业务要做 cursor pagination，应在自定义页面/API 中另行设计 cursor，不要把 cursor 塞进标准 `ModelPageReq`。

## 字段映射

当 Ako field ID 与 Prisma property 不同，可以提供 `fieldMap`：

```ts
const repository = createPrismaRepository({
    delegate: prisma.student,
    fieldMap: {
        createdAt: 'created_at',
    },
})
```

在 Prisma Client 中通常应优先使用 schema 暴露的 property 名称；只有 adapter 对应的是特殊 delegate 或自定义映射时，才需要使用这个选项。

## 复杂过滤器

默认 `like` 只翻译简单的首尾 `%`。以下模式无法在 Prisma 常规字符串 filter 中保持 SQL LIKE 的完全等价语义：

- 中间含有多个 `%`。
- 使用 `_` 单字符通配符。
- 需要数据库方言特有的大小写或正则匹配。

对这些情况提供 `toWhere`：

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

`toWhere` 收到的过滤器已经通过 Ako 字段白名单，但仍要对白名单字段做最终映射。不要把 `filter.field` 直接拼到 raw SQL。

## 保存与删除

默认行为是：没有 ID 时调用 `delegate.create({ data })`，有 ID 时调用 `delegate.update({ where, data })`；批量删除调用 `delegate.deleteMany`：

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

`bigint` ID 要在模型上配合 `parseId`，并在 repository 的 Prisma 类型中保持 bigint；响应序列化会把它转成字符串。

## 事务与租户

Prisma 的交互式 `$transaction` 应由应用 service 或 repository callback 管理。不要为了适配 Ako 而在每个 `page` 查询中隐式创建事务。

行级和租户级条件也应由 repository 统一加入：

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

前端能看到的菜单、`permission` 和按钮不属于权限系统；repository 必须在 `page`、`save` 和 `delete` 内再次检查当前用户。

## 进一步阅读

- [适配器总览](/backend/javascript/adapters)
- [Repository 与数据访问](/backend/javascript/data-access)
- [Prisma pagination](https://www.prisma.io/docs/orm/v6/prisma-client/queries/pagination)
- [Prisma filtering and sorting](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/filtering-and-sorting)
