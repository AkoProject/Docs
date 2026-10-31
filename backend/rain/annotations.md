---
title: 注解功能
description: JVM 中每个 Ako 注解的参数、默认值、前端效果和实现限制。
---

# 注解功能

`ako-rain` 和 `ako-spring` 都用 `ako-core` 中的注解把模型声明转换成页面元数据。注解只负责描述页面该怎么显示，实际效果还取决于三件事：模型是否被运行时发现，前端是否注册了对应组件，后端是否实现了真正的业务校验。

下面按模型与菜单、字段显示、编辑校验、搜索、字段类型、按钮、权限与排序分组，列出源码中的全部 Ako 注解。其他语言的后端不需要复刻这些注解，只要输出相同的协议 JSON 即可。

## 使用前提

```kotlin
import ako.annotation.*
import ako.annotation.types.*
```

`@DbEnum`、`@CascadeEnum`、`@Mapping`、`@CascadeMapping`、时间注解和 `@BinarySize` 在 `ako.annotation.types` 包中，其余注解在 `ako.annotation` 包中。

Ako 通过 Java 反射读取字段上的注解。字段节点注解、`@Timestamp`、`@DateOnly`、`@TimeOnly` 没有声明 `@Target`，在 Kotlin 主构造函数参数上使用时要写成 `@field:TableColumnNode("...")` 这种形式，否则注解不会落在字段上，Ako 读不到。

模型要满足以下条件：

1. 实现 `AkoModel`，通常继承 `CompleteModel`、`LongCompleteModel` 或 UUID 基类。
2. 有对应的数据访问入口：Rain 是 `AkoAccess`/`SoftDeleteAccess`，Spring Data 是 `AkoJpaRepository`/`SoftDeleteAccess`，自定义 Spring 数据库则由 `AkoSpringDatabase.modelTypes` 提供。
3. 模型和数据访问入口能被所用框架发现。
4. 对应的运行时已注册，底层 JPA 或数据访问服务可用。

| 环节 | `ako-rain` | `ako-spring` |
| --- | --- | --- |
| 运行时 | `AkoRain`，由 Rain 模块配置注册。 | `AkoSpringRuntime`，由 Boot 自动配置注册。 |
| 模型来源 | Rain `ClassRegister` 发现 `AkoAccess`。 | `AkoSpringDatabase` Bean 的 `modelTypes`；Spring Data 模块从容器中的 Repository Bean 解析。 |
| 自定义类型提供者 | 从 Rain DI 容器获取。 | 先找 Spring Bean，找不到时用无参构造创建。 |
| 注解转换 | 共用 `Class<T>.dbModel`。 | 共用 `Class<T>.dbModel`。 |

## 1. 模型与菜单注解

### `@DbName`

可以写在类或字段上，设置页面中显示的名称。

```kotlin
@DbName("学生", index = 10)
@Entity
class Student : CompleteModel()
```

| 参数 | 默认值 | 效果 |
| --- | --- | --- |
| `value` | 必填 | 写在类上是模型名称；写在字段上是字段在搜索区、表格列和表单中的名称。 |
| `index` | `100` | 写在类上时成为 `DbModel.index`，决定菜单顺序。写在字段上不起作用，字段排序请用 `@ColumnIndex`。 |

不写 `@DbName` 时，模型名称取类名，字段名称取字段 ID。枚举常量上也可以写 `@DbName`，作为该选项的显示名。

### `@MenuGroup`

写在类上，把模型归入一个菜单组。

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
| `id` | `""` | 菜单组标识，必须填写，为空时生成元数据会报错。 |
| `name` | `""` | 非空时设置菜单组名称。 |
| `icon` | `""` | 非空时作为菜单组的 `iconNode`。 |
| `index` | `0` | 非 0 时设置菜单组排序。 |
| `previous` | `""` | 原本用于指定父级菜单，但 `AkoService.findMenu` 没有把它写入 `DbModelMenu`，目前无法用它做嵌套菜单。 |

模型的 `DbModel.previous` 会指向这个组 ID。多个模型写同一个 `id` 时共用一个菜单组，后读取到的非空参数会覆盖先前的值。核心的菜单接口不按 `channel` 过滤，所有菜单组和模型都会返回。

### `@ModelNode`

写在类上，替换模型页面各区域使用的前端组件。

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

这些值是前端组件的注册名，不是 URL。组件必须先注册到 Vue App。名称写错时后端照常启动，但前端无法渲染该区域。

### `@NoAkoModel`

写在类上，让模型不进入 `AkoRain.modelMap` 或 `AkoSpringRuntime.modelMap`，`menu/list` 返回的 `models` 中也不会有它。ORM 和业务代码仍可正常使用这个实体，适合内部实体、关联表和不想出现在管理后台的模型。

## 2. 字段显示注解

### `@NoAkoField`

写在字段上，Ako 完全忽略这个字段：`DbModel.fields` 不收集它，也不生成搜索、表格或编辑信息。JPA 基类用它隐藏了 `updateTime` 和 `deleteTime`。

### `@SearchIgnore`、`@TableIgnore`、`@EditIgnore`

写在字段上，各自只隐藏一个区域：

| 注解 | 生成结果 |
| --- | --- |
| `@SearchIgnore` | `field.search = null`，不出现在搜索区。 |
| `@TableIgnore` | `field.column = null`，不出现在表格。 |
| `@EditIgnore` | `field.edit = null`，不出现在编辑表单。 |

它们不会把字段从实体 JSON 中去掉。敏感字段还要在后端的序列化配置或 DTO 中禁止输出。

### `@Description`

写在字段上，给字段加一段说明文字。

```kotlin
@Description("用户在后台中看到的姓名")
var name: String = ""
```

说明写入 `DbField.description`，默认编辑面板把它显示在输入框下方。注解定义允许写在类上，但转换器只读取字段上的 `@Description`，写在类上不会生成模型描述。

### 字段节点注解

写在字段上，替换该字段在某个区域使用的前端组件：

| 注解 | 参数 | 效果 |
| --- | --- | --- |
| `@SearchPropertyNode(value)` | 组件名 | 覆盖 `search.component`。 |
| `@SearchInputNode(value)` | 组件名 | 覆盖 `search.entries[].component`。 |
| `@TableColumnNode(value)` | 组件名 | 覆盖 `column.component`。 |
| `@EditPropertyNode(value)` | 组件名 | 覆盖 `edit.propertyComponent`。 |
| `@EditInputNode(value)` | 组件名 | 覆盖 `edit.inputComponent`。 |

`value` 都是前端组件的注册名。这些注解只改变渲染用的组件，不影响保存接口和字段类型。

### `@FieldNode`（未启用）

源码里有一段 `FieldNode` 的旧设计，但整段被注释掉了，没有编译进 `ako-core`。请使用上面五个字段节点注解。

### `@SearchColumnWidth`、`@TableColumnWidth`、`@ColumnIndex`

写在字段上，调整宽度和列顺序：

| 注解 | 参数 | 效果 |
| --- | --- | --- |
| `@SearchColumnWidth("240px")` | CSS 宽度字符串 | 写入搜索项的 `width`。 |
| `@TableColumnWidth(240)` | 整数 | 写入表格列的 `width`。 |
| `@ColumnIndex(10)` | 整数，默认 `100` | 写入表格列的 `index`，越小越靠前。 |

不指定时，搜索项宽度为 `200px`，表格列宽度为 `200`。没有 `@ColumnIndex` 的列，默认前端用它在字段列表中的位置作为 `index`，再统一排序。

## 3. 编辑状态与校验注解

本节注解都写在字段上，结果写入 `edit` 和 `edit.validate`。

### `@Required`

```kotlin
@Required("请输入姓名")
var name: String = ""
```

把字段设为必填：`edit.require = true`，并在 `validate` 中加入 `require: true` 的规则，`value` 是提示信息。Kotlin 中声明为非空类型的字段，即使不加 `@Required` 也会生成默认的必填规则（提示为“字段名 不能为空”）。Java 字段一律按可空处理，需要必填时请显式加 `@Required`。

### `@AllowEmpty`

设置 `edit.allowEmpty = true`。默认前端保存时，会把这个字段的空值作为空字符串 `''` 提交。它和数据库的 nullable 无关，也不能绕过后端的非空约束。

### `@Disabled`

设置 `edit.editable = false`，默认前端会禁用这个输入框。注解有一个 `value` 参数，原本用于提示信息，但转换器只判断注解是否存在，不会使用这个值。

### `@RangeValidate`

```kotlin
@RangeValidate(min = 1, message = "年龄不能小于 1")
var age: Int = 18
```

| 参数 | 默认值 | 效果 |
| --- | --- | --- |
| `min` | `-1` | 下限。字符串字段限制长度，数字字段限制数值。`-1` 表示不限制。 |
| `max` | `-1` | 上限，`-1` 表示不限制。 |
| `message` | `""` | 校验失败时的提示，为空时由转换器生成。 |

结果写入 `validate[].min/max`，只有大于 0 的边界会写进去。源码中检查范围的条件写反了：`min < max` 时会直接抛错。因此目前只能单独设置 `min` 或 `max`，同时设置两者前请先确认所用版本已修正。这条规则只在前端执行，后端不会校验。

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

写入 `validate[].eval`。前端把它包装成 `async (value, data, model, field) => { ... }` 执行，函数抛出异常即视为校验失败，提示的是 `message` 参数而不是异常内容。这段代码只在浏览器中运行，后端不会执行。

### `@FetchValidate`

```kotlin
@FetchValidate("/api/validate/username", "用户名已存在")
var username: String = ""
```

写入 `validate[].fetch`。默认前端在输入框失去焦点时向该地址发送 POST 请求：

```json
{
  "model": "Student",
  "field": "username",
  "data": { "username": "Alice" },
  "value": "Alice"
}
```

响应 JSON 中 `success` 为真时校验通过，否则显示 `message`。请求出错时提示“参数远程验证失败”。接口地址、认证、CORS 和服务端的最终校验都由应用自己负责。

## 4. 搜索注解

### `@SearchType`

写在字段上，指定搜索区为这个字段生成哪些条件。可以传多个值，每个值生成一个搜索项。

```kotlin
@SearchType(
    SearchType.Type.GreaterEqual,
    SearchType.Type.LessEqual,
)
var age: Int = 0
```

可选值：

| 枚举 | 请求操作符 | 含义 |
| --- | --- | --- |
| `Equal` | `eq` | 等于；请求参数也可以直接用字段 ID。 |
| `Like` | `like` | 模糊匹配。 |
| `Greater` | `gt` | 大于。 |
| `Less` | `lt` | 小于。 |
| `GreaterEqual` | `gte` | 大于等于。 |
| `LessEqual` | `lte` | 小于等于。 |

不写 `@SearchType` 时，由字段的类型提供者通过 `defaultSearch` 决定默认搜索项：普通字段是一个 `eq`，时间字段是 `gte` 加 `lte` 两项。

## 5. 字段类型注解

这类注解决定字段的 `type` 和 `options`。一个字段上只能有一个类型注解，写了多个会在生成元数据时报错。

### `@DbEnum`

```kotlin
@DbEnum("男", "女")
var sex: Boolean = false
```

生成 `type: "ako:enum"` 和对应的选项。默认用数组下标作为选项值；写成 `"值:显示名"` 可以指定固定的值。`flag` 只在被 `@CascadeEnum` 引用时有用。

不加 `@DbEnum` 时，布尔字段默认生成“是/否”两个选项；枚举类型字段默认用常量名作为显示名，常量上加 `@DbName` 可以改成中文名。

### `@CascadeEnum`

让一个字段的可选项随另一个字段的值变化。

```kotlin
@CascadeEnum(
    "kind",
    DbEnum("普通", "加急"),
    DbEnum("标准", "特殊"),
)
var level: Int = 0
```

第一个参数 `cascader` 是控制字段的 ID，后面的 `DbEnum` 列表按控制字段的值选取：`DbEnum.flag` 非空时用它匹配，否则按数组下标匹配。生成的类型仍是 `ako:enum`，`options` 结构如下：

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

把字段声明为指向另一个模型的外键，页面上显示关联记录的名称。

```kotlin
@Mapping(Group::class, field = "id", display = "name")
var group: Int = 0
```

生成 `type: "ako:mapping"`。参数如下：

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `value` | 必填 | 目标模型的类，协议中转换为模型 ID（类名）。 |
| `field` | `"id"` | 目标模型中与当前值匹配的字段。 |
| `display` | 必填 | 用于显示的目标字段。 |
| `flag` | `""` | 只在 `@CascadeMapping` 中作为匹配值。 |

查询分页时，JVM 的类型提供者会收集当前页的关联值，查询目标模型，并把结果放入 `information["ako:mapping"]`。

### `@CascadeMapping`

让关联的目标模型随另一个字段的值变化。

```kotlin
@CascadeMapping(
    "kind",
    Mapping(Group::class, display = "name", flag = "group"),
    Mapping(Team::class, display = "name", flag = "team"),
)
var owner: Int = 0
```

第一个参数 `field` 是控制字段的 ID，后面的 `Mapping` 按 `flag` 或数组下标匹配。前端先读取当前行或表单中控制字段的值，再到对应的目标模型中查找关联数据。

### `@Timestamp`、`@DateOnly`、`@TimeOnly`、`@Datetime`

把数值字段按时间显示和搜索：

| 注解 | 生成类型 | `options` |
| --- | --- | --- |
| `@Timestamp("YYYY-MM-DD")` | `ako:timestamp` | 自定义的 dayjs 格式。 |
| `@DateOnly` | `ako:timestamp` | `YYYY-MM-DD` |
| `@TimeOnly` | `ako:timestamp` | `HH:mm:ss` |
| `@Datetime` | `ako:timestamp` | `YYYY-MM-DD HH:mm:ss` |

时间字段默认生成 `gte` 和 `lte` 两个搜索项。前端提交的是毫秒时间戳，后端要统一时区和精度。JVM 不会根据 `Date`、`LocalDateTime` 等字段类型自动识别时间，必须加上述注解之一。

### `@BinarySize`

生成 `type: "ako:binary_size"`，把整数按字节大小显示。表格中自动换算成带单位的字符串，搜索和编辑控件可以选择单位。类型提供者不生成 `options`。前端默认按 1000 进位，浏览器 `localStorage` 中 `__ako_default_binary` 为 `"true"` 时改为按 1024 进位。

### `@AkoType`

`@AkoType(provider = MyProvider::class)` 是元注解，用来把一个自定义注解绑定到 JVM 的 `AkoTypeProvider` 实现。它也可以直接写在字段上。

```kotlin
@AkoType(MoneyProvider::class)
annotation class Money(val currency: String)
```

字段上的 `@Money` 被读取后，`MoneyProvider` 可以生成自定义的 `type`、`options`、默认搜索项和分页 `information`。类型提供者必须能被运行时找到：Rain 从 DI 容器获取；Spring 先查找 Bean，找不到时用无参构造创建并缓存。拿不到实例时，生成元数据会报错。

### `@Identifier`

`@Identifier("billing:money")` 写在自定义类型注解上，原本用于给类型指定 ID。转换器只在字段没有类型提供者时才读取它；而字段上一旦有自定义类型注解，就必须能找到类型提供者，否则直接报错。所以这个注解实际上不会生效。新类型请直接让类型提供者的 `id` 返回 `billing:money`，并在前端注册同名的类型提供者。

## 6. 模型按钮与面板注解

按钮的协议结构和前端执行方式见 [按钮与操作](/protocol/buttons)。

### `@ModelButton`

写在类上，在搜索区添加页面级按钮，可以重复使用：


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
| `url` | `""` | 点击后请求的地址，可用 `${id}` 等占位符引用选中行。 |
| `method` | `GET` | 请求方法；写 `popup` 时在新窗口打开。 |
| `eval` | `""` | 在浏览器中执行的异步函数体，可使用 `single`、`multi`、`props`。 |
| `reconfirm` | `""` | 非空时点击后先弹出确认。 |
| `type` | `default` | Element Plus 按钮类型。 |
| `component` | `""` | 改用前端注册的自定义按钮组件渲染。 |
| `dialog` | 空 `ButtonDialog` | 点击后打开指定组件的弹窗。 |
| `panel` | 空 `ButtonPanel` | 点击后打开由字段声明生成的编辑面板。 |

同时配置了多种行为时，前端只执行一种，优先级为 `panel` > `eval` > `dialog` > `url`。

没有 `@ModelButtons` 时，转换器先添加默认的“查询”“新增”“批量删除”，再追加类上的 `@ModelButton`。

### `@ModelButtons`

写在类上，完整指定页面级按钮列表。

```kotlin
@ModelButtons(
    ModelButton(name = "同步", url = "/api/sync", type = "primary"),
)
class Student : CompleteModel()
```

写了它之后，默认按钮和类上直接写的 `@ModelButton` 都会被忽略。如果还需要查询、新增或删除，要在列表里重新声明。

### `@OperateButton`

写在类上，在表格每一行的操作列中添加按钮，也可以重复使用。参数是 `@ModelButton` 的基础部分：`name`、`index`、`url`、`method`、`eval`、`reconfirm`、`type`、`component`，没有 `dialog` 和 `panel`。点击时当前行作为 `single` 传入。

### `@OperateButtons`

写在类上，完整指定行级按钮列表。

```kotlin
@OperateButtons(
    OperateButton(name = "查看", url = "/student/\${id}", method = "GET", type = "primary"),
)
class Student : CompleteModel()
```

写了它之后，默认的“编辑”“删除”按钮和类上直接写的 `@OperateButton` 都会被忽略。

### `@ButtonDialog`

`@ModelButton` 的 `dialog` 参数，点击按钮后打开一个弹窗，内容是指定的前端组件：

| 参数 | 默认值 | 效果 |
| --- | --- | --- |
| `component` | 必填 | 弹窗内容的组件名；为空字符串时不生成弹窗配置。 |
| `title` | `""` | 弹窗标题。 |
| `style` | `""` | 弹窗样式字符串。 |
| `close` | `false` | 是否显示关闭按钮。 |
| `needSingle` | `false` | 是否要求先单选一行。 |
| `needMulti` | `false` | 是否要求至少勾选一行。 |

组件会收到 `single`、`multi`、`model`、`search` 和 `edit` 五个 props。

### `@ButtonPanel`

`@ModelButton` 的 `panel` 参数，用字段声明生成一个编辑面板，不需要写前端代码：

| 参数 | 默认值 | 效果 |
| --- | --- | --- |
| `id` | `""` | 面板对应的模型 ID，不使用 `url` 时用它保存。 |
| `name` | `""` | 面板名称。 |
| `url` | `""` | 提交地址，填写后改为向这个地址提交。 |
| `method` | `""` | 向 `url` 提交时的请求方法，为空时前端用 POST。 |
| `data` | `""` | JavaScript 表达式，以 `it`（当前选中行）为参数，结果作为面板初始数据。 |
| `fields` | 空 | `PanelField` 字段列表。 |

填写了 `url` 时，保存会把表单数据提交到该地址；否则调用 `model/save/{id}` 走标准保存流程。保存后页面自动刷新。

### `@PanelField`

`@ButtonPanel` 中的一个字段：

| 参数 | 默认值 | 效果 |
| --- | --- | --- |
| `id` | 必填 | 字段 ID。 |
| `nullable` | `true` | 是否可空；为 `false` 时生成必填规则。 |
| `allowEmpty` | `false` | 为 `true` 时等同于给字段加 `@AllowEmpty`。 |
| `name` | 空 `DbName` | 字段名称。 |
| `description` | 空 `Description` | 字段说明。 |
| `enum` | 空 `DbEnum` | 枚举选项。 |
| `cascadeEnum` | 空 `CascadeEnum` | 级联枚举。 |
| `mapping` | 空 `Mapping` | 关联映射。 |
| `cascadeMapping` | 空 `CascadeMapping` | 级联关联。 |
| `empty` | `AllowEmpty()` | 只是 `allowEmpty` 用到的默认实例，不需要设置。 |

`PanelField` 按字符串字段处理，转换成 `CustomEditField`，类型和选项的生成方式与普通字段相同。

## 7. 权限与排序注解

### `@Permission`、`@Scene`

各带一个字符串值，原本用于声明权限和场景：

```kotlin
@Permission("student:write")
@Scene("backoffice")
class Student : CompleteModel()
```

转换器不读取这两个注解，`DbModel.permission` 始终为 `null`，控制器也不会据此鉴权。权限请在后端中间件或业务代码中实现。

### `@DefaultSort`

```kotlin
@DefaultSort("-createdAt")
class Student : CompleteModel()
```

注解只定义了一个字符串值，元数据转换和前端首次查询都没有使用它。默认排序请在后端适配器、请求的初始参数或前端 `mixin` 中设置。

## 8. 组合示例

下面的注解在两套框架中完全相同，只有实体类的写法和数据访问接口所在的包不同：

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
    note: 'Rain 由 ClassRegister 发现 StudentAccess，再通过 Rain DI 获取实现。',
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
    note: 'Java 版注解参数用 value = ... 和 .class 写法；Access 同样由 Rain 的 ClassRegister 和 DI 发现。',
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
    note: 'Spring Data 由 Repository Bean 提供数据访问；open class/open var 让 JPA 能生成代理。',
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
    note: 'Java 版实体注解与 Rain 完全相同；Repository Bean 由 Spring Data 发现，Java 类不加 open 也能被 JPA 代理。',
  },
]
</script>

<CodeSwitch :variants="composedExamples" />

这段声明会生成：

- 菜单中名为“学生”的模型，归在 `school` 菜单组下。
- `name`：模糊搜索、必填校验和普通文本输入框。
- `group`：关联选择，分页结果中附带关联数据 `information`。
- `age`：数值范围校验，表格列宽 100。
- `createdAt`：按时间格式显示，不出现在编辑表单中。
- 一个页面级的“导出”按钮。

## 注解之外的工作

注解只负责生成页面元数据。建表和数据库迁移、后端授权、租户隔离、审计以及服务端校验都要另外实现，前端的自定义组件也需要自己注册。复杂的领域操作应该写成后端接口，不要塞进按钮的 `eval`。

注解表达不了的业务，可以保留标准模型页面，再通过普通的后端控制器、按钮 URL 或自定义前端节点扩展。
