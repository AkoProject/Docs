---
layout: home

hero:
  name: "Ako"
  text: "业务快速启动框架"
  tagline: 后端声明业务模型，前端自动生成管理后台。
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
    details: 字段、搜索、表格、表单和按钮都写在后端模型里，前端照着元数据生成页面。
  - title: 前后端分离
    details: 前端只认 Ako 协议。后端用什么语言、数据库和 Web 框架都可以。
  - title: 按需替换
    details: 页面节点、字段类型、按钮和 API 都能换成自己的实现，让页面逐步贴合业务。
---

<figure class="ako-shot ako-shot--hero ako-home-shot">
  <a href="/guide/showcase"><img src="/showcase/orders.png" alt="Ako 根据后端声明自动生成的订单管理页面"></a>
  <figcaption>这一整页由一个带注解的 Kotlin 实体类生成，前端没有写页面代码。<a href="/guide/showcase">看看是怎么做到的 →</a></figcaption>
</figure>

<div class="ako-home-note">

<span class="ako-home-note__status">实现状态</span>
<p>前端提供 Vue 3 实现；后端（JVM）提供 <code>ako-rain</code> 和 <code>ako-spring</code> 两套实现；后端（JavaScript）是运行在 Node.js 和 Bun 上的 TypeScript 实验性实现。协议本身不绑定语言，其他语言和框架只要实现同一套 HTTP 接口就能接入。</p>

</div>
