---
title: TypeORM 接入
description: 使用 TypeORM Repository 与 Find Operators 接入 Ako JavaScript 查询和分页。
---

# TypeORM 接入

`createTypeOrmRepository` 接受 TypeORM `Repository` 和 Find Operators，不把 TypeORM 加入 Ako 的运行时依赖。它使用 `findAndCount` 实现分页，使用 `find` 实现关联字段的列表查询。

## 安装与创建 repository

```bash
yarn add typeorm
```

```ts
import {
    And,
    In,
    IsNull,
    LessThan,
    LessThanOrEqual,
    Like,
    MoreThan,
    MoreThanOrEqual,
    Not,
} from 'typeorm'
import { createTypeOrmRepository } from '@ako-dev/ako-js-typeorm'

const repository = createTypeOrmRepository<Student, number>({
    repository: dataSource.getRepository(StudentEntity),
    operators: {
        Like,
        MoreThan,
        MoreThanOrEqual,
        LessThan,
        LessThanOrEqual,
        Not,
        In,
        IsNull,
        And,
    },
})
```

## 查询映射

| Ako | TypeORM |
| --- | --- |
| `eq` | 字段直接使用值 |
| `like` | `Like(value)` |
| `gt`/`gte`/`lt`/`lte` | 对应 `MoreThan` 等 Find Operator |
| `ne` | `Not(value)` |
| `in` | `In(values)` |
| `isNull` | `IsNull()` 或 `Not(IsNull())` |
| sort | `order` 对象，使用 `ASC`/`DESC` |
| page | `skip` + `take` |

TypeORM 的 `findAndCount` 会返回实体和符合条件的总数；分页选项中的 `skip`/`take` 不会影响 count。MSSQL 等 dialect 在使用 `take` 时还需要稳定的 `order`，Ako 默认会发送主键排序。

## 同一字段多个条件

以下请求会在同一个字段上产生多个比较：

```json
{
    "params": {
        "age_gte": 18,
        "age_lte": 60
    }
}
```

adapter 需要 `And` 才能合并两个 Find Operators：

```ts
const repository = createTypeOrmRepository({
    repository: dataSource.getRepository(StudentEntity),
    operators: {
        Like,
        MoreThan,
        MoreThanOrEqual,
        LessThan,
        LessThanOrEqual,
        Not,
        In,
        IsNull,
        And,
    },
})
```

如果没有提供 `And`，adapter 会抛出明确错误，不会静默覆盖前一个条件。

## 字段与列名

Ako field ID 通常使用实体 property 名称；数据库列名由 TypeORM 的 `@Column({ name })` 处理。如果 adapter 需要直接使用另一组 property，可以用 `fieldMap`：

```ts
const repository = createTypeOrmRepository({
    repository: dataSource.getRepository(StudentEntity),
    fieldMap: {
        createdAt: 'createdAt',
    },
    operators,
})
```

不要把数据库列名或客户端任意字符串直接交给 `QueryBuilder`。fieldMap 也应当是固定配置，而不是从请求参数生成。

## 保存、删除与软删除

默认保存流程是 `repository.create(data)` + `repository.save(entity)`；默认删除流程使用 `In(ids)` 生成批量条件：

```ts
const repository = createTypeOrmRepository<User, string>({
    repository: dataSource.getRepository(UserEntity),
    operators,
    idField: 'uuid',
})
```

如果实体使用 `@DeleteDateColumn`，TypeORM 默认查询会排除软删除记录。Ako adapter 不覆盖这个行为；需要显式恢复或包含已删除记录时，应在自定义 callback 或单独业务 API 中处理。

## 事务与领域服务

TypeORM 的 transaction、QueryRunner 和 subscriber 属于应用数据层。要让保存与审计、事件或额外表更新处于同一事务，使用自定义 `save` callback 或在调用 Ako 之外包裹应用 service；不要把事务对象放进前端数据。

## 进一步阅读

- [适配器总览](/backend/javascript/adapters)
- [Repository 与数据访问](/backend/javascript/data-access)
- [TypeORM Find Options](https://typeorm.io/docs/working-with-entity-manager/find-options/)
- [TypeORM EntityManager API](https://typeorm.io/docs/working-with-entity-manager/entity-manager-api/)
