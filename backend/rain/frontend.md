---
title: 前端联动
description: 了解 ako-rain 的实体声明如何变成 Ako 前端菜单、搜索、表格、编辑和操作。
---

# 前端联动

在 `ako-rain` 中，前端联动不是另外写一套页面配置，而是由模型、Access 和 Ako 注解共同生成元数据，再由 `@ako-dev/ako` 的默认 View 消费。

```text
JPA Entity + Ako 注解
          ↓
AkoRain 发现模型和 Access
          ↓
menu/list/{channel} 返回 DbModel
          ↓
Ako 前端按 page/search/table/edit 节点创建 View
          ↓
model/page、save、delete 完成数据交互
```

## 一次打开页面会发生什么

| 时机 | 后端接口 | 前端用途 |
| --- | --- | --- |
| 启动 | `GET auth/isAuth` | 判断显示登录页还是主界面。 |
| 进入主界面 | `GET menu/list/{channel}` | 取得菜单分组和模型元数据。 |
| 打开模型 | `POST model/page/{model}` | 取得分页数据和关联 `information`。 |
| 新增/编辑 | `POST model/save/{model}` | 提交实体 JSON。 |
| 删除 | `POST model/delete/{model}` | 提交 ID 数组。 |

默认前端第一页是 `page: 1`，默认基地址是 `/api/ako/`。如果前端配置了 `channel` 或 `baseUrl`，Rain 控制器的路径必须与它拼接后的结果一致。

## 从实体字段到页面控件

一个最小实体：

```kotlin
@DbName("学生")
@Entity
class Student(
    @DbName("姓名")
    var name: String = "",

    @DbName("年龄")
    var age: Int = 0,
) : CompleteModel()
```

`ako-rain` 会把字段转换成 `DbField`：

- `@DbName` 提供页面显示名称。
- Kotlin/JVM 字段类型选择默认 `type`，例如文本、枚举或时间。
- 字段是否有 `search`、`column`、`edit` 决定它出现在哪个区域。
- `@SearchIgnore`、`@TableIgnore`、`@EditIgnore` 可以分别隐藏一个区域。
- `@Description`、宽度、排序和校验注解会进入对应元数据。

前端再根据 `type` 找到 `TypeProvider`，将同一个字段分别渲染为搜索、表格和编辑控件。完整注解行为见 [注解功能](/backend/rain/annotations)，协议 JSON 见 [模型定义](/protocol/metadata)。

## 让字段显示关联名称

关联字段需要两部分：模型元数据中的 `ako:mapping`，以及分页响应 `information` 中的关联实体：

```kotlin
@DbName("小组")
@Mapping(Group::class, display = "name")
@Column(name = "group_id")
var group: Int = 0
```

前端会用 `information.ako:mapping.<字段或模型标识>` 查找名称，并在搜索/编辑时打开关联模型的标准 View。关联模型本身也必须被 Rain 发现，否则选择页没有可用模型。

## 枚举、日期和大小

字段类型会影响三个区域：

| JVM 声明 | 前端效果 |
| --- | --- |
| `@DbEnum(...)` 或枚举 | 下拉搜索、label 显示、下拉编辑。 |
| `Timestamp` / 日期时间类型 | 日期或时间搜索和格式化显示。 |
| `@BinarySize` 或二进制大小类型 | 带单位的搜索和显示。 |
| `@Mapping(...)` | 关联搜索、名称显示和关联选择页。 |

如果要新增类型，需要同时准备 JVM 侧的 TypeProvider（或协议 `type/options`）和前端 TypeProvider。只在前端注册组件而不让后端返回同名 `type`，默认页面不会使用它。

## 页面和节点联动

模型级 `@ModelNode` 指定的是前端组件名称：

```kotlin
@ModelNode(
    pageNode = "sales-order-page",
    tableNode = "sales-order-table",
)
class Order : CompleteModel()
```

前端必须先注册对应组件：

```ts
app.component('sales-order-page', SalesOrderPage)
app.component('sales-order-table', SalesOrderTable)
```

组件名称不是 URL，也不会让后端自动获得权限。它只告诉前端在对应位置使用哪个 View。标准节点、props 和替换策略见 [前端参考](/frontend/reference) 与 [使用 Ako View 构建页面](/frontend/views)。

## 页面级和行级操作

`@ModelButton` / `@ModelButtons` 生成页面级按钮，`@OperateButton` / `@OperateButtons` 生成行级按钮。按钮可以：

- 调用一个带 URL 的后端接口。
- 打开标准编辑面板。
- 打开自定义 Dialog 或 Panel。
- 在浏览器执行短小的前端脚本。

推荐把有权限、事务、批量处理或审计要求的操作放在后端 URL 中；前端按钮只是入口。按钮元数据的通用结构见 [模型定义](/protocol/metadata) 和 [字段类型与选项](/protocol/types)。

## 前端联动的排查顺序

### 菜单里没有模型

检查模型是否有 `AkoAccess`/`SoftDeleteAccess`，Access 与模型是否在 `rain.scanPackages`，以及 `AkoRain` 是否已初始化。

### 菜单有模型但页面空白

先在浏览器或 curl 中查看 `DbModel.fields`，确认字段没有被 `@NoAkoField` 或场景忽略注解排除；再确认 `type` 是前端已注册的类型。

### 关联显示 ID

确认关联模型已出现在 `models`，分页响应是否包含对应 `information`，以及 `@Mapping` 的显示字段是否真实存在。

### 自定义页面没有生效

确认组件注册发生在菜单加载前，组件名与 `pageNode` 完全一致，并且没有被后续的 `mixin` 覆盖。

### 保存或删除成功但页面未刷新

标准 View 会在保存、删除后重新调用分页；自定义按钮或自定义 View 需要主动调用传入的 `searchFun`。服务端仍需独立完成鉴权、校验和事务。
