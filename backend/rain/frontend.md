---
title: 前端联动
description: 对比 ako-rain 与 ako-spring 如何把 JVM 实体声明转换成 Ako 前端页面。
---

# 前端联动

`ako-rain` 和 `ako-spring` 都把 JVM 模型转换成同一份 `DbModel`/`DbField` 元数据，交给 `@ako-dev/ako` 的默认 View 渲染。两套框架的差异只在运行时、Access/Repository、控制器和数据库这几层，前端看到的接口和 JSON 结构完全相同。

```text
JVM Entity + Ako 注解
          ↓
Rain AkoRain / Spring AkoSpringRuntime
          ↓
menu/list/{channel} 返回 DbModel
          ↓
Ako 前端按 page/search/table/edit 节点创建 View
          ↓
model/page、save、delete 完成数据交互
```

## 打开页面时的请求

| 时机 | 接口 | 前端用途 |
| --- | --- | --- |
| 启动 | `GET auth/isAuth` | 判断显示登录页还是主界面。 |
| 进入主界面 | `GET menu/list/{channel}` | 取得菜单分组和模型元数据。 |
| 打开模型 | `POST model/page/{model}` | 取得分页数据和关联 `information`。 |
| 新增/编辑 | `POST model/save/{model}` | 提交实体 JSON。 |
| 删除 | `POST model/delete/{model}` | 提交 ID 数组。 |

默认前端的页码从 `page: 1` 开始，默认基地址是 `/api/ako/`，默认 `channel` 是 `manager`。前端改了 `channel` 或 `baseUrl` 后，后端控制器的路径要与拼接后的地址保持一致。

## 从模型到 `DbModel`

实体字段上的 Ako 注解在两套框架中完全相同：

<CodeSwitch :variants="metadataExamples" />

两套框架会把它转换成相同的字段元数据：

- `@DbName` 提供页面上的显示名称。
- 字段的 JVM 类型决定默认 `type`：布尔和枚举类型是 `ako:enum`，其他类型是 `ako:text`。时间、关联等类型需要显式加注解。
- `search`、`column`、`edit` 三项是否存在，决定字段出现在搜索区、表格还是编辑表单。
- `@Description`、宽度、排序、校验和节点注解写入对应的元数据项。

前端根据 `type` 找到对应的类型提供者，把同一个字段分别渲染成搜索、表格和编辑控件。各注解的详细行为见 [注解功能](/backend/rain/annotations)，协议 JSON 见 [模型定义](/protocol/metadata)。

## 模型发现

<script setup lang="ts">
const discoveryExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `@Entity
@DbName("学生")
data class Student(
  var name: String = "",
) : CompleteModel() {
  companion object : StudentAccess by findAccess()
}

interface StudentAccess : SoftDeleteAccess<Student, Int>`,
    note: 'Rain 通过 ClassRegister 注册 Access 接口，AkoRain 再从 Rain 容器取得 Access 实例，并读出模型类型。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `import ako.annotation.DbName;
import ako.model.base.CompleteModel;
import ako.rain.access.SoftDeleteAccess;
import jakarta.persistence.Entity;

@Entity
@DbName("学生")
public class Student extends CompleteModel {
  private String name = "";

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
}

interface StudentAccess extends SoftDeleteAccess<Student, Integer> {}`,
    note: 'Java 版同样由 ClassRegister 注册 StudentAccess，Access 实例由 Rain DI 提供，没有 Kotlin 的 companion object。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `@Entity
@DbName("学生")
open class Student : CompleteModel() {
  open var name: String = ""

  companion object : StudentRepository by findAccess()
}

interface StudentRepository : SoftDeleteAccess<Student, Int>`,
    note: 'AkoSpringDataDatabase 从 ApplicationContext 收集 Repository Bean，并从泛型参数解析模型类型；AkoSpringRuntime 再据此建立 modelMap。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `import ako.annotation.DbName;
import ako.model.base.CompleteModel;
import ako.spring.data.SoftDeleteAccess;
import jakarta.persistence.Entity;

@Entity
@DbName("学生")
public class Student extends CompleteModel {
  private String name = "";

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
}

interface StudentRepository extends SoftDeleteAccess<Student, Integer> {}`,
    note: 'Java 版同样从 StudentRepository 的泛型参数解析出 Student；业务代码通过构造器注入 Repository。',
  },
]

const metadataExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `@DbName("学生")
@Entity
data class Student(
  @DbName("姓名")
  @Description("学生在管理后台中的展示名称")
  @Required("请输入姓名")
  var name: String = "",

  @DbName("年龄")
  @SearchType(SearchType.Type.GreaterEqual)
  var age: Int = 0,
) : CompleteModel()`,
    note: 'Rain Kotlin 用 data class 声明实体，Ako 注解生成的 DbField 元数据与其他写法相同。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `@DbName("学生")
@Entity
public class Student extends CompleteModel {
  @DbName("姓名")
  @Description("学生在管理后台中的展示名称")
  @Required("请输入姓名")
  private String name = "";

  @DbName("年龄")
  @SearchType(SearchType.Type.GreaterEqual)
  private int age;

  // JavaBean getters/setters omitted
}`,
    note: 'Rain Java 在字段上写注解并提供 JavaBean 访问器，生成的元数据与 Kotlin 相同。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `@DbName("学生")
@Entity
open class Student : CompleteModel() {
  @DbName("姓名")
  @Description("学生在管理后台中的展示名称")
  @Required("请输入姓名")
  open var name: String = ""

  @DbName("年龄")
  @SearchType(SearchType.Type.GreaterEqual)
  open var age: Int = 0
}`,
    note: 'Spring Kotlin 用 open class/open var 让 JPA 能生成代理，Ako 注解的效果不变。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `@DbName("学生")
@Entity
public class Student extends CompleteModel {
  @DbName("姓名")
  @Description("学生在管理后台中的展示名称")
  @Required("请输入姓名")
  private String name = "";

  @DbName("年龄")
  @SearchType(SearchType.Type.GreaterEqual)
  private int age;

  // JavaBean getters/setters omitted
}`,
    note: 'Spring Java 使用普通实体类和访问器，代理和 Bean 管理由 Spring/JPA 负责。',
  },
]

const relationExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `@DbName("小组")
@Mapping(Group::class, display = "name")
@Column(name = "group_id")
var group: Int = 0`,
    note: '@Mapping 生成关联字段，查询分页时后端会在 information 中附带关联数据。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `@DbName("小组")
@Mapping(value = Group.class, display = "name")
@Column(name = "group_id")
private int group;`,
    note: 'Java 写成 Group.class；目标模型 Group 也必须能被 Rain 运行时发现。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `@DbName("小组")
@Mapping(Group::class, display = "name")
@Column(name = "group_id")
open var group: Int = 0`,
    note: '关联声明与 Rain 相同，关联数据由 AkoSpringDataDatabase 查询。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `@DbName("小组")
@Mapping(value = Group.class, display = "name")
@Column(name = "group_id")
private int group;`,
    note: 'Java 写法同上，前端拿到的仍是同一个 ako:mapping 类型。',
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
    note: '节点名只决定前端使用哪个组件，与 Rain 的 Access 无关。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `@ModelNode(
    pageNode = "sales-order-page",
    tableNode = "sales-order-table"
)
public class Order extends CompleteModel {}`,
    note: 'Java 用命名参数写法；前端组件仍需预先注册。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `@ModelNode(
  pageNode = "sales-order-page",
  tableNode = "sales-order-table",
)
open class Order : CompleteModel()`,
    note: 'Spring 只把节点名写入 DbModel，不会自动注册 Vue 组件。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `@ModelNode(
    pageNode = "sales-order-page",
    tableNode = "sales-order-table"
)
public class Order extends CompleteModel {}`,
    note: 'Java Spring 写法相同，组件仍需在前端注册。',
  },
]
</script>

<CodeSwitch :variants="discoveryExamples" />

两个 `SoftDeleteAccess` 同名但来源不同。Spring 的来自 `ako.spring.data`，继承 Spring Data 的 `JpaRepository`；Rain 的来自 `ako.rain.access`，继承 SmartAccess 的 `JpaAccess`。所以前端看到的字段和菜单相同，但两边的模型发现代码不能直接互换。

## 关联字段

关联声明同样属于公共模型层：

<CodeSwitch :variants="relationExamples" />

两套框架都生成 `type: "ako:mapping"`。分页响应的 `information` 带有关联实体，前端的 `ako:mapping` 类型提供者用它把 ID 显示成名称；搜索和编辑时，点击按钮会打开关联模型的标准 View 供选择。关联的目标模型也必须能被对应的运行时发现。

## 枚举、时间和大小

| JVM 声明 | 前端效果 |
| --- | --- |
| `@DbEnum(...)`、枚举类型或布尔字段 | 下拉搜索、表格显示选项名称、下拉编辑。 |
| `@Timestamp`、`@DateOnly`、`@TimeOnly`、`@Datetime` | 日期或时间选择器搜索，表格按格式显示。 |
| `@BinarySize` | 带单位的搜索、显示和编辑。 |
| `@Mapping(...)` | 关联搜索、名称显示和关联选择页。 |

这些都是 `ako-core` 提供的元数据，从 Rain 换到 Spring 不会有任何变化。新增类型时，后端的 `AkoTypeProvider`（或协议中的 `type`/`options`）要和前端的类型提供者使用同一个名称。

## 自定义页面节点

模型级的 `@ModelNode` 在两套框架中相同。它的值是前端组件名，与后端路由无关：

<CodeSwitch :variants="modelNodeExamples" />

前端必须先注册同名组件：

```ts
app.component('sales-order-page', SalesOrderPage)
app.component('sales-order-table', SalesOrderTable)
```

组件名只决定前端在该位置渲染哪个 View，与后端权限无关。标准节点、props 和替换方式见 [前端参考](/frontend/reference) 与 [使用 Ako View 构建页面](/frontend/views)。

## 页面按钮与行按钮

`@ModelButton`/`@ModelButtons` 生成搜索区的页面级按钮，`@OperateButton`/`@OperateButtons` 生成表格每行的按钮。按钮可以请求一个后端 URL、打开自定义弹窗或编辑面板，也可以在浏览器里执行一小段脚本。

权限、事务、批量处理和审计都应该放在按钮请求的后端接口里，前端按钮只是入口。按钮的元数据结构见 [按钮与操作](/protocol/buttons)。

## 自定义字段与 View

只改前端显示时，不需要为 Rain 和 Spring 各写一套页面：

1. 在前端注册一个类型提供者或 View。
2. 两套后端使用相同的 `type` 或 `*Node` 名称。
3. 让 JVM 适配器生成同一份元数据。

`@ModelNode` 等注解在两套后端中写法一致，需要随框架切换的只有实体的 Access/Repository 和控制器路由。前端的实现方式见 [运行时与工具](/frontend/tools)、[使用 mixin](/frontend/mixins) 和 [使用 Ako View 构建页面](/frontend/views)。

## 常见问题排查

### 菜单里没有模型

- Rain：检查 `rain.scanPackages` 是否包含 Access 所在的包、ClassRegister 是否发现了 `AkoAccess`，以及 SmartAccess/JPA 服务是否可用。
- Spring：检查 `@SpringBootApplication` 的扫描范围、Repository 是否被 `@EnableJpaRepositories` 扫描到，以及 `AkoSpringDatabase` 是否已注册为 Bean。

### 菜单有模型但页面空白

查看 `DbModel.fields`，确认字段没有被 `@NoAkoField` 或 `@SearchIgnore` 等忽略注解排除，再确认 `type` 是前端已注册的类型。

### 关联字段显示成 ID

确认关联模型已经出现在 `models` 中，分页响应带有对应的 `information`，并且 `@Mapping` 的 `display` 字段确实存在。

### 自定义页面没有生效

确认组件在菜单加载前已注册，组件名与 `pageNode` 完全一致，并且没有被之后的 `mixin` 覆盖。

### 保存或删除成功但页面没有刷新

标准 View 在保存、删除后会重新查询分页；自定义按钮或 View 需要自己调用 `searchFun`。鉴权、校验和事务仍需服务端独立完成。

