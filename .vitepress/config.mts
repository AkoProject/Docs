import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'Ako',
  description: 'Ako 业务快速启动框架：由后端声明驱动的前端管理后台。',
  themeConfig: {
    logo: '/ako-mark.svg',
    siteTitle: 'Ako',
    nav: [
      { text: '前端', link: '/frontend/quick-start' },
      { text: '后端（JVM）', link: '/backend/rain/project' },
      { text: '扩展参考', link: '/extension/overview' },
    ],
    sidebar: {
      '/frontend/': [
        {
          text: '前端',
          link: '/frontend/quick-start',
          items: [
            { text: '前端开始方式', link: '/frontend/quick-start' },
            { text: '前端配置', link: '/frontend/configuration' },
            { text: '前端工具', link: '/frontend/tools' },
            { text: '前端参考', link: '/frontend/reference' },
            { text: 'mixin 使用方法', link: '/frontend/mixins' },
            {
              text: '使用 Ako View 构建页面',
              link: '/frontend/views',
              items: [
                { text: '自定义页面与类型', link: '/frontend/customization' },
              ],
            },
          ],
        },
      ],
      '/backend/rain/': [
        {
          text: '后端（JVM）',
          link: '/backend/rain/',
          items: [
            { text: '项目创建', link: '/backend/rain/project' },
            {
              text: '开始',
              link: '/backend/rain/quick-start',
              items: [
                { text: '数据访问与事务', link: '/backend/rain/data-access' },
                { text: '控制器与接口', link: '/backend/rain/controllers' },
                { text: '内置工具', link: '/backend/rain/tools' },
              ],
            },
            { text: '实体模型', link: '/backend/rain/models' },
            { text: '注解功能', link: '/backend/rain/annotations' },
            { text: '前端联动', link: '/backend/rain/frontend' },
          ],
        },
      ],
      '/extension/': [
        {
          text: '扩展参考',
          link: '/extension/overview',
          items: [
            { text: 'Ako 协议', link: '/protocol/overview' },
            { text: '交互规则', link: '/protocol/http-api' },
            {
              text: '模型定义',
              link: '/protocol/metadata',
              items: [
                { text: '字段类型与选项', link: '/protocol/types' },
                { text: '按钮与操作', link: '/protocol/buttons' },
              ],
            },
          ],
        },
      ],
      '/protocol/': [
        {
          text: '扩展参考',
          items: [
            { text: 'Ako 协议', link: '/protocol/overview' },
            { text: '交互规则', link: '/protocol/http-api' },
            {
              text: '模型定义',
              link: '/protocol/metadata',
              items: [
                { text: '字段类型与选项', link: '/protocol/types' },
                { text: '按钮与操作', link: '/protocol/buttons' },
              ],
            },
          ],
        },
      ],
      '/guide/': [
        {
          text: 'Ako 概览',
          items: [
            { text: 'Ako 是什么', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '整体架构', link: '/guide/architecture' },
            { text: '实现状态与边界', link: '/guide/status' },
          ],
        },
      ],
      '/backend/': [
        {
          text: '扩展参考：后端适配器',
          items: [
            { text: '后端实现概览', link: '/backend/overview' },
          ],
        },
      ],
      '/reference/': [
        {
          text: '兼容入口',
          items: [
            { text: '常见问题与限制', link: '/reference/limitations' },
            { text: 'JVM 注解索引', link: '/reference/annotations' },
            { text: '旧版内置工具参考', link: '/reference/built-ins' },
          ],
        },
      ],
    },
    outline: { level: [2, 3] },
    search: { provider: 'local' },
    footer: {
      message: 'Ako 前后端分离，协议先于框架。',
      copyright: 'Copyright © Ako contributors',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/AkoProject/Frontend' },
    ],
  },
})
