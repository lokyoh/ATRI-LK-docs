import { defineConfig } from 'vitepress'

export default defineConfig({
    lang: 'zh-CN',
    title: "ATRI-LK版",
    description: "ATRI-LK版的文档",
    base: '/ATRI-LK-docs/',
    lastUpdated: true,
    head: [
        [
            'link', 
            { rel: 'icon', href: 'favicon.ico' }
        ],
        [
            'style',
            {},
            `
            .VPNavBarTitle .title {
              display: inline-flex;
              align-items: center;
              gap: 8px;
            }
            .VPNavBarTitle .title::after {
              content: "YHN-LK0-023";
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: 8px;
              line-height: 1.2;
              padding: 2px 6px;
              border-radius: 999px;
              color: var(--vp-c-text-2);
              background: var(--vp-c-bg-soft);
              border: 1px solid var(--vp-c-divider);
              font-weight: 600;
              letter-spacing: 0.06em;
              vertical-align: middle;
              transform: translateY(-1px);
              opacity: 0.9;
            }
            `
        ]
    ],
    themeConfig: {
        logo: 'favicon.ico',
        
        search: {
        provider: 'local'
        },
        
        lastUpdated: {
            text: '最后更新于',
            formatOptions: {
              dateStyle: 'full',
              timeStyle: 'medium'
            }
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
                {
                    text: '起步',
                    items: [
                        { text: '引导', link: '/service/index.md' }
                    ]
                },
                {
                    text: '内置插件服务',
                    items: [
                        { text: '用户', link: '/service/lkbot.md' },
                        { text: '聊天', link: '/service/lkchat.md' },
                        { text: '农场', link: '/service/lkfarm.md' },
                        { text: '宠物', link: '/service/lkpet.md' },
                        { text: '钓鱼', link: '/service/lkfishing.md' },
                        { text: '运势', link: '/service/fortune.md' },
                        { text: '签到', link: '/service/signin.md' },
                        { text: '投喂', link: '/service/feed.md' },
                        { text: '帮助', link: '/service/help.md' },
                        { text: '管理', link: '/service/manage.md' },
                        { text: 'rss', link: '/service/rss.md' },
                        { text: '广播', link: '/service/broadcast.md' },
                        { text: '反馈', link: '/service/repo.md' },
                        { text: '状态', link: '/service/status.md' },
                        { text: '群管', link: '/service/lkbot-admin.md' },
                        { text: '主人', link: '/service/lkbot-master.md' },
                        { text: '更新', link: '/service/update.md' },
                        { text: '重启', link: '/service/restart.md' },
                        { text: '插件商店', link: "/service/plugin_store.md" },
                    ]
                },
                {
                    text: '插件商店服务',
                    items: [
                        { text: '谁是卷王', link: '/service/anti_effort.md' },
                        { text: 'b站动态订阅', link: '/service/bilibili_dynamic.md' },
                        { text: '乐', link: '/service/funny.md' },
                        { text: 'kimo', link: '/service/kimo.md' },
                        { text: '拍立得', link: '/service/polaroid.md' },
                        { text: 'rss.mikan', link: '/service/rss_mikan.md' },
                        { text: 'rss.rsshub', link: '/service/rss_rsshub.md' },
                        { text: '以图搜图', link: '/service/saucenao.md' },
                        { text: '涩图', link: '/service/setu.md' },
                        { text: '词库管理', link: '/service/thesaurus.md' },
                        { text: '小工具', link: '/service/util.md' },
                        { text: '以图搜番', link: '/service/anime_search.md' },
                        { text: '每日新闻', link: '/service/dailynews.md' },
                        { text: 'coser', link: '/service/coser.md' },
                        { text: 'MC服务器', link: '/service/mcserver.md' },
                        { text: '组队插件', link: '/service/team.md' },
                        { text: '钉宫语录', link: '/service/dinggong.md' },
                        { text: '每日发癫', link: '/service/fadian.md' },
                        { text: '舔狗日记', link: '/service/tiangou.md' },
                        { text: '点歌', link: '/service/music.md' },
                    ]
                }
            ]
        },
        {
            text: '设置', link: '/config.md'
        },
        {
            text: '开发', items: [
                { text: '引导', link: '/develop/index.md'},
                {
                    text: 'ATRI提供的功能',
                    items: [
                        { text: 'ATRI核心模块说明', link: '/develop/atri.md' },
                        { text: 'bot模块', link: '/develop/atri/bot.md' },
                        { text: 'configs模块', link: '/develop/atri/configs.md' },
                        { text: 'database模块', link: '/develop/atri/database.md' },
                        { text: 'event模块', link: '/develop/atri/event.md' },
                        { text: 'exceptions模块', link: '/develop/atri/exceptions.md' },
                        { text: 'load模块', link: '/develop/atri/load.md' },
                        { text: 'log模块', link: '/develop/atri/log.md' },
                        { text: 'message模块', link: '/develop/atri/message.md' },
                        { text: 'permission模块', link: '/develop/atri/permission.md' },
                        { text: 'rule模块', link: '/develop/atri/rule.md' },
                        { text: 'scheduler模块', link: '/develop/atri/scheduler.md' },
                        { text: 'service模块', link: '/develop/atri/service.md' },
                        { text: 'utils模块', link: '/develop/atri/utils.md' },
                    ]
                },
                
                {
                    text: 'LK插件提供的功能',
                    items: [
                        { text: 'LK插件提供的功能', link: '/develop/lkbot.md' },
                    ]
                },
                {
                    text: '实战教程', items: [
                        { text: 'ATRI插件', link: '/develop/course/plugin.md'},
                        { text: 'LK插件附属', link: '/develop/course/lkplugin.md'},
                    ]
                },
                {
                    text: '自定义数据', items: [
                        { text: '物品数据及其使用方法注册', link: '/develop/custom/item.md'},
                        { text: '商店数据注册', link: '/develop/custom/shop.md'},
                        { text: '农场插件自定义数据', link: '/develop/custom/lkfarm.md'},
                        { text: '钓鱼插件自定义数据', link: '/develop/custom/lkfishing.md'},
                    ]
                },
            ]
        },
        {
            text: '贡献', items: [
                { text: '引导', link: '/contribute/index.md' },
                { text: '为文档贡献', link: '/contribute/docs.md' },
                { text: '为 ATRI-LK 贡献', link: '/contribute/project-lk.md' },
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
                text: '内置插件服务',
                items: [
                    { text: '用户', link: '/service/lkbot.md' },
                    { text: '聊天', link: '/service/lkchat.md' },
                    { text: '农场', link: '/service/lkfarm.md' },
                    { text: '宠物', link: '/service/lkpet.md' },
                    { text: '钓鱼', link: '/service/lkfishing.md' },
                    { text: '运势', link: '/service/fortune.md' },
                    { text: '签到', link: '/service/signin.md' },
                    { text: '投喂', link: '/service/feed.md' },
                    { text: '帮助', link: '/service/help.md' },
                    { text: '管理', link: '/service/manage.md' },
                    { text: 'rss', link: '/service/rss.md' },
                    { text: '广播', link: '/service/broadcast.md' },
                    { text: '反馈', link: '/service/repo.md' },
                    { text: '状态', link: '/service/status.md' },
                    { text: '群管', link: '/service/lkbot-admin.md' },
                    { text: '主人', link: '/service/lkbot-master.md' },
                    { text: '更新', link: '/service/update.md' },
                    { text: '重启', link: '/service/restart.md' },
                    { text: '插件商店', link: "/service/plugin_store.md" },
                ]
            },
            {
                text: '插件商店服务',
                items: [
                    { text: '谁是卷王', link: '/service/anti_effort.md' },
                    { text: 'b站动态订阅', link: '/service/bilibili_dynamic.md' },
                    { text: '乐', link: '/service/funny.md' },
                    { text: 'kimo', link: '/service/kimo.md' },
                    { text: '拍立得', link: '/service/polaroid.md' },
                    { text: 'rss.mikan', link: '/service/rss_mikan.md' },
                    { text: 'rss.rsshub', link: '/service/rss_rsshub.md' },
                    { text: '以图搜图', link: '/service/saucenao.md' },
                    { text: '涩图', link: '/service/setu.md' },
                    { text: '词库管理', link: '/service/thesaurus.md' },
                    { text: '小工具', link: '/service/util.md' },
                    { text: '以图搜番', link: '/service/anime_search.md' },
                    { text: '每日新闻', link: '/service/dailynews.md' },
                    { text: 'coser', link: '/service/coser.md' },
                    { text: 'MC服务器', link: '/service/mcserver.md' },
                    { text: '组队插件', link: '/service/team.md' },
                    { text: '钉宫语录', link: '/service/dinggong.md' },
                    { text: '每日发癫', link: '/service/fadian.md' },
                    { text: '舔狗日记', link: '/service/tiangou.md' },
                    { text: '点歌', link: '/service/music.md' },
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
                text: 'ATRI提供的功能',
                items: [
                    { text: 'ATRI核心模块说明', link: '/develop/atri.md' },
                    { text: 'bot模块', link: '/develop/atri/bot.md' },
                    { text: 'configs模块', link: '/develop/atri/configs.md' },
                    { text: 'database模块', link: '/develop/atri/database.md' },
                    { text: 'event模块', link: '/develop/atri/event.md' },
                    { text: 'exceptions模块', link: '/develop/atri/exceptions.md' },
                    { text: 'load模块', link: '/develop/atri/load.md' },
                    { text: 'log模块', link: '/develop/atri/log.md' },
                    { text: 'message模块', link: '/develop/atri/message.md' },
                    { text: 'permission模块', link: '/develop/atri/permission.md' },
                    { text: 'rule模块', link: '/develop/atri/rule.md' },
                    { text: 'scheduler模块', link: '/develop/atri/scheduler.md' },
                    { text: 'service模块', link: '/develop/atri/service.md' },
                    { text: 'utils模块', link: '/develop/atri/utils.md' },
                ]
            },
            
            {
                text: 'LK插件提供的功能',
                items: [
                    { text: 'LK插件提供的功能', link: '/develop/lkbot.md' },
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
                text: '自定义数据', items: [
                    { text: '物品数据及其使用方法注册', link: '/develop/custom/item.md'},
                    { text: '商店数据注册', link: '/develop/custom/shop.md'},
                    { text: '农场插件自定义数据', link: '/develop/custom/lkfarm.md'},
                    { text: '钓鱼插件自定义数据', link: '/develop/custom/lkfishing.md'},
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
                    { text: '为 ATRI-LK 贡献', link: '/contribute/project-lk.md' }
                ]
            }
        ]
    },

        socialLinks: [
        { icon: 'github', link: 'https://github.com/lokyoh/ATRI-LK' }
        ],

        footer: {
            message: 'Released under the CC-BY-SA-4.0 License.',
            copyright: 'Copyright © 2026-present <a href="https://blog.lokyoh.com" target=_blank>lokyoh</a>'
        }
    }
})
