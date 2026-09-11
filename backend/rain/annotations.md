---
title: 注解功能
description: JVM 适配器中每个 Ako 注解的参数、前端效果和当前实现边界。
---

# 注解功能

`ako-rain` 和 `ako-spring` 都使用 `ako-core` 的 JVM 注解把模型声明转换成页面元数据。注解本身只描述意图，最终效果取决于：模型是否被对应 Runtime 发现、前端是否注册对应组件、以及后端是否实现了实际业务校验。

本页覆盖当前源码中的全部 Ako 注解，包括模型、菜单、字段、类型、校验、按钮和元注解。其他语言的适配器不需要复刻注解，只需要输出相同的协议结果。

## 使用前提

```kotlin
import ako.annotation.*
import ako.annotation.types.*
```

模型需要：

1. 实现 `AkoModel`，通常继承 `CompleteModel`、`LongCompleteModel` 或 UUID 基类。
2. 有对应的数据访问入口：Rain 是 `AkoAccess`/`SoftDeleteAccess`，Spring Data 是 `AkoJpaRepository`/`SoftDeleteAccess`，自定义 Spring 数据库则由 `AkoSpringDatabase.modelTypes` 提供。
3. 模型和数据访问入口能被宿主框架发现。
4. 对应 Runtime 已注册，并且底层 JPA/数据访问服务可用。

| 发现环节 | `ako-rain` | `ako-spring` |
| --- | --- | --- |
| Runtime | `AkoRain`，由 Rain 模块配置注册。 | `AkoSpringRuntime`，由 Boot 自动配置注册。 |
| 模型来源 | Rain `ClassRegister` 发现 `AkoAccess`。 | Spring `ApplicationContext` 中的 Repository Bean，或 `AkoSpringDatabase`。 |
| 自定义 Provider | Rain DI Bean。 | Spring Bean，或 Runtime 的无参构造回退。 |
| 注解转换 | 共同使用 `Class<T>.dbModel`。 | 共同使用 `Class<T>.dbModel`。 |

## 1. 模型与菜单注解

### `@DbName`

```kotlin
@DbName("学生", index = 10)
@Entity
class Student : CompleteModel()
```

| 参数 | 默认值 | 效果 |
| --- | --- | --- |
| `value` | 必填 | 类上是模型名称；字段上是字段/列/表单名称。 |
| `index` | `100` | 类上成为 `DbModel.index`，影响菜单顺序。字段上的 `index` 当前不会用于排序；字段排序用 `@ColumnIndex`。 |

没有 `@DbName` 时，当前转换器使用类名或字段 ID。

### `@MenuGroup`

```kotlin
@MenuGroup(
    id = "school",
    name = "学校管理",
    icon = "School",
    index = 10,
)
class Student : CompleteModel()
```

| 参数 | 默认值 | 效果 |
| --- | --- | --- |
| `id` | `""` | 菜单组标识；当前实现要求非空。 |
| `name` | `""` | 非空时覆盖菜单组名称。 |
| `icon` | `""` | 非空时作为 `iconNode`。 |
| `index` | `0` | 非 0 时覆盖菜单组排序。 |
| `previous` | `""` | 设计上用于父级菜单；当前 `AkoService.findMenu` 没有把它写入 `DbModelMenu`，嵌套菜单不要依赖该参数。 |

模型上的 `@MenuGroup` 会让 `DbModel.previous` 指向该组 ID，并在 `menus` 中创建或复用菜单组。当前核心菜单汇总也不会按 `channel` 过滤。

### `@ModelNode`

```kotlin
@ModelNode(
    pageNode = "sales-order-page",
    tableNode = "sales-order-table",
)
class Order : CompleteModel()
```

| 参数 | 默认值 | 对应元数据 |
| --- | --- | --- |
| `pageNode` | `default-entity-page-node` | `DbModel.pageNode` |
| `searchNode` | `default-entity-search-node` | `DbModel.searchNode` |
| `tableNode` | `default-entity-table-node` | `DbModel.tableNode` |
| `editNode` | `default-entity-edit-node` | `DbModel.editNode` |
| `iconNode` | `default-entity-icon-node` | `DbModel.iconNode` |

这些值是前端组件名称，不是 URL。组件必须注册到 Vue App；名称错误时后端仍可能启动，但前端无法渲染。

### `@NoAkoModel`

标记模型不进入 `AkoRain.modelMap` 或 `AkoSpringRuntime.modelMap`，也不会出现在 `menu/list` 的 `models`。它仍可以被 ORM 或业务代码使用，适合内部实体、关联表和不希望暴露到管理后台的模型。

## 2. 字段显示注解

### `@NoAkoField`

字段不会被 `DbModel.fields` 收集，也不会生成搜索、表格或编辑信息。当前 JPA 基类用它隐藏 `updateTime` 与 `deleteTime`。

### `@SearchIgnore`、`@TableIgnore`、`@EditIgnore`

这三个注解只隐藏一个场景：

| 注解 | 生成结果 |
| --- | --- |
| `@SearchIgnore` | `field.search = null`，不出现在搜索区。 |
| `@TableIgnore` | `field.column = null`，不出现在表格。 |
| `@EditIgnore` | `field.edit = null`，不出现在编辑表单。 |

它们不会自动从实体 JSON 删除字段。涉及敏感信息时，应在后端序列化/DTO 层同时禁止输出。

### `@Description`

```kotlin
@Description("用户在后台中看到的姓名")
var name: String = ""
```

字段上的描述写入 `DbField.description`，默认编辑面板显示在输入项下方。注解声明允许标记类，但当前字段元数据转换只读取字段上的 `@Description`，类级别不会形成模型描述。

### 字段节点注解

| 注解 | 参数 | 效果 |
| --- | --- | --- |
| `@SearchPropertyNode(value)` | 组件名 | 覆盖 `search.component`。 |
| `@SearchInputNode(value)` | 组件名 | 覆盖 `search.entries[].component`。 |
| `@TableColumnNode(value)` | 组件名 | 覆盖 `column.component`。 |
| `@EditPropertyNode(value)` | 组件名 | 覆盖 `edit.propertyComponent`。 |
| `@EditInputNode(value)` | 组件名 | 覆盖 `edit.inputComponent`。 |

这些注解的 `value` 都是前端组件注册名。它们只改变渲染节点，不改变保存接口或数据类型。

### `@FieldNode`（当前未启用）

源码中保留了一段旧的 `FieldNode` 设计注释，但该注解当前被整段注释掉，并未编译进 `ako-core`。请使用上面的五个字段节点注解，不要在业务代码中引用 `FieldNode`。

### `@SearchColumnWidth`、`@TableColumnWidth`、`@ColumnIndex`

| 注解 | 参数 | 效果 |
| --- | --- | --- |
| `@SearchColumnWidth("240px")` | CSS 宽度字符串 | 写入搜索 entry 的 `width`。 |
| `@TableColumnWidth(240)` | 整数 | 写入表格 column 的 `width`。 |
| `@ColumnIndex(10)` | 整数 | 写入表格 column 的 `index`，越小越靠前。 |

未指定时，搜索宽度默认是 `200px`，表格宽度默认是 `200`，列顺序按字段发现顺序补齐。

## 3. 编辑状态与校验注解

### `@Required`

```kotlin
@Required("请输入姓名")
var name: String = ""
```

设置 `edit.require = true`，并添加 `validate[].require = true`。不可空字段即使没有 `@Required` 也会生成默认必填规则；注解的 `value` 是提示信息。

### `@AllowEmpty`

设置 `edit.allowEmpty = true`。它用于告诉默认前端编辑器：字段允许把空输入作为空值/空字符串提交。它不是数据库 nullable 设置，也不会绕过后端的非空约束。

### `@Disabled`

设置 `edit.editable = false`，默认前端会禁用输入控件。`value` 参数用于设计上的提示信息，但当前转换器只读取“是否存在”这一事实，不会把该提示写进校验消息。

### `@RangeValidate`

```kotlin
@RangeValidate(min = 1, message = "年龄不能小于 1")
var age: Int = 18
```

| 参数 | 默认值 | 效果 |
| --- | --- | --- |
| `min` | `-1` | 最小边界；对字符串表示长度，对数字表示数值。 |
| `max` | `-1` | 最大边界。 |
| `message` | `""` | 为空时由转换器生成默认提示。 |

协议结果写入 `validate[].min/max`。当前实现只把大于 0 的边界写入协议，且源码中的范围顺序判断是 `min < max` 时抛错（与通常写法相反）；使用双边界前请先验证版本或修正实现，不要把它当作后端校验。

### `@RegExpValidate`

```kotlin
@RegExpValidate("^[A-Z][A-Za-z0-9_]*$", "标识格式不正确")
var code: String = ""
```

写入 `validate[].regexp`，由 Element Plus 表单在前端执行。`value` 是正则表达式，`message` 是失败提示。

### `@FunctionValidate`

```kotlin
@FunctionValidate(
    "if (value === 'root') throw new Error('保留字')",
    "名称不可用",
)
var username: String = ""
```

写入 `validate[].eval`。前端会把它包装成 `async (value, data, model, field) => { ... }` 执行。该函数只在浏览器生效，后端不会执行或验证它。

### `@FetchValidate`

```kotlin
@FetchValidate("/api/validate/username", "用户名已存在")
var username: String = ""
```

写入 `validate[].fetch`。默认前端会向该地址 POST：

```json
{
  "model": "Student",
  "field": "username",
  "data": { "username": "Alice" },
  "value": "Alice"
}
```

响应需要让前端能读取 `success`；网络错误会被转换为“参数远程验证失败”。目标地址、认证、CORS 和服务端校验都由应用负责。

## 4. 搜索注解

### `@SearchType`

```kotlin
@SearchType(
    SearchType.Type.GreaterEqual,
    SearchType.Type.LessEqual,
)
var age: Int = 0
```

可用枚举：

| 枚举 | 请求操作符 | 语义 |
| --- | --- | --- |
| `Equal` | `eq` | 等于；前端请求参数可直接使用字段 ID。 |
| `Like` | `like` | 模糊匹配。 |
| `Greater` | `gt` | 大于。 |
| `Less` | `lt` | 小于。 |
| `GreaterEqual` | `gte` | 大于等于。 |
| `LessEqual` | `lte` | 小于等于。 |

没有 `@SearchType` 时，Provider 可以通过 `defaultSearch` 提供默认搜索；普通字段默认是 `eq`，时间字段默认是 `gte` + `lte`。

## 5. 字段类型注解

### `@DbEnum`

```kotlin
@DbEnum("男", "女")
var sex: Boolean = false
```

生成 `type: "ako:enum"` 和 `EnumOptions`。没有显式值时按数组下标生成值；使用 `"值:显示名"` 可以指定稳定值。`flag` 主要用于被 `CascadeEnum` 引用，单独使用时没有额外效果。

布尔字段即使没有 `@DbEnum`，当前默认 Provider 也会生成“是/否”选项；原生枚举常量默认使用常量名，也可以给常量加 `@DbName`。

### `@CascadeEnum`

```kotlin
@CascadeEnum(
    "kind",
    DbEnum("普通", "加急"),
    DbEnum("标准", "特殊"),
)
var level: Int = 0
```

第一个参数 `cascader` 是控制字段 ID；后续 `DbEnum` 列表按控制值选择。每个 `DbEnum.flag` 非空时作为控制值，否则按数组下标。生成的 `options` 仍是 `ako:enum`，结构为：

```json
{
  "cascader": "kind",
  "values": {
    "0": [{ "value": "0", "label": "普通" }],
    "1": [{ "value": "0", "label": "标准" }]
  }
}
```

### `@Mapping`

```kotlin
@Mapping(Group::class, field = "id", display = "name")
var group: Int = 0
```

生成 `type: "ako:mapping"`。参数含义：

| 参数 | 作用 |
| --- | --- |
| `value` | 目标模型 Class；协议中变成模型 ID。 |
| `field` | 用来匹配当前值的目标字段，默认 `id`。 |
| `display` | 展示名称字段，必填。 |
| `flag` | 只在 `CascadeMapping` 中作为级联键。 |

当前 JVM Provider 会根据当前页实体的关联 ID 查询目标模型，并写入 `information["ako:mapping"]`。

### `@CascadeMapping`

```kotlin
@CascadeMapping(
    "kind",
    Mapping(Group::class, display = "name", flag = "group"),
    Mapping(Team::class, display = "name", flag = "team"),
)
var owner: Int = 0
```

第一个参数是控制字段；后面的 `Mapping` 按 `flag` 或数组下标选择目标模型。前端会在当前行/表单中读取控制字段，再按对应目标模型查找关联数据。

### `@Timestamp`、`@DateOnly`、`@TimeOnly`、`@Datetime`

| 注解 | 生成类型 | `options` |
| --- | --- | --- |
| `@Timestamp("YYYY-MM-DD")` | `ako:timestamp` | 自定义 dayjs 格式。 |
| `@DateOnly` | `ako:timestamp` | `YYYY-MM-DD`。 |
| `@TimeOnly` | `ako:timestamp` | `HH:mm:ss`。 |
| `@Datetime` | `ako:timestamp` | `YYYY-MM-DD HH:mm:ss`。 |

时间 Provider 默认生成 `gte` 和 `lte` 搜索项；前端默认以时间戳提交，后端应统一时区和精度。

### `@BinarySize`

生成 `type: "ako:binary_size"`，用于把整数大小显示成带单位的字节大小，并提供对应搜索控件。当前 Provider 本身不产生额外 options，显示单位由前端配置决定。

### `@AkoType`

`@AkoType(provider = MyProvider::class)` 是元注解，用于把另一个注解绑定到 JVM `AkoTypeProvider`。Provider 必须能被当前 `AkoRuntime` 找到：Rain 通常从 DI 容器获取，Spring 通常从 `ApplicationContext` 获取，当前 Spring Runtime 找不到 Bean 时还会尝试无参构造。

```kotlin
@AkoType(MoneyProvider::class)
annotation class Money(val currency: String)
```

自定义注解被读取后，Provider 可以生成自定义 `type`、`options`、默认搜索项和 `information`。

### `@Identifier`

`@Identifier("billing:money")` 用于给自定义类型提供一个显式 ID。当前字段转换器只在没有实际 Provider ID 时尝试读取它；内置类型不需要此注解。新类型推荐直接让 Provider 的 `id` 稳定返回 `billing:money`，并在前端注册同名 TypeProvider。

## 6. 模型按钮与面板注解

### `@ModelButton`

模型级按钮显示在搜索区域。它是可重复注解：

```kotlin
@ModelButton(
    name = "导出",
    index = 10,
    url = "/api/student/export",
    method = "GET",
    type = "primary",
)
class Student : CompleteModel()
```

| 参数 | 默认值 | 效果 |
| --- | --- | --- |
| `name` | `""` | 按钮文字。 |
| `index` | `0` | 按钮顺序。 |
| `url` | `""` | 没有 `eval` 时请求的 URL。 |
| `method` | `GET` | 请求方法；`popup` 会新窗口打开。 |
| `eval` | `""` | 浏览器异步函数体；非空时覆盖 URL 执行。 |
| `reconfirm` | `""` | 非空时点击前二次确认。 |
| `type` | `default` | Element Plus 按钮类型。 |
| `component` | `""` | 使用前端注册的自定义按钮组件。 |
| `dialog` | 空 `ButtonDialog` | 打开指定 Dialog 组件。 |
| `panel` | 空 `ButtonPanel` | 用字段声明生成编辑面板。 |

如果没有 `@ModelButtons`，转换器会自动添加“查询”“新增”“批量删除”，再追加类上的 `@ModelButton`。按钮默认行为详见 [模型定义](/protocol/metadata)。

### `@ModelButtons`

```kotlin
@ModelButtons(
    ModelButton(name = "同步", url = "/api/sync", type = "primary"),
)
class Student : CompleteModel()
```

提供后会完整替换默认页面级按钮，也会忽略直接写在类上的 `@ModelButton`。需要保留查询、新增或删除时，要在列表中显式重新声明。

### `@OperateButton`

模型行级按钮，也是可重复注解。它的参数与 `@ModelButton` 的基础字段相同（`name`、`index`、`url`、`method`、`eval`、`reconfirm`、`type`、`component`），但默认在表格行上下文执行，可以使用当前 `single` 行。

### `@OperateButtons`

```kotlin
@OperateButtons(
    OperateButton(name = "查看", url = "/student/\${id}", method = "GET", type = "primary"),
)
class Student : CompleteModel()
```

提供后会完整替换默认“编辑/删除”行级按钮，也会忽略直接写在类上的 `@OperateButton`。

### `@ButtonDialog`

这是 `@ModelButton`/`@OperateButton` 的嵌套配置：

| 参数 | 默认值 | 效果 |
| --- | --- | --- |
| `component` | 必填 | 前端 Dialog 内容组件名；为空时不生成 Dialog 配置。 |
| `title` | `""` | Dialog 标题。 |
| `style` | `""` | Dialog 样式字符串。 |
| `close` | `false` | 是否显示关闭按钮。 |
| `needSingle` | `false` | 是否要求单选一行。 |
| `needMulti` | `false` | 是否要求至少多选一行。 |

组件会收到 `single`、`multi`、`model`、`search` 和 `edit`。

### `@ButtonPanel`

这是一个声明式编辑面板：

| 参数 | 默认值 | 效果 |
| --- | --- | --- |
| `id` | `""` | 面板模型 ID；为空时通常配合 `url` 使用。 |
| `name` | `""` | 面板名称。 |
| `url` | `""` | 提交地址；提供后使用 URL 模式。 |
| `method` | `""` | URL 提交方法。 |
| `data` | `""` | JavaScript 数据转换表达式。 |
| `fields` | 空 | `PanelField` 字段列表。 |

如果使用 URL 模式，点击保存会把表单提交到 `url`；否则使用面板 `id` 对应的标准模型保存逻辑。

### `@PanelField`

| 参数 | 默认值 | 效果 |
| --- | --- | --- |
| `id` | 必填 | 字段 ID。 |
| `nullable` | `true` | 是否允许空值，并影响必填规则。 |
| `allowEmpty` | `false` | 是否允许空字符串。 |
| `name` | 空 `DbName` | 字段名称。 |
| `description` | 空 `Description` | 字段说明。 |
| `enum` | 空 `DbEnum` | 枚举选项。 |
| `cascadeEnum` | 空 | 级联枚举。 |
| `mapping` | 空 | 关联映射。 |
| `cascadeMapping` | 空 | 级联关联。 |
| `empty` | 空 `AllowEmpty` | 面板字段的空值标记。 |

`PanelField` 会被转换成 `CustomEditField`，复用普通字段的类型、选项和编辑校验。

## 7. 权限与排序注解

### `@Permission`、`@Scene`

这两个注解分别携带一个字符串值，用于表达权限或场景意图：

```kotlin
@Permission("student:write")
@Scene("backoffice")
class Student : CompleteModel()
```

当前 `dbModel` 转换器没有把它们完整写入 `DbModel.permission`，也不会自动替控制器执行鉴权。它们不能替代后端权限中间件。

### `@DefaultSort`

```kotlin
@DefaultSort("-createdAt")
class Student : CompleteModel()
```

注解定义了一个字符串值，但当前元数据转换和前端首次查询没有消费它。实际默认排序请在后端适配器、请求初始值或前端 `mixin` 中明确设置。

## 8. 注解组合示例

下面的业务声明部分相同，只有实体代理、数据访问入口和 `findAccess` 包名随框架变化：

<script setup lang="ts">
const composedExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `@DbName("学生", index = 10)
@MenuGroup(id = "school", name = "学校管理", index = 10)
@ModelButton(name = "导出", url = "/api/student/export", type = "primary")
@Entity
@Table
data class Student(
  @DbName("小组")
  @Mapping(Group::class, display = "name")
  @Column(name = "group_id")
  var group: Int = 0,

  @DbName("姓名")
  @Required("请输入姓名")
  @SearchType(SearchType.Type.Like)
  var name: String = "",

  @DbName("年龄")
  @RangeValidate(min = 1)
  @TableColumnWidth(100)
  var age: Int = 18,

  @DbName("创建时间")
  @Datetime
  @EditIgnore
  var createdAt: Long = 0,
) : CompleteModel()

interface StudentAccess : ako.rain.access.SoftDeleteAccess<Student, Int>`,
    note: 'Rain 侧由 ClassRegister 发现 StudentAccess，并通过 Rain DI 获取实现。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `@DbName(value = "学生", index = 10)
@MenuGroup(id = "school", name = "学校管理", index = 10)
@ModelButton(name = "导出", url = "/api/student/export", type = "primary")
@Entity
@Table
public class Student extends CompleteModel {
  @DbName("小组")
  @Mapping(value = Group.class, display = "name")
  @Column(name = "group_id")
  private int group;

  @DbName("姓名")
  @Required("请输入姓名")
  @SearchType(SearchType.Type.Like)
  private String name = "";

  @DbName("年龄")
  @RangeValidate(min = 1)
  @TableColumnWidth(100)
  private int age = 18;

  @DbName("创建时间")
  @Datetime
  @EditIgnore
  private long createdAt;

  // JavaBean getters/setters omitted
}

interface StudentAccess extends ako.rain.access.SoftDeleteAccess<Student, Integer> {}`,
    note: 'Java Rain 的注解参数使用 Java 的 value/class 语法；Access 仍由 Rain ClassRegister 和 DI 发现。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `@DbName("学生", index = 10)
@MenuGroup(id = "school", name = "学校管理", index = 10)
@ModelButton(name = "导出", url = "/api/student/export", type = "primary")
@Entity
@Table
open class Student : CompleteModel() {
  @DbName("小组")
  @Mapping(Group::class, display = "name")
  @Column(name = "group_id")
  open var group: Int = 0

  @DbName("姓名")
  @Required("请输入姓名")
  @SearchType(SearchType.Type.Like)
  open var name: String = ""

  @DbName("年龄")
  @RangeValidate(min = 1)
  @TableColumnWidth(100)
  open var age: Int = 18

  @DbName("创建时间")
  @Datetime
  @EditIgnore
  open var createdAt: Long = 0
}

interface StudentRepository : ako.spring.data.SoftDeleteAccess<Student, Int>`,
    note: 'Spring Data 侧由 Repository Bean 提供数据访问；open class/open var 用于 JPA 代理。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `@DbName(value = "学生", index = 10)
@MenuGroup(id = "school", name = "学校管理", index = 10)
@ModelButton(name = "导出", url = "/api/student/export", type = "primary")
@Entity
@Table
public class Student extends CompleteModel {
  @DbName("小组")
  @Mapping(value = Group.class, display = "name")
  @Column(name = "group_id")
  private int group;

  @DbName("姓名")
  @Required("请输入姓名")
  @SearchType(SearchType.Type.Like)
  private String name = "";

  @DbName("年龄")
  @RangeValidate(min = 1)
  @TableColumnWidth(100)
  private int age = 18;

  @DbName("创建时间")
  @Datetime
  @EditIgnore
  private long createdAt;

  // JavaBean getters/setters omitted
}

interface StudentRepository extends ako.spring.data.SoftDeleteAccess<Student, Integer> {}`,
    note: 'Java Spring 的实体声明与 Rain 共用 Ako 注解；Repository Bean 由 Spring Data 发现，JPA 代理不需要 Kotlin 的 open 关键字。',
  },
]
</script>

<CodeSwitch :variants="composedExamples" />

这段声明会形成：

- 菜单名“学生”和一个 `school` 菜单组。
- `name` 的模糊搜索、必填校验和普通文本输入。
- `group` 的关联选择和 `information` 补充数据。
- `age` 的数值范围校验和 100 宽度表格列。
- `createdAt` 的时间类型，但不出现在编辑表单。
- 一个页面级“导出”按钮。

## 注解不负责什么

- 不负责创建数据库表或迁移。
- 不负责后端授权、租户隔离和审计。
- 不负责把前端校验同步成服务端校验。
- 不负责自动注册前端自定义组件。
- 不负责把复杂领域操作变成安全的 `eval`。

当注解无法表达复杂业务时，保留标准模型页面，并通过普通 SmartWeb 控制器、按钮 URL 或自定义前端节点扩展即可。
