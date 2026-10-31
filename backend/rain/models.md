---
title: 实体模型
description: 在 ako-rain 或 ako-spring 中声明实体、数据访问入口和页面字段。
---

# 实体模型

`ako-rain` 和 `ako-spring` 共用 `ako-core` 与 `ako-jpa` 中的模型元数据。实体上的 Ako 注解决定前端显示的名称、字段类型、搜索条件、表格列、编辑表单和按钮。两套框架只在两件事上不同：由谁发现模型，由谁负责数据访问。

本页的 Spring Data 示例基于 Spring Boot 3/4 和 Jakarta Persistence。Boot 2 使用的 `ako-spring-common` 不依赖 `ako-jpa`；如果应用仍在用 `javax.persistence`，请按 [项目创建](/backend/rain/project) 中的公共 SPI 方式自行提供模型和数据库实现。

## 最小模型

同一个“学生”模型在两套框架中的写法如下。切换一次语言或框架，本站其他 JVM 示例会一起切换。

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
    note: 'Rain 通过 ClassRegister 发现 StudentAccess，再从 Rain DI 容器取得它的实现。示例沿用测试代码中的 data class 写法；依赖 JPA 代理（如懒加载）的实体请另行验证。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `package example.model;

import ako.annotation.DbName;
import ako.model.base.CompleteModel;
import ako.rain.access.SoftDeleteAccess;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@DbName("学生")
@Entity
@Table
public class Student extends CompleteModel {
  @DbName("姓名")
  private String name = "";

  @DbName("年龄")
  private int age = 0;

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public int getAge() { return age; }
  public void setAge(int age) { this.age = age; }
}

interface StudentAccess extends SoftDeleteAccess<Student, Integer> {}`,
    note: 'Java 版没有 Kotlin 的伴生对象，StudentAccess 通过 Rain DI 获取。实体提供标准 JavaBean 访问器，供 JPA 和 JSON 绑定使用。',
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
    note: 'Spring Data JPA 需要 Repository Bean。示例用 open class/open var，让 JPA 能生成代理；这里的 SoftDeleteAccess 是 Spring Data 版的 Repository 基类。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `package example.model;

import ako.annotation.DbName;
import ako.model.base.CompleteModel;
import ako.spring.data.SoftDeleteAccess;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@DbName("学生")
@Entity
@Table
public class Student extends CompleteModel {
  @DbName("姓名")
  private String name = "";

  @DbName("年龄")
  private int age = 0;

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public int getAge() { return age; }
  public void setAge(int age) { this.age = age; }
}

interface StudentRepository extends SoftDeleteAccess<Student, Integer> {}`,
    note: 'Java 版同样使用 Spring Data Repository Bean。JavaBean 访问器即可满足 JPA 和 JSON 绑定，不需要 companion object 或 open var。',
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
    note: '协议结果与后端框架无关。Rain 和 Spring 生成的 DbModel 结构相同，Ako 前端可以直接使用。',
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
    note: 'Rain 的自定义方法和分页查询使用 SmartAccess/JPA 的 API。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `import ako.rain.access.SoftDeleteAccess;
import smartaccess.item.Page;

interface StudentAccess extends SoftDeleteAccess<Student, Integer> {}

List<Student> rows = access.whereQuery(
  Map.of("name_like", "Alice"),
  Map.of("age", "desc"),
  new Page(0, 20),
  "ASC"
);`,
    note: 'Java 通过 Rain DI 注入或查找 StudentAccess。SmartAccess 的 Page 使用从 0 开始的 offset。',
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
    note: '自定义方法遵循 Spring Data 的派生查询规则。Ako 前端发来的 page 请求由 AkoSpringDataDatabase 用 Criteria API 处理。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `import org.springframework.data.domain.Sort;

interface StudentRepository extends SoftDeleteAccess<Student, Integer> {
  List<Student> findByNameContainingIgnoreCase(String name);
}

List<Student> rows = studentRepository.findByNameContainingIgnoreCase("Alice");
List<Student> ordered = studentRepository.findAll(
  Sort.by("age").descending()
);`,
    note: 'Java 版直接注入 StudentRepository，业务查询用 Spring Data 派生方法；Ako 的通用 page 请求仍由 Criteria API 处理。',
  },
]

const relationExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `@DbName("小组")
@Mapping(Group::class, display = "name")
@Column(name = "group_id")
var group: Int = 0

@DbName("性别")
@DbEnum("男", "女")
var sex: Boolean = false`,
    note: '关联和枚举注解属于 Ako 的公共模型层，Rain 只负责发现模型和提供数据访问。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `@DbName("小组")
@Mapping(value = Group.class, display = "name")
@Column(name = "group_id")
private int group;

@DbName("性别")
@DbEnum({"男", "女"})
private boolean sex;`,
    note: 'Java 写成 Group.class 和数组参数，生成的元数据与 Kotlin 相同。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `@DbName("小组")
@Mapping(Group::class, display = "name")
@Column(name = "group_id")
open var group: Int = 0

@DbName("性别")
@DbEnum("男", "女")
open var sex: Boolean = false`,
    note: '关联和枚举注解不依赖 Spring，关联模型的数据由 AkoSpringDataDatabase 查询。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `@DbName("小组")
@Mapping(value = Group.class, display = "name")
@Column(name = "group_id")
private int group;

@DbName("性别")
@DbEnum({"男", "女"})
private boolean sex;`,
    note: 'Java 版在普通字段上加注解即可，生成的 DbField 元数据与 Rain 相同。',
  },
]

const fieldVisibilityExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `class InternalModel(
  @TableIgnore
  var internalNote: String = "",

  @SearchIgnore
  var description: String = "",

  @EditIgnore
  var createdAt: Long = 0,
) : CompleteModel()`,
    note: '这三个注解在 Rain 和 Spring 中通用，只影响元数据中对应的区域。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `public class InternalModel extends CompleteModel {
  @TableIgnore
  private String internalNote = "";

  @SearchIgnore
  private String description = "";

  @EditIgnore
  private long createdAt;

  // JavaBean getters/setters omitted
}`,
    note: 'Java 在字段上加同样的注解，即可在搜索、表格或编辑中隐藏字段。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `open class InternalModel : CompleteModel() {
  @TableIgnore
  open var internalNote: String = ""

  @SearchIgnore
  open var description: String = ""

  @EditIgnore
  open var createdAt: Long = 0
}`,
    note: 'Spring Data JPA 场景保留 open class/open var，让 JPA 能生成代理。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `public class InternalModel extends CompleteModel {
  @TableIgnore
  private String internalNote = "";

  @SearchIgnore
  private String description = "";

  @EditIgnore
  private long createdAt;

  // JavaBean getters/setters omitted
}`,
    note: 'Java 类默认就能被 Spring/JPA 代理，但仍需提供标准 JavaBean 访问器。',
  },
]

const modelNodeExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `@ModelNode(
  pageNode = "sales-order-page",
  tableNode = "sales-order-table",
)
class Order : CompleteModel()`,
    note: 'ModelNode 只描述前端节点名称，与 Rain 的 Access 层无关。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `@ModelNode(
    pageNode = "sales-order-page",
    tableNode = "sales-order-table"
)
public class Order extends CompleteModel {}`,
    note: 'Java 用命名参数写法，效果与 Kotlin 相同。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `@ModelNode(
  pageNode = "sales-order-page",
  tableNode = "sales-order-table",
)
open class Order : CompleteModel()`,
    note: 'Spring 同样只把节点名写入 DbModel，不会自动注册 Vue 组件。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `@ModelNode(
    pageNode = "sales-order-page",
    tableNode = "sales-order-table"
)
public class Order extends CompleteModel {}`,
    note: 'Java Spring 写法相同，组件仍需在 Vue App 中注册。',
  },
]
</script>

<CodeSwitch :variants="modelExamples" />

两套写法只在数据访问层不同：Rain 的 Access 基于 SmartAccess 的 `JpaAccess`，Spring 的 Repository 基于 Spring Data 的 `JpaRepository`。`@DbName`、`@Entity`、`CompleteModel` 和字段注解完全一样。

## Access 与 Repository

| 事项 | `ako-rain` | `ako-spring` |
| --- | --- | --- |
| 数据访问入口 | `ako.rain.access.AkoAccess<T, PK>` | `ako.spring.access.AkoAccess<T, PK>`；使用 Spring Data 时通常继承 `AkoJpaRepository<T, ID>` |
| 软删除入口 | `ako.rain.access.SoftDeleteAccess` | `ako.spring.data.SoftDeleteAccess` 或 `AkoSoftDeleteRepository` |
| 发现方式 | Rain `ClassRegister` 注册 Access 接口 | 从 `AkoSpringDatabase` Bean 的 `modelTypes` 读取模型；Spring Data 模块的实现会收集容器中的 Repository Bean |
| `findAccess()` | 返回 Rain 容器中的 Access | 返回一个代理，每次调用时才从 `ApplicationContext` 查找目标 Repository |
| 自定义数据库 | 需要接入 SmartAccess/JPA | 实现并注册 `AkoSpringDatabase`，不必使用 Spring Data |

`ako-spring-common` 中的公共 `AkoAccess` 有意不继承 `JpaRepository`。这样 Boot 2/3/4 和不基于 Spring Data 的数据实现可以共用同一个运行时。`AkoJpaRepository` 等 Repository 基类只在 `ako-springboot-springdata` 中提供。

## 关联与枚举

字段注解在两套框架中写法相同：

<CodeSwitch :variants="relationExamples" />

`@Mapping` 生成 `ako:mapping` 类型，分页结果的 `information` 会附带关联模型的数据。`@DbEnum`、枚举类型字段和布尔字段生成 `ako:enum` 类型。关联的目标模型也必须能被对应框架发现。类型的 JSON 结构见 [字段类型与选项](/protocol/types)。

## 自定义查询

两套数据访问库的差异主要体现在自定义查询上：

<CodeSwitch :variants="queryExamples" />

两套框架的查询对象不能混用。无论用哪套，都要对前端传入的字段名、操作符和排序方向做白名单校验。

## 控制字段显示

一个字段可以分别决定是否出现在搜索区、表格和编辑表单中：

<CodeSwitch :variants="fieldVisibilityExamples" />

| 注解 | 效果 |
| --- | --- |
| `@SearchIgnore` | 不生成 `search`，字段不出现在搜索区 |
| `@TableIgnore` | 不生成 `column`，字段不出现在表格 |
| `@EditIgnore` | 不生成 `edit`，字段不出现在编辑表单 |

名称、描述、排序、校验和节点注解见 [注解功能](/backend/rain/annotations)。这三个注解只控制页面显示，字段值仍会出现在接口返回的实体 JSON 里。不该暴露给浏览器的字段，要在后端的 DTO 或序列化配置中排除。

## 自定义页面节点

`@ModelNode` 在两套框架中也完全相同。它的值是前端组件的注册名，与后端路由无关：

<CodeSwitch :variants="modelNodeExamples" />

前端需要注册同名组件。组件的 props 和替换方式见 [前端参考](/frontend/reference) 与 [使用 Ako View 构建页面](/frontend/views)。

## 排除模型与主键类型

类上加 `@NoAkoModel` 后，模型仍可被 ORM 使用，但不会出现在 Ako 菜单和模型列表中。字段上加 `@NoAkoField` 后，Ako 完全忽略这个字段，元数据中也不会出现它。JPA 基类就是用它隐藏了更新时间和删除时间。

`ako-jpa` 提供 Int、Long 和 UUID 三种主键的基类。协议层把 ID 当作可序列化的标量，删除接口接收字符串数组，因此 UUID 和大整数都能传递。前端自定义 API 或 TypeScript 类型时，不要把 ID 固定写成 `number`。

## 切换框架时要改什么

模型声明属于 `ako-core` 和 `ako-jpa`，Access 和 Repository 则属于各自的适配器：

```text
同一套 Entity + Ako 注解
       ├── ako-rain → AkoAccess → SmartAccess/JPA
       └── ako-spring → AkoJpaRepository/AkoSpringDatabase → Spring Data/自定义数据库
```

因此更换 JVM Web 框架时，前端的菜单、字段和页面都不受影响，只需要调整启动、模型发现、数据访问和控制器代码。

