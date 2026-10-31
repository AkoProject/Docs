---
title: 项目创建
description: 创建 ako-rain 或 ako-spring 后端项目，选好对应的 Web 框架和数据访问实现。
---

# 项目创建

Ako 的后端（JVM）有两套实现。先看你的项目建在哪个框架上，再复制对应的依赖和启动配置：

- 已经在用 Rain、SmartWeb、SmartAccess：选 `ako-rain`。
- 已经在用 Spring Boot、Spring MVC、Spring Data JPA：选 `ako-spring`。
- Spring Boot 2 搭配 `javax.persistence`：使用 Spring 公共运行时，自己提供数据库实现。仓库自带的 Spring Data JPA 适配器只用于 Boot 3/4。

还没有项目的话，先阅读 [Rain 快速开始](https://rain.icecreamqaq.com/guide/getting-started) 或 [Spring Boot 文档](https://docs.spring.io/spring-boot/docs/current/reference/html/) 把空项目建起来。

## 添加依赖

`ako-rain` 依赖 Rain、SmartWeb 和 SmartAccess；`ako-spring` 依赖对应版本的 Spring Boot 自动配置模块和数据访问模块：

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
    note: 'Rain 需要 Application、Controller、SmartWeb 和 SmartAccess 几个模块；Rain 相关版本以 framework/rain/build.gradle.kts 为准。',
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
    note: 'Spring MVC 和 Spring Data JPA 的版本由项目的 Spring Boot 依赖管理决定；Boot 2 见下文“Spring Boot 2 项目”。',
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
    note: 'Rain 项目由模块配置、扫描范围和 SmartWeb 控制器组成。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `src/main/java/example/
├── Application.java
├── controller/
│   ├── AkoController.java
│   ├── MenuController.java
│   ├── ModelController.java
│   └── AuthController.java
└── model/
    └── Student.java

src/main/resources/conf/
└── application.properties`,
    note: 'Java 项目把源码放在 src/main/java，其余结构与 Kotlin 项目相同。',
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
    note: 'Spring 项目由 Boot 自动配置、组件扫描、Spring MVC Controller 和 Spring Data Repository 组成。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `src/main/java/example/
├── Application.java
├── controller/
│   ├── AkoMenuController.java
│   ├── AkoModelController.java
│   └── AuthController.java
├── model/
│   └── Student.java
└── repository/
    └── StudentRepository.java

src/main/resources/
└── application.yml`,
    note: 'Java 项目把源码放在 src/main/java，其余结构与 Kotlin 项目相同。',
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
    note: 'FullStackApplicationLauncher 负责 Rain 的类加载、模块初始化和扫描；AkoRain 由 ako-rain 自带的 Rain 模块配置注册。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `package example;

import rain.application.FullStackApplicationLauncher;

public final class Application {
  public static void main(String[] args) {
    FullStackApplicationLauncher.launch();
  }
}`,
    note: 'Java 直接调用 Rain 的启动器；AkoRain 同样由 Rain 模块配置注册。',
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
    note: 'Boot 自动配置会注册 AkoSpringRuntime；数据库实现和 Repository Bean 由 Spring 的 ApplicationContext 提供。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `package example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }
}`,
    note: 'Java 用 SpringApplication.run 启动；Boot 自动配置会注册 AkoSpringRuntime。',
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
    note: '这些配置项分别属于 Rain、SmartWeb 和 SmartAccess；AkoRain 由 ako-rain 自带的 conf/module/ako.properties 注册，不用手动配置。',
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
    note: '使用 Spring Boot 标准的 server、spring.datasource 和 spring.jpa 配置；Bean 和 Repository 由组件扫描和 @EnableJpaRepositories 负责。',
  },
]
</script>

<CodeSwitch :variants="dependencyExamples" />

### Spring 模块怎么组合

| 模块 | 用途 | 适用范围 |
| --- | --- | --- |
| `ako-spring-common` | `AkoSpringRuntime`、`AkoSpringDatabase`、事务和模型上下文。 | Boot 2/3/4，或自行组装的 Spring 应用。 |
| `ako-springboot-2` | Boot 2.7 自动配置。 | Java 8、`javax` 生态；数据库层需要自己实现。 |
| `ako-springboot-3` | Boot 3 自动配置。 | Java 17、Jakarta 生态。 |
| `ako-springboot-4` | Boot 4 自动配置。 | Java 17、Spring Framework 7。 |
| `ako-springboot-springdata` | 基于 Spring Data JPA 的数据库实现。 | Boot 3/4。 |

`ako-springboot-springdata` 基于 Jakarta Persistence 和 Spring Data JPA 的公共 API，不能和 Boot 2 的 `javax.persistence` 混用，所以单独拆成一个模块。Ako 的模型和注解在各个 Boot 版本上是同一套定义。

### Spring Boot 2 项目

如果项目还在 Boot 2.7 和 `javax.persistence` 上，只引入 Boot 2 自动配置（它会带上公共运行时），再自己实现 `AkoSpringDatabase`：

```kotlin
dependencies {
  implementation("com.ako-dev:ako-springboot-2:<ako-version>")
  implementation("org.springframework.boot:spring-boot-starter-web")
  // 不引入 ako-springboot-springdata
}
```

这样仍然可以使用 `AkoSpringRuntime`、菜单/模型接口和事务入口，模型发现和增删改查则交给你的 `AkoSpringDatabase`。Boot 2 的 `javax.persistence` 也就不会和 `ako-jpa`、Spring Data 使用的 Jakarta API 混在一起。接口定义见 [数据访问与事务](/backend/rain/data-access)。

## 推荐目录

业务模型和 Ako 注解两边通用；宿主配置、控制器和数据访问入口各不相同：

<CodeSwitch :variants="layoutExamples" />

Rain 项目一般把配置放在 `conf` 目录下，靠扫描发现组件；Spring 项目一般由 Boot 自动配置和 `application.yml` 管理 Bean、数据源和 JPA。目录可以按需调整，只要模型、Access 或 Repository 能被对应的运行时发现即可。

## 启动入口

<CodeSwitch :variants="launcherExamples" />

两段代码不同，是因为 Rain 有自己的类加载增强和模块生命周期，Spring Boot 则围绕 ApplicationContext 运转。两者启动后都会创建 Ako 运行时，只是创建的时机和方式不同。

## 基础配置

<CodeSwitch :variants="configurationExamples" />

示例里的 H2、端口和密码只用于本地开发。生产环境请参照 [Rain 配置](https://rain.icecreamqaq.com/) 或 [Spring Boot 外部化配置](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)，配置真实的数据库、连接池、日志和安全策略。

## 创建后检查

1. 应用能正常启动，业务包在宿主框架的扫描范围内。
2. Ako 运行时已注册：Rain 是 `AkoRain`，Spring 是 `AkoSpringRuntime`。
3. 创建一个实体模型和对应的数据访问入口：Rain 用 `AkoAccess`，Spring Data 用 `AkoJpaRepository`/`AkoRepository`。
4. 挂载 `menu/list/{channel}`、`model/page/{model}`、`model/save/{model}` 和 `model/delete/{model}`。
5. 把前端的 `baseUrl` 指向这些路由，先确认认证和菜单接口正常。
6. 再逐步加上关联、枚举、按钮和自定义校验。

完成后先访问这几个接口：

```text
GET  /api/ako/auth/isAuth
GET  /api/ako/menu/list/manager
POST /api/ako/model/page/Student
```

如果返回的 `models` 为空：Rain 项目先检查 ClassRegister、`rain.scanPackages` 和 Access；Spring 项目先检查 Repository Bean、`@EnableJpaRepositories` 或组件扫描范围，以及 `AkoSpringDatabase` Bean。

## 版本

JVM 根项目的版本为 `0.0.17`。Rain、Spring Boot、Spring Framework、Spring Data JPA 和 SmartAccess 的版本要与项目实际使用的版本线一致；复制依赖前，请以对应模块的 `build.gradle.kts` 和制品仓库为准。
