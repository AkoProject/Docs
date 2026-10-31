---
title: Ako 能做什么
description: 后端写一个带注解的实体类，前端在运行时按这份声明渲染出完整的管理后台，不生成任何代码。附真实运行截图，以及与 admin 模板、代码生成器的对比。
aside: false
---

# 一个实体类，就是一整页管理后台

后端写一个带注解的实体类，前端在运行时读取这份声明，直接渲染出搜索、表格、表单、关联选择和业务按钮齐全的管理后台。

整个过程**不生成任何代码**。声明改了，页面就跟着变；前端、后端和框架各自升级，只要三方遵守同一份协议，就互不影响。

下面所有截图都来自真实运行的 Ako：后端是 `ako-rain`，前端是原封不动的 `@ako-dev/ako`。**前端没有写一行页面代码。**

<figure class="ako-shot ako-shot--hero">
  <a href="/showcase/orders.png" target="_blank"><img src="/showcase/orders.png" alt="Ako 按后端声明渲染的订单管理页面"></a>
  <figcaption>订单管理页：菜单分组、搜索区、关联字段显示名称、状态枚举、时间格式化、分页、页面按钮和行按钮，全部由后端声明驱动。</figcaption>
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
| 新增与编辑 | 手写弹窗、表单项和校验规则，前后端校验各写一遍 | 按字段类型自动渲染，校验在一处声明 |
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
| 定制方式 | 直接改模板源码，升级困难 | 任意一层都能单独接管，其余部分照常由声明驱动（见 [每一层都能接管](#每一层都能接管)） |

## 和代码生成器也不一样

说到“根据模型自动出后台”，很多人会想到若依、JeecgBoot 这类代码生成器。它们和 Ako 看起来相似，原理却正好相反。

代码生成器读一遍模型，输出一批 Controller、Vue 页面和 SQL。这批代码从输出那一刻起就归你维护，和模型再无关系：

- 模型改了，要重新生成；
- 重新生成会覆盖文件，写进生成代码里的业务逻辑会被冲掉；
- 不想被冲掉，就只能从此不再生成，回到手工维护，之前省下的时间又还了回去。

Ako 根本没有“生成”这一步。后端声明在运行时变成元数据，前端在运行时读取元数据并渲染，中间不产生任何需要维护的代码。声明是唯一的事实来源；业务逻辑写在保存钩子、业务接口和自定义组件里，与声明并列存在，不会被任何东西覆盖。

| | 代码生成器 | Ako |
| --- | --- | --- |
| 产物 | 一批需要长期维护的代码 | 没有产物，只有声明 |
| 模型变更 | 重新生成，或者手工同步每个文件 | 改声明，重启后端即生效 |
| 自定义业务 | 写在生成的代码里，重新生成会被覆盖 | 写在钩子、接口、组件里，与声明互不干扰 |
| 前端升级 | 旧页面停留在生成时的样子 | 所有页面同时用上新能力 |
| 更换后端 | 全部重新生成 | 协议不变，前端无感 |

和若依这类一体化平台的区别，以及更完整的设计原则，见 [设计思路](/guide/design#和其他方案的区别)。

### 三方各自演进

前端、后端和框架之间只有一份协议。下面是真实发生过的例子：

- **前端单独升级**：`@ako-dev/ako` 把容量类型改为以 BigInt 为核心，编辑时自动换算单位。所有用到 `@BinarySize` 的页面同时受益，后端一行没动。
- **后端单独修改**：给订单加一个“优惠金额”字段，后端加两行、重启，搜索区、表格列和编辑表单同时出现，前端不用发版。
- **框架单独替换**：同一套模型可以跑在 `ako-rain` 上，也可以换到 `ako-spring`，后端甚至可以整个换成 [JavaScript 实现](/backend/javascript/)。前端完全感知不到。

## 每一层都能接管

担心“总有一两个页面要特殊处理，到时候卡在那 20% 上”？Ako 不是“要么全用、要么全弃”。从一个输入框到 Ako 本身，每一层都可以单独接管，其余部分照常由声明驱动。

### 前端渲染层

前端渲染的每一处都通过组件名查找组件。元数据里写的是名字，你在 Vue 应用里注册一个同名组件，就接管了那一处。

| 接管粒度 | 怎么做 |
| --- | --- |
| 编辑表单里的一个输入控件 | 字段上写 `@EditInputNode("组件名")` |
| 字段的外层（标签、布局） | `@SearchPropertyNode`、`@EditPropertyNode`、`@TableColumnNode` |
| 一种字段类型 | 注册自己的类型提供者，搜索、表格、编辑三处一起接管 |
| 页面的某一块 | `@ModelNode` 的 `searchNode`、`tableNode`、`editNode`，单独替换搜索区、表格或编辑表单 |
| 整个模型页面 | `@ModelNode(pageNode = "组件名")`，页面完全自己写，Ako 只把模型元数据交给你 |
| 按钮行为 | 从声明式的 `url`、`panel`，一路退到 `dialog` 弹任意组件、`eval` 执行任意脚本、`component` 整个换掉按钮 |
| 菜单图标、仪表盘、Logo | `iconNode`，以及 `dashboard`、`authLogo`、`mainLogo` 配置 |
| 纯前端页面 | `menuItems` 把完全自己写的页面挂进同一套菜单 |

详细写法见 [自定义页面与类型](/frontend/customization) 和 [JVM 注解功能](/backend/rain/annotations)。

### 元数据层

元数据的主路径是后端声明。后端还可以全局替换默认值：`AkoDefaultNode` 里的默认节点名都是可修改的变量，改一处，全站同类组件一起换掉。

后端暂时改不了的时候，前端还有 mixin 兜底。后端返回的元数据到达前端后，先经过 mixin，你可以在这里修改任意模型、字段和按钮，甚至替换整个响应：

```ts
import { createApp } from 'vue'
import { Ako, AkoBootView, menuRespMixin } from '@ako-dev/ako'

createApp(AkoBootView).use(new Ako(), {
  // 后端来不及发版，先在前端隐藏订单的“创建时间”列
  mixin: menuRespMixin().model('ShopOrder', (model) => {
    model.fields.find((f) => f.id === 'createTime')!.column = undefined
  }),
}).mount('#app')
```

等后端跟上，再把这段 mixin 删掉。协议仍然是契约，但契约的落地不再卡在某一方的发版节奏上。详见 [使用 mixin](/frontend/mixins)。

### 实现层

再往外，连 Ako 本身也可以替换：

- **数据来源**：替换 `api` 配置，菜单、分页、保存、删除都可以不走默认的 HTTP 实现。
- **应用外壳**：不用 `AkoBootView`，用 `AkoApp` 嵌进已有布局；也可以不调用 `install`，自己组装。见 [使用 Ako View 构建页面](/frontend/views)。
- **零散能力**：搜索面板、表格面板、编辑面板、`createEntityView`、`createSaveFun` 都已导出，可以只拿其中一块用在自己的页面里。
- **后端业务**：保存钩子、自定义控制器、Spring 的 `AkoSpringDatabase` 接口，都能插入自己的逻辑。见 [保存钩子](/backend/rain/data-access#保存钩子)。
- **整个前端或后端**：任何读得懂、实现得了 [Ako 协议](/protocol/overview) 的程序，都可以替换现有的 Vue 前端或 JVM、JavaScript 后端。

没有任何一环是必须的。协议、组件库、库和框架都只是 Ako 这组能力的不同形态，按业务需要取用即可。为什么这样设计，见 [设计思路](/guide/design)。

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
