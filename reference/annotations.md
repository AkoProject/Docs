---
title: JVM 注解速查
description: ako-core 与 ako-jpa 提供的 JVM 模型、字段和操作注解一览。
---

# JVM 注解速查

这一页列出 JVM 源码中的注解，以及它们分别生成哪些元数据。这些注解只属于 JVM 实现，并非协议要求；其他语言可以用装饰器、schema 或直接写 JSON 达到同样的效果。

如果你在用 `ako-rain`，建议先读 [注解功能](/backend/rain/annotations)。那里结合 Rain 的实际运行过程，讲解了全部注解、嵌套配置和已知限制。

## 模型注解

| 注解 | 作用 | 生成位置 |
| --- | --- | --- |
| `@DbName("学生")` | 设置模型显示名；参数 `index` 决定模型的排序。 | `DbModel.name`、`DbModel.index` |
| `@MenuGroup(...)` | 为模型创建或引用菜单组，设置组名、图标和排序。 | `DbModel.previous`、`menus` |
| `@ModelNode(...)` | 替换页面、搜索、表格、编辑和图标组件名。 | `DbModel.*Node` |
| `@ModelButton(...)` | 添加一个页面级按钮。 | `modelButtons` |
| `@ModelButtons(...)` | 整体替换默认的页面级按钮列表。 | `modelButtons` |
| `@OperateButton(...)` | 添加一个行级按钮。 | `operateButtons` |
| `@OperateButtons(...)` | 整体替换默认的行级按钮列表。 | `operateButtons` |
| `@NoAkoModel` | 模型仍可供 ORM 或业务使用，但不进入 Ako 模型列表。 | 不出现在 `models` 中 |
| `@Permission`、`@Scene` | 只有注解定义，元数据转换不读取。 | `DbModel.permission` 始终为 `null` |

## 字段显示注解

| 注解 | 作用 |
| --- | --- |
| `@DbName("姓名")` | 设置字段显示名。 |
| `@Description("说明")` | 在编辑表单中显示字段说明。 |
| `@NoAkoField` | 完全排除该字段，不生成任何 Ako 字段元数据。 |
| `@SearchIgnore` | 不生成 `search`。 |
| `@TableIgnore` | 不生成 `column`。 |
| `@EditIgnore` | 不生成 `edit`。 |
| `@SearchColumnWidth("200px")` | 设置搜索输入框宽度，默认 `200px`。 |
| `@TableColumnWidth(200)` | 设置表格列最小宽度，默认 `200`。 |
| `@ColumnIndex(10)` | 设置表格列顺序。 |

`@ModelNode` 只在模型类上读取，标在字段上不起作用；字段的组件请用下文的节点注解指定。

字段上可以组合使用这些注解，例如：

```kotlin
class Student(
    @DbName("姓名")
    @Description("用于登录和展示的姓名")
    @Required("请输入姓名")
    @TableColumnWidth(240)
    var name: String = "",

    @DbName("内部备注")
    @SearchIgnore
    @TableIgnore
    var internalNote: String = "",
)
```

## 节点注解

字段的节点注解把元数据指向前端注册的组件名：

| 注解 | 替换的组件 |
| --- | --- |
| `@SearchPropertyNode("...")` | 搜索字段的外层组件 |
| `@SearchInputNode("...")` | 搜索输入组件 |
| `@TableColumnNode("...")` | 表格单元格组件 |
| `@EditPropertyNode("...")` | 编辑字段的外层组件 |
| `@EditInputNode("...")` | 编辑输入组件 |

组件名必须已经在 Vue App 中注册，props 约定见 [自定义页面与类型](/frontend/customization)。

## 编辑校验

| 注解 | 协议字段 | 说明 |
| --- | --- | --- |
| `@Required("...")` | `edit.validate[].require` | 前端必填校验。非空类型的字段也会默认生成必填规则。 |
| `@AllowEmpty` | `edit.allowEmpty` | 必填字段允许提交空字符串：前端保存时会把未填写的值补成 `''`。 |
| `@Disabled("...")` | `edit.editable` | 让编辑控件不可编辑。 |
| `@RangeValidate(min, max, message)` | `edit.validate[].min/max` | 字符串校验长度，数字校验数值范围。 |
| `@RegExpValidate(value, message)` | `edit.validate[].regexp` | 正则校验。 |
| `@FunctionValidate(value, message)` | `edit.validate[].eval` | 在浏览器中执行的异步函数体。 |
| `@FetchValidate(value, message)` | `edit.validate[].fetch` | 浏览器把当前值 POST 到目标地址做远程校验。 |

`FunctionValidate` 和 `FetchValidate` 只在前端生效，后端不会因此多做任何校验。保存接口必须自己再校验一遍。

## 搜索注解

`@SearchType` 用来显式指定搜索操作符：

```kotlin
@SearchType(SearchType.Type.Like)
var name: String = ""
```

可选值有 `Equal`、`Like`、`Greater`、`Less`、`GreaterEqual`、`LessEqual`。不指定时由类型提供者决定默认搜索方式：普通字段默认 `eq`，时间字段默认生成 `gte` 和 `lte` 两个输入框。

前端把字段名和操作符拼成请求参数：

```text
name              → 等于
name_like         → 模糊匹配
createdAt_gte     → 大于等于
createdAt_lte     → 小于等于
```

## 类型注解

| 注解 | 类型 ID | 选项 |
| --- | --- | --- |
| `@DbEnum("男", "女")` | `ako:enum` | 枚举值和显示名。 |
| `@CascadeEnum(...)` | `ako:enum` | 由另一个字段决定的枚举值。 |
| `@Mapping(Group::class, display = "name")` | `ako:mapping` | 关联模型、匹配字段和展示字段。 |
| `@CascadeMapping(...)` | `ako:mapping` | 由另一个字段决定的关联目标。 |
| `@Timestamp("YYYY-MM-DD")` | `ako:timestamp` | dayjs 格式。 |
| `@DateOnly` | `ako:timestamp` | `YYYY-MM-DD`。 |
| `@TimeOnly` | `ako:timestamp` | `HH:mm:ss`。 |
| `@Datetime` | `ako:timestamp` | `YYYY-MM-DD HH:mm:ss`。 |
| `@BinarySize` | `ako:binary_size` | 字节大小的显示和搜索类型。 |
| `@AkoType(...)` | 自定义 | 指定后端（JVM）的类型提供者。 |

详见 [字段类型与选项](/protocol/types)。

## 操作按钮

`@ModelButton` 和 `@OperateButton` 都支持下面这些参数：

```kotlin
@OperateButton(
    name = "查看详情",
    url = "/orders/\${id}",
    method = "GET",
    type = "primary",
    reconfirm = "",
)
```

此外还可以设置 `eval`、`component`、`dialog` 或 `panel`。按钮语法和安全注意事项见 [按钮与操作](/protocol/buttons)。

## 默认节点名

没有替换节点时，JVM 转换器使用以下名称：

```text
default-entity-page-node
default-entity-icon-node
default-entity-search-node
default-entity-table-node
default-entity-edit-node
default-entity-search-property-node
default-entity-search-input-node
default-entity-table-column-node
default-entity-edit-property-node
default-entity-edit-input-node
```

这些名称和前端的默认组件一一对应。替换时，前端注册和后端元数据要一起改。
