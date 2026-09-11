---
title: 后端（JVM）
description: Ako 在 JVM 上使用 ako-rain 与 ako-spring 的共同能力、差异和选择建议。
---

# 后端（JVM）

Ako 的 JVM 后端现在有两条可以接入同一套前端协议的实现：`ako-rain` 和 `ako-spring`。两者共享 `ako-core` 的模型、注解、元数据和分页协议；差异来自各自依赖的应用容器、Web 层、数据访问层和事务模型。

## 先选择实现

下面的代码块可以切换语言和框架，并同步本网站其他 JVM 代码示例。框架选择会保存到浏览器的 `localStorage`，键名为 `ako-code-switch-framework`；Java/Kotlin 代码块的语言选择保存到 `ako-code-switch-language`。

<script setup lang="ts">
const runtimeExamples = [
  {
    language: 'Kotlin',
    framework: 'ako-rain',
    code: `import rain.application.FullStackApplicationLauncher

fun main() {
  FullStackApplicationLauncher.launch()
}

// AkoRain 由 Rain 模块配置注册，负责发现 AkoAccess 和模型。`,
    note: 'Rain 负责启动、扫描和 DI；ako-rain 使用 SmartWeb 暴露控制器，并使用 SmartAccess/JPA 访问数据。',
  },
  {
    language: 'Java',
    framework: 'ako-rain',
    code: `import rain.application.FullStackApplicationLauncher;

public final class Application {
  public static void main(String[] args) {
    FullStackApplicationLauncher.launch();
  }
}

// AkoRain 由 Rain 模块配置注册，负责发现 AkoAccess 和模型。`,
    note: 'Java 直接调用 Rain 的 JVM 启动器；AkoRain 仍由 Rain 模块配置注册。',
  },
  {
    language: 'Kotlin',
    framework: 'ako-spring',
    code: `import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class Application

fun main(args: Array<String>) {
  runApplication<Application>(*args)
}

    // AkoSpringRuntime 由对应的 Boot 自动配置注册。`,
    note: 'Spring Boot 负责启动、组件扫描和 Bean 生命周期；ako-spring 通过 AkoSpringDatabase 连接 Repository 或自定义数据实现。',
  },
  {
    language: 'Java',
    framework: 'ako-spring',
    code: `import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }
}

// AkoSpringRuntime 由对应的 Boot 自动配置注册。`,
    note: 'Java 使用 SpringApplication.run 启动；AkoSpringRuntime 由对应的 Boot 自动配置注册。',
  },
]
</script>

<CodeSwitch :variants="runtimeExamples" />

## 共同能力与框架差异

| 能力 | `ako-rain` | `ako-spring` | 为什么不同 |
| --- | --- | --- | --- |
| 应用启动 | `FullStackApplicationLauncher` | `SpringApplication` / `runApplication` | 两个框架的应用生命周期和类加载机制不同。 |
| 组件发现 | Rain `ClassRegister` 发现 `AkoAccess` | Spring `ApplicationContext` 发现 `AkoAccess`/Repository Bean | 一个依赖 Rain 注册表，一个依赖 Spring Bean 容器。 |
| Ako Runtime | `AkoRain` | `AkoSpringRuntime` | Runtime 必须绑定宿主框架的 DI、事务和模型发现方式。 |
| 菜单/模型路由 | 实现 `IMenuController`、`IModelController` | 使用普通 Spring MVC Controller 调用 `Menu`、`Model` | SmartWeb 和 Spring MVC 的路由注解、参数绑定不同。 |
| 数据访问 | `AkoAccess : JpaAccess`，由 SmartAccess 提供实现 | `AkoJpaRepository : JpaRepository`，由 Spring Data JPA 提供实现；也可自定义 `AkoSpringDatabase` | 两套 ORM/Repository API 不能直接互换。 |
| 查询 | SmartAccess HQL/分页工具 | Jakarta Criteria API + Spring Data Repository | Spring 适配器需要在 Boot 3/4 的 Jakarta 生态中保持可移植。 |
| 事务 | `EntityManager` 手动事务 | `PlatformTransactionManager` + `TransactionTemplate` | 事务管理器的所有权分别属于 SmartAccess 和 Spring。 |
| 软删除 | 依赖 Hibernate Filter 和 QueryRewriter | 对 `SoftDeleteModel` 显式更新 `deleteTime`，查询时加入过滤条件 | 删除语义由底层数据访问实现决定，核心协议不规定软删除。 |

## 共同的模型层

无论选择哪套实现，模型声明仍然使用 `ako-core`/`ako-jpa` 的同一组能力：

- `@DbName`、`@Description`、`@ModelNode`、`@SearchType` 等注解。
- `CompleteModel`、`LongCompleteModel`、UUID 基类。
- `DbModel`、`DbField`、`ModelPageReq` 和 `ModelPageResp`。
- `@Mapping`、`@DbEnum`、时间/大小类型和按钮元数据。

换框架通常不需要重写页面声明；需要替换的是启动、Access/Repository、控制器和数据库配置。

## 适用场景

| 你的项目 | 建议 |
| --- | --- |
| 已经是 Rain 应用，使用 SmartAccess/Hibernate | 选择 `ako-rain`，接入现有扫描和 ClassRegister。 |
| 已经是 Spring Boot + Spring Data JPA | 选择 `ako-spring`，使用 Boot 3/4 模块和 `AkoJpaRepository`。 |
| Spring Boot 2 + `javax.persistence` | 使用 `ako-springboot-2` + `ako-spring-common`，自行提供 `AkoSpringDatabase`；当前不承诺 Spring Data JPA 实现兼容。 |
| 非 JPA 或多数据源 | 使用 `ako-spring-common`，为每个数据实现提供 `AkoSpringDatabase` Bean。 |
| 需要最少的框架改造 | 先保持模型和协议不变，只替换适配器层。 |

Spring Boot 2 与 Boot 3/4 的差异不是 Ako 注解差异，而是 `javax.persistence` 与 `jakarta.persistence` 以及对应 Spring Data 版本线不同。Spring 适配器把公共 Runtime 与 Boot 版本、数据库实现拆开，就是为了避免这些 API 互相泄漏。

## 阅读顺序

1. [项目创建](/backend/rain/project)：选择 Rain 或 Spring，并添加匹配依赖。
2. [开始](/backend/rain/quick-start)：启动应用、配置数据库和挂载协议路由。
3. [实体模型](/backend/rain/models)：声明 Entity、Access/Repository 和字段。
4. [注解功能](/backend/rain/annotations)：查看每个 Ako 注解的前端效果。
5. [前端联动](/backend/rain/frontend)：验证模型元数据如何驱动页面。

数据访问、控制器和工具的深入说明放在 [开始](/backend/rain/quick-start) 页的进一步使用部分；它们也会根据所选框架给出对应代码。

## 版本与实现状态

JVM 根项目当前包含并启用：`ako-core`、`ako-jpa`、`ako-rain`、`ako-spring-common`、`ako-springboot-2`、`ako-springboot-3`、`ako-springboot-4` 和 `ako-springboot-springdata`。根版本当前为 `0.0.15`；Spring Boot 和 Rain 的版本请以各模块构建文件及制品仓库为准。

Ako 协议仍然独立于 JVM。需要实现其他语言或 Web 框架时，阅读 [扩展参考](/extension/overview)。
