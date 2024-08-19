import { defineConfig } from 'vitepress'

export default defineConfig({
    lang: 'zh-CN',
    title: "ATRI-LK版",
    description: "ATRI-LK版的文档",
    base: '/ATRI-LK-docs/',
    head: [
        [
            'link', 
            { rel: 'icon', href: 'atri.png' }
        ]
    ],
    themeConfig: {
        logo: 'atri.png',
        
        search: {
        provider: 'local'
        },

        nav: [
        {
            text: '入门', items: [
                { text: '介绍', link: '/quick_start/introduction.md' },
                { text: '准备工作', link: '/quick_start/preparation.md' },
                { text: '环境初始化', link: '/quick_start/env_setup.md' },
                { text: '启动', link: '/quick_start/run.md' },
                { text: '第一次对话', link: '/quick_start/helloworld.md' },
                { text: 'Q&A', link: '/quick_start/q_a.md' }
            ]
        },
        {
            text: '指南', items: [
                { text: '引导', link: '/guide/index.md' },
                { text: '用户指南', link: '/guide/user.md' },
                { text: '群管理指南', link: '/guide/admin.md' },
                { text: '主人指南', link: '/guide/master.md' },
            ]
        },
        {
            text: '服务合集', items: [
                { text: '引导', link: '/service/index.md' },
                { text: 'lk插件', link: '/service/lkbot.md' },
                { text: 'lk功能', link: '/service/lkfunc.md' },
                { text: 'lk农场', link: '/service/lkfarm.md' },
                { text: 'lk宠物', link: '/service/lkpet.md' },
                { text: '谁是卷王', link: '/service/anti_effort.md' },
                { text: '小程序处理', link: '/service/applet.md' },
                { text: 'b站动态订阅', link: '/service/bilibili_dynamic.md' },
                { text: '在线跑代码', link: '/service/code_runner.md' },
                { text: '基础部件', link: '/service/essential.md' },
                { text: '乐', link: '/service/funny.md' },
                { text: '帮助', link: '/service/help.md' },
                { text: 'kimo', link: '/service/kimo.md' },
                { text: '管理', link: '/service/manage.md' },
                { text: '拍立得', link: '/service/polaroid.md' },
                { text: 'rss', link: '/service/rss.md' },
                { text: 'rss.mikan', link: '/service/rss_mikan.md' },
                { text: 'rss.rsshub', link: '/service/rss_rsshub.md' },
                { text: '以图搜图', link: '/service/saucenao.md' },
                { text: '涩图', link: '/service/setu.md' },
                { text: '词库管理', link: '/service/thesaurus.md' },
                { text: '推特动态订阅', link: '/service/twitter.md' },
                { text: '小工具', link: '/service/util.md' },
                { text: '以图搜番', link: '/service/anime_search.md' },
                { text: '贴贴', link: '/service/auto_tietie.md' },
                { text: '广播', link: '/service/broadcast.md' },
                { text: '反馈', link: '/service/repo.md' },
                { text: '状态', link: '/service/status.md' },
                { text: '每日新闻', link: '/service/dailynews.md' },
                { text: 'coser', link: '/service/coser.md' },
                { text: 'MC服务器', link: '/service/mcserver.md' },
                { text: '组队插件', link: '/service/team.md' },
                { text: 'lk群管', link: '/service/lkbot-admin.md' },
                { text: 'lk主人', link: '/service/lkbot-master.md' },
            ]
        },
        {
            text: '设置', link: '/config.md'
        },
        {
            text: '开发', items: [
                { text: '引导', link: '/develop/index.md'},
                {
                    text: '开发文档', items: [
                        { text: 'ATRI提供的功能', link: '/develop/atri.md'},
                        { text: 'LK插件提供的功能', link: '/develop/lkbot.md'},
                    ]
                },
                {
                    text: '实战教程', items: [
                        { text: 'ATRI插件', link: '/develop/course/plugin.md'},
                        { text: 'LK插件附属', link: '/develop/course/lkplugin.md'},
                    ]
                },
                {
                    text: 'LK插件自定义数据', items: [
                        { text: 'lk农场', link: '/develop/custom/lkfarm.md'},
                    ]
                },
            ]
        },
        {
            text: '贡献', items: [
                { text: '引导', link: '/contribute/index.md' },
                { text: '为文档贡献', link: '/contribute/docs.md' },
                { text: '为 ATRI-LK 贡献', link: '/contribute/project-lk.md' },
                { text: '为 ATRI 贡献', link: '/contribute/project.md' }
            ]
        }
    ],

    sidebar: {
        '/quick_start/': [
            {
                text: '起步',
                items: [
                    { text: '介绍', link: '/quick_start/introduction.md' }
                ]
            },
            {
                text: '开始部署',
                items: [
                    { text: '准备工作', link: '/quick_start/preparation.md' },
                    { text: '环境初始化', link: '/quick_start/env_setup.md' },
                    { text: '启动', link: '/quick_start/run.md' },
                    { text: '第一次对话', link: '/quick_start/helloworld.md' },
                    { text: 'Q&A', link: '/quick_start/q_a.md' }
                ]
            }
        ],
        '/guide/': [
            {
                text: '起步',
                items: [
                    { text: '引导', link: '/guide/index.md' }
                ]
            },
            {
                text: '用户分流',
                items: [
                    { text: '用户指南', link: '/guide/user.md' },
                    { text: '群管理指南', link: '/guide/admin.md' },
                    { text: '主人指南', link: '/guide/master.md' }
                ]
            }
        ],
        '/service/': [
            {
                text: '起步',
                items: [
                    { text: '引导', link: '/service/index.md' }
                ]
            },
            {
                text: '服务合集',
                items: [
                    { text: 'lk插件', link: '/service/lkbot.md' },
                    { text: 'lk功能', link: '/service/lkfunc.md' },
                    { text: 'lk农场', link: '/service/lkfarm.md' },
                    { text: 'lk宠物', link: '/service/lkpet.md' },
                    { text: '谁是卷王', link: '/service/anti_effort.md' },
                    { text: '小程序处理', link: '/service/applet.md' },
                    { text: 'b站动态订阅', link: '/service/bilibili_dynamic.md' },
                    { text: '在线跑代码', link: '/service/code_runner.md' },
                    { text: '基础部件', link: '/service/essential.md' },
                    { text: '乐', link: '/service/funny.md' },
                    { text: '帮助', link: '/service/help.md' },
                    { text: 'kimo', link: '/service/kimo.md' },
                    { text: '管理', link: '/service/manage.md' },
                    { text: '拍立得', link: '/service/polaroid.md' },
                    { text: 'rss', link: '/service/rss.md' },
                    { text: 'rss.mikan', link: '/service/rss_mikan.md' },
                    { text: 'rss.rsshub', link: '/service/rss_rsshub.md' },
                    { text: '以图搜图', link: '/service/saucenao.md' },
                    { text: '涩图', link: '/service/setu.md' },
                    { text: '词库管理', link: '/service/thesaurus.md' },
                    { text: '推特动态订阅', link: '/service/twitter.md' },
                    { text: '小工具', link: '/service/util.md' },
                    { text: '以图搜番', link: '/service/anime_search.md' },
                    { text: '贴贴', link: '/service/auto_tietie.md' },
                    { text: '广播', link: '/service/broadcast.md' },
                    { text: '反馈', link: '/service/repo.md' },
                    { text: '状态', link: '/service/status.md' },
                    { text: '每日新闻', link: '/service/dailynews.md' },
                    { text: 'coser', link: '/service/coser.md' },
                    { text: 'MC服务器', link: '/service/mcserver.md' },
                    { text: '组队插件', link: '/service/team.md' },
                    { text: 'lk群管', link: '/service/lkbot-admin.md' },
                    { text: 'lk主人', link: '/service/lkbot-master.md' },
                ]
            }
        ],
        '/develop/': [
            {
                text: '起步',
                items: [
                { text: '引导', link: '/develop/index.md' }
                ]
            },
            {
                text: '开发文档',
                items: [
                    { text: 'ATRI提供的功能', link: '/develop/atri.md'},
                    { text: 'LK插件提供的功能', link: '/develop/lkbot.md'},
                ]
            },
            {
                text: '实战教程',
                items: [
                    { text: 'ATRI插件', link: '/develop/course/plugin.md'},
                    { text: 'LK插件附属', link: '/develop/course/lkplugin.md'},
                ]
            },
            {
                text: 'LK插件自定义数据', items: [
                    { text: 'lk农场', link: '/develop/custom/lkfarm.md'},
                ]
            },
        ],
        '/contribute/': [
            {
                text: '起步',
                items: [
                { text: '引导', link: '/contribute/index.md' }
                ]
            },
            {
                text: '贡献分流',
                items: [
                    { text: '为文档贡献', link: '/contribute/docs.md' },
                    { text: '为 ATRI-LK 贡献', link: '/contribute/project-lk.md' },
                    { text: '为 ATRI 贡献', link: '/contribute/project.md' }
                ]
            }
        ]
    },

        socialLinks: [
        { icon: 'github', link: 'https://github.com/lokyoh/ATRI-LK' }
        ],

        footer: {
            message: 'Released under the CC-BY-SA-4.0 License.',
            copyright: 'Copyright © 2024-present <a href="https://blog.lokyoh.com" target=_blank>lokyoh</a>'
        }
    }
})
