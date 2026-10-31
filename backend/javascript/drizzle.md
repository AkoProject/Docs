---
title: Drizzle 接入
description: 通过注入 Drizzle 的列、操作符函数和查询回调创建 Ako Repository。
---

# Drizzle 接入

Drizzle 的列对象、SQL 表达式和查询 builder 随数据库方言而变。`@ako-dev/ako-js-drizzle` 提供的 `createDrizzleRepository` 不去猜这些细节，而是由应用注入 `columns`、`operators` 以及 `select`、`count`、`save`、`delete` 四个回调。适配器不导入 `drizzle-orm`，支持 0.30 及以上版本。

## 安装与创建 Repository

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

`columns` 是 Ako 字段 ID 到 Drizzle 列的白名单。过滤或排序用到了没有注册的字段时，适配器会直接抛出错误。

## 选项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `columns` | 必填 | Ako 字段 ID 到 Drizzle 列的映射 |
| `operators` | 必填 | 从 `drizzle-orm` 导入的 `eq`、`like`、`gt`、`gte`、`lt`、`lte`、`ne`、`inArray`、`isNull`、`isNotNull`、`and`、`asc`、`desc` |
| `select` | 必填 | `({ where, orderBy, limit, offset }) => rows`，执行查询 |
| `count` | 必填 | `(where) => number`，统计总数 |
| `save` | 必填 | `(data) => ...`，新增或更新 |
| `delete` | 必填 | `(ids) => ...`，批量删除 |
| `toWhere` | 默认转换 | `(filters, columns, operators) => where`，自定义过滤条件 |
| `toOrderBy` | 默认转换 | `(sort, columns, operators) => orderBy[]`，自定义排序 |

## 实现 select 与 count

`select` 回调负责把 Ako 生成的 `where`、`orderBy`、`limit` 和 `offset` 交给 Drizzle builder：

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

没有过滤条件时 `where` 为 `undefined`。解析关联字段（mapping）的显示值时，适配器也会调用 `select`，这时不传 `offset`。`sql` 的写法、返回值类型和 builder 泛型都由 Drizzle 方言决定，适配器不强行统一。

## 查询转换

默认转换规则如下：

| Ako | Drizzle 操作符 |
| --- | --- |
| `eq` | `eq(column, value)` |
| `like` | `like(column, value)` |
| `gt`/`gte`/`lt`/`lte` | 对应的比较函数 |
| `ne` | `ne(column, value)` |
| `in` | `inArray(column, values)` |
| `isNull` | `isNull`/`isNotNull` |
| sort | `asc`/`desc` |
| page | `limit` + `offset` |

多个过滤条件用 `and` 组合。默认转换由包中导出的 `toDrizzleWhere` 和 `toDrizzleOrderBy` 完成，自定义时可以复用。

Drizzle 的 select API 提供 `limit`、`offset` 和 `orderBy`。请求没有指定排序时，Ako 会按主键升序排序，保证分页顺序稳定。

## 自定义过滤与关联查询

关联查询、租户条件、软删除或 PostgreSQL 特有的表达式，用 `toWhere` 和 `toOrderBy` 处理：

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

用户输入只能作为表达式的值传给 Drizzle，不能拼进 `sql` 字符串。

## 保存与删除

Drizzle 的 insert、update、delete 写法依赖表定义和数据库方言，所以由回调实现：

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

事务、软删除和审计字段都在这些回调里统一处理，不要让通用的 Ako 请求处理函数依赖某个方言的事务 API。

## 延伸阅读

- [适配器总览](/backend/javascript/adapters)
- [Repository 与数据访问](/backend/javascript/data-access)
- [Drizzle Select](https://orm.drizzle.team/docs/select)
