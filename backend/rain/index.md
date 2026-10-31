---
title: 后端（JVM）
description: 在 JVM 上用 ako-rain 或 ako-spring 搭建 Ako 后端：两者的共同部分、区别和选型建议。
---

# 后端（JVM）

Ako 在 JVM 上有两套实现：`ako-rain` 和 `ako-spring`。它们对接的是同一套前端协议，也共用 `ako-core` 里的模型、注解、元数据和分页结构。区别在于各自依赖的应用框架：启动方式、Web 层、数据访问和事务都跟着宿主框架走。

## 选择实现

本站的 JVM 代码块都可以切换语言（Java/Kotlin）和框架（`ako-rain`/`ako-spring`），选择会在全站同步，并保存在浏览器的 `localStorage` 中。

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
    note: 'Rain 负责启动、扫描和依赖注入；ako-rain 用 SmartWeb 暴露控制器，用 SmartAccess/JPA 访问数据。',
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
    note: 'Java 直接调用 Rain 的启动器；AkoRain 同样由 Rain 模块配置注册。',
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
    note: 'Spring Boot 负责启动、组件扫描和 Bean 生命周期；ako-spring 通过 AkoSpringDatabase 接入 Repository 或自定义的数据实现。',
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
    note: 'Java 用 SpringApplication.run 启动；AkoSpringRuntime 由对应的 Boot 自动配置注册。',
  },
]
</script>

<CodeSwitch :variants="runtimeExamples" />

## 两套实现的对比

| 能力 | `ako-rain` | `ako-spring` | 原因 |
| --- | --- | --- | --- |
| 应用启动 | `FullStackApplicationLauncher` | `SpringApplication` / `runApplication` | 两个框架的应用生命周期和类加载机制不同。 |
| 组件发现 | Rain `ClassRegister` 发现 `AkoAccess` | Spring `ApplicationContext` 发现 `AkoAccess`/Repository Bean | 一个靠 Rain 的注册表，一个靠 Spring 的 Bean 容器。 |
| 运行时 | `AkoRain` | `AkoSpringRuntime` | 运行时要接入宿主框架的依赖注入、事务和模型发现。 |
| 菜单/模型路由 | 实现 `IMenuController`、`IModelController` | 在普通 Spring MVC Controller 中调用 `Menu`、`Model` | SmartWeb 和 Spring MVC 的路由注解、参数绑定不同。 |
| 数据访问 | `AkoAccess : JpaAccess`，由 SmartAccess 生成实现 | `AkoJpaRepository : JpaRepository`，由 Spring Data JPA 生成实现；也可以自定义 `AkoSpringDatabase` | 两套 ORM/Repository API 不能互换。 |
| 查询 | SmartAccess 的 HQL 和分页工具 | Jakarta Criteria API + Spring Data Repository | Spring 适配器要在 Boot 3/4 的 Jakarta 生态里通用。 |
| 事务 | 手动管理 `EntityManager` 事务 | `PlatformTransactionManager` + `TransactionTemplate` | 事务管理器分别归 SmartAccess 和 Spring 管。 |
| 软删除 | Hibernate Filter + QueryRewriter | 对 `SoftDeleteModel` 显式更新 `deleteTime`，查询时追加过滤条件 | 软删除由底层数据访问实现决定，Ako 协议本身不涉及。 |

## 共用的模型层

无论选哪套实现，声明模型用的都是 `ako-core`/`ako-jpa` 里的同一组能力：

- `@DbName`、`@Description`、`@ModelNode`、`@SearchType` 等注解
- `CompleteModel`、`LongCompleteModel` 和 UUID 基类
- `DbModel`、`DbField`、`ModelPageReq` 和 `ModelPageResp`
- `@Mapping`、`@DbEnum`、时间/大小类型和按钮元数据

所以换框架时，页面相关的声明一般不用重写。要换掉的是启动入口、Access/Repository、控制器和数据库配置。

## 怎么选

| 你的项目 | 建议 |
| --- | --- |
| 已经是 Rain 应用，使用 SmartAccess/Hibernate | 选 `ako-rain`，沿用现有的扫描和 ClassRegister。 |
| 已经是 Spring Boot + Spring Data JPA | 选 `ako-spring`，使用 Boot 3/4 模块和 `AkoJpaRepository`。 |
| Spring Boot 2 + `javax.persistence` | 使用 `ako-springboot-2` + `ako-spring-common`，自己提供 `AkoSpringDatabase`；Spring Data JPA 实现不保证兼容。 |
| 不用 JPA，或有多个数据源 | 使用 `ako-spring-common`，为每个数据实现注册一个 `AkoSpringDatabase` Bean。 |
| 希望尽量少改动现有框架 | 模型和协议保持不变，只替换适配器。 |

Spring Boot 2 和 Boot 3/4 的区别不在 Ako 注解上，而在 `javax.persistence` 与 `jakarta.persistence`，以及对应的 Spring Data 版本。Spring 适配器把公共运行时、Boot 版本和数据库实现拆成不同模块，就是为了不让这两套 API 混在一起。

## 阅读顺序

1. [项目创建](/backend/rain/project)：选择 Rain 或 Spring，添加对应依赖。
2. [快速开始](/backend/rain/quick-start)：启动应用、配置数据库、挂载 Ako 路由。
3. [实体模型](/backend/rain/models)：声明实体、Access/Repository 和字段。
4. [注解功能](/backend/rain/annotations)：查看每个 Ako 注解在前端的效果。
5. [前端联动](/backend/rain/frontend)：看模型元数据如何生成页面。

更深入的内容见 [数据访问与事务](/backend/rain/data-access)、[控制器与接口](/backend/rain/controllers) 和 [内置工具](/backend/rain/tools)，这几页同样按所选框架给出代码。

## 版本与实现状态

JVM 根项目包含以下模块：`ako-core`、`ako-jpa`、`ako-rain`、`ako-spring-common`、`ako-springboot-2`、`ako-springboot-3`、`ako-springboot-4` 和 `ako-springboot-springdata`。根版本为 `0.0.17`；Spring Boot 和 Rain 的版本以各模块的构建文件和制品仓库为准。

Ako 协议本身与 JVM 无关。如果要用其他语言或 Web 框架实现，请阅读 [扩展参考](/extension/overview)。
