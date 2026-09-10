---
title: JVM 注解参考
description: ako-core 与 ako-jpa 当前提供的 JVM 模型、字段和操作注解。
---

# JVM 注解参考

本页只描述当前 JVM 源码中的注解如何参与元数据生成。它们不是跨语言协议要求；其他语言可以用装饰器、schema 或显式 JSON 达到相同效果。

如果你正在使用 `ako-rain`，请优先阅读 [注解功能](/backend/rain/annotations)，那里按 Rain 的实际运行链路说明了所有注解、嵌套配置和当前限制。

## 模型级注解

| 注解 | 作用 | 生成位置 |
| --- | --- | --- |
| `@DbName("学生")` | 设置模型显示名；类上的 `index` 也可影响模型排序。 | `DbModel.name`、`DbModel.index` |
| `@MenuGroup(...)` | 为模型创建或引用菜单组，设置组名、图标和排序。 | `DbModel.previous`、`menus` |
| `@ModelNode(...)` | 覆盖页面、搜索、表格、编辑和图标组件名。 | `DbModel.*Node` |
| `@ModelButton(...)` | 添加一个页面级按钮。 | `modelButtons` |
| `@ModelButtons(...)` | 完整替换默认页面级按钮列表。 | `modelButtons` |
| `@OperateButton(...)` | 添加一个行级按钮。 | `operateButtons` |
| `@OperateButtons(...)` | 完整替换默认行级按钮列表。 | `operateButtons` |
| `@NoAkoModel` | 保留模型给 ORM 或业务使用，但不进入 Ako 模型列表。 | 不出现在 `models` |
| `@Permission`、`@Scene` | 记录权限/场景意图。 | 当前转换器尚未完整接入授权执行 |

## 字段显示注解

| 注解 | 作用 |
| --- | --- |
| `@DbName("姓名")` | 设置字段展示名。 |
| `@Description("说明")` | 在编辑表单中显示字段描述。 |
| `@NoAkoField` | 完全排除字段，不生成任何 Ako 字段元数据。 |
| `@SearchIgnore` | 不生成 `search`。 |
| `@TableIgnore` | 不生成 `column`。 |
| `@EditIgnore` | 不生成 `edit`。 |
| `@SearchColumnWidth("200px")` | 设置搜索输入宽度。 |
| `@TableColumnWidth(200)` | 设置表格列最小宽度。 |
| `@ColumnIndex(10)` | 设置表格列顺序。 |
| `@ModelNode` | 不能标注字段；字段节点使用下面的 `*Node` 注解。 |

字段可以组合这些注解。例如：

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

| 注解 | 场景 |
| --- | --- |
| `@SearchPropertyNode("...")` | 替换搜索字段外层属性组件。 |
| `@SearchInputNode("...")` | 替换搜索输入组件。 |
| `@TableColumnNode("...")` | 替换表格单元格组件。 |
| `@EditPropertyNode("...")` | 替换编辑字段外层属性组件。 |
| `@EditInputNode("...")` | 替换编辑输入组件。 |

组件名必须在 Vue App 中注册，且应和 [自定义页面与类型](/frontend/customization) 中的 props 约定一致。

## 编辑校验

| 注解 | 协议字段 | 说明 |
| --- | --- | --- |
| `@Required("...")` | `validate[].require` | 前端必填校验；非空类型也会默认生成必填规则。 |
| `@AllowEmpty` | `edit.allowEmpty` | 允许将空值提交为空字符串/空值的前端行为。 |
| `@Disabled("...")` | `edit.editable` | 使编辑控件不可编辑。 |
| `@RangeValidate(min, max, message)` | `validate[].min/max` | 字符串按长度，数字按数值范围。 |
| `@RegExpValidate(value, message)` | `validate[].regexp` | 正则校验。 |
| `@FunctionValidate(value, message)` | `validate[].eval` | 浏览器端异步函数体。 |
| `@FetchValidate(value, message)` | `validate[].fetch` | 浏览器向目标地址 POST 当前值进行远程校验。 |

`FunctionValidate` 和 `FetchValidate` 在当前实现中只在前端生效，后端不会因此自动增加校验。任何保存接口都必须再次校验。

## 搜索注解

`@SearchType` 可以显式指定搜索操作符：

```kotlin
@SearchType(SearchType.Type.Like)
var name: String = ""
```

可选值包括：`Equal`、`Like`、`Greater`、`Less`、`GreaterEqual`、`LessEqual`。如果没有显式指定，类型提供者会选择默认搜索方式；普通字段默认是 `eq`，时间字段默认生成 `gte`/`lte` 两个输入。

前端会把字段和操作符组合成请求参数：

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
| `@CascadeEnum(...)` | `ako:enum` | 由另一个字段控制的枚举值。 |
| `@Mapping(Group::class, display = "name")` | `ako:mapping` | 关联模型、匹配字段和展示字段。 |
| `@CascadeMapping(...)` | `ako:mapping` | 由另一个字段控制的关联目标。 |
| `@Timestamp("YYYY-MM-DD")` | `ako:timestamp` | dayjs 格式。 |
| `@DateOnly` | `ako:timestamp` | `YYYY-MM-DD`。 |
| `@TimeOnly` | `ako:timestamp` | `HH:mm:ss`。 |
| `@Datetime` | `ako:timestamp` | `YYYY-MM-DD HH:mm:ss`。 |
| `@BinarySize` | `ako:binary_size` | 字节大小的显示/搜索类型。 |
| `@AkoType(...)` | 自定义 | 指定 JVM TypeProvider。 |

详见 [字段类型与选项](/protocol/types)。

## 操作按钮

`@ModelButton` 和 `@OperateButton` 都支持：

```kotlin
@OperateButton(
    name = "查看详情",
    url = "/orders/\${id}",
    method = "GET",
    type = "primary",
    reconfirm = "",
)
```

也可以设置 `eval`、`component`、`dialog` 或 `panel`。按钮语法和安全边界见 [按钮与操作](/protocol/buttons)。

## 默认节点名

如果没有覆盖节点，JVM 转换器使用：

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

这些名称与前端默认组件映射对应；替换它们时要同时更新前端注册和后端元数据。
