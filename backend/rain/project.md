---
title: 项目创建
description: 创建 ako-rain 或 ako-spring JVM 后端项目，并选择匹配的 Web 与数据访问实现。
---

# 项目创建

Ako 的 JVM 后端有两种实现。先确认自己的应用宿主，再复制对应的依赖和启动配置：

- 已经使用 Rain、SmartWeb、SmartAccess：选择 `ako-rain`。
- 已经使用 Spring Boot、Spring MVC、Spring Data JPA：选择 `ako-spring`。
- Spring Boot 2 使用 `javax.persistence` 时，使用 Spring 公共运行时并自行提供数据库实现；Boot 3/4 才使用仓库中提供的 Spring Data JPA 适配器。

如果你还没有宿主项目，请先阅读 [Rain 快速开始](https://rain.icecreamqaq.com/guide/getting-started) 或 [Spring Boot 文档](https://docs.spring.io/spring-boot/docs/current/reference/html/)。下面代码块的框架选择会在全站保持，并写入浏览器 `localStorage`。

## 依赖方式

`ako-rain` 依赖 Rain、SmartWeb 和 SmartAccess；`ako-spring` 依赖对应的 Spring Boot 自动配置和数据访问模块。两套依赖如下：

<script setup lang="ts">
const dependencyExamples = [
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
    note: 'Rain 依赖其 Application、SmartWeb 和 SmartAccess 生态；版本以 JVM 根项目和 framework/rain/build.gradle.kts 为准。',
  },
  {
    language: 'Kotlin DSL',
    framework: 'ako-spring',
    code: `dependencies {
  // Boot 3；Boot 4 将 springboot-3 换成 springboot-4
  implementation("com.ako-dev:ako-springboot-3:<ako-version>")
  implementation("com.ako-dev:ako-springboot-springdata:<ako-version>")

  implementation("org.springframework.boot:spring-boot-starter-web")
  implementation("org.springframework.boot:spring-boot-starter-data-jpa")
  runtimeOnly("com.h2database:h2:<h2-version>")
}`,
    note: 'Spring 的 Boot 自动配置、Spring MVC 和 Spring Data JPA 由宿主的 dependency management 提供版本；Boot 2 请看本页的兼容说明。',
  },
]

const layoutExamples = [
  {
    language: '目录',
    framework: 'ako-rain',
    code: `src/main/kotlin/example/
├── Application.kt
├── controller/
│   ├── AkoController.kt
│   ├── MenuController.kt
│   ├── ModelController.kt
│   └── AuthController.kt
└── model/
    └── Student.kt

src/main/resources/conf/
└── application.properties`,
    note: 'Rain 使用模块配置、扫描范围和 SmartWeb 控制器。',
  },
  {
    language: '目录',
    framework: 'ako-spring',
    code: `src/main/kotlin/example/
├── Application.kt
├── controller/
│   ├── AkoMenuController.kt
│   ├── AkoModelController.kt
│   └── AuthController.kt
├── model/
│   └── Student.kt
└── repository/
    └── StudentRepository.kt

src/main/resources/
└── application.yml`,
    note: 'Spring 使用 Boot 自动配置、组件扫描、Spring MVC Controller 和 Spring Data Repository。',
  },
]

const launcherExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `package example

import rain.application.FullStackApplicationLauncher

fun main() {
  FullStackApplicationLauncher.launch()
}`,
    note: '完整启动器负责 Rain 的应用类加载、模块初始化和扫描；ako-rain 再由 Rain 模块配置注册 AkoRain。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `package example

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class Application

fun main(args: Array<String>) {
  runApplication<Application>(*args)
}`,
    note: '对应的 Boot 自动配置会注册 AkoSpringRuntime；Spring 通过 ApplicationContext 发现数据库实现和 Repository Bean。',
  },
]

const configurationExamples = [
  {
    language: 'Properties',
    framework: 'ako-rain',
    code: `# src/main/resources/conf/application.properties
rain.scanPackages=example
webServer.port=17777

db.provider=smartaccess.hibernate.HibernateService
db.driver=org.h2.Driver
db.url=jdbc:h2:./h2db/ako
db.username=h2
db.password=h2
db.dialect=org.hibernate.dialect.H2Dialect`,
    note: 'Rain 的配置键由 Rain、SmartWeb 和 SmartAccess 提供；ako-rain 模块本身还会注册 AkoRain。',
  },
  {
    language: 'YAML',
    framework: 'ako-spring',
    code: `server:
  port: 17777

spring:
  datasource:
    url: jdbc:h2:mem:ako;DB_CLOSE_DELAY=-1
    driver-class-name: org.h2.Driver
    username: sa
    password:
  jpa:
    hibernate:
      ddl-auto: update`,
    note: 'Spring Boot 使用 server、spring.datasource 和 spring.jpa 配置；Bean 与 Repository 由组件扫描和 @EnableJpaRepositories 管理。',
  },
]
</script>

<CodeSwitch :variants="dependencyExamples" />

### Spring 模块如何组合

| 模块 | 用途 | 适用版本 |
| --- | --- | --- |
| `ako-spring-common` | `AkoSpringRuntime`、`AkoSpringDatabase`、事务和模型上下文。 | Boot 2/3/4，或自定义 Spring 应用。 |
| `ako-springboot-2` | Boot 2.7 自动配置。 | Java 8、`javax` 生态；数据库层需要自定义。 |
| `ako-springboot-3` | Boot 3 自动配置。 | Java 17、Jakarta 生态。 |
| `ako-springboot-4` | Boot 4 自动配置。 | Java 17、Spring Framework 7。 |
| `ako-springboot-springdata` | Spring Data JPA 数据库实现。 | Boot 3/4。 |

`ako-springboot-springdata` 使用 Jakarta Persistence 和 Spring Data JPA 的公共 API，因此不与 Boot 2 的 `javax.persistence` 技术栈混用。这是模块拆分的原因，不是 Ako 模型或注解在不同 Boot 版本上有两套定义。

### Spring Boot 2 兼容路径

如果项目仍在 Boot 2.7 和 `javax.persistence` 技术栈上，可以只引入 Boot 2 自动配置和公共运行时，再自行实现 `AkoSpringDatabase`：

```kotlin
dependencies {
  implementation("com.ako-dev:ako-springboot-2:<ako-version>")
  implementation("org.springframework.boot:spring-boot-starter-web")
  // 不引入 ako-springboot-springdata
}
```

这条路径保留了 `AkoSpringRuntime`、菜单/模型协议和事务入口，但数据库模型发现与 CRUD 由你的 `AkoSpringDatabase` 提供。这样可以避免把 Boot 2 的 `javax.persistence` 与 `ako-jpa`/Spring Data 的 Jakarta API 混在一起；完整 SPI 见 [数据访问与事务](/backend/rain/data-access)。

## 推荐目录

业务模型和 Ako 注解可以共享；宿主配置、控制器和数据访问入口不同：

<CodeSwitch :variants="layoutExamples" />

Rain 项目通常把 Ako 模块配置放在 `conf` 下并依赖扫描；Spring 项目通常由 Boot 自动配置和 `application.yml` 管理 Bean、数据源和 JPA。目录可以调整，关键是模型/Access 或 Repository 必须能被对应运行时发现。

## 启动入口

<CodeSwitch :variants="launcherExamples" />

这两段代码不同，是因为 Rain 的增强类加载/模块生命周期和 Spring Boot 的 ApplicationContext 生命周期不同。它们启动后都会建立 Ako Runtime，但 Runtime 的初始化来源不同。

## 基础配置

<CodeSwitch :variants="configurationExamples" />

生产环境请分别按照 [Rain 配置](https://rain.icecreamqaq.com/) 或 [Spring Boot 外部化配置](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config) 配置真实数据库、连接池、日志和安全策略。不要把示例中的 H2、端口和密码直接用于生产。

## 创建后的检查顺序

1. 确认应用能启动，且业务包已经进入宿主框架的扫描范围。
2. 确认对应的 Ako Runtime 已注册：Rain 是 `AkoRain`，Spring 是 `AkoSpringRuntime`。
3. 创建一个实体模型和一个数据访问入口：Rain 使用 `AkoAccess`，Spring Data 使用 `AkoJpaRepository`/`AkoRepository`。
4. 挂载 `menu/list/{channel}`、`model/page/{model}`、`model/save/{model}` 和 `model/delete/{model}`。
5. 前端把 `baseUrl` 指向这些路由，并先检查认证和菜单接口。
6. 再添加关联、枚举、按钮和自定义校验。

完成后先访问：

```text
GET  /api/ako/auth/isAuth
GET  /api/ako/menu/list/manager
POST /api/ako/model/page/Student
```

如果 `models` 为空，Rain 优先检查 ClassRegister、`rain.scanPackages` 和 Access；Spring 优先检查 Repository Bean、`@EnableJpaRepositories`/组件扫描和 `AkoSpringDatabase` Bean。

## 当前版本

JVM 根项目当前版本为 `0.0.15`。Rain、Spring Boot、Spring Framework、Spring Data JPA 和 SmartAccess 的版本线必须与目标运行时匹配；复制依赖前请以对应模块的 `build.gradle.kts` 和制品仓库为准。
