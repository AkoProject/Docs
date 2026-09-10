---
title: 前端联动
description: 对比 ako-rain 与 ako-spring 如何把 JVM 实体声明转换成 Ako 前端页面。
---

# 前端联动

`ako-rain` 和 `ako-spring` 都把 JVM 模型转换成同一份 `DbModel`/`DbField` 元数据，再由 `@ako-dev/ako` 的默认 View 消费。框架差异停留在 Runtime、Access/Repository、控制器和数据库层，不应该扩散到前端页面协议。

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

## 一次打开页面会发生什么

| 时机 | 接口 | 前端用途 |
| --- | --- | --- |
| 启动 | `GET auth/isAuth` | 判断显示登录页还是主界面。 |
| 进入主界面 | `GET menu/list/{channel}` | 取得菜单分组和模型元数据。 |
| 打开模型 | `POST model/page/{model}` | 取得分页数据和关联 `information`。 |
| 新增/编辑 | `POST model/save/{model}` | 提交实体 JSON。 |
| 删除 | `POST model/delete/{model}` | 提交 ID 数组。 |

默认前端第一页是 `page: 1`，默认基地址是 `/api/ako/`。如果前端配置了 `channel` 或 `baseUrl`，两套后端的控制器路径都必须与它拼接后的结果一致。

## 从模型到 `DbModel`

实体字段的 Ako 注解在两个框架中完全相同：

```kotlin
@DbName("学生")
@Entity
class Student(
  @DbName("姓名")
  @Description("学生在管理后台中的展示名称")
  @Required("请输入姓名")
  var name: String = "",

  @DbName("年龄")
  @SearchType(SearchType.Type.GreaterEqual)
  var age: Int = 0,
) : CompleteModel()
```

`ako-rain` 和 `ako-spring` 都会把它转换为字段元数据：

- `@DbName` 提供页面显示名称。
- JVM 字段类型选择默认 `type`，例如文本、枚举或时间。
- `search`、`column`、`edit` 是否存在决定字段出现在哪个区域。
- `@Description`、宽度、排序、校验和节点注解进入对应元数据。

前端再根据 `type` 找到 TypeProvider，将同一个字段分别渲染为搜索、表格和编辑控件。完整注解行为见 [注解功能](/backend/rain/annotations)，协议 JSON 见 [模型定义](/protocol/metadata)。

## 模型发现方式

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
    note: 'Rain 通过 ClassRegister 注册 Access 接口，再由 AkoRain 从 Rain 容器获取 Access 实例和模型类型。',
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
    note: 'Spring 通过 ApplicationContext 发现 Repository Bean；AkoSpringRuntime 从 Repository 泛型解析模型类型并建立 modelMap。',
  },
]
</script>

<CodeSwitch :variants="discoveryExamples" />

Spring 的 `SoftDeleteAccess` 来自 `ako.spring.data`，本质是 `JpaRepository` + Ako 标记；Rain 的同名接口来自 `ako.rain.access`，本质是 SmartAccess `JpaAccess`。因此前端看到的字段和菜单可以相同，模型发现代码不能直接互换。

## 让字段显示关联名称

关联声明同样是共同层能力：

```kotlin
@DbName("小组")
@Mapping(Group::class, display = "name")
@Column(name = "group_id")
var group: Int = 0
```

两套实现都会生成 `type: "ako:mapping"`。分页响应的 `information` 提供关联实体，前端 `ako:mapping` TypeProvider 用它显示名称，并在搜索/编辑时打开关联模型的标准 View。关联目标模型也必须被对应 Runtime 发现。

## 枚举、日期和大小

| JVM 声明 | 前端效果 |
| --- | --- |
| `@DbEnum(...)` 或原生枚举 | 下拉搜索、label 显示、下拉编辑。 |
| `@Timestamp` / 日期时间类型 | 日期或时间搜索和格式化显示。 |
| `@BinarySize` 或二进制大小类型 | 带单位的搜索和显示。 |
| `@Mapping(...)` | 关联搜索、名称显示和关联选择页。 |

这些是 `ako-core` 的元数据能力，不会因为宿主从 Rain 换成 Spring 而改变。如果新增类型，需要同时让 JVM TypeProvider（或协议 `type/options`）和前端 TypeProvider 使用同一个名称。

## 页面和节点联动

模型级 `@ModelNode` 在两个框架中相同，它指定前端组件名，而不是后端路由：

```kotlin
@ModelNode(
  pageNode = "sales-order-page",
  tableNode = "sales-order-table",
)
class Order : CompleteModel()
```

前端必须先注册同名组件：

```ts
app.component('sales-order-page', SalesOrderPage)
app.component('sales-order-table', SalesOrderTable)
```

组件名称只告诉前端在对应位置使用哪个 View，不会让后端自动获得权限。标准节点、props 和替换策略见 [前端参考](/frontend/reference) 与 [使用 Ako View 构建页面](/frontend/views)。

## 页面级和行级操作

`@ModelButton` / `@ModelButtons` 生成页面级按钮，`@OperateButton` / `@OperateButtons` 生成行级按钮。按钮可以：

- 调用一个带 URL 的后端接口。
- 打开标准编辑面板。
- 打开自定义 Dialog 或 Panel。
- 在浏览器执行短小的前端脚本。

推荐把权限、事务、批量处理或审计要求放在后端 URL 中；前端按钮只是入口。按钮元数据见 [模型定义](/protocol/metadata) 和 [字段类型与选项](/protocol/types)。

## 自定义字段和 View

如果只是改变前端显示，不需要为 Rain 和 Spring 写两套页面：

1. 注册一个前端 TypeProvider 或 View。
2. 在两套后端中使用相同的 `type` 或 `*Node` 名称。
3. 让当前 JVM 适配器生成同一份元数据。

后端的 `@ModelNode` 代码可以保持一致，只有实体 Access/Repository 和控制器路由使用框架切换。前端实现方式见 [前端工具](/frontend/tools)、[mixin 使用方法](/frontend/mixins) 和 [使用 Ako View 构建页面](/frontend/views)。

## 前端联动的排查顺序

### 菜单里没有模型

- Rain：检查 `rain.scanPackages`、ClassRegister 是否发现 `AkoAccess`，以及 SmartAccess/JPA 服务。
- Spring：检查 `@SpringBootApplication` 的扫描范围、Repository 是否被 `@EnableJpaRepositories` 扫描，以及 `AkoSpringDatabase` 是否成为 Bean。

### 菜单有模型但页面空白

查看 `DbModel.fields`，确认字段没有被 `@NoAkoField` 或场景忽略注解排除，再确认 `type` 是前端已注册的类型。

### 关联显示 ID

确认关联模型已经进入 `models`，分页响应包含对应 `information`，以及 `@Mapping` 的显示字段真实存在。

### 自定义页面没有生效

确认组件注册发生在菜单加载前，组件名与 `pageNode` 完全一致，并且没有被后续 `mixin` 覆盖。

### 保存或删除成功但页面未刷新

标准 View 会在保存、删除后重新调用分页；自定义按钮或 View 需要主动调用 `searchFun`。服务端仍需独立完成鉴权、校验和事务。
