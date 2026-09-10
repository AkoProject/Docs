---
title: 实体模型
description: 在 ako-rain 或 ako-spring 中声明 JVM 实体、数据访问入口和页面字段。
---

# 实体模型

`ako-rain` 和 `ako-spring` 都使用 `ako-core`/`ako-jpa` 的模型元数据。实体上的 Ako 注解决定前端看到的名称、字段类型、搜索、表格、编辑和按钮；框架差异主要出现在“谁发现模型”和“谁负责数据访问”。

这里的 Spring Data 示例针对 Boot 3/4 的 Jakarta Persistence。Boot 2 的 `ako-spring-common` 不要求使用 `ako-jpa`，如果应用仍基于 `javax.persistence`，请按 [项目创建](/backend/rain/project) 的公共 SPI 路径提供模型和数据库实现。

## 最小模型

下面的代码块是同一个“学生”模型在两套实现中的写法。选择一次 `ako-rain` 或 `ako-spring` 后，本网站其他 JVM 差异代码会跟随切换。

<script setup lang="ts">
const modelExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `package example.model

import ako.annotation.DbName
import ako.model.base.CompleteModel
import ako.rain.access.SoftDeleteAccess
import ako.rain.\`fun\`.findAccess
import jakarta.persistence.Entity
import jakarta.persistence.Table

@DbName("学生")
@Entity
@Table
data class Student(
  @DbName("姓名")
  var name: String = "",
  @DbName("年龄")
  var age: Int = 0,
) : CompleteModel() {
  companion object : StudentAccess by findAccess()
}

interface StudentAccess : SoftDeleteAccess<Student, Int>` ,
    note: 'Rain 通过 ClassRegister 发现 StudentAccess，再从 SmartAccess 获取它的实现。测试代码使用 data class；复杂 JPA 场景仍应按实体代理要求验证。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `package example.model

import ako.annotation.DbName
import ako.model.base.CompleteModel
import ako.spring.\`fun\`.findAccess
import ako.spring.data.SoftDeleteAccess
import jakarta.persistence.Entity
import jakarta.persistence.Table

@DbName("学生")
@Entity
@Table
open class Student : CompleteModel() {
  @DbName("姓名")
  open var name: String = ""
  @DbName("年龄")
  open var age: Int = 0

  companion object : StudentRepository by findAccess()
}

interface StudentRepository : SoftDeleteAccess<Student, Int>` ,
    note: 'Spring Data JPA 需要 Repository Bean；示例使用 open class/open var 以适配 JPA 代理。SoftDeleteAccess 是 Spring Data 版本的 Repository 基类。',
  },
  {
    language: 'JSON',
    framework: '协议结果',
    code: `{
  "id": "Student",
  "name": "学生",
  "fields": [
    {
      "id": "name",
      "name": "姓名",
      "type": "ako:text",
      "search": { "component": "default-entity-search-property-node", "entries": [] },
      "column": { "component": "default-entity-table-column-node", "width": 200 },
      "edit": { "propertyComponent": "default-entity-edit-property-node", "inputComponent": "default-entity-edit-input-node", "require": true, "allowEmpty": false, "editable": true, "placeholder": "姓名", "validate": [] }
    }
  ]
}`,
    note: '协议结果与后端宿主无关；Rain 和 Spring 最终都应生成同样可被 Ako 前端消费的 DbModel。',
  },
]

const queryExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `interface StudentAccess : SoftDeleteAccess<Student, Int> {
  fun findByStudent(student: Int): StudentPoint?
}

val rows = Student.whereQuery(
  mapOf("name_like" to "Alice"),
  sort = mapOf("age" to "desc"),
)`,
    note: 'Rain 自定义方法和分页查询使用 SmartAccess/JPA API。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `val repository = findAccess<StudentRepository>()

interface StudentRepository : SoftDeleteAccess<Student, Int> {
  fun findByNameContainingIgnoreCase(name: String): List<Student>
}

val rows = repository.findAll(
  org.springframework.data.domain.Sort.by("age").descending(),
)`,
    note: 'Spring Data 自定义方法遵循 Repository 派生查询规则；Ako 动态 page 请求由 AkoSpringDataDatabase 使用 Criteria API 处理。',
  },
]
</script>

<CodeSwitch :variants="modelExamples" />

两段 JVM 代码的差异不是 Ako 模型定义差异：Rain 的 Access 是 SmartAccess 的 `JpaAccess`，Spring 的 Repository 是 Spring Data 的 `JpaRepository`。共同的 `@DbName`、`@Entity`、`CompleteModel` 和字段元数据仍然保持一致。

## Access 与 Repository

| 事项 | `ako-rain` | `ako-spring` |
| --- | --- | --- |
| 数据访问入口 | `ako.rain.access.AkoAccess<T, PK>` | `ako.spring.access.AkoAccess<T, PK>`；使用 Spring Data 时通常继承 `AkoJpaRepository<T, ID>` |
| 软删除入口 | `ako.rain.access.SoftDeleteAccess` | `ako.spring.data.SoftDeleteAccess` 或 `AkoSoftDeleteRepository` |
| 发现方式 | Rain `ClassRegister` 注册 Access 接口 | Spring 容器发现 Repository Bean，或发现 `AkoSpringDatabase` Bean 提供的模型类型 |
| `findAccess()` | 返回 Rain 容器中的 Access | 返回延迟解析 Spring Bean 的代理；调用时再从 `ApplicationContext` 查找目标 Repository |
| 自定义数据库 | 需要接入 SmartAccess/JPA | 实现并注册 `AkoSpringDatabase`，不必使用 Spring Data |

Spring 的 `ako-spring-common` 故意不让公共 `AkoAccess` 继承 `JpaRepository`，这样 Boot 2/3/4 和非 Spring Data 数据实现可以共享 Runtime。只有 `ako-springboot-springdata` 才提供 `AkoJpaRepository` 等 Repository 基类。

## 关系与枚举

字段注解在两套实现中相同：

```kotlin
@DbName("小组")
@Mapping(Group::class, display = "name")
@Column(name = "group_id")
var group: Int = 0

@DbName("性别")
@DbEnum("男", "女")
var sex: Boolean = false
```

`@Mapping` 会生成 `ako:mapping`，分页结果中的 `information` 负责补充关联模型；`@DbEnum` 和原生枚举会生成 `ako:enum`。关联目标模型也必须被对应框架发现。类型的 JSON 结构见 [字段类型与选项](/protocol/types)。

## 自定义查询

自定义查询的写法体现了两套数据访问库的差异：

<CodeSwitch :variants="queryExamples" />

不要把一套数据访问 API 的查询对象传给另一套框架。无论哪套实现，都要对前端传入的字段、操作符和排序方向做白名单校验。

## 控制字段显示

字段可以分别参与搜索、表格和编辑：

```kotlin
class InternalModel(
  @TableIgnore
  var internalNote: String = "",

  @SearchIgnore
  var description: String = "",

  @EditIgnore
  var createdAt: Long = 0,
) : CompleteModel()
```

- `@SearchIgnore`：不生成 `search`。
- `@TableIgnore`：不生成 `column`。
- `@EditIgnore`：不生成 `edit`。

名称、描述、排序、校验和节点注解见 [注解功能](/backend/rain/annotations)。如果字段不应该暴露给浏览器，应在后端 DTO/序列化层同时处理，不能只依赖显示忽略注解。

## 自定义页面节点

`@ModelNode` 在两套框架中也完全相同，它指定前端组件注册名，而不是后端路由：

```kotlin
@ModelNode(
  pageNode = "sales-order-page",
  tableNode = "sales-order-table",
)
class Order : CompleteModel()
```

前端需要注册同名组件；完整 props 和替换方式见 [前端参考](/frontend/reference) 与 [使用 Ako View 构建页面](/frontend/views)。

## 模型排除与 ID

给类加 `@NoAkoModel`，模型仍可被 ORM 使用，但不会进入 Ako 菜单和模型列表。给字段加 `@NoAkoField`，字段不会被 Ako 处理，也不会出现在元数据中；适合隐藏内部状态、更新时间和删除时间。

JVM + JPA 方向同时支持 Int、Long 和 UUID 基础模型。协议层把 ID 看成可序列化标量，删除请求使用字符串数组也可以承载 UUID 和大整数。前端自定义 API 或 TypeScript 类型不要把所有 ID 固定成 `number`。

## 为什么只改 Access/Repository

Ako 的模型声明位于 `ako-core`/`ako-jpa`，而 Access/Repository 是适配器边界：

```text
同一套 Entity + Ako 注解
       ├── ako-rain → AkoAccess → SmartAccess/JPA
       └── ako-spring → AkoJpaRepository/AkoSpringDatabase → Spring Data/自定义数据库
```

这使前端菜单、字段和页面不随 JVM Web 框架改变；只有启动、发现、数据访问和控制器代码需要切换。
