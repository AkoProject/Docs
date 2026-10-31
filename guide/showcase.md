---
title: Ako 能做什么
description: 后端写一个带注解的实体类，Ako 自动生成搜索、表格、表单、关联选择和业务按钮齐全的管理后台。附真实运行截图，以及与传统 admin 模板的对比。
aside: false
---

# 一个实体类，就是一整页管理后台

后端写一个带注解的实体类，Ako 自动生成搜索、表格、表单、关联选择和业务按钮齐全的管理后台。

下面所有截图都来自真实运行的 Ako：后端是 `ako-rain`，前端是原封不动的 `@ako-dev/ako`。**前端没有写一行页面代码。**

<figure class="ako-shot ako-shot--hero">
  <a href="/showcase/orders.png" target="_blank"><img src="/showcase/orders.png" alt="Ako 自动生成的订单管理页面"></a>
  <figcaption>订单管理页：菜单分组、搜索区、关联字段显示名称、状态枚举、时间格式化、分页、页面按钮和行按钮，全部由后端声明生成。</figcaption>
</figure>

<div class="ako-stats">
  <div class="ako-stat"><strong>5</strong><span>个业务模型，分布在 3 个菜单分组</span></div>
  <div class="ako-stat"><strong>0</strong><span>行前端页面代码</span></div>
  <div class="ako-stat"><strong>256</strong><span>行后端代码，含 import、空行和 3 个自定义业务接口</span></div>
</div>

## 从声明到页面

上面这一页订单管理，后端只写了下面这个类（省略了 import 和几行列宽设置）：

```kotlin
@DbName("订单")
@MenuGroup(id = "trade", name = "交易中心", index = 20)
@ModelButton(
    name = "发货",
    type = "primary",
    panel = ButtonPanel(
        url = "/api/showcase/order/\${id}/ship",
        method = "PATCH",
        fields = [
            PanelField(
                "carrier", name = DbName("物流公司"), nullable = false,
                enum = DbEnum("顺丰", "京东", "中通", "圆通"),
            ),
            PanelField("trackingNo", name = DbName("运单号"), nullable = false),
        ]
    )
)
@OperateButton(
    name = "退款",
    url = "/api/showcase/order/\${id}/refund",
    method = "PATCH",
    reconfirm = "确定为这笔订单退款吗？",
    type = "danger",
)
@Entity
data class ShopOrder(
    @DbName("订单号")
    @SearchType(SearchType.Type.Like)
    var orderNo: String = "",

    @DbName("客户")
    @Mapping(Customer::class, display = "name")
    var customer: Int = 0,

    @DbName("商品")
    @Mapping(Product::class, display = "name")
    var product: Int = 0,

    @DbName("数量")
    var quantity: Int = 1,

    @DbName("金额（元）")
    @SearchType(SearchType.Type.GreaterEqual)
    var amount: Int = 0,

    @DbName("状态")
    @DbEnum("待付款", "待发货", "已发货", "已完成", "已退款")
    var status: Int = 0,

    @DbName("下单时间")
    @Datetime
    var orderedAt: Long = 0,
) : CompleteModel()

interface ShopOrderAccess : SoftDeleteAccess<ShopOrder, Int>
```

每一行注解都直接对应页面上的一处效果：

| 后端这样写 | 页面上得到 |
| --- | --- |
| `@DbName("订单")` + `@MenuGroup(...)` | 左侧“交易中心”分组下多出“订单”菜单 |
| `@SearchType(Like)` / `@SearchType(GreaterEqual)` | 订单号模糊搜索，金额按“大于等于”搜索 |
| `@Mapping(Customer::class, display = "name")` | 列表显示客户姓名而不是 ID；表单里点放大镜弹出客户选择器 |
| `@DbEnum("待付款", ...)` | 列表显示状态文字，搜索和表单变成下拉框 |
| `@Datetime` | 毫秒时间戳显示成 `2026-10-28 17:35:22`，搜索变成时间范围 |
| Kotlin 非空类型 | 表单自动标记必填，提交前校验 |
| `@ModelButton(panel = ...)` | 页面上的“发货”按钮，点开是带物流公司下拉框和运单号的表单 |
| `@OperateButton(reconfirm = ...)` | 每行的“退款”按钮，点击先弹出二次确认 |
| `CompleteModel` | 自增编号、创建时间、软删除，开箱即有 |

## 同一份声明，还自动得到了这些

<div class="ako-gallery">
  <figure class="ako-shot">
    <figcaption><strong>组合搜索</strong>金额 ≥ 1000 且状态为“待发货”。查询方式写在字段上，前端不用写一行查询逻辑。</figcaption>
    <a href="/showcase/search.png" target="_blank"><img src="/showcase/search.png" alt="组合搜索" loading="lazy"></a>
  </figure>
  <figure class="ako-shot">
    <figcaption><strong>关联选择</strong>在订单表单里选客户，弹出的是“客户”模型自己的搜索和表格，可以按姓名、等级、城市筛选后再选。</figcaption>
    <a href="/showcase/mapping.png" target="_blank"><img src="/showcase/mapping.png" alt="关联选择" loading="lazy"></a>
  </figure>
  <figure class="ako-shot">
    <figcaption><strong>表单校验</strong>必填、正则、范围校验都来自后端注解；<code>@Required("请输入商品名称")</code> 的提示语原样出现，字段说明也一并显示。</figcaption>
    <a href="/showcase/validate.png" target="_blank"><img src="/showcase/validate.png" alt="表单校验" loading="lazy"></a>
  </figure>
  <figure class="ako-shot">
    <figcaption><strong>业务操作面板</strong>选中订单后点“发货”，弹出的表单字段来自 <code>@PanelField</code>，提交到你自己的业务接口。</figcaption>
    <a href="/showcase/panel.png" target="_blank"><img src="/showcase/panel.png" alt="业务操作面板" loading="lazy"></a>
  </figure>
  <figure class="ako-shot">
    <figcaption><strong>危险操作二次确认</strong><code>reconfirm</code> 写一句话，行按钮就会先弹出确认框。</figcaption>
    <a href="/showcase/confirm.png" target="_blank"><img src="/showcase/confirm.png" alt="二次确认" loading="lazy"></a>
  </figure>
  <figure class="ako-shot">
    <figcaption><strong>专用字段类型</strong><code>@BinarySize</code> 把字节数显示成 GB、TB，搜索框自带单位切换；<code>@DateOnly</code> 只显示日期。</figcaption>
    <a href="/showcase/storage.png" target="_blank"><img src="/showcase/storage.png" alt="容量与日期" loading="lazy"></a>
  </figure>
</div>

## 和模板时代的 admin 比一比

过去十年，搭管理后台的主流做法是找一套 admin 模板，比如 vue-element-admin、Ant Design Pro，以及各种 xxx-admin。模板解决了登录、布局、权限菜单这些“外壳”，但壳里的每一个业务页面，仍然要人一行一行写出来，而且前后端各写一遍。

### 做一个“订单管理”要写什么

| 工作 | 模板时代 | Ako |
| --- | --- | --- |
| 数据定义 | 后端写实体和 DTO，前端再写一份 TypeScript 类型 | 一个带注解的实体类 |
| 增删改查接口 | 每个模型写一套 Controller、Service；前端再封装一个 api 模块 | 所有模型共用 `IModelController`，一次接入 |
| 搜索区 | 手写表单，逐个字段绑定，自己处理模糊、范围查询 | `@SearchType` 声明查询方式 |
| 表格 | 手写每一列，自己格式化时间、翻译枚举 | 字段自动成列，`@Datetime`、`@DbEnum` 自动格式化 |
| 关联字段 | 列表里 ID 换名称要额外查询；表单里另写下拉框或选择弹窗 | `@Mapping` 一行，显示名称和选择弹窗全自动 |
| 新增与编辑 | 手写弹窗、表单项和校验规则，前后端校验各写一遍 | 按字段类型生成，校验在一处声明 |
| 业务按钮 | 手写按钮、弹窗、确认框和请求代码 | `@ModelButton`、`@OperateButton` 声明 |
| 菜单与路由 | 改路由表、菜单配置 | `@MenuGroup`，模型自动出现在菜单里 |

用模板写这样一页，通常要动前后端六七个文件、几百行代码。在 Ako 里，它就是上面那一个类。

### 加一个字段要改几处

产品经理说：“订单加一个优惠金额。”

在模板项目里，你要依次修改数据库实体、DTO、前端类型、搜索表单、表格列、编辑表单和校验规则。漏掉任何一处，就会出现“列表里有、表单里没有”或者“前端能填、后端不收”这类 bug。

在 Ako 里，你只需要加两行：

```kotlin
@DbName("优惠金额")
var discount: Int = 0,
```

重启后端，搜索区、表格列、编辑表单同时出现这个字段。前端不用发版。

### 差距在哪里

| | 模板时代 | Ako |
| --- | --- | --- |
| 页面从哪里来 | 复制一个模板页面，再逐行改成新业务 | 后端声明，前端运行时按元数据渲染 |
| 前后端怎么对齐 | 靠接口文档和沟通，字段名、类型时常对不上 | 元数据就是契约，前端读到什么就渲染什么 |
| 改一个字段 | 前后端多处同步修改 | 改实体类一处 |
| 页面一致性 | 每页的交互细节取决于写它的人 | 全站同一套搜索、表格、表单和按钮行为 |
| 后端技术栈 | 前端模板与后端无关，但每个接口都要手写对接 | 一份协议：JVM（Rain、Spring Boot）、JavaScript，或任何能实现协议的语言 |
| 定制方式 | 直接改模板源码，升级困难 | 替换页面节点、字段类型或按钮组件，默认能力照常可用 |

### 什么时候仍然需要手写

Ako 擅长的是“标准的数据管理页面”，也就是大多数后台里占了八成工作量的那部分。数据大屏、营销活动页、复杂的多步骤流程，Ako 不会替你生成。不过你可以把这些页面注册成自定义页面节点，挂进同一套菜单里，标准页面继续由声明生成。具体做法见 [自定义页面与类型](/frontend/customization)。

## 自己跑一遍

这些截图都可以在本地复现。演示工程在文档仓库的 `showcase/` 目录，分成两个独立的小项目，只依赖已发布的 Ako：

- `showcase/jvm`：演示后端，一个普通的 Gradle 项目，依赖 `com.ako-dev:ako-rain`。包含 5 个模型类、Ako 控制器和 3 个自定义业务接口。
- `showcase/web`：演示前端，一个最小的 Vite 项目，只有一个入口文件，依赖 npm 上的 `@ako-dev/ako`。

```bash
# 1. 启动演示后端（Gradle 需要 JDK 17～21）
cd showcase/jvm && ./gradlew run

# 2. 在文档仓库根目录，通过 Ako 的标准保存接口写入演示数据
python3 showcase/jvm/seed.py

# 3. 启动演示前端
cd showcase/web && bun install && bun run dev
```

打开 `http://localhost:7777` 就能看到和截图一样的后台。想从头搭一个自己的项目，从 [快速开始](/guide/quick-start) 开始。
