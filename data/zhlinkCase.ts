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
  circleFlowSection: {
    label: "02/完整链路",
    title: "圈子并不是一个独立功能，而是一套完整的运转系统",
    desc: "圈子在站内的结构位置："
  },
  circleInnerSection: {
    title: "向内：构建兴趣场",
    content:
      "通过发现—消费—发布闭环，组织连续内容消费，并前置互动与发布入口，降低参与门槛，，并通过头部和运营模块强化“这是一个场”的感知。",
    image: "/assets/case-study/zhihu-circle-inner-loop-showcase-01-20260506.png?v=20260506-0837"
  },
  circleOuterUpSection: {
    title: "向外：承接全站流量 & 向上：反哺内容分发",
    content: "在推荐流、详情页与搜索中外显圈子入口，并通过内容挂载圈子标签建立导流路径，同时接入推荐分发，实现内容回流与曝光放大。",
    image: "/assets/case-study/zhihu-circle-outer-up-showcase-01-20260506.png?v=20260506-0842"
  },
  circleDownSection: {
    title: "向下：沉淀用户关系",
    content: "通过关注流、圈子 Tab 与个人页多入口承接回访路径，强化持续访问与参与，沉淀稳定的兴趣关系。",
    image: "/assets/case-study/zhihu-circle-downstream-showcase-01-20260506.png?v=20260506-0842"
  },
  circleKeyDesignSection: {
    label: "03/关键设计",
    title: "圈子主页：搭建可扩展的双层容器架构",
    desc: "圈子产品强依赖运营介入，且后期需要承载商业增长模块，因此在 0-1 搭建框架时，我将圈子主页拆为「内容层 + 服务层」的双层结构，为未来运营能力做结构预埋",
    image: "/assets/case-study/zhihu-circle-key-design-structure-showcase-01-20260506.png?v=20260506-2258"
  },
  circleKeyDesignVisualSection: {
    title: "构建兴趣场的视觉与氛围",
    content: "以主题色建立场景识别，结合等级体系强化身份与激励机制，提升用户在圈子内的认同感",
    image: "/assets/case-study/07.png?v=20260507-1111"
  },
  circleResultSection: {
    label: "04/取得成果",
    title: "圈子的收益"
  },
  circleResultModules: [
    {
      title: "1. 内容消费：用户浏览深度提升，内容结构支持持续消费",
      gridVariant: "compact",
      cards: [
        { label: "圈友消费消费 uv", value: "10112" },
        { label: "圈友消费人均 cardshow", value: "14.02" },
        { label: "圈友消费次日留存", value: "21.5%" }
      ]
    },
    {
      title: "2. 内容供给：圈子开始承接一定比例的优质内容，内容生产逐步稳定",
      cards: [
        { label: "A2+ 想法占比", value: "9.3%" },
        { label: "发帖用户占比", value: "27.8%" }
      ]
    },
    {
      title: "3. 内容流通：圈子内容逐步进入推荐体系，并开始参与平台内容流通",
      cards: [
        { label: "推荐页，圈子想法曝光 cardshow", value: "稳步增长趋势" },
        { label: "推荐页，圈子想法 CTR", value: "5%" }
      ]
    },
    {
      title: "4. 对大盘的贡献：",
      summary: {
        intro: "圈子在「内容供给」与「用户参与」两个层面均有提升",
        bullets: ["一方面提高了内容供给占比", "另一方面提升了用户活跃与互动率"],
        conclusion: "从而对整体内容消费规模与用户留存形成正向拉动"
      }
    }
  ],
  circleConnectWaysSection: {
    title: "三种方式，让连接发生",
    desc: "知乎的社交不是一次关注按钮的点击，而是在不同方式中逐步建立的过程",
    cards: [
      "个人页\n让人更容易被理解和关注",
      "ZhiLink（数字名片）\n让人轻松表达和传播",
      "圈子\n让用户基于兴趣建立更多连接"
    ]
  },
  dataTitle: "用户主动分享，带动外部触达增长",
  conclusion:
    "从数据反馈看，用户不仅完成了个人展示搭建，还愿意主动分享。这说明该表达方式被认可，并能把知乎创作者带入更多外部场景，扩大触达范围并放大连接发生的机会。"
};

module.exports = zhlinkCase;
