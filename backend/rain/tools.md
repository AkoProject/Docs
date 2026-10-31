---
title: 内置工具
description: ako-rain 与 ako-spring 提供的运行时、Access 查找、事务、元数据和错误处理工具。
---

# 内置工具

后端（JVM）的工具分两层。`ako-core` 里的协议和元数据工具在两个框架中通用；`ako-rain` 和 `ako-spring` 则各自提供与框架相关的运行时、Access 查找和事务入口。

## 运行时

| 项目 | `ako-rain` | `ako-spring` |
| --- | --- | --- |
| 全局实例 | `AkoRain.instance` | `AkoSpringRuntime.instance` |
| 创建方式 | Rain 模块配置创建 `AkoRain` | Boot 自动配置创建 `AkoSpringRuntime` |
| 模型表 | 根据 `accesses` 的模型类型生成 `modelMap` | 根据 `AkoSpringDatabase.modelTypes` 生成 `modelMap` |
| 类型提供者 | 从 Rain 依赖注入容器获取 | 先从 `ApplicationContext` 获取，找不到再尝试无参构造 |
| 事务 | 基于 SmartAccess/JPA 的 EntityManager | 基于 `PlatformTransactionManager`；没有事务管理器时直接执行代码块 |

直接操作运行时一般只在扩展或排查问题时需要。业务代码优先使用下面的 Access、模型扩展函数和 `AkoService`。

## Access 查找与模型操作

<script setup lang="ts">
const accessExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `import ako.rain.\`fun\`.accessOfModel
import ako.rain.\`fun\`.findAccess

val access = findAccess<StudentAccess>()
val sameAccess = student.findAccess()
val byClass = accessOfModel(Student::class.java)

student.save()
student.delete()`,
    note: 'findAccess/accessOfModel 从 AkoRain.instance.accesses 中查找 Access；save/delete 最终调用 SmartAccess/JPA。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `import ako.rain.access.SoftDeleteAccess;

StudentAccess access = /* 从 Rain DI 获取 StudentAccess */;
Student student = new Student();
access.saveOrUpdate(student);
access.delete(student);

// Java 无法直接调用 Kotlin 的 reified findAccess() 扩展，
// 在服务或控制器中注入 Access 即可。`,
    note: 'Java 通过 Rain 依赖注入获取 Access；Kotlin 的 reified findAccess/accessOfModel 扩展不能在 Java 中直接调用。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `import ako.spring.\`fun\`.findAccess

val repository = findAccess<StudentRepository>()

student.save()
student.delete()

// 需要按模型查找上下文时：
val context = AkoSpringRuntime.instance.modelMap["Student"]`,
    note: 'Spring 的 findAccess 返回延迟代理，调用方法时才从 ApplicationContext 取出 Repository；模型上下文由 AkoSpringDatabase 提供。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `import org.springframework.stereotype.Service;

@Service
public class StudentService {
  private final StudentRepository repository;

  public StudentService(StudentRepository repository) {
    this.repository = repository;
  }

  public void update(Student student) {
    repository.save(student);
    repository.delete(student);
  }
}`,
    note: 'Java 直接通过构造器注入 Repository，不需要 Kotlin 的 companion object + findAccess() 写法。',
  },
]

const transactionExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `import ako.rain.\`fun\`.transaction

transaction {
  val student = Student.get(studentId) ?: Student.notExist()
  student.name = newName
  student.save()
}`,
    note: 'AkoRain.instance.transaction 基于 EntityManager：已有活动事务时直接复用，否则开启新事务，成功提交，异常回滚。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `import ako.rain.AkoRain;
import smartaccess.item.Page;
import java.util.Map;

AkoRain.Companion.getInstance().transaction(() -> {
  Student student = access.findFirst(Map.of(), new Page(0, 1))
      .stream()
      .findFirst()
      .orElseThrow();
  student.setName(newName);
  access.saveOrUpdate(student);
  return null;
});`,
    note: 'Java 调用 AkoRain 实例上的 transaction 方法；示例省略了 Access 的注入，Page 的第一个参数同样是 offset。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `import ako.spring.\`fun\`.transaction

transaction {
  val student = studentRepository.findById(studentId).orElseThrow()
  student.name = newName
  studentRepository.save(student)
}`,
    note: 'AkoSpringRuntime.transaction 基于 TransactionTemplate，传播行为为 REQUIRED；事务管理器由 Spring 提供。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentService {
  private final StudentRepository repository;

  public StudentService(StudentRepository repository) {
    this.repository = repository;
  }

  @Transactional
  public void rename(int studentId, String newName) {
    Student student = repository.findById(studentId).orElseThrow();
    student.setName(newName);
    repository.save(student);
  }
}`,
    note: 'Java 一般直接用 @Transactional；它和 Kotlin 的 transaction { } 一样，最终都交给 Spring 的 PlatformTransactionManager。',
  },
]
</script>

<CodeSwitch :variants="accessExamples" />

| 函数 | Rain | Spring |
| --- | --- | --- |
| `findAccess<T>()` | 从 `AkoRain.instance.accesses` 中找到 Access 实例。 | 返回指向 Spring Bean 的代理，避免在模型初始化时过早获取 Bean。 |
| `accessOfModel(Class)` | 按模型 Class 查找 Access。 | 没有同名的公共扩展；使用 `AkoSpringRuntime.modelMap` 或自己的数据库服务。 |
| `model.findAccess()` | 按实例的 Class 查找 Access。 | 没有同名扩展；使用 `findAccess<T>()` 或 `AkoSpringRuntime.modelMap`。 |
| `model.save()` | 调用 Access 的 `saveOrUpdate`。 | 通过运行时调用数据库实现的 `save`。 |
| `model.delete()` | 调用 Access 的 `delete`。 | 读取模型 ID 后调用运行时的 `delete`。 |

找不到 Access、模型或数据库 Bean 时，两边都会抛出异常。遇到这种情况，先检查扫描范围和运行时是否已初始化。

## 事务工具

<CodeSwitch :variants="transactionExamples" />

两边的 `transaction` 同名，是为了让业务代码迁移时少改动，底层并不是同一种事务：Rain 直接操作 EntityManager，Spring 交给 `PlatformTransactionManager`。事务传播、异常转换和外部副作用要分别按各自框架测试。

## 元数据工具

### `Class<T>.dbModel`

`dbModel` 读取模型 Class 上的 Ako 注解，生成 `DbModel`：

```kotlin
val metadata = Student::class.java.dbModel
println(metadata.fields.map { it.id })
```

它在两个框架中的行为相同，会处理：

- 模型名称、菜单组和默认页面节点
- 字段名称、类型，以及搜索、表格和编辑信息
- 校验、枚举、关联、按钮和面板
- `@NoAkoModel`/`@NoAkoField` 对暴露范围的影响

运行时只决定什么时候、对哪些模型类型调用它，元数据的生成逻辑都在 `ako-core` 中。

### `Field.dbField` / `readFieldInfo`

这两个反射工具把 JVM 的 Field 转成字段协议，编写适配器时可以用来生成自定义字段。普通业务不需要手动调用；如果要扩展字段，优先使用 [注解功能](/backend/rain/annotations) 或实现 `AkoTypeProvider`。

### `AkoDefaultNode`

在生成模型元数据之前，可以修改全局的默认页面节点：

```kotlin
AkoDefaultNode.entityTable = "my-default-table"
AkoDefaultNode.fieldTableColumn = "my-default-cell"
```

可配置的属性有 `view`、`icon`、`entitySearch`、`entityTable`、`entityEdit`、`fieldSearchInput`、`fieldSearchProperty`、`fieldEditInput`、`fieldEditProperty` 和 `fieldTableColumn`。它们是进程级的全局状态，必须在第一次生成模型元数据前设置好，不能按请求动态修改。

## `AkoService`

`AkoService` 是两个适配器共用的核心注册表：

| 成员/函数 | 作用 |
| --- | --- |
| `runtime` | 当前的 `AkoRuntime`，由 `AkoRain` 或 `AkoSpringRuntime` 初始化。 |
| `modelOf(modelName)` | 按模型 ID 获取 `ModelContext`；不存在时抛出 `WebError(881001001, ...)`。 |
| `dbMenus` | 已发现的菜单组元数据。 |
| `findMenu(annotation)` | 按 `@MenuGroup.id` 查找菜单组，不存在时创建。 |
| `registerDefaultTypeProvider(priority, provider)` | 按优先级注册默认类型提供者，用于按 JVM 字段类型匹配。 |
| `findDefaultTypeProvider(fieldType)` | 查找某个 JVM 字段类型对应的类型提供者。 |

`AkoService.initRuntime` 只由适配器在初始化时调用。业务代码不要再调用它，否则全局运行时会被替换，默认类型提供者也会被重复注册。

## 类型提供者

后端（JVM）中的自定义字段类型通过 `AkoTypeProvider` 实现，它决定字段类型、选项、默认搜索项和分页时附带的关联信息。前端也必须注册同名的类型提供者。

```text
id                → field.type
readField         → field.options
defaultSearch     → 没有显式 SearchType 时的搜索项
searchInformation → 当前页的关联/补充信息
```

| 项目 | `ako-rain` | `ako-spring` |
| --- | --- | --- |
| 从哪里获取 | Rain 依赖注入容器 | Spring `ApplicationContext` |
| 如何注册 | 按 Rain 的 Bean 规则注册 | 用 `@Component` 等方式注册；没有注册时运行时会尝试无参构造 |
| 为什么能共用 | 两边都实现了 `AkoRuntime.getTypeProvider` | `AkoTypeProvider` 接口定义在 `ako-core`，不依赖具体框架 |

## 错误工具 `webError`

`webError` 定义在 `ako-core`，两个框架都能使用：

```kotlin
import ako.`fun`.webError

fun requireStudent(id: Int): Student =
  Student.get(id) ?: webError(1001001, "学生不存在")
```

它会抛出带 `code` 和 `message` 的 `WebError`。需要在 Rain SmartWeb 或 Spring MVC 的全局异常处理中把它转换成应用统一的 HTTP 错误响应。Ako 不规定错误响应的格式，也不会自动隐藏敏感信息。

## 通用工具

| 工具 | 作用 | 注意 |
| --- | --- | --- |
| `String.md5` / `File.md5` / `ByteArray.md5` | 计算 MD5。 | 只适合做完整性校验或兼容旧系统，不能用于存储密码或安全签名。 |
| `Class.allField` | 获取当前类及所有父类的字段。 | 结果中可能包含内部字段，需要自行过滤。 |
| `Member.isStatic` | 判断反射成员是否为 static。 | 生成元数据时使用。 |
| `AnnotatedElement.annotation<T>()` | 读取注解。 | 反射辅助。 |
| `AnnotatedElement.hasAnnotation<T>()` | 判断是否存在某个注解。 | 反射辅助。 |
| `Annotation.annotationAnnotation<T>()` | 读取注解上的元注解。 | 自定义 `AkoType` 时使用。 |
| `String.notEmptyOrNull()` | 空字符串转为 null。 | 转换按钮和配置时使用。 |

## 安全提醒

`AkoService.modelOf`、`findAccess`、`webError`、按钮和前端校验都只是便利工具，下面这些事情它们都不会替你做：

- 当前用户的权限判断和租户隔离
- 字段、操作符、排序方向和主键的白名单校验
- 事务之外的外部副作用控制
- 生产环境的错误脱敏和审计

这些需要由 Rain/Spring 的控制器、服务、数据访问层和安全组件共同完成。
