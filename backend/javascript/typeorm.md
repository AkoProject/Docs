---
title: TypeORM 接入
description: 用 TypeORM 的 Repository 和 Find Operators 创建 Ako Repository，支持查询、分页、保存和删除。
---

# TypeORM 接入

`@ako-dev/ako-js-typeorm` 提供 `createTypeOrmRepository`，接收一个 TypeORM `Repository` 和一组 Find Operators，创建 Ako Repository。适配器不导入 TypeORM，支持 0.3 及以上版本。分页使用 `findAndCount`，解析关联字段的显示值时使用 `find`。

## 安装与创建 Repository

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

## 选项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `repository` | 必填 | TypeORM `Repository`，需要有 `findAndCount`、`find`、`create`、`save`、`delete` |
| `operators` | 必填 | 从 `typeorm` 导入的 `Like`、`MoreThan`、`MoreThanOrEqual`、`LessThan`、`LessThanOrEqual`、`Not`、`In`、`IsNull`，以及可选的 `And` |
| `idField` | `'id'` | 主键字段，用于默认删除 |
| `fieldMap` | 无 | Ako 字段 ID 到实体属性名的映射，可以是对象或函数 |
| `save` | 默认保存 | `(data, repository) => ...`，替换默认保存逻辑 |
| `remove` | 默认删除 | `(ids, repository) => ...`，替换默认删除逻辑 |

## 查询转换

| Ako | TypeORM |
| --- | --- |
| `eq` | 字段直接使用值 |
| `like` | `Like(value)` |
| `gt`/`gte`/`lt`/`lte` | `MoreThan` 等对应的 Find Operator |
| `ne` | `Not(value)` |
| `in` | `In(values)` |
| `isNull` | `IsNull()` 或 `Not(IsNull())` |
| sort | `order` 对象，值为 `ASC`/`DESC` |
| page | `skip` + `take` |

默认转换由包中导出的 `toTypeOrmWhere` 和 `toTypeOrmOrder` 完成。

`findAndCount` 同时返回实体和符合条件的总数，`skip`/`take` 不影响总数。MSSQL 等数据库在使用 `take` 时需要稳定的 `order`；请求没有指定排序时，Ako 会按主键升序排序。

## 同一字段多个条件

下面的请求会在同一个字段上产生两个比较条件：

```json
{
    "params": {
        "age_gte": 18,
        "age_lte": 60
    }
}
```

适配器需要用 `And` 把两个 Find Operator 合并，所以 `operators` 中要传入 `And`：

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

没有传 `And` 时遇到这种请求，适配器会抛出明确的错误，不会悄悄覆盖前一个条件。

## 字段与列名

Ako 字段 ID 通常就是实体的属性名，数据库列名交给 TypeORM 的 `@Column({ name })` 处理。如果需要映射到另一组属性名，使用 `fieldMap`：

```ts
const repository = createTypeOrmRepository({
    repository: dataSource.getRepository(StudentEntity),
    fieldMap: {
        createdAt: 'createdAt',
    },
    operators,
})
```

`fieldMap` 应该是固定配置，不能根据请求参数生成。也不要把数据库列名或客户端传来的任意字符串直接交给 `QueryBuilder`。

## 保存、删除与软删除

默认保存逻辑是 `repository.create(data)` 再 `repository.save(entity)`；默认删除用 `In(ids)` 生成批量条件。主键不叫 `id` 时，设置 `idField`：

```ts
const repository = createTypeOrmRepository<User, string>({
    repository: dataSource.getRepository(UserEntity),
    operators,
    idField: 'uuid',
})
```

实体使用 `@DeleteDateColumn` 时，TypeORM 默认查询会排除已软删除的记录，适配器不改变这一行为。需要恢复或查询已删除记录时，在自定义回调或单独的业务接口中处理。

## 事务与领域服务

TypeORM 的事务、QueryRunner 和 subscriber 属于应用的数据层。如果保存时要在同一事务里写审计、发事件或更新其他表，使用自定义 `save` 回调，或者在 Ako 之外用应用 service 包一层。事务对象不能放进前端数据。

## 延伸阅读

- [适配器总览](/backend/javascript/adapters)
- [Repository 与数据访问](/backend/javascript/data-access)
- [TypeORM Find Options](https://typeorm.io/docs/working-with-entity-manager/find-options/)
- [TypeORM EntityManager API](https://typeorm.io/docs/working-with-entity-manager/entity-manager-api/)
