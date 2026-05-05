const zhlinkCase = {
  hero: {
    tag: "强社交 · 社区资产外显",
    title: "ZhiLink：弱连接之外的场景补充",
    desc: "个人页主要服务于站内访问场景，用户通过浏览内容与信息，完成对一个人的判断，进而完成连接。 但在线下或更直接、更强的社交场景中（如知乎盐沙龙、年度新知答主等活动），用户没有足够时间通过内容慢慢了解对方，而是需要一种能立刻展示自己的方式。 因此，我尝试做成一个更轻量、可分享的名片工具。",
    goalLabel: "01/目标定义",
    image: {
      src: "/assets/case-study/zhilink-hero-cover-4x-20260505.png?v=20260505-1830",
      alt: "ZhiLink 场景插图"
    },
    summary: [
      "让用户更高效地完成自我表达，促进社交",
      "ZhiLink 的设计核心，是降低个人展示的成本，同时提升分享意愿"
    ],
    coreFlow: {
      label: "02/核心流程",
      title: "围绕“生成—展示—分享”构建精美独特的个人profile"
    }
  },
  infoCards: [
    { title: "目标 1", desc: "可以快速生成" },
    { title: "目标 2", desc: "信息结构清晰" },
    { title: "目标 3", desc: "有意愿分享" }
  ],
  sections: [
    {
      id: "zhilink-generate",
      title: "01、快速生成",
      content: "在传统 profile 制作过程中，用户需要将信息结构化呈现，成本较高，因此尝试利用 AI 降低门槛。围绕效率与可控性平衡，分别探索了“对话式”和“表单式”两种交互路径，最终优先落地更稳定可控的表单式方案。",
      introLines: [
        "在传统 profile 的制作过程中，用户需要将自己的信息结构化呈现，这一步成本极高，因此我尝试利用 AI 来降低成本。但面临一个问题：",
        "AI 的参与度需要控制到什么程度，才能达到效率和可控性的平衡？",
        "于是我尝试了「对话式」&「表单式」两种交互："
      ],
      module: {
        title: "",
        subtitle: "",
        caption: "方案 a：对话式交互",
        images: [
          "/assets/case-study/zhilink-generate-solution-a-01-20260505.png?v=20260505-2022",
          "/assets/case-study/zhilink-generate-solution-a-02-20260505.png?v=20260505-2022"
        ],
        secondaryCaption: "方案 b：表单式交互",
        secondaryImages: ["/assets/case-study/zhilink-generate-solution-b-01-20260505.png?v=20260505-2022"],
        decisionNote: {
          title: "方案决策：方案 b",
          body: "考虑到「对话式交互」会强依赖模型能力，模型不稳定、成本不可控、错误难定位等产品风险，因此需要将 AI 降级为“辅助角色”。",
          summary:
            "而「表单式交互」更符合此次的产品目标：快速、稳定、可信，生成 profile 的场景中，用户更倾向于“可见即所得”的操作。"
        }
      },
      images: ["from figma", "from figma"]
    },
    {
      id: "zhilink-display",
      title: "02、精美展示",
      content: "用户上传内容复杂多样，需要以统一结构呈现来降低理解成本",
      image: "/assets/case-study/zhilink-display-showcase-01-20260505.png?v=20260505-2056",
      images: ["from figma", "from figma"]
    },
    {
      id: "zhilink-share",
      title: "03、乐意分享",
      content: "通过精美名片设计，提升用户分享意愿",
      image: "/assets/case-study/zhilink-share-showcase-01-20260505.png?v=20260505-2117",
      images: ["from figma"]
    }
  ],
  data: [
    { label: "名片生成量", value: "12,594" },
    { label: "浏览UV", value: "3,500" },
    { label: "分享率", value: "50.86%" },
    { label: "转化率", value: "10.76%" }
  ],
  resultSection: {
    label: "03/项目结果",
    title: "用户主动分享，带动外部触达增长",
    cards: [
      { label: "名片生成数量", value: "112,524" },
      { label: "日均访问", value: "3,500 UV" },
      { label: "C4、C5用户生成率", value: "50.98%" },
      { label: "分享率", value: "10.76%（高于目标 8.48%）" }
    ],
    note: {
      lines: [
        "从数据来看，用户不仅完成了个人展示的搭建，还愿意主动进行分享。",
        "这些行为说明：",
        "用户认可这种展示方式",
        "用户愿意传播自己的知乎身份"
      ],
      summary: "本质上，是将知乎创作者带入更多外部场景，扩大触达范围，从而放大连接发生的机会。"
    }
  },
  circleDefinition: {
    label: "01/产品定义",
    title: "圈子本质上是把知乎的社交从“内容维度” 扩展到 “兴趣维度”",
    paragraphs: [
      "原有结构下，用户更多是围绕单个内容去互动（比如看到一个回答，赞同或评论一下，这个关系就结束了，或者再强一点关注这个答主，后续会继续去这个答主的其他内容，这是知乎一个较为完整社交链路。）",
      "但圈子把这个逻辑变成：用户可以围绕一个兴趣持续消费、互动、生产内容（比如进入 AI 圈子之后，会不断看到相关内容、参与讨论，甚至反复回来。）",
      "所以连接不再单依附于某一条内容，而是依附于一个兴趣场。"
    ]
  },
  dataTitle: "用户主动分享，带动外部触达增长",
  conclusion:
    "从数据反馈看，用户不仅完成了个人展示搭建，还愿意主动分享。这说明该表达方式被认可，并能把知乎创作者带入更多外部场景，扩大触达范围并放大连接发生的机会。"
};

module.exports = zhlinkCase;
