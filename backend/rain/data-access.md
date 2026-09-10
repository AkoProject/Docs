---
title: 数据访问与事务
description: ako-rain 中的 Access、查询、JPA 基类、事务与软删除。
---

# 数据访问与事务

`ako-rain` 的数据访问建立在 SmartAccess/JPA 上。Ako 只负责把前端的分页请求映射到模型上下文；业务查询、事务和数据库细节仍属于后端。

## 模型基类

`ako-jpa` 提供一组可选基类：

| 基类 | ID/能力 |
| --- | --- |
| `AkoModel` | 只有 Ako 模型标记接口，不绑定 JPA。 |
| `AkoModelBase` | 创建时间、更新时间生命周期字段。 |
| `IdentityModel` | `AkoModelBase` + 自增 `Int` ID。 |
| `SoftDeleteModel` | `AkoModelBase` + 删除时间字段和软删除 Filter。 |
| `CompleteModel` | `SoftDeleteModel` + 自增 `Int` ID，最常用的完整基类。 |
| `LongIdentityModel` / `LongCompleteModel` | Long ID 版本。 |
| `UuidV4IdentityModel` / `UuidV4CompleteModel` | UUID ID 版本。 |

`createTime` 和 `updateTime` 使用毫秒时间戳；`updateTime`、`deleteTime` 默认使用 `@NoAkoField` 或 JSON 忽略，不会暴露给管理页面。基类只是 JVM/JPA 便利能力，其他协议实现不需要复刻它们。

## Access

最小 Access：

```kotlin
interface StudentAccess : AkoAccess<Student, Int>
```

如果模型继承 `SoftDeleteModel` 或 `CompleteModel`：

```kotlin
interface StudentAccess : SoftDeleteAccess<Student, Int>
```

`ako-rain` 会通过 Rain 的 ClassRegister 找到 Access，再把它与模型类型配对。Access 必须在 `rain.scanPackages` 范围内，并由 SmartAccess 生成或注册实现。

## 标准查询工具

`AkoAccess` 在 SmartAccess 基础上提供：

| 方法 | 作用 |
| --- | --- |
| `findFirst(params, page)` | 按 ID 升序查询第一页。 |
| `findLast(params, page)` | 按 ID 降序查询第一页。 |
| `whereQuery(params, orderBy, converts)` | 按条件查询列表。 |
| `whereQuery(params, page, orderBy, converts)` | 带分页查询列表。 |
| `whereQuery(params, sort, page, orderBy)` | 带多字段排序和分页查询。 |
| `wherePage(params, page, orderBy, sort, converts)` | 查询总数并返回分页数据。 |
| `countAll()` | 查询模型总数。 |
| `countQuery(params)` | 按条件查询数量。 |
| `deleteAll()` | 删除模型的全部数据；请谨慎使用。 |

查询参数使用 `字段名_操作符`：

```kotlin
val rows = Student.whereQuery(
    mapOf(
        "name_like" to "Alice",
        "age_gte" to 18,
    ),
    sort = mapOf("age" to "desc"),
)
```

`AkoRainModelContext` 会把 HTTP 的 1-based `page` 转成 SmartAccess 的 offset/page 参数，并使用字段 `DbField.convert` 做基础类型转换。直接调用 `AkoAccess` 时，`smartaccess.item.Page` 的含义以 SmartAccess 版本为准，不要把它和 HTTP page 参数混用。

## 自定义查询方法

领域查询属于 Access，而不是 Ako 协议：

```kotlin
interface StudentPointAccess : SoftDeleteAccess<StudentPoint, Int> {
    fun findByStudent(student: Int): StudentPoint?
}
```

在业务控制器或服务中，可以先使用 `findAccess()` 获取 Access，再在事务内调用。复杂查询应使用参数绑定或 SmartAccess 的安全 API，不要直接把客户端字段名拼接进 HQL。

## 事务

`ako-rain` 提供事务工具：

```kotlin
transaction {
    val student = Student.get(studentId) ?: Student.notExist()
    student.name = newName
    student.save()
}
```

标准模型 Controller 的分页、保存和删除已经使用事务；普通业务操作、跨模型更新和自定义按钮接口也应该显式包在事务中。事务块抛出异常时会回滚，成功时提交。

## 模型扩展函数

`ako-rain` 提供以下便捷扩展：

```kotlin
val access = findAccess<StudentAccess>()
val sameAccess = student.findAccess()

student.save()
student.delete()
```

对应关系：

| 工具 | 说明 |
| --- | --- |
| `findAccess<T>()` | 按 Access 类型从 `AkoRain.instance` 查找实例。 |
| `accessOfModel<T>(Class<T>)` | 按模型 Class 查找 Access。 |
| `model.findAccess()` | 当前模型实例对应的 Access。 |
| `model.save()` | 调用 `saveOrUpdate`，返回模型自身。 |
| `model.delete()` | 按当前模型删除。 |

找不到 Access 时会抛出异常；请在应用启动和扫描配置正确后调用。

## 软删除

`SoftDeleteModel` 声明 `deleteTime` 并设置 Hibernate Filter；`AkoRain.transaction` 会尝试启用 `_ako_soft_delete`。`SoftDeleteAccess` 通过 QueryRewriter 把删除改写为更新删除时间。

当前源码中的重写字符串写成了 `delete form`，而标准 HQL 关键字是 `delete from`。因此在当前开发快照中不要未经测试就承诺软删除一定生效；请先针对删除、查询过滤和恢复策略编写集成测试，并在升级源码时确认该实现。

## JPA 命名策略

Rain 测试配置提供 `ako.rain.fun.CamelToSnakeCaseNamingStrategy`，把 `createTime` 等字段映射为下划线命名。是否使用它由应用的 Hibernate 配置决定，不是 Ako 协议要求。

## 保存生命周期

核心 `ModelContext` 定义 `akoPreSave` 与 `akoPostSave` 扩展点。当前 `AkoRainModelContext` 默认实现为空；业务级校验、审计、唯一性和权限应放在你自己的服务/控制器中，不要只依赖前端编辑规则。

## 数据访问安全清单

- [ ] 对 `model`、字段名、操作符和排序方向做白名单。
- [ ] 对查询值按字段真实类型转换。
- [ ] 对每一次 page/save/delete 独立鉴权。
- [ ] 对批量删除设置数量、权限和审计限制。
- [ ] 用集成测试确认软删除 Filter 和 QueryRewriter 的行为。
- [ ] 不把数据库异常、HQL 和内部 ID 暴露给浏览器。
