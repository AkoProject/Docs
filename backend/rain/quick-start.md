---
title: 开始
description: 使用 Rain、SmartWeb 和 SmartAccess 接入 Ako JVM 后端。
---

# 开始

`ako-rain` 是当前 Ako JVM 方向已经接通的后端实现。它把 Ako 核心模型协议接入 Rain 应用生命周期、SmartWeb 控制器和 SmartAccess/JPA 数据访问。

## 依赖

`ako-rain` 的构建文件把 Rain、SmartWeb 和 SmartAccess 作为平台依赖，因此业务应用需要显式引入一组相互匹配的版本。源码仍是开发版本，下面用占位符避免复制出过期坐标：

<script setup lang="ts">
const rainDependencyExamples = [
  {
    language: 'Kotlin DSL',
    framework: 'ako-rain',
    code: `repositories {
  mavenCentral()
  maven("https://maven.cnb.cool/IceCream/maven/-/packages/")
}

val akoVersion = "<ako-version>"
val rainVersion = "<rain-version>"
val smartWebVersion = "<smartweb-version>"
val smartAccessVersion = "<smartaccess-version>"

dependencies {
  implementation("com.ako-dev:ako-rain:$akoVersion")
  implementation("com.IceCreamQAQ.Rain:application:$rainVersion")
  implementation("com.IceCreamQAQ.Rain:controller:$rainVersion")
  implementation("com.IceCreamQAQ.SmartWeb.Server:SmartHTTP:$smartWebVersion")
  implementation("com.IceCreamQAQ.SmartAccess:hibernate5:$smartAccessVersion")
  runtimeOnly("com.h2database:h2:<h2-version>")
}`,
    note: '版本请以 JVM 根项目和 framework/rain/build.gradle.kts 的组合为准。不要把开发版本直接升级成互不匹配的一组。',
  },
  {
    language: 'HTTP',
    framework: '自定义后端',
    code: `只要提供同一组接口即可：

GET  /api/ako/menu/list/{channel}
POST /api/ako/model/page/{model}
POST /api/ako/model/save/{model}
POST /api/ako/model/delete/{model}

认证入口：
GET  /api/ako/auth/isAuth
POST /api/ako/auth/login`,
    note: '这个分支不是 Spring 已实现的代码，只是说明协议可以独立于 Rain。',
  },
]
</script>

<CodeSwitch :variants="rainDependencyExamples" />

当前源码快照的参考值是：Ako 根项目版本 `0.0.14`；`framework/rain` 构建文件中使用的 Rain、SmartWeb、SmartAccess 仍是开发版本。发布和运行前请核对制品仓库中真正存在的版本。

## 创建入口

Rain 应用使用完整启动器：

```kotlin
package example

import rain.application.FullStackApplicationLauncher

fun main() {
    FullStackApplicationLauncher.launch()
}
```

`FullStackApplicationLauncher` 会创建支持 Rain 类增强的应用类加载器；如果不需要类增强，可以按 Rain 文档选择基础启动器。

## 配置扫描与数据库

Ako 模型和 Access 必须在 Rain 扫描范围内。可以在 `src/main/resources/conf/application.properties` 中写入：

```properties
rain.scanPackages=example
```

`ako-rain` 自身的模块配置会注册 `ako.rain.AkoRain`，不要移除它。使用 H2 验证链路时，可以配置：

```yaml
webServer:
  port: 17777

db:
  provider: smartaccess.hibernate.HibernateService
  driver: org.h2.Driver
  url: jdbc:h2:./h2db/ako
  username: h2
  password: h2
  dialect: org.hibernate.dialect.H2Dialect
```

生产环境请根据 SmartAccess 文档配置实际数据库、连接池和 Hibernate 参数。Rain 的配置文件格式、扫描边界和启动顺序见 [Rain 快速开始](https://rain.icecreamqaq.com/guide/getting-started) 与 [SmartAccess 配置](https://rain.icecreamqaq.com/smartaccess/configuration)。

## 最小项目结构

```text
src/main/kotlin/example/
├── Application.kt
├── controller/
│   ├── AkoController.kt
│   ├── MenuController.kt
│   ├── ModelController.kt
│   └── AuthController.kt
└── model/
    ├── Student.kt
    └── Group.kt
src/main/resources/conf/
└── application.properties
```

模型声明见 [实体模型](/backend/rain/models)，控制器挂载见 [控制器与接口](/backend/rain/controllers)。

## 事务与软删除

`ako-rain` 的标准模型接口会在分页、保存和删除操作外围开启事务。JPA 方向的 `CompleteModel` 设计上继承软删除模型；配套的 `SoftDeleteAccess` 尝试把删除操作重写为更新删除时间，而不是直接物理删除。

当前开发快照的 QueryRewriter 仍需要验证，详见 [数据访问与事务](/backend/rain/data-access) 的软删除说明。

这只是当前 JVM + JPA 实现的默认行为。其他适配器可以使用自己的事务和删除策略，但应在数据与安全文档中明确说明。

## 运行检查

启动后检查：

```bash
curl http://localhost:17777/api/ako/menu/list/manager
curl -X POST http://localhost:17777/api/ako/model/page/Student \
  -H 'Content-Type: application/json' \
  -d '{"page":1,"size":20,"params":{},"sort":{}}'
```

如果 `models` 为空，优先检查 Access 是否继承 `AkoAccess`/`SoftDeleteAccess`、模型包是否在 `rain.scanPackages` 内，以及 `AkoRain` 是否已经注册。

完整的真实页面示例见 [Ako 快速开始的运行效果](/guide/quick-start#_5-真实运行效果)。

## 进一步使用

主流程跑通后，再按需要阅读：

- [数据访问与事务](/backend/rain/data-access)：查询、保存、删除、事务、软删除和模型基类。
- [控制器与接口](/backend/rain/controllers)：认证、Ako 路由和自定义业务接口。
- [内置工具](/backend/rain/tools)：`AkoRain`、Access 查找、元数据和错误工具。
