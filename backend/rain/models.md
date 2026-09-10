---
title: 实体模型
description: 在 ako-rain 中使用 JPA 模型、Access 和 JVM 注解生成管理页面。
---

# 实体模型

在 `ako-rain` 中，通常由一个 JPA 模型和一个 `AkoAccess` 接口组成可被 Ako 发现的模型。模型上的 JVM 注解会被转换成 `DbModel` 与 `DbField`，前端无需读取 Kotlin 或 Java 字节码。

## 最小模型

下面的例子使用当前测试代码中已经验证过的写法：

<script setup lang="ts">
const modelExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain + JPA',
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

interface StudentAccess : SoftDeleteAccess<Student, Int>`,
    note: '模型必须有可识别的 ID；CompleteModel 已提供自增 Int ID、创建时间和软删除字段。',
  },
  {
    language: 'JSON',
    framework: '协议元数据',
    code: `{
  "id": "Student",
  "name": "学生",
  "fields": [
    {
      "id": "name",
      "name": "姓名",
      "type": "ako:text",
      "search": { "component": "default-entity-search-property-node", "entries": [] },
      "column": { "component": "default-entity-table-column-node", "width": 200, "index": 100 },
      "edit": { "propertyComponent": "default-entity-edit-property-node", "inputComponent": "default-entity-edit-input-node", "require": true, "allowEmpty": false, "editable": true, "placeholder": "姓名", "validate": [] }
    }
  ]
}`,
    note: 'JSON 分支是前端真正消费的结果；后端语言和 ORM 只影响它如何被生成。',
  },
]
</script>

<CodeSwitch :variants="modelExamples" />

`@DbName` 在类上设置模型显示名，在字段上设置列/表单显示名。没有 `@DbName` 时，当前 JVM 转换器使用类名或字段 ID。

## 关系与枚举

当前测试模型还演示了关联和枚举：

```kotlin
data class Student(
    @DbName("小组")
    @Mapping(Group::class, display = "name")
    @Column(name = "group_id")
    var group: Int = 0,

    @DbName("性别")
    @DbEnum("男", "女")
    var sex: Boolean = false,

    @DbName("状态")
    var status: Status = Status.ACTIVE,
) : CompleteModel() {
    enum class Status {
        @DbName("启用") ACTIVE,
        @DbName("停用") INACTIVE,
    }
}
```

`@Mapping` 会生成 `ako:mapping`，分页结果中的 `information` 负责补充关联模型；`@DbEnum` 和原生枚举会生成 `ako:enum`。类型的 JSON 结构见 [字段类型与选项](/protocol/types)。

## Access 为什么必需

`ako-rain` 通过 Rain 的类注册机制发现继承 `AkoAccess` 的接口，再从 Access 找到对应模型和数据访问实现。只有模型类而没有 Access，或者 Access 没被扫描到，模型不会出现在 `menu/list/{channel}` 的 `models` 中。

常见选择：

| Access | 行为 |
| --- | --- |
| `AkoAccess<T, PK>` | 通用 JPA 数据访问和查询。 |
| `SoftDeleteAccess<T, PK>` | 在 `AkoAccess` 基础上使用软删除查询重写。 |

Access 还可以声明自定义查询方法，例如：

```kotlin
interface StudentPointAccess : SoftDeleteAccess<StudentPoint, Int> {
    fun findByStudent(student: Int): StudentPoint?
}
```

这些领域查询方法属于 SmartAccess/JPA 能力，不是 Ako 前端协议的一部分。

## 控制字段的显示

字段声明会独立决定三个场景：

```kotlin
class InternalModel(
    @TableIgnore
    var internalNote: String = "",

    @SearchIgnore
    var description: String = "",

    @EditIgnore
    var createdAt: Long = 0,
)
```

- `@SearchIgnore`：不生成 `search`。
- `@TableIgnore`：不生成 `column`。
- `@EditIgnore`：不生成 `edit`。

名称、描述、排序、校验和节点注解见 [注解功能](/backend/rain/annotations)。

## 自定义页面节点

`@ModelNode` 可以把模型的页面、搜索、表格、编辑和图标节点改成前端已注册的组件名：

```kotlin
@ModelNode(
    pageNode = "sales-order-page",
    tableNode = "sales-order-table",
)
class Order : CompleteModel()
```

组件注册方式见 [自定义页面与类型](/frontend/customization)。如果组件名写错，后端仍然可以生成元数据，但前端无法找到对应组件。

## 模型排除

给类加 `@NoAkoModel`，模型仍可被 ORM 使用，但不会进入 Ako 菜单和模型列表。给字段加 `@NoAkoField`，字段不会被 Ako 处理，也不会出现在元数据中；适合隐藏内部状态、更新时间和删除时间。

## ID 类型

JVM + JPA 方向同时有 Int、Long 和 UUID 基础模型。协议层建议把 ID 看成可序列化标量，删除请求使用字符串数组也可以承载 UUID 和大整数。前端自定义 API 或 TypeScript 类型不要把所有 ID 固定成 `number`。
