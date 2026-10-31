---
layout: home

hero:
  name: "Ako"
  text: "业务快速启动框架"
  tagline: 后端声明业务模型，前端实时渲染管理后台，不生成一行代码。
  actions:
    - theme: brand
      text: 看看 Ako 能做什么
      link: /guide/showcase
    - theme: alt
      text: 立即开始
      link: /frontend/quick-start
    - theme: alt
      text: 后端（JVM）
      link: /backend/rain/project
    - theme: alt
      text: 后端（JavaScript）
      link: /backend/javascript/project

features:
  - title: 一份模型声明
    details: 字段、搜索、表格、表单和按钮都写在后端模型里，前端在运行时按元数据渲染。改了声明，页面立刻跟着变。
  - title: 三方各自演进
    details: 前端、后端和框架之间只有一份协议。谁升级都不影响另外两方，后端用什么语言和框架都可以。
  - title: 每一层都能接管
    details: 从一个输入框、一个页面到数据来源乃至 Ako 本身，每项能力都可选、可注入、可组装、可任意替换；后端来不及改，前端还有 mixin 兜底。
---

<figure class="ako-shot ako-shot--hero ako-home-shot">
  <a href="/guide/showcase"><img src="/showcase/orders.png" alt="Ako 按后端声明渲染的订单管理页面"></a>
  <figcaption>这一整页由一个带注解的 Kotlin 实体类驱动，前端没有写页面代码，也没有生成任何代码。<a href="/guide/showcase">看看是怎么做到的 →</a></figcaption>
</figure>

<div class="ako-home-note">

<span class="ako-home-note__status">实现状态</span>
<p>前端提供 Vue 3 实现；后端（JVM）提供 <code>ako-rain</code> 和 <code>ako-spring</code> 两套实现；后端（JavaScript）是运行在 Node.js 和 Bun 上的 TypeScript 实验性实现。协议本身不绑定语言，其他语言和框架只要实现同一套 HTTP 接口就能接入。</p>

</div>
