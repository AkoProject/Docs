---
title: Repository 与数据访问
description: 将 Ako JavaScript 后端接入 Prisma、Drizzle、TypeORM、SQL 或其他数据访问实现。
---

# Repository 与数据访问

Ako JavaScript 不内置 ORM。`AkoRepository` 是一个很小的适配边界：它接收已经通过 Ako 白名单解析的查询计划，返回分页实体，并负责保存、删除和关联列表查询。

## Repository 合约

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

也可以用 `createRepository` 包装同步 callback：

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

repository 不需要知道 HTTP 路径，也不应直接读取浏览器的原始查询对象。这样可以把 Express/Fastify 的请求绑定、Ako 的查询白名单和 ORM 的查询语句分开测试。

## 查询计划

前端请求中的：

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

会被转换成 ORM 无关的结构：

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

支持的操作符与协议一致：

| 操作符 | 含义 | repository 注意事项 |
| --- | --- | --- |
| `eq` | 等于 | 直接映射到 ORM 的等值条件。 |
| `like` | 模糊匹配 | 前端通常已将输入包装成 `%...%`。 |
| `gt`/`gte` | 大于/大于等于 | 根据字段类型转换数值或时间。 |
| `lt`/`lte` | 小于/小于等于 | 注意时区和边界精度。 |
| `ne` | 不等于 | 需要明确数据库对 `NULL` 的语义。 |
| `in` | 在集合中 | 只接受白名单字段和集合值。 |
| `isNull` | 是否为空 | 本实现中 `true` 表示为空，`false` 表示非空。 |

`page` 始终是 1-based；repository 可以在内部转换为 ORM 的 offset 或 zero-based page。没有传 `sort` 时，runtime 会按模型主键升序排序，便于页面首次加载稳定复现。

## Prisma/Drizzle 等 ORM 的适配思路

不要把客户端传入的 `field`、`operator` 或排序方向直接拼接到 SQL。先建立字段白名单，再把 canonical query 映射到 ORM：

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

上例中的 `toStudentWhere` 和 `toStudentOrderBy` 应由业务 adapter 自己实现。Prisma、Drizzle、TypeORM 和 SQL builder 的空值、模糊匹配、大小写和日期行为不完全相同，不能由 Ako 核心替 ORM 做假设。

## 字段值转换

如果 ORM 需要把 JSON 字符串转成数字、UUID、日期或其他值，可以在字段上提供 `parseQueryValue`：

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

转换失败会被 handler 转成 `400 bad_request`。repository 收到的已经是转换后的值，但仍应执行自己的领域校验。

## 关联信息查询

`mappingField` 会在当前页实体中收集关联 ID，并调用目标模型的 `repository.list`：

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

`list` 的过滤条件是目标字段的 `in`，数量上限是当前页中实际出现的关联 ID 数量。目标模型的 `authorize` 也会被检查；没有权限读取的关联模型不会被塞进 `information`。

如果一个模型不需要关联字段，`list` 仍然是合约的一部分，以便同一套 repository 类型可以被任意模型复用。

## 保存、删除与 ID

`save` 接收一个 JSON 对象。新增还是更新、字段允许列表、唯一性、业务状态转换和审计，应由 repository 或领域服务决定：

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

删除请求中的 ID 默认按 JSON 值传递；UUID、`bigint` 或 ORM 专用类型可以用 `parseId` 转换：

```ts
const accountModel = defineModel<Account, bigint>({
    id: 'Account',
    name: '账户',
    parseId: (value) => BigInt(String(value)),
    repository: accountRepository,
    fields: accountFields,
})
```

协议响应中的 `bigint` 会序列化为十进制字符串，避免前端 `number` 精度不足。数据库端仍然必须检查 ID 是否属于当前用户、租户或授权范围。

## 事务、软删除和并发

Ako runtime 不包裹事务，因为不同 ORM 和宿主框架的事务模型不同。推荐由 repository 或应用 service 保证一次操作的边界：

- `page` 的 count 与 entities 查询是否需要同一事务，由数据库和业务一致性要求决定。
- `save` 的校验、唯一索引、审计和事件发布应在同一业务事务中协调。
- `delete` 如果实现软删除，应在 repository 内更新删除标记，并让 `page`/`list` 默认排除已删除行。
- 对批量删除要限制数量、检查每个 ID 的权限，并根据 ORM 的事务能力决定原子性。

## 内存 repository

原型或协议测试可以使用：

```ts
const repository = createMemoryRepository<Student, number>(
    [{ id: 1, name: 'Alice' }],
    {
        idField: 'id',
        createId: (data, entities) => entities.length + 1,
    },
)
```

它支持过滤、排序、分页、保存和删除，但不提供事务、并发控制或持久化能力。不要把它当作生产数据库替代品。
