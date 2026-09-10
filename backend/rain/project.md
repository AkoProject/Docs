---
title: 项目创建
description: 创建一个使用 ako-rain 的 JVM 后端项目，并准备 Rain、SmartWeb 与 SmartAccess。
---

# 项目创建

`ako-rain` 是 Ako 当前已经接通的 JVM 后端实现。一个可运行的项目需要三类能力：Rain 负责应用启动与扫描，SmartWeb 负责 HTTP 控制器，SmartAccess/JPA 负责实体持久化和查询。

如果你还没有 Rain 项目，建议先阅读 [Rain 快速开始](https://rain.icecreamqaq.com/guide/getting-started)，再把 Ako 接入已有的 Rain 应用。

## 依赖方式

当前源码仍处于开发版本，依赖版本必须成组匹配。下面是 Kotlin DSL 的项目骨架：

```kotlin
repositories {
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
}
```

`framework/rain/build.gradle.kts` 当前使用的参考版本是 Rain `1.0.0-DEV7`、SmartWeb `1.0.0-DEV9`、SmartAccess `1.0.0-DEV11`；它们只是源码快照参考值，不是永久兼容声明。发布前请以制品仓库和 JVM 根项目为准。

## 推荐目录

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

最开始只需要一个模型和一个 Access。业务控制器、菜单分组、枚举和关联可以在页面跑通后逐步增加。

## 启动入口

Rain 应用使用完整启动器：

```kotlin
package example

import rain.application.FullStackApplicationLauncher

fun main() {
    FullStackApplicationLauncher.launch()
}
```

完整启动器会准备 Rain 所需的应用类加载和模块初始化。具体启动器差异以 [Rain 应用启动](https://rain.icecreamqaq.com/guide/getting-started) 为准。

## 先准备配置

把业务包加入 Rain 扫描范围：

```properties
rain.scanPackages=example
```

开发阶段可以使用 H2 验证完整链路：

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

生产环境请按 [SmartAccess 配置](https://rain.icecreamqaq.com/smartaccess/configuration) 换成实际数据库、连接池和 Hibernate 参数。

## 创建后的检查顺序

1. 确认应用能启动，且扫描日志包含业务包。
2. 接入 `AkoRain` 模块，不要从 Rain 配置中移除它。
3. 创建继承 `AkoAccess` 或 `SoftDeleteAccess` 的模型 Access。
4. 按 [开始](/backend/rain/quick-start) 挂载菜单、模型和认证接口。
5. 按 [实体模型](/backend/rain/models) 添加第一个实体。
6. 前端把 `baseUrl` 指向你的 Ako 路径。

完成后先访问 `GET /api/ako/auth/isAuth` 和 `GET /api/ako/menu/list/manager`，再打开模型页面。不要一开始就调试复杂注解；先确认模型已被发现。

## 当前 JVM 状态

当前 Ako JVM 根项目启用了 `ako-core`、`ako-jpa` 和 `ako-rain`；`ako-spring` 仍在推进中，不能按完成的 Spring Boot 适配器使用。协议本身不依赖 JVM，其他语言和框架请阅读 [扩展参考](/extension/overview)。
