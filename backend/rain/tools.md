---
title: ako-rain 内置工具
description: ako-rain 与 ako-core 为 JVM 业务代码提供的运行时、模型和查询工具。
---

# `ako-rain` 内置工具

本页面向已经接入 `ako-rain` 的 JVM 应用，集中说明业务代码可以直接使用的工具。协议数据结构见 [Ako 协议](/protocol/overview)，Rain 自身的 DI、生命周期和 Web 工具见 [Rain 文档](https://rain.icecreamqaq.com/)。

## 运行时 `AkoRain`

`AkoRain` 是 Rain ApplicationService、ClassRegister 和 AkoRuntime 的组合：

| 成员 | 用途 |
| --- | --- |
| `AkoRain.instance` | 获取当前全局 Rain 适配器实例。由模块初始化，不应手工创建第二个实例。 |
| `context` | Rain DI 上下文，用于查找 Bean。 |
| `db` | 从 SmartAccess 获取默认 JPA 服务上下文。 |
| `accesses` | 已发现并实例化的 Access 列表。 |
| `models` | Access 对应的模型类型列表。 |
| `modelMap` | `model id -> ModelContext`，用于菜单和模型操作。 |
| `transaction {}` | 在默认 EntityManager 上开启、提交或回滚事务。 |

应用通常不需要直接操作这些成员；使用标准 Controller 和 [数据访问工具](/backend/rain/data-access) 即可。直接读取 `accesses`/`modelMap` 适合编写管理扩展或调试工具。

## Access 查找

```kotlin
import ako.rain.`fun`.accessOfModel
import ako.rain.`fun`.findAccess
import ako.rain.`fun`.transaction

val studentAccess = findAccess<StudentAccess>()
val anotherAccess = accessOfModel(Student::class.java)

val student = Student(name = "Alice", age = 20)
transaction {
    student.save()
}

// 删除已有实体：
transaction {
    existingStudent.delete()
}
```

可用函数：

| 函数 | 行为 |
| --- | --- |
| `findAccess<T>()` | 通过 Access 接口类型查找实例。 |
| `accessOfModel<T>(modelType)` | 通过模型 Class 查找 Access。 |
| `T.findAccess()` | 通过模型实例的 Class 查找 Access。 |
| `T.save()` | 调用 Access 的 `saveOrUpdate` 并返回自身。 |
| `T.delete()` | 调用 Access 删除当前实体。 |
| `transaction {}` | 使用 `AkoRain.instance.transaction` 执行事务块。 |

这些查找函数依赖 Access 已被 Rain 扫描。需要完整参数、分页和软删除语义时，阅读 [数据访问与事务](/backend/rain/data-access)。

## 查询参数工具

`AkoAccess` 的 `whereQuery`/`wherePage` 支持：

```text
field             =
field_eq          =
field_gt          >
field_gte         >=
field_lt          <
field_lte         <=
field_ne          !=
field_like        like
field_in          in
field_isNull      is null
```

`AkoAccess.margeWhereQuery` 是底层查询条件构造器，名称中的 `marge` 是源码既有拼写。它返回要绑定的参数数组并把条件追加到查询字符串；只适合适配器内部使用，不要把客户端键名未经白名单直接交给它。

## 错误工具 `webError`

`webError` 创建并抛出 `WebError`：

```kotlin
import ako.`fun`.webError

fun requireStudent(id: Int): Student =
    Student.get(id) ?: webError(1001001, "学生不存在")
```

`WebError` 携带 `code` 和 `message`。Ako 核心不会替你决定 HTTP 错误响应格式；SmartWeb 全局异常处理器应把它转换成统一的业务错误响应，并避免泄露堆栈。

## 模型元数据工具

### `Class<T>.dbModel`

`dbModel` 会从模型 Class 读取注解并生成 `DbModel`：

```kotlin
val metadata = Student::class.java.dbModel
println(metadata.fields.map { it.id })
```

它会处理默认按钮、模型节点、字段显示信息、搜索/编辑校验和类型 Provider。`AkoRain` 通过它把已发现的模型放入 `modelMap`。

### `Field.dbField` / `readFieldInfo`

这些工具把 Java Field 转为字段协议；高级适配器可以使用 `readFieldInfo` 生成自定义字段，但通常不应在业务代码中手工调用。自定义协议实现更适合显式构造 JSON 或实现自己的 metadata generator。

### `AkoDefaultNode`

可以在模型元数据生成前修改全局默认节点：

```kotlin
AkoDefaultNode.entityTable = "my-default-table"
AkoDefaultNode.fieldTableColumn = "my-default-cell"
```

可配置项包括 `view`、`icon`、`entitySearch`、`entityTable`、`entityEdit`、`fieldSearchInput`、`fieldSearchProperty`、`fieldEditInput`、`fieldEditProperty` 和 `fieldTableColumn`。它是进程级全局状态，必须在第一次建立 `modelMap` 前设置，不能按用户请求动态修改。

## `AkoService`

`AkoService` 是核心运行时注册表：

| 成员/函数 | 说明 |
| --- | --- |
| `runtime` | 当前 `AkoRuntime`，由 `AkoRain` 初始化。 |
| `modelOf(modelName)` | 按模型 ID 找到 `ModelContext`，找不到时抛出 `WebError(881001001, ...)`。 |
| `dbMenus` | 已发现的菜单组元数据。 |
| `findMenu(annotation)` | 按 `MenuGroup.id` 查找或创建菜单组。ID 不能为空。 |
| `registerDefaultTypeProvider(priority, provider)` | 注册 JVM 字段类型到 Ako TypeProvider 的默认映射。 |
| `findDefaultTypeProvider(fieldType)` | 查找字段类型的默认 Provider。 |

`AkoService.initRuntime` 通常由适配器调用；业务应用不应重复初始化全局运行时。

## 通用 core 工具

`ako-core` 还提供一些与 Rain 无关的 JVM 扩展：

| 工具 | 作用 | 注意 |
| --- | --- | --- |
| `String.md5` | 计算字符串 MD5。 | 不用于密码存储或安全签名；优先使用现代密码哈希/签名算法。 |
| `File.md5` | 流式计算文件 MD5。 | 适合完整性校验，不代表抗碰撞安全。 |
| `ByteArray.md5` | 计算字节数组 MD5。 | 同上。 |
| `Class.allField` | 获取当前类及父类的全部声明字段。 | 反射结果包含内部字段，输出前要做过滤。 |
| `Member.isStatic` | 判断反射成员是否 static。 | 元数据生成器使用。 |
| `AnnotatedElement.annotation<T>()` | 读取单个注解。 | JVM 反射辅助。 |
| `AnnotatedElement.hasAnnotation<T>()` | 判断是否有注解。 | JVM 反射辅助。 |
| `Annotation.annotationAnnotation<T>()` | 读取注解上的元注解。 | 自定义 `AkoType` 时使用。 |
| `String.notEmptyOrNull()` | 空字符串转成 null。 | 主要用于按钮配置转换。 |

这些工具会随着 `ako-core` API 演进，业务代码应尽量依赖稳定的模型、Access 和协议接口。

## 自定义 TypeProvider

JVM 侧可以通过 `AkoTypeProvider` 提供字段类型的默认搜索、字段选项和分页关联信息。Rain 适配器通过 `AkoRuntime.getTypeProvider` 从 DI 容器获取 Provider；前端还必须注册同名 TypeProvider。

最小接口关注三个阶段：

```text
readField       → 生成 field.type / field.options
defaultSearch  → 没有显式 SearchType 时生成搜索项
searchInformation → 为当前页补充 information
```

后端自定义 Provider 的实现细节属于 JVM 扩展开发；跨语言适配器直接按 [字段类型与选项](/protocol/types) 输出 JSON 即可。

## 不要把工具当成安全边界

`AkoService.modelOf`、`findAccess`、`webError` 和前端按钮工具都只是便捷 API。它们不会自动完成：

- 当前用户权限判断。
- 多租户数据隔离。
- 输入参数白名单。
- 事务之外的外部副作用控制。
- 生产环境错误脱敏。

这些判断必须由业务服务、控制器中间件和数据访问层共同完成。
