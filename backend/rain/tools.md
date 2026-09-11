---
title: 内置工具
description: 对比 ako-rain 与 ako-spring 的 Runtime、Access、事务和元数据工具。
---

# 内置工具

JVM 模块提供两层工具：`ako-core` 的协议/元数据工具在两个框架中通用，`ako-rain` 与 `ako-spring` 则分别提供宿主框架相关的 Runtime、Access 查找和事务入口。

## Runtime

| 工具 | `ako-rain` | `ako-spring` |
| --- | --- | --- |
| 全局实例 | `AkoRain.instance` | `AkoSpringRuntime.instance` |
| Runtime 初始化 | Rain 模块配置创建 `AkoRain` | Boot 自动配置创建 `AkoSpringRuntime` |
| 模型表 | 从 `accesses` 的模型类型生成 `modelMap` | 从 `AkoSpringDatabase.modelTypes` 生成 `modelMap` |
| TypeProvider | 从 Rain DI 容器查找 | 先从 `ApplicationContext` 查找，再尝试无参构造 |
| 事务依赖 | SmartAccess/JPA EntityManager | `PlatformTransactionManager`，没有事务管理器时执行普通代码块 |

直接读取 Runtime 通常只适合扩展或诊断；业务代码优先使用下面的 Access、模型扩展和 `AkoService` 工具。

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
    note: 'findAccess/accessOfModel 从 AkoRain.instance.accesses 获取 Rain Access；save/delete 调用 SmartAccess/JPA。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `import ako.rain.access.SoftDeleteAccess;

StudentAccess access = /* 从 Rain DI 获取 StudentAccess */;
Student student = new Student();
access.saveOrUpdate(student);
access.delete(student);

// Java 不直接调用 Kotlin 的 reified findAccess() 扩展，
// 在服务或控制器中注入/查找 Access 即可。`,
    note: 'Rain Java 代码通过 Rain DI 获取 Access；Kotlin 的 reified findAccess/accessOfModel 扩展不能直接作为 Java 方法调用。',
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
    note: 'Spring 的 findAccess 返回延迟代理，在调用时从 ApplicationContext 找到 Repository；模型上下文来自 AkoSpringDatabase。',
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
    note: 'Spring Java 代码直接通过构造器注入 Repository；Kotlin 的 companion object + findAccess() 代理不是 Java 必需写法。',
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
    note: 'AkoRain.instance.transaction 取得 EntityManager；活动事务会复用，否则开始、提交或回滚事务。',
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
    note: 'Java 可以调用 AkoRain 的成员事务入口；示例省略 Access 的 Rain DI 获取，Page 仍使用 offset。',
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
    note: 'AkoSpringRuntime.transaction 使用 TransactionTemplate，传播行为为 REQUIRED；事务管理器由 Spring 提供。',
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
    note: 'Spring Java 通常使用 @Transactional；它与 Kotlin 的 transaction { } helper 都会委托 Spring PlatformTransactionManager。',
  },
]
</script>

<CodeSwitch :variants="accessExamples" />

| 函数 | Rain 行为 | Spring 行为 |
| --- | --- | --- |
| `findAccess<T>()` | 从 `AkoRain.instance.accesses` 找到 Access 实例。 | 创建指向 Spring Bean 的代理，避免模型初始化时过早取 Bean。 |
| `accessOfModel(Class)` | 按模型 Class 找 Access。 | 没有同名公共扩展；使用 `AkoSpringRuntime.modelMap` 或自己的数据库服务。 |
| `model.findAccess()` | 按实例 Class 查找 Access。 | 当前没有同名扩展；使用 `findAccess<T>()` 或 `AkoSpringRuntime.modelMap`。 |
| `model.save()` | 调用 `saveOrUpdate`。 | 调用 Runtime 和 Spring Data/数据库 SPI 的 `save`。 |
| `model.delete()` | 调用 Access 删除。 | 读取模型 ID 后调用 Runtime 的 `delete`。 |

找不到 Access、模型或数据库 Bean 时，两边都会抛出异常；请先检查扫描和 Runtime 初始化。

## 事务工具

<CodeSwitch :variants="transactionExamples" />

两段代码同名是为了让业务层迁移更简单，但底层不是同一种事务：Rain 直接控制 EntityManager，Spring 委托 `PlatformTransactionManager`。事务传播、异常转换和外部副作用仍应按宿主框架测试。

## 元数据工具

### `Class<T>.dbModel`

`dbModel` 从模型 Class 读取 Ako 注解并生成 `DbModel`：

```kotlin
val metadata = Student::class.java.dbModel
println(metadata.fields.map { it.id })
```

它在两个框架中相同，会处理：

- 模型名称、菜单组和默认节点。
- 字段名称、类型、搜索、表格和编辑信息。
- 校验、枚举、关联、按钮和面板。
- `@NoAkoModel`/`@NoAkoField` 对暴露范围的影响。

Runtime 只负责决定何时、从哪些模型类型调用它；元数据生成逻辑在 `ako-core`。

### `Field.dbField` / `readFieldInfo`

这些反射工具把 JVM Field 转成字段协议，高级适配器可以使用它们生成自定义字段。普通业务不需要手工调用；如果要扩展字段，优先使用 [注解功能](/backend/rain/annotations) 或实现 `AkoTypeProvider`。

### `AkoDefaultNode`

可以在建立模型元数据前修改全局默认节点：

```kotlin
AkoDefaultNode.entityTable = "my-default-table"
AkoDefaultNode.fieldTableColumn = "my-default-cell"
```

可配置 `view`、`icon`、`entitySearch`、`entityTable`、`entityEdit`、`fieldSearchInput`、`fieldSearchProperty`、`fieldEditInput`、`fieldEditProperty` 和 `fieldTableColumn`。它是进程级状态，必须在模型第一次建立前设置，不能按用户请求动态改变。

## `AkoService`

`AkoService` 是两个 JVM 适配器共享的核心注册表：

| 成员/函数 | 作用 |
| --- | --- |
| `runtime` | 当前 `AkoRuntime`，由 `AkoRain` 或 `AkoSpringRuntime` 初始化。 |
| `modelOf(modelName)` | 按模型 ID 获取 `ModelContext`；不存在时抛出 `WebError(881001001, ...)`。 |
| `dbMenus` | 已发现的菜单组元数据。 |
| `findMenu(annotation)` | 按 `@MenuGroup.id` 查找或创建菜单组。 |
| `registerDefaultTypeProvider(priority, provider)` | 注册 JVM 字段类型到默认 Provider 的映射。 |
| `findDefaultTypeProvider(fieldType)` | 查找某个 JVM 字段类型的 Provider。 |

适配器只在初始化时调用 `AkoService.initRuntime`。业务应用不应重复初始化，否则全局 Runtime 和默认 TypeProvider 会被覆盖。

## TypeProvider

JVM 自定义字段类型通过 `AkoTypeProvider` 生成字段类型、选项、默认搜索项和分页关联信息；前端仍必须注册同名 TypeProvider。

```text
readField       → field.type / field.options
defaultSearch   → 没有显式 SearchType 时的搜索项
searchInformation → 当前页的关联/补充信息
```

| 发现方式 | `ako-rain` | `ako-spring` |
| --- | --- | --- |
| 容器 | Rain DI | Spring `ApplicationContext` |
| Provider Bean | 按 Rain Bean 规则注册 | 使用 `@Component` 等方式注册；也可由 Runtime 无参构造 |
| 共享原因 | 两边都实现 `AkoRuntime.getTypeProvider` | Provider 接口属于 `ako-core`，不绑定宿主框架 |

## 错误工具 `webError`

`webError` 位于 `ako-core`，两个框架都可以使用：

```kotlin
import ako.`fun`.webError

fun requireStudent(id: Int): Student =
  Student.get(id) ?: webError(1001001, "学生不存在")
```

它抛出带 `code` 和 `message` 的 `WebError`。Rain SmartWeb 或 Spring MVC 全局异常处理器需要把它转换成应用统一的 HTTP 错误响应；Ako 不替应用决定错误格式，也不会自动隐藏敏感信息。

## 通用 core 工具

| 工具 | 作用 | 注意 |
| --- | --- | --- |
| `String.md5` / `File.md5` / `ByteArray.md5` | 计算 MD5。 | 只适合完整性/兼容用途，不用于密码存储或安全签名。 |
| `Class.allField` | 获取当前类及父类字段。 | 反射结果要过滤内部字段。 |
| `Member.isStatic` | 判断反射成员是否 static。 | 元数据生成辅助。 |
| `AnnotatedElement.annotation<T>()` | 读取注解。 | JVM 反射辅助。 |
| `AnnotatedElement.hasAnnotation<T>()` | 判断注解存在。 | JVM 反射辅助。 |
| `Annotation.annotationAnnotation<T>()` | 读取注解上的元注解。 | 自定义 `AkoType` 时使用。 |
| `String.notEmptyOrNull()` | 空字符串转 null。 | 按钮和配置转换辅助。 |

## 不要把工具当成安全边界

`AkoService.modelOf`、`findAccess`、`webError`、按钮和前端校验都是便捷 API，不会自动完成：

- 当前用户权限判断和租户隔离。
- 字段、操作符、排序方向和主键的白名单。
- 跨模型事务之外的外部副作用控制。
- 生产错误脱敏和审计。

这些责任由 Rain/Spring 的控制器、服务、数据访问层和安全组件共同完成。
