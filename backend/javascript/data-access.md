---
title: Repository 与数据访问
description: 把 Ako JavaScript 后端接到 Prisma、Drizzle、TypeORM、SQL 或其他数据访问实现上。
---

# Repository 与数据访问

Ako JavaScript 不内置 ORM，数据访问统一通过 `AkoRepository` 这个很小的接口完成。它接收已经按字段白名单校验过的查询条件，返回分页数据，并负责保存、删除和关联数据的列表查询。

## Repository 接口

```ts
interface AkoRepository<TEntity extends object, TId> {
    page(query: AkoPageQuery): Promise<{
        total: number
        entities: readonly TEntity[]
    }>
    list(query: AkoListQuery): Promise<readonly TEntity[]>
    save(data: Readonly<Record<string, unknown>>): Promise<unknown>
    delete(ids: readonly TId[]): Promise<void>
}
```

也可以用 `createRepository` 来创建。传给它的回调既可以是异步函数，也可以是同步函数：

```ts
const studentRepository = createRepository<Student, number>({
    async page(query) {
        return studentDataSource.page(query)
    },
    async list(query) {
        return studentDataSource.list(query)
    },
    async save(data) {
        return studentDataSource.save(data)
    },
    async delete(ids) {
        await studentDataSource.delete(ids)
    },
})
```

Repository 不关心 HTTP 路径，也不应该直接读取浏览器传来的原始查询对象。这样，Express、Fastify 的请求绑定，Ako 的字段白名单校验，以及 ORM 查询语句，三者可以分开测试。

## 查询计划

前端发来的请求体：

```json
{
    "page": 1,
    "size": 20,
    "params": {
        "name_like": "%Alice%",
        "age_gte": 18
    },
    "sort": {
        "age": "desc",
        "id": "asc"
    }
}
```

会被转换成与 ORM 无关的结构：

```ts
{
    page: 1,
    size: 20,
    filters: [
        { field: 'name', operator: 'like', value: '%Alice%' },
        { field: 'age', operator: 'gte', value: 18 },
    ],
    sort: [
        { field: 'age', direction: 'desc' },
        { field: 'id', direction: 'asc' },
    ],
}
```

支持的操作符与接口规范一致：

| 操作符 | 含义 | 实现 Repository 时注意 |
| --- | --- | --- |
| `eq` | 等于 | 直接对应 ORM 的等值条件。 |
| `like` | 模糊匹配 | 前端会先把输入包成 `%...%`。 |
| `gt`/`gte` | 大于/大于等于 | 按字段类型转换为数值或时间。 |
| `lt`/`lte` | 小于/小于等于 | 注意时区和边界精度。 |
| `ne` | 不等于 | 要想清楚数据库对 `NULL` 怎么处理。 |
| `in` | 属于集合 | 只接受白名单字段和集合值。 |
| `isNull` | 是否为空 | `true` 表示为空，`false` 表示不为空。 |

`page` 从 1 开始计数，Repository 可以在内部换算成 ORM 需要的 offset 或从 0 开始的页码。请求没有传 `sort` 时，运行时会按模型主键升序排序，保证页面首次加载的顺序稳定。

## 对接 ORM

客户端传来的 `field`、`operator` 和排序方向，绝不能直接拼进 SQL。应该先建立字段白名单，再把查询计划转换成 ORM 的查询：

```ts
const studentRepository = createRepository<Student, number>({
    async page(query) {
        const where = toStudentWhere(query.filters)
        const orderBy = toStudentOrderBy(query.sort)

        const [entities, total] = await Promise.all([
            prisma.student.findMany({
                where,
                orderBy,
                skip: (query.page - 1) * query.size,
                take: query.size,
            }),
            prisma.student.count({ where }),
        ])

        return { total, entities }
    },
    async list(query) {
        return prisma.student.findMany({
            where: toStudentWhere(query.filters),
            take: query.limit,
        })
    },
    async save(data) {
        return saveStudentWithDomainValidation(data)
    },
    async delete(ids) {
        await prisma.student.deleteMany({ where: { id: { in: ids } } })
    },
})
```

上例中的 `toStudentWhere` 和 `toStudentOrderBy` 需要业务代码自己实现。Prisma、Drizzle、TypeORM 和各种 SQL 构建器在空值、模糊匹配、大小写和日期上的行为各不相同，Ako 核心无法替 ORM 做这些假设。

## 字段值转换

如果 ORM 需要把 JSON 中的字符串转成数字、UUID、日期或其他类型，可以给字段提供 `parseQueryValue`：

```ts
defineField<Student>({
    id: 'age',
    name: '年龄',
    parseQueryValue(value, operator) {
        if (operator === 'in' && Array.isArray(value)) {
            return value.map((item) => Number(item))
        }
        const result = Number(value)
        if (!Number.isFinite(result)) {
            throw new Error('age must be numeric')
        }
        return result
    },
})
```

分页查询时，转换抛出的异常会变成 `400 bad_request` 响应。Repository 拿到的已经是转换后的值，但仍要做自己的领域校验。

## 关联信息查询

`mappingField` 会收集当前页实体中的关联 ID，然后调用目标模型 Repository 的 `list`：

```ts
const groupRepository = createRepository<Group, number>({
    async page(query) {
        return groupDataSource.page(query)
    },
    async list(query) {
        return groupDataSource.list(query)
    },
    async save(data) {
        return groupDataSource.save(data)
    },
    async delete(ids) {
        await groupDataSource.delete(ids)
    },
})
```

传给 `list` 的过滤条件是目标字段的 `in`，`limit` 等于当前页里实际出现的不同关联 ID 的数量。运行时同样会检查目标模型的 `authorize`，没有读取权限的关联模型不会写进 `information`。

即使某个模型用不到关联字段，也要实现 `list`。它是接口的一部分，这样同一种 Repository 类型才能给任意模型复用。

## 保存、删除与 ID

`save` 接收一个 JSON 对象。是新增还是更新、允许写哪些字段、唯一性约束、业务状态流转和审计，都由 Repository 或领域服务决定。需要在保存前做校验时，可以用 `beforeSave`：

```ts
const model = defineModel({
    id: 'Student',
    name: '学生',
    repository: studentRepository,
    beforeSave: async ({ data }) => {
        if (typeof data.name !== 'string' || data.name.trim() === '') {
            throw badRequest('姓名不能为空')
        }
    },
    fields: studentFields,
})
```

删除请求中的 ID 默认按 JSON 原值传递。UUID、`bigint` 或 ORM 专用的 ID 类型可以用 `parseId` 转换：

```ts
const accountModel = defineModel<Account, bigint>({
    id: 'Account',
    name: '账户',
    parseId: (value) => BigInt(String(value)),
    repository: accountRepository,
    fields: accountFields,
})
```

`parseId` 抛出异常时，请求会以 `400` 结束。响应中的 `bigint` 会序列化为十进制字符串，避免前端 `number` 丢失精度。但服务端仍要检查这些 ID 是否属于当前用户、租户或授权范围。

## 事务、软删除和并发

不同 ORM 和宿主框架的事务模型差别很大，所以 Ako 的运行时不负责开启事务。一次操作的事务范围应由 Repository 或应用服务保证：

- `page` 中的计数和数据查询是否放在同一事务里，取决于数据库和业务对一致性的要求。
- `save` 的校验、唯一索引、审计和事件发布，应在同一个业务事务中协调。
- `delete` 如果做成软删除，应在 Repository 中更新删除标记，并让 `page`、`list` 默认排除已删除的行。
- 批量删除要限制数量、逐个检查 ID 的权限，并根据 ORM 的事务能力决定是否保证原子性。

## 内存 Repository

做原型或测试接口时可以用：

```ts
const repository = createMemoryRepository<Student, number>(
    [{ id: 1, name: 'Alice' }],
    {
        idField: 'id',
        createId: (data, entities) => entities.length + 1,
    },
)
```

它支持过滤、排序、分页、保存和删除，但没有事务、并发控制和持久化，不能代替生产数据库。
