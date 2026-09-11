---
title: Drizzle 接入
description: 使用 Drizzle 的列、operators 和 query builder callback 接入 Ako JavaScript。
---

# Drizzle 接入

Drizzle 的列对象、SQL expression 和查询 builder 会随数据库方言变化。Ako 的 `createDrizzleRepository` 不猜测这些细节，而是注入 `columns`、`operators`、`select`、`count`、`save` 和 `delete`。

## 安装与列映射

```bash
yarn add drizzle-orm
```

```ts
import {
    and,
    asc,
    desc,
    eq,
    gt,
    gte,
    inArray,
    isNotNull,
    isNull,
    like,
    lt,
    lte,
    ne,
} from 'drizzle-orm'
import { createDrizzleRepository } from '@ako-dev/ako-js-drizzle'

const repository = createDrizzleRepository<Student, number>({
    columns: {
        id: students.id,
        name: students.name,
        age: students.age,
    },
    operators: {
        eq,
        like,
        gt,
        gte,
        lt,
        lte,
        ne,
        inArray,
        isNull,
        isNotNull,
        and,
        asc,
        desc,
    },
    select: selectStudents,
    count: countStudents,
    save: saveStudent,
    delete: deleteStudents,
})
```

`columns` 是 Ako field ID 到 Drizzle column 的白名单。没有注册的字段不会进入查询表达式。

## 实现 select 与 count

`select` callback 负责把 Ako 的 `where`、`orderBy`、`limit` 和 `offset` 接到 Drizzle builder：

```ts
async function selectStudents({ where, orderBy, limit, offset }) {
    let query = db.select().from(students)
    if (where) query = query.where(where)
    if (orderBy.length > 0) query = query.orderBy(...orderBy)
    if (limit !== undefined) query = query.limit(limit)
    if (offset !== undefined) query = query.offset(offset)
    return query
}

async function countStudents(where) {
    const rows = await db.select({ count: sql<number>`count(*)` })
        .from(students)
        .where(where)
    return Number(rows[0]?.count ?? 0)
}
```

实际项目中 `sql`、返回值类型和 builder 的泛型会由 Drizzle dialect 决定；adapter 不强行把它们抹平。

## 查询表达式

默认转换为：

| Ako | Drizzle operator |
| --- | --- |
| `eq` | `eq(column, value)` |
| `like` | `like(column, value)` |
| `gt`/`gte`/`lt`/`lte` | 对应比较函数 |
| `ne` | `ne(column, value)` |
| `in` | `inArray(column, values)` |
| `isNull` | `isNull`/`isNotNull` |
| sort | `asc`/`desc` |
| page | `limit` + `offset` |

Drizzle 官方的 select API 同时提供 `limit`、`offset` 和 `orderBy`；Ako 默认排序会带上主键，避免分页没有稳定顺序。

## 自定义过滤与关系查询

对于关联查询、租户条件、软删除或 PostgreSQL 特有表达式，使用 `toWhere` 和 `toOrderBy`：

```ts
const repository = createDrizzleRepository({
    columns,
    operators,
    toWhere(filters, columns, operators) {
        const tenant = eq(columns.tenantId, currentTenantId())
        const userFilters = toAllowedExpressions(filters, columns, operators)
        return operators.and(tenant, ...userFilters)
    },
    select: selectStudents,
    count: countStudents,
    save: saveStudent,
    delete: deleteStudents,
})
```

用户输入只能作为 expression 的值传给 Drizzle，不能拼接为 `sql` 字符串。TypeORM 官方文档也对 raw query 的用户输入给出了同样的参数绑定安全要求。

## 保存与删除

Drizzle 的 insert/update/delete 写法依赖表定义和数据库 dialect，建议封装在 callback：

```ts
async function saveStudent(data) {
    if (data.id === undefined) {
        return db.insert(students).values(data).returning()
    }
    return db.update(students)
        .set(data)
        .where(eq(students.id, data.id))
        .returning()
}

async function deleteStudents(ids) {
    await db.delete(students).where(inArray(students.id, ids))
}
```

如果数据库使用事务、软删除或审计字段，在这些 callback 中统一处理；不要在通用 Ako handler 中依赖某个 dialect 的事务 API。

## 进一步阅读

- [适配器总览](/backend/javascript/adapters)
- [Repository 与数据访问](/backend/javascript/data-access)
- [Drizzle Select](https://orm.drizzle.team/docs/select)
