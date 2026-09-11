---
title: 数据访问与事务
description: 对比 ako-rain 与 ako-spring 的 Access、Repository、查询、事务和软删除。
---

# 数据访问与事务

Ako 只规定模型上下文需要完成分页、保存和删除；具体如何查库、开启事务和实现软删除，由 JVM 适配器决定。`ako-rain` 使用 SmartAccess/JPA，`ako-spring` 使用 Spring Data JPA 或 `AkoSpringDatabase` SPI。

## 模型基类

Rain 与 Spring Data Boot 3/4 共享 `ako-jpa` 的模型基类；Spring Boot 2 的 `javax.persistence` 兼容路径不强制使用这些 Jakarta 基类：

| 基类 | 能力 |
| --- | --- |
| `AkoModel` | 只有 Ako 模型标记，不绑定 JPA。 |
| `AkoModelBase` | 创建时间、更新时间生命周期字段。 |
| `IdentityModel` | `AkoModelBase` + 自增 `Int` ID。 |
| `SoftDeleteModel` | `AkoModelBase` + 删除时间字段和软删除语义。 |
| `CompleteModel` | `SoftDeleteModel` + 自增 `Int` ID。 |
| `LongIdentityModel` / `LongCompleteModel` | Long ID 版本。 |
| `UuidV4IdentityModel` / `UuidV4CompleteModel` | UUID ID 版本。 |

基类和 Ako 注解是共同层；Access/Repository、查询实现和事务管理器才是框架差异。

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
    note: 'Rain 的 Access 继承 SmartAccess 的 JpaAccess，由 ClassRegister 发现并由 Rain 容器提供实现。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `import ako.rain.access.SoftDeleteAccess;

public interface StudentAccess extends SoftDeleteAccess<Student, Integer> {}

Student student = new Student();
student.setName("Alice");
studentAccess.saveOrUpdate(student);`,
    note: 'Rain Java 使用接口继承声明 Access，并通过 Rain DI 注入 studentAccess；保存调用 SmartAccess 的 saveOrUpdate。',
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
    note: 'Spring Data Repository 是 Spring Bean；AkoSpringRuntime 从 ApplicationContext 延迟解析 findAccess() 返回的代理。',
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
    note: 'Spring Java 通过构造器注入 StudentRepository；Repository 既是 Spring Data JPA 接口，也是 Ako 模型的数据访问入口。',
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
    note: 'Rain 的 SmartAccess Page 使用 offset；AkoRainModelContext 会把前端的 1-based page 转成 offset。',
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
    note: 'Rain Java 直接调用 SmartAccess 的 whereQuery；Page 的第一个参数是从 0 开始的 offset。',
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
    note: 'Spring Data 适合声明领域查询；AkoSpringDataDatabase 使用 Jakarta Criteria API 处理通用字段过滤和分页。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `import ako.model.base.ModelContext;
import ako.model.resp.PageResp;
import ako.spring.AkoSpringRuntime;
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
    note: 'Spring Java 使用 Repository 派生查询或 Runtime 的 modelMap；Ako 通用分页使用 1-based 页码并由 Criteria API 执行。',
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
    note: 'AkoRain.instance.transaction 使用 JPA EntityManager；活动事务会复用，否则开始、提交或回滚一个事务。',
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
    note: 'Java 调用 AkoRain 的成员事务入口；实际项目中应从 Rain DI 获取 studentAccess。',
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
    note: 'AkoSpringRuntime.transaction 使用 PlatformTransactionManager/TransactionTemplate，并以 REQUIRED 传播行为执行。',
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
    note: 'Spring Java 通常使用 @Transactional；它与 Kotlin 的 transaction { } helper 都委托 PlatformTransactionManager。',
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
    note: 'findAccess/accessOfModel 从 AkoRain.instance.accesses 查找 Rain Access。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `StudentAccess access = /* 从 Rain DI 获取 */;

Student student = new Student();
access.saveOrUpdate(student);
access.delete(student);`,
    note: 'Java 直接调用 Access 的实例方法；Kotlin 的 reified findAccess/accessOfModel 和模型扩展函数不能直接照搬到 Java。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `import ako.spring.\`fun\`.findAccess
import ako.spring.\`fun\`.transaction

val repository = findAccess<StudentRepository>()
student.save()
student.delete()`,
    note: 'Spring 的 findAccess 返回延迟代理；调用 save/delete 时由 AkoSpringRuntime 找到对应模型上下文和 Repository。',
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
    note: 'Java Spring 通过构造器注入 Repository；不需要 companion object 或 Kotlin 扩展函数代理。',
  },
]
</script>

<CodeSwitch :variants="accessExamples" />

| 事项 | `ako-rain` | `ako-spring` |
| --- | --- | --- |
| 基础接口 | `ako.rain.access.AkoAccess` | `ako.spring.access.AkoAccess` |
| JPA 具体接口 | SmartAccess `JpaAccess` | Spring Data `JpaRepository` / `AkoJpaRepository` |
| 发现入口 | Rain `ClassRegister` | Spring `ApplicationContext` + `AkoSpringDatabase` |
| 自定义数据库 | 接入 SmartAccess/JPA | 实现并注册 `AkoSpringDatabase` |

`ako-spring-common` 的 `AkoAccess` 不继承 `JpaRepository`，这是有意的：Boot 2/3/4 以及非 Spring Data 数据实现可以共享公共 Runtime。只有引入 `ako-springboot-springdata` 时，才使用 `AkoJpaRepository`、`AkoRepository` 或 `SoftDeleteAccess`。

## 查询

### Rain：SmartAccess 查询

<CodeSwitch :variants="queryExamples" />

两套实现都支持以下 Ako 查询键：`field`/`field_eq`、`field_like`、`field_gt`、`field_gte`、`field_lt`、`field_lte`、`field_ne`、`field_in`、`field_isNull`。适配器必须对白名单字段、操作符、排序字段和排序方向做校验。

Rain 的 `smartaccess.item.Page(0, size)` 是 offset 页对象，而 Ako HTTP 请求的 `page: 1` 表示第一页；Spring 的实现直接在 Criteria Query 上计算 `(page - 1) * size`。两个 API 的页码对象不能混用。

## 自定义数据库：Spring SPI

如果 Spring 项目不是 Spring Data JPA，或需要接入其他数据库，可以只使用公共接口：

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

`AkoSpringDatabase` 必须声明自己负责的 `modelTypes`，并实现 `whereList`、`wherePage`、`save` 和 `delete`。Runtime 会为每个模型创建 `AkoSpringModelContext`。这条 SPI 是 Spring 与 Rain 的重要差异：Rain 的 `AkoAccess` 直接依赖 SmartAccess，而 Spring 把数据库能力抽象成可替换 Bean。

## 事务

<CodeSwitch :variants="transactionExamples" />

标准模型 Controller 的 page/save/delete 会进入适配器自己的事务；跨模型更新、普通业务接口和自定义按钮仍应显式包在事务中。事务 API 名称相同，是为了让业务代码保持相似；底层事务管理器不同，所以异常、传播和外部副作用仍需按宿主框架验证。

## 模型扩展函数

<CodeSwitch :variants="modelFunctionExamples" />

Spring 没有 Rain 的 `accessOfModel(Class)` 公共扩展，因为模型到数据实现的映射由 `AkoSpringDatabase.modelTypes` 建立；需要按模型查找时使用 Runtime 的 `modelMap` 或自己的数据库服务。

## 软删除

| 行为 | `ako-rain` | `ako-spring` |
| --- | --- | --- |
| 删除入口 | `SoftDeleteAccess` 的 QueryRewriter | `AkoSpringDataDatabase.delete` 判断 `SoftDeleteModel` 后更新 `deleteTime` |
| 查询过滤 | Hibernate `_ako_soft_delete` Filter | Criteria 查询显式追加 `deleteTime = 0` |
| 恢复 | 需要业务代码/底层策略 | 需要业务代码/Repository 更新 |
| 当前注意 | 当前源码的 QueryRewriter 字符串仍写成 `delete form`，应通过集成测试确认 | 当前实现把删除语义写在 Spring Data 数据库适配器中，未依赖 Hibernate Filter |

这就是两套框架软删除代码不同的原因：Rain 通过 SmartAccess 的 SQL/HQL 重写扩展删除，Spring 适配器直接控制 Criteria 和 Repository 调用。软删除不是 Ako 协议的一部分，不能只看前端是否刷新来判断是否成功。

## 保存生命周期与安全

`ModelContext` 提供 `akoPreSave` 和 `akoPostSave` 扩展点。两套当前默认上下文都不替业务完成权限、唯一性和审计；这些逻辑应放在服务/控制器中，并在 `page`、`save`、`delete` 每次请求独立鉴权。

- 不要把客户端字段名未经白名单直接传给 HQL 或 Criteria。
- 不要只用前端 `validate` 保护数据。
- 不要把批量删除当作普通单条删除，需单独限制数量并审计。
- 不要把事务块中的外部消息、文件或支付副作用误认为会自动回滚。
