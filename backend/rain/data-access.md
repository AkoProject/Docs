---
title: 数据访问与事务
description: ako-rain 与 ako-spring 在 Access、Repository、查询、事务、软删除和保存钩子上的写法与区别。
---

# 数据访问与事务

Ako 只要求模型上下文能分页、保存和删除。怎么查库、怎么开事务、怎么做软删除，都由各自的适配器决定：`ako-rain` 用 SmartAccess/JPA，`ako-spring` 用 Spring Data JPA 或自定义的 `AkoSpringDatabase`。

## 模型基类

Rain 和 Spring Data（Boot 3/4）共用 `ako-jpa` 里的模型基类。Spring Boot 2 项目使用 `javax.persistence`，不必继承这些基于 Jakarta 的基类：

| 基类 | 能力 |
| --- | --- |
| `AkoModel` | 仅标记这是一个 Ako 模型，不依赖 JPA。 |
| `AkoModelBase` | 自动维护创建时间和更新时间。 |
| `IdentityModel` | `AkoModelBase` + 自增 `Int` ID。 |
| `SoftDeleteModel` | `AkoModelBase` + 删除时间字段，用于软删除。 |
| `CompleteModel` | `SoftDeleteModel` + 自增 `Int` ID。 |
| `LongIdentityModel` / `LongCompleteModel` | 对应的 `Long` ID 版本。 |
| `UuidV4IdentityModel` / `UuidV4CompleteModel` | 对应的 UUID ID 版本。 |

基类和 Ako 注解两边通用，真正不同的是 Access/Repository、查询实现和事务管理器。

## Access 与 Repository

<script setup lang="ts">
const accessExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `import ako.rain.access.SoftDeleteAccess

interface StudentAccess : SoftDeleteAccess<Student, Int>

val access = findAccess<StudentAccess>()
val student = Student(name = "Alice")
access.saveOrUpdate(student)`,
    note: 'Rain 的 Access 继承 SmartAccess 的 JpaAccess，由 ClassRegister 发现，实现由 Rain 容器提供。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `import ako.rain.access.SoftDeleteAccess;

public interface StudentAccess extends SoftDeleteAccess<Student, Integer> {}

Student student = new Student();
student.setName("Alice");
studentAccess.saveOrUpdate(student);`,
    note: 'Java 同样用接口继承声明 Access，studentAccess 通过 Rain 依赖注入获得；保存调用 SmartAccess 的 saveOrUpdate。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `import ako.spring.data.SoftDeleteAccess
import org.springframework.data.jpa.repository.JpaRepository

interface StudentRepository : SoftDeleteAccess<Student, Int> {
  fun findByNameContainingIgnoreCase(name: String): List<Student>
}

val student = Student().apply { name = "Alice" }
studentRepository.save(student)`,
    note: 'Spring Data Repository 是普通的 Spring Bean；findAccess() 返回的代理在调用时才由 AkoSpringRuntime 从 ApplicationContext 取出真正的 Bean。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `import ako.spring.data.SoftDeleteAccess;
import java.util.List;

public interface StudentRepository extends SoftDeleteAccess<Student, Integer> {
  List<Student> findByNameContainingIgnoreCase(String name);
}

Student student = new Student();
student.setName("Alice");
studentRepository.save(student);`,
    note: 'Java 通过构造器注入 StudentRepository；它既是 Spring Data JPA 的 Repository，也是 Ako 模型的数据访问入口。',
  },
]

const queryExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `val rows = Student.whereQuery(
  mapOf(
    "name_like" to "Alice",
    "age_gte" to 18,
  ),
  sort = mapOf("age" to "desc"),
)

val page = Student.wherePage(
  emptyMap(),
  page = Page(0, 20),
)`,
    note: 'SmartAccess 的 Page 第一个参数是 offset；AkoRainModelContext 会把前端从 1 开始的页码换算成 offset。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `import java.util.List;
import java.util.Map;
import smartaccess.item.Page;

List<Student> rows = studentAccess.whereQuery(
  Map.<String, Object>of(
    "name_like", "Alice",
    "age_gte", 18
  ),
  Map.of("age", "desc"),
  new Page(0, 20),
  "ASC"
);`,
    note: 'Java 直接调用 AkoAccess 的 whereQuery；Page 的第一个参数是从 0 开始的 offset。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `// Spring Data 自定义查询
val repository = findAccess<StudentRepository>()
val rows = repository.findByNameContainingIgnoreCase("Alice")

// Ako 的 model/page 请求由 Criteria API 处理
val page = runtime.modelMap["Student"]!!.wherePage(
  params = mapOf("age_gte" to 18),
  sort = mapOf("age" to "DESC"),
  pid = 1,
  pSize = 20,
)`,
    note: '业务查询用 Spring Data 的派生方法声明；Ako 的通用过滤和分页由 AkoSpringDataDatabase 通过 Jakarta Criteria API 执行。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `import ako.model.base.ModelContext;
import ako.model.resp.PageResp;
import ako.spring.AkoSpringRuntime;
import java.util.List;
import java.util.Map;

List<Student> rows = studentRepository.findByNameContainingIgnoreCase("Alice");

ModelContext<?> context = AkoSpringRuntime.Companion.getInstance()
  .getModelMap()
  .get("Student");
PageResp<?> page = context.wherePage(
  Map.<String, Object>of("age_gte", 18),
  Map.of("age", "DESC"),
  1,
  20
);`,
    note: 'Java 可以用 Repository 的派生查询，也可以通过运行时的 modelMap 调用 Ako 通用分页；页码从 1 开始，由 Criteria API 执行。',
  },
]

const saveHookExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `import ako.\`fun\`.webError
import ako.rain.access.SoftDeleteAccess

interface StudentAccess : SoftDeleteAccess<Student, Int> {
  fun findByName(name: String): Student?

  override fun akoPreSave(data: Student) {
    data.name = data.name.trim()
    val exists = findByName(data.name)
    if (exists != null && exists.id != data.id) webError(1000001, "学生姓名已存在")
  }

  override fun akoPostSave(data: Student) {
    // 保存成功后执行，仍在同一事务中
  }
}`,
    note: '钩子写在 Access 接口里，由 AkoRainModelContext 在标准保存流程中调用；webError 抛出的异常会让本次保存回滚。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `import ako.rain.access.SoftDeleteAccess;
import static ako.fun.WebErrorKt.webError;

public interface StudentAccess extends SoftDeleteAccess<Student, Integer> {
  Student findByName(String name);

  @Override
  default void akoPreSave(Student data) {
    data.setName(data.getName().trim());
    Student exists = findByName(data.getName());
    if (exists != null && !exists.getId().equals(data.getId())) {
      webError(1000001, "学生姓名已存在");
    }
  }

  @Override
  default void akoPostSave(Student data) {
    // 保存成功后执行，仍在同一事务中
  }
}`,
    note: 'Java 在 Access 接口里用 default 方法覆盖钩子，效果与 Kotlin 版本相同。',
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
    note: 'AkoRain.instance.transaction 基于 JPA EntityManager：已有活动事务时直接复用，否则开启新事务，成功提交，异常回滚。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `import ako.rain.AkoRain;
import smartaccess.item.Page;
import java.util.Map;

AkoRain.Companion.getInstance().transaction(() -> {
  Student student = studentAccess.findFirst(Map.of(), new Page(0, 1))
    .stream()
    .findFirst()
    .orElseThrow();
  student.setName(newName);
  studentAccess.saveOrUpdate(student);
  return null;
});`,
    note: 'Java 调用 AkoRain 实例上的 transaction 方法；实际项目中 studentAccess 应通过 Rain 依赖注入获得。',
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
    note: 'AkoSpringRuntime.transaction 基于 PlatformTransactionManager 和 TransactionTemplate，传播行为为 REQUIRED。',
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
    note: 'Java 一般直接用 @Transactional；它和 Kotlin 的 transaction { } 一样，最终都交给 PlatformTransactionManager。',
  },
]

const modelFunctionExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `import ako.rain.\`fun\`.accessOfModel
import ako.rain.\`fun\`.findAccess
import ako.rain.\`fun\`.transaction

val access = findAccess<StudentAccess>()
val sameAccess = student.findAccess()
student.save()
student.delete()`,
    note: 'findAccess/accessOfModel 从 AkoRain.instance.accesses 中查找 Access。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `StudentAccess access = /* 从 Rain DI 获取 */;

Student student = new Student();
access.saveOrUpdate(student);
access.delete(student);`,
    note: 'Java 直接调用 Access 的实例方法；Kotlin 的 reified findAccess/accessOfModel 和模型扩展函数在 Java 中无法直接使用。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `import ako.spring.\`fun\`.findAccess
import ako.spring.\`fun\`.transaction

val repository = findAccess<StudentRepository>()
student.save()
student.delete()`,
    note: 'Spring 的 findAccess 返回延迟代理；save/delete 由 AkoSpringRuntime 找到对应的模型上下文，再交给数据库实现。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `private final StudentRepository repository;

public StudentService(StudentRepository repository) {
  this.repository = repository;
}

repository.save(student);
repository.delete(student);`,
    note: 'Java 通过构造器注入 Repository，用不到 companion object 和 Kotlin 扩展函数。',
  },
]
</script>

<CodeSwitch :variants="accessExamples" />

| 事项 | `ako-rain` | `ako-spring` |
| --- | --- | --- |
| 基础接口 | `ako.rain.access.AkoAccess` | `ako.spring.access.AkoAccess` |
| JPA 接口 | SmartAccess `JpaAccess` | Spring Data `JpaRepository` / `AkoJpaRepository` |
| 发现方式 | Rain `ClassRegister` | Spring `ApplicationContext` + `AkoSpringDatabase` |
| 自定义数据库 | 接入 SmartAccess/JPA | 实现并注册 `AkoSpringDatabase` |

`ako-spring-common` 里的 `AkoAccess` 有意不继承 `JpaRepository`，这样 Boot 2/3/4 以及不基于 Spring Data 的数据实现都能共用同一个公共运行时。只有引入 `ako-springboot-springdata` 后，才会用到 `AkoJpaRepository`、`AkoRepository` 或 `SoftDeleteAccess`。

## 查询

<CodeSwitch :variants="queryExamples" />

两套实现支持同一组查询键：`field`/`field_eq`、`field_like`、`field_gt`、`field_gte`、`field_lt`、`field_lte`、`field_ne`、`field_in`、`field_isNull`。

对查询键的校验两边不一样。Spring 的 `AkoSpringDataDatabase` 会对照模型字段检查查询字段和排序字段，排序方向只接受 `ASC`/`DESC`，不合法就抛异常。Rain 的 `AkoAccess.margeWhereQuery` 和 `wherePage` 会把字段名、排序键原样拼进 HQL，不做白名单校验；而 `IModelController.page` 会把前端传来的 `params` 和 `sort` 直接交给它们。Rain 项目需要在控制器里先按模型字段过滤这两个参数。

页码的含义也不同。Rain 的 `smartaccess.item.Page(0, size)` 第一个参数是 offset；Ako HTTP 请求里的 `page: 1` 表示第一页；Spring 的实现直接在 Criteria 查询上按 `(page - 1) * size` 计算 offset。两种页码对象不能混用。

## 自定义数据库（Spring）

如果 Spring 项目不用 Spring Data JPA，或者要接入别的数据库，可以只依赖公共接口，自己实现 `AkoSpringDatabase`：

```kotlin
@Component
class BillingDatabase : AkoSpringDatabase {
  override val modelTypes = listOf(Invoice::class.java)

  override fun <T : AkoModel> whereList(
    model: DbModel<out T>,
    params: Map<String, Any>?,
    sort: Map<String, String>?,
    page: Int?,
    size: Int?,
  ): List<T> = billingStore.list(model, params, sort, page, size)

  override fun <T : AkoModel> wherePage(
    model: DbModel<out T>,
    params: Map<String, Any>?,
    sort: Map<String, String>?,
    page: Int,
    size: Int,
  ): PageResp<T> = billingStore.page(model, params, sort, page, size)

  override fun <T : AkoModel> save(data: T): T = billingStore.save(data)

  override fun delete(model: DbModel<out AkoModel>, id: Any?) {
    billingStore.delete(model.id, id)
  }
}
```

实现类要通过 `modelTypes` 声明自己负责哪些模型，并实现 `whereList`、`wherePage`、`save` 和 `delete`。运行时会为每个模型创建一个 `AkoSpringModelContext`。一个模型只能由一个 `AkoSpringDatabase` 提供，重复声明会在初始化时报错。

这是 Spring 和 Rain 的一个重要区别：Rain 的 `AkoAccess` 直接建立在 SmartAccess 之上，Spring 则把数据库能力抽象成可以替换的 Bean。

## 事务

<CodeSwitch :variants="transactionExamples" />

标准模型接口（page/save/delete）会自动进入适配器的事务。跨模型更新、普通业务接口和自定义按钮，仍然要自己显式包一层事务。

两边的事务 API 名字相同，方便业务代码保持一致写法；但底层的事务管理器不同，异常处理、事务传播和外部副作用仍要按各自框架验证。

## 模型扩展函数

<CodeSwitch :variants="modelFunctionExamples" />

Spring 没有 Rain 那样的 `accessOfModel(Class)` 公共扩展，因为模型和数据实现的对应关系由 `AkoSpringDatabase.modelTypes` 决定。需要按模型查找时，使用运行时的 `modelMap` 或自己的数据库服务。

## 软删除

| 行为 | `ako-rain` | `ako-spring` |
| --- | --- | --- |
| 删除方式 | `SoftDeleteAccess` 用 QueryRewriter 把删除语句改写为更新 `deleteTime` | `AkoSpringDataDatabase.delete` 判断是 `SoftDeleteModel` 后更新 `deleteTime` |
| 查询过滤 | Hibernate `_ako_soft_delete` Filter（`delete_time = 0`） | Criteria 查询显式追加 `deleteTime = 0` |
| 恢复数据 | 业务代码自行处理 | 业务代码或 Repository 自行更新 |
| 注意事项 | 改写规则匹配的是 `delete form` 前缀（与 SmartAccess 生成的单条删除语句一致），因此只对 `delete(id)`/`delete(entity)` 生效；`deleteAll()` 发出的 `delete from ...` 不会被改写，执行的是物理删除 | 删除逻辑写在 Spring Data 数据库实现里，不依赖 Hibernate Filter |

两套代码不同，是因为 Rain 通过 SmartAccess 的语句改写扩展删除，Spring 适配器则直接控制 Criteria 查询和 Repository 调用。软删除不属于 Ako 协议，判断删除是否成功要看数据库里的数据，不能只看前端有没有刷新。

## 保存钩子

从 JVM `0.0.16` 起，`ako-rain` 的 `AkoAccess` 提供两个保存钩子，默认都是空实现：

```kotlin
fun akoPreSave(data: T) {}
fun akoPostSave(data: T) {}
```

前端调用 `model/save/{model}` 时，Ako 按 `akoPreSave → 保存 → akoPostSave` 的顺序执行。在 Access 接口里覆盖它们，就可以在保存前补全字段、做业务校验，或在保存后同步其他数据：

<CodeSwitch :variants="saveHookExamples" />

使用时注意：

- Rain 的 `IModelController.save` 整体运行在 `transaction {}` 中，钩子和保存处于同一个事务。`akoPreSave` 里抛出异常会中止保存并回滚，适合做唯一性校验这类“不通过就拒绝”的检查。
- 钩子只在经过 `Model.save` 的标准保存流程中触发。业务代码直接调用 `saveOrUpdate()`，或使用 Kotlin 扩展函数 `save()`，都不会经过钩子。
- 新增和编辑走同一个钩子，需要区分时可以判断 `data.id` 是否为 `null`。
- `ako-spring` 的 `AkoSpringModelContext` 中这两个钩子仍是空实现，Spring 项目暂时没有覆盖入口。相关逻辑请放在自定义的 `AkoSpringDatabase.save` 或业务服务中。

## 安全

默认的模型上下文不会替你处理权限、唯一性和审计。这些逻辑应写在保存钩子、服务或控制器中，并且 `page`、`save`、`delete` 每次请求都要单独鉴权。另外几点：

- 客户端传来的字段名必须先经过白名单校验，再交给 HQL 或 Criteria。
- 前端的 `validate` 只改善体验，数据校验要在服务端再做一遍。
- 批量删除要单独限制数量并记录审计，不能当作普通的单条删除处理。
- 事务只回滚数据库操作；事务块里发出的消息、写入的文件、发起的支付不会随之撤销。
