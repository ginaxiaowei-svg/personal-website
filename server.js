import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 4321);
const DATA_FILE = path.join(__dirname, "data", "site-content.json");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".mp4": "video/mp4"
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

async function readContent() {
  const file = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(file);
}

async function writeContent(content) {
  await fs.writeFile(DATA_FILE, `${JSON.stringify(content, null, 2)}\n`, "utf8");
}

function validateContent(content) {
  if (!content || typeof content !== "object") {
    return "内容格式必须是对象。";
  }

  if (!content.site || typeof content.site !== "object") {
    return "缺少 site 基础配置。";
  }

  if (!Array.isArray(content.experiences)) {
    return "experiences 必须是数组。";
  }

  if (!Array.isArray(content.socialLinks)) {
    return "socialLinks 必须是数组。";
  }

  if (!Array.isArray(content.works)) {
    return "works 必须是数组。";
  }

  const slugs = new Set();
  for (const work of content.works) {
    if (!work.slug || !work.title) {
      return "每个作品都必须有 slug 和 title。";
    }

    if (slugs.has(work.slug)) {
      return `作品 slug 重复：${work.slug}`;
    }
    slugs.add(work.slug);

    if (!work.caseStudy || !Array.isArray(work.caseStudy.sections)) {
      return `作品 ${work.slug} 缺少 caseStudy.sections。`;
    }
  }

  return null;
}

function send(response, statusCode, contentType, body, method = "GET") {
  response.writeHead(statusCode, { "Content-Type": contentType });
  if (method === "HEAD") {
    response.end();
    return;
  }
  response.end(body);
}

function sendHtml(response, body, statusCode = 200, method = "GET") {
  send(response, statusCode, "text/html; charset=utf-8", body, method);
}

function sendJson(response, payload, statusCode = 200, method = "GET") {
  send(response, statusCode, "application/json; charset=utf-8", `${JSON.stringify(payload)}\n`, method);
}

function redirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) {
      throw new Error("请求体过大。");
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function renderSiteHeader(content, currentPath = "/") {
  const { site } = content;
  const isHome = currentPath === "/";
  const navLinks = [
    { href: "/works", label: site.navWork },
    { href: "/ai-coding", label: site.navAbout },
    { href: "/resume", label: site.navResume }
  ];
  const backIconSvg = `
    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M580.625 271.15625h-331.875l111.09375-111.09375c15.375-15.375 15.375-40.21875 0-55.5-15.375-15.375-40.21875-15.375-55.5 0L130.15625 278.65625c-8.4375 8.4375-12 19.6875-11.25 30.65625-0.84375 10.96875 2.8125 22.21875 11.25 30.65625l174.09375 174.09375c7.6875 7.6875 17.71875 11.53125 27.75 11.53125s20.0625-3.84375 27.75-11.53125c15.375-15.375 15.375-40.21875 0-55.5L250.90625 349.71875h324.75c137.15625 0 252.75 108 255.84375 245.15625 3.1875 140.90625-110.53125 256.59375-250.78125 256.59375h-50.25c-0.5625 0-1.21875-0.09375-1.78125-0.09375H191.65625c-0.65625 0-1.21875 0.09375-1.78125 0.09375-18.75 0.84375-33.9375 14.71875-36.9375 32.8125v12.9375c3 18 18.1875 31.875 36.75 32.8125H574.8125c180.5625 0 331.875-142.875 335.15625-323.34375 3.375-184.40625-145.6875-335.53125-329.34375-335.53125z" fill="currentColor"></path>
    </svg>
  `;
  const brandMarkup = isHome
    ? `
        <span class="brand-name">${escapeHtml(site.name)}</span>
        <span class="brand-role">${escapeHtml(site.role)}</span>
      `
    : `
        <span class="back-icon" aria-hidden="true">${backIconSvg}</span>
        <span class="back-label">主页</span>
      `;

  return `
    <header class="site-header">
      <div class="header-inner">
        <a href="/" class="brand${isHome ? "" : " brand--back"}">${brandMarkup}</a>

        <nav class="site-nav" aria-label="Primary">
          ${navLinks
            .map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`)
            .join("")}
        </nav>
      </div>
    </header>
  `;
}

function renderFooter(content) {
  return `
    <footer class="site-footer reveal">
      <div class="footer-credit">
        <span>${escapeHtml(content.site.footerPrefix)}</span>
        <button class="heart-button" type="button" aria-label="为这个站点点赞">+</button>
        <span>by ${escapeHtml(content.site.footerName)}</span>
      </div>

      <div class="footer-links">
        ${content.socialLinks
          .map(
            (link) =>
              `<a href="${escapeHtml(link.url)}" target="${link.url.startsWith("mailto:") ? "_self" : "_blank"}" rel="noreferrer">${escapeHtml(link.label)}</a>`
          )
          .join("")}
      </div>
    </footer>
  `;
}

function renderCoverMedia(work, options = {}) {
  const {
    className = "",
    loading = "lazy",
    eagerVideo = false
  } = options;
  const mediaSrc = work.coverMedia || work.coverImage;

  if (!mediaSrc) {
    return "";
  }

  const mediaType = work.coverMediaType || (mediaSrc.endsWith(".mp4") ? "video" : "image");

  if (mediaType === "video") {
    return `
      <video
        class="${escapeHtml(`${className} ${className}--video`)}"
        autoplay
        muted
        loop
        playsinline
        preload="${eagerVideo ? "auto" : "metadata"}"
        poster="${escapeHtml(work.coverImage || "")}"
        aria-hidden="true"
      >
        <source src="${escapeHtml(mediaSrc)}" type="video/mp4" />
      </video>
    `;
  }

  const ambientClass = work.coverMediaAnimated ? ` ${className}--ambient` : "";
  return `<img class="${escapeHtml(`${className} ${className}--image${ambientClass}`)}" src="${escapeHtml(mediaSrc)}" alt="${escapeHtml(`${work.title} 封面图`)}" loading="${escapeHtml(loading)}" />`;
}

function renderPublicScript() {
  return `
    <script>
      const cursor = document.querySelector(".cursor-dot");
      const reveals = document.querySelectorAll(".reveal");

      if (cursor && window.matchMedia("(pointer:fine)").matches) {
        window.addEventListener("mousemove", (event) => {
          cursor.style.transform = \`translate(\${event.clientX}px, \${event.clientY}px)\`;
          cursor.style.opacity = "1";
        });

        window.addEventListener("mouseout", () => {
          cursor.style.opacity = "0";
        });
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
            }
          });
        },
        { threshold: 0.12 }
      );

      reveals.forEach((section) => observer.observe(section));
    </script>
  `;
}

const zhihuDetailCase = {
  nav: [
    { href: "#overview", label: "项目概览" },
    { href: "#scope", label: "范围收敛" },
    { href: "#insight", label: "用户洞察" },
    { href: "#strategy-1", label: "策略一" },
    { href: "#interviews", label: "用户访谈" },
    { href: "#metrics", label: "效果总览" },
    { href: "#reflection", label: "项目沉淀" }
  ],
  metrics: [
    {
      value: "+21 %",
      title: "大盘消费增长",
      body: "短容器带动平台整体消费增长"
    },
    {
      value: "67.09 %",
      title: "详情页路径，短容器曝光 UV 渗透",
      body: "超过 2/3 的详情页用户会看到短容器"
    },
    {
      value: "4.5 亿",
      title: "短容器 Cardshow（50% 的流量）",
      body: "短容器成为站内第三大流量场"
    },
    {
      value: "40.96",
      title: "短容器人均 CARDSHOW",
      body: "短容器的用户平均产生 40 次卡片曝光，用户在单个 SESSION 阅读中消费更多内容"
    },
    {
      value: "+4.6%",
      title: "人均总内容互动数",
      body: "赞同、收藏、评论、关注等用户参与互动行为明显增加"
    },
    {
      value: "+14.8%",
      title: "商业广告 Adload",
      body: "每 100 次内容曝光约 15 次商业曝光，在不影响体验的情况下提升商业承载"
    }
  ],
  reflectionCards: [
    {
      tone: "rose",
      title: "一、定义结构问题",
      subtitle: "从分散的用户体验问题中，识别真正的系统性瓶颈",
      body: "用户在筛选与消费间频繁跳转，内容被详情页结构割裂。归因是详情页结构的消费效率问题。"
    },
    {
      tone: "blue",
      title: "二、对齐决策边界",
      subtitle: "推动跨团队共识，明确改版影响范围与决策边界",
      body: "短容器会影响到消费结构、商业曝光、技术架构，需要过多轮专家、技术、商业评审对齐。"
    },
    {
      tone: "green",
      title: "三、降低决策风险",
      subtitle: "通过实验逐步验证关键假设，为团队决策提供可靠证据",
      body: "不把结构改版当成一次性拍板，而是通过实验、小流量和访谈逐步收窄风险。"
    },
    {
      tone: "amber",
      title: "四、推动方案落地",
      subtitle: "推动方案进入产品决策与落地，实现验证到全量闭环",
      body: "结构改版最终同时带来消费增长与商业价值提升，完成从策略到结果的闭环。"
    }
  ]
};

function renderZhihuDetailCasePage(content, work) {
  const navMarkup = zhihuDetailCase.nav
    .map(
      (item, index) => `
        <a href="${escapeHtml(item.href)}" class="zhihu-case-rail-link">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <strong>${escapeHtml(item.label)}</strong>
        </a>
      `
    )
    .join("");

  const metricMarkup = zhihuDetailCase.metrics
    .map(
      (item) => `
        <article class="zhihu-metric-card">
          <strong>${escapeHtml(item.value)}</strong>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `
    )
    .join("");

  const reflectionMarkup = zhihuDetailCase.reflectionCards
    .map(
      (item) => `
        <article class="zhihu-reflection-card zhihu-reflection-card--${escapeHtml(item.tone)}">
          <h3>${escapeHtml(item.title)}</h3>
          <p class="zhihu-reflection-subtitle">${escapeHtml(item.subtitle)}</p>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `
    )
    .join("");

  const body = `
    ${renderSiteHeader(content, `/work/${work.slug}`)}

    <main class="case-shell zhihu-case-shell">
      <aside class="zhihu-case-rail reveal is-visible" aria-label="章节导航">
        ${navMarkup}
      </aside>

      <div class="zhihu-case-main">
        <section class="zhihu-case-hero reveal is-visible" id="overview">
          <div class="zhihu-case-brand" aria-hidden="true">知乎</div>
          <h1 class="zhihu-case-title">知乎问答详情页容器重构</h1>

          <div class="zhihu-case-meta">
            <div>
              <span>我的角色</span>
              <strong>产品设计 Owner</strong>
            </div>
            <div>
              <span>项目时间</span>
              <strong>2022 年 4 月 → 2024 年 6 月 · 26 个月</strong>
            </div>
          </div>

          <div class="zhihu-case-intro">
            <p>
              在此项目中，我担任设计 Owner 的角色，和 2 位产品经理合作，以提升消费深度为目标，
              在用户体验、业务诉求、技术可行性之间反复权衡，探索出一套知乎独有的承载内容消费体系的「容器设计语言」。
            </p>
          </div>
        </section>

        <section class="zhihu-case-section reveal is-visible" id="why">
          <h2>业务愿景（Why）</h2>
          <p class="zhihu-case-kicker">通过「统一、融合」的产品设计手段来达到「降本增效」</p>
          <ul class="zhihu-case-list">
            <li>统一的容器 & 互动（本项目不讲）提升消费效率，降低认知成本。</li>
            <li>减少不同内容形态与规则不一致导致的反复适应，帮助用户更快进入消费状态。</li>
          </ul>
        </section>

        <section class="zhihu-case-section reveal is-visible" id="scope">
          <h2>范围收敛（Scope）</h2>
          <p class="zhihu-case-muted">当前的内容组织形式有 3 种，用户认知成本高（如下图，3 种容器）</p>
          <p class="zhihu-case-kicker">阶段聚焦：先做核心消费容器 A（回答 / 文章 - 长图文内容）</p>
          <ul class="zhihu-case-list">
            <li>回答 / 文章是知乎最核心的消费载体，在消费时长、消费深度、互动量与变现等指标上的贡献最高。</li>
            <li>本轮结构统一优先聚焦回答 / 文章容器，先把核心消费链路跑顺，再逐步扩展到其他形态。</li>
            <li>视频不在业务中心，可以暂不纳入本轮结构统一。</li>
          </ul>

          <figure class="zhihu-figure zhihu-figure--panel">
            <img src="/assets/case-study/40000371-127413.png" alt="知乎现有三种内容容器对比图" loading="lazy" />
          </figure>
        </section>

        <section class="zhihu-case-section reveal is-visible" id="insight">
          <h2>用户行为洞察（Insight）</h2>
          <p class="zhihu-case-kicker">通过数据洞察用户有以下消费行为：</p>
          <ul class="zhihu-case-list">
            <li>用户在详情页有“筛选式消费”，而非全是沉浸式阅读，65% 的用户会在 10 秒内退出详情页，从首页再筛选内容进入详情页。</li>
            <li>用户筛选不到只能无限下滑或退出，49.7% 的用户消费在 10 秒内，且无「下一个按钮」行为。</li>
          </ul>
        </section>

        <section class="zhihu-case-section reveal is-visible">
          <h2>阶段目标（What）</h2>
          <ul class="zhihu-case-list">
            <li>让用户在一个问题下更容易继续筛选更多回答，提升消费深度，多看几条。</li>
          </ul>
        </section>

        <section class="zhihu-case-section reveal is-visible">
          <h2>设计策略（How）</h2>
          <ul class="zhihu-case-list">
            <li>策略 1：首篇回答内增强「还有内容可看」的感知。</li>
            <li>策略 2：其他回答让“筛选 + 阅读”并存，做结构改造。</li>
            <li>策略 3：改造首篇回答，提升短容器曝光。</li>
          </ul>
        </section>

        <section class="zhihu-case-section reveal is-visible" id="strategy-1">
          <h2>设计策略 1：首篇回答内——增强“还有内容可看”的感知</h2>
          <div class="zhihu-scroll-figure">
            <figure class="zhihu-figure zhihu-figure--wide">
              <img src="/assets/case-study/40000371-128588.png" alt="首篇回答内增强内容连续感的多种尝试方案" loading="lazy" />
            </figure>
          </div>
        </section>

        <section class="zhihu-case-section reveal is-visible">
          <div class="zhihu-model-head">
            <h2>交互模型（最终版）</h2>
            <div class="zhihu-tabs" aria-hidden="true">
              <span class="is-active">交互</span>
              <span>UI</span>
            </div>
          </div>
          <ul class="zhihu-case-list">
            <li>正向滚动：进入「短容器」。</li>
            <li>每次点击「下一个」按钮：同层替换，进入「长容器」。</li>
            <li>仅 1 个层级。</li>
          </ul>
          <figure class="zhihu-figure zhihu-figure--panel">
            <img src="/assets/case-study/40000371-132523-flow.png" alt="短容器最终交互模型流程图" loading="lazy" />
          </figure>
        </section>

        <section class="zhihu-decision-card reveal is-visible">
          <header>
            <p>方案决策（非常关键）</p>
            <h2>短容器筛选成立，但消费体验仍然不足</h2>
            <p>交互模型 2 和用户访谈验证后，真正的争议点变成了：短容器应该是筛选容器，还是消费容器？</p>
          </header>

          <div class="zhihu-decision-compare">
            <article>
              <h3>结构化：更适合筛选</h3>
              <p class="zhihu-card-label">特点</p>
              <ul class="zhihu-case-list zhihu-case-list--compact">
                <li>内容摘要</li>
                <li>图片集中</li>
                <li>引导进入详情</li>
              </ul>
              <p class="zhihu-card-label">问题</p>
              <p>无法承接消费。</p>
            </article>

            <article>
              <h3>截断化：更适合筛选 + 消费</h3>
              <p class="zhihu-card-label">特点</p>
              <ul class="zhihu-case-list zhihu-case-list--compact">
                <li>原始内容顺序</li>
                <li>超出容器截断</li>
                <li>可原地展开继续阅读</li>
              </ul>
              <p class="zhihu-card-label">问题</p>
              <p>技术实现复杂且成本巨高。</p>
            </article>
          </div>

          <section class="zhihu-triangle">
            <h3>短容器的 Product Triangle：UX × Biz × Tech</h3>
            <div class="zhihu-triangle-center">短容器内容承载方案</div>
            <div class="zhihu-triangle-pills">
              <span>结构化内容</span>
              <span>VS</span>
              <span>截断式内容</span>
            </div>
            <div class="zhihu-triangle-grid">
              <article>
                <h4>用户体验</h4>
                <p>用户希望在短容器内连续阅读内容，减少跳转详情页。</p>
              </article>
              <article>
                <h4>业务目标</h4>
                <p>提升内容消费深度，减少无效退出，实现「筛选 + 消费」并存。</p>
              </article>
              <article>
                <h4>技术约束</h4>
                <p>当前富文本以 Hybrid 渲染为主，Native 承载完整消费存在技术成本，需考虑架构升级。</p>
              </article>
            </div>
          </section>

          <p class="zhihu-decision-note">我整理了用户研究、业务目标与技术约束等信息，为方案选择提供决策支持。</p>

          <div class="zhihu-experiment">
            <article>
              <h3>小流量实验：验证命题</h3>
              <ul class="zhihu-case-list zhihu-case-list--compact">
                <li>短容器（截断化方案）内容呈现，能否承接更多阅读行为，实现真正的筛选 + 阅读的内容消费场。</li>
              </ul>
            </article>
            <article>
              <h3>验证指标</h3>
              <ul class="zhihu-case-list zhihu-case-list--compact">
                <li>用户对当前方案的反馈和接受度</li>
                <li>短容器的渗透率</li>
                <li>大盘消费时长（平稳 or 提升）</li>
                <li>首篇回答的消费时长（平稳 or 提升）</li>
              </ul>
            </article>
          </div>

          <div class="zhihu-next-step">
            <h3>结论与下一步</h3>
            <p class="zhihu-card-label">数据反馈</p>
            <p>待补充</p>
            <ol>
              <li>改造首篇回答（短回答），提升首屏的利用率，增加短容器的曝光。</li>
              <li>将想法详情页能力整合进短容器，最终实现统一消费结构。</li>
            </ol>
          </div>
        </section>

        <section class="zhihu-case-section reveal is-visible" id="interviews">
          <div class="zhihu-interview-card">
            <header>
              <h2>用户访谈</h2>
              <p>
                我主导了 10 位高频用户的结构化访谈，通过行为回溯、对比追问和情绪归因，
                定位短容器改版中的真实痛点，并为后续方案迭代提供决策依据。
              </p>
            </header>

            <section class="zhihu-voices">
              <h3>用户原声</h3>
              <div class="zhihu-voice-panel">
                <p class="zhihu-voice-title">方向没错：短容器确实提升了筛选效率</p>
                <div class="zhihu-voice-bubble">更方便找感兴趣的回答，不需要再点进去，能更节省时间。</div>
                <div class="zhihu-voice-bubble zhihu-voice-bubble--right">提高了筛选效率，还比较方便。</div>
                <div class="zhihu-voice-bubble">可以快速看出回答是否专业的，还是故意“玩梗”，可以瞬间过滤掉。</div>
                <p class="zhihu-voice-title zhihu-voice-title--secondary">核心问题：卡片能筛选，但不能顺滑承接消费</p>
                <div class="zhihu-voice-bubble">为什么下一条不是直接显示了，而是只能看到一部分，要看下一条还要重新点进去，看着好难受好出戏。</div>
                <div class="zhihu-voice-bubble zhihu-voice-bubble--right">进入 1.5 层，下拉退出时，回到大卡，此动作本身会超出认知预期……认为应该直接到下一个。</div>
                <div class="zhihu-voice-bubble">在短容器上一刷刷到很多回答，个人就会对这个问答不再感兴趣。</div>
              </div>
            </section>

            <section class="zhihu-interview-summary">
              <h3>访谈结论</h3>
              <div class="zhihu-insight-grid">
                <article>
                  <h4>筛选成立，但消费被打断</h4>
                  <p>用户认可短容器提升筛选效率，但不接受消费完后退回卡片列表。</p>
                </article>
                <article>
                  <h4>路径不符合旧习惯</h4>
                  <p>下拉、返回、问题页进入后的层级关系，与原有消费习惯冲突。</p>
                </article>
                <article>
                  <h4>知乎感被削弱</h4>
                  <p>非正文元素变多，信息密度下降，专业感变弱。</p>
                </article>
              </div>
            </section>

            <section class="zhihu-interview-decisions">
              <h3>对决策的作用</h3>
              <div class="zhihu-decision-stack">
                <article>
                  <h4>确认方向成立</h4>
                  <p>短容器的筛选价值是成立的，用户会用它快速判断内容值不值得看。</p>
                </article>
                <article>
                  <h4>确认核心问题</h4>
                  <p>问题不在“要不要做卡片”，而在“卡片之后怎么继续消费”——能筛选，但消费不顺，路径不符合旧习惯。</p>
                </article>
                <article>
                  <h4>推动下一步决策</h4>
                  <p>不再继续打磨细节，转向提升原地消费能力，并推进图文混排，减少跳转，恢复沉浸感。</p>
                </article>
              </div>
            </section>
          </div>
        </section>

        <section class="zhihu-case-section reveal is-visible">
          <h2>设计策略 3：改造首篇回答，提升短容器曝光</h2>
          <figure class="zhihu-figure zhihu-figure--panel">
            <img src="/assets/case-study/40000371-132867.png" alt="改造首篇回答前后的对比示意图" loading="lazy" />
          </figure>
        </section>

        <section class="zhihu-case-section reveal is-visible">
          <h2>目标达成：容器最终统一</h2>
          <figure class="zhihu-figure zhihu-figure--panel">
            <img src="/assets/case-study/40000371-133580.png" alt="短容器统一后的想法详情页、回答详情页与文章详情页效果图" loading="lazy" />
          </figure>
        </section>

        <section class="zhihu-case-section reveal is-visible" id="metrics">
          <h2>数据墙-效果总览</h2>
          <p class="zhihu-case-kicker">短容器上线后，消费、互动、商业化指标全面增长，核心底盘保持稳定。</p>
          <div class="zhihu-metric-grid">
            ${metricMarkup}
          </div>
        </section>

        <section class="zhihu-case-section reveal is-visible" id="reflection">
          <h2>项目沉淀：复杂项目改版中的设计决策路径</h2>
          <div class="zhihu-reflection-grid">
            ${reflectionMarkup}
          </div>
        </section>

        <section class="zhihu-case-closing reveal is-visible">
          <p>在复杂产品改版中，设计师不仅是提出方案，还要通过共识构建与阶段验证，推动组织完成关键决策。</p>
        </section>
      </div>
    </main>

    ${renderFooter(content)}
  `;

  return renderLayout({
    title: `${work.title} | Case Study`,
    description: "知乎问答详情页容器重构，围绕筛选与消费并存的结构改版案例。",
    bodyClass: "case-study-page case-study-page--zhihu",
    content,
    body,
    script: renderPublicScript()
  });
}

function renderLayout({ title, description, bodyClass = "", content, body, script = "" }) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body class="${escapeHtml(bodyClass)}">
    ${content ? '<div class="cursor-dot" aria-hidden="true"></div>' : ""}
    ${body}
    ${script}
  </body>
</html>`;
}

function renderHomePage(content) {
  const body = `
    ${renderSiteHeader(content, "/")}

    <main id="top" class="page-shell">
      <section class="intro-grid">
        <div class="hero-copy reveal">
          <p class="eyebrow">${escapeHtml(content.site.heroEyebrow)}</p>
          <h1>
            ${escapeHtml(content.site.heroPrefix)}
            <span>${escapeHtml(content.site.heroHighlight)}</span>
          </h1>
          <p class="hero-lead">${escapeHtml(content.site.heroLead)}</p>
        </div>

        <aside class="experience-panel reveal" id="resume" aria-label="履历">
          ${content.experiences
            .map(
              (item) => `
                <div class="experience-row">
                  <p class="year">${escapeHtml(item.year)}</p>
                  <div>
                    <a href="${escapeHtml(item.url || "/#work")}" class="company">${escapeHtml(item.company)}</a>
                    <p class="role">${escapeHtml(item.role)}</p>
                  </div>
                </div>
              `
            )
            .join("")}
        </aside>
      </section>

      <section class="projects-section reveal" id="work">
        <div class="section-heading">
          <p>${escapeHtml(content.site.workSectionLabel)}</p>
        </div>
        <div class="project-grid">
          ${content.works
            .map(
              (work) => `
                <a class="project-card" href="/work/${escapeHtml(work.slug)}">
                  <div class="project-thumb ${escapeHtml(work.tone)} ${escapeHtml(work.ratio)}${work.coverImage ? " project-thumb--image" : ""}">
                    ${renderCoverMedia(work, { className: "project-thumb-media", loading: "lazy" })}
                    <span>${escapeHtml(work.badge || "案例占位")}</span>
                  </div>
                  <div class="project-meta">
                    <h2>${escapeHtml(work.title)}</h2>
                    <p>${escapeHtml(work.cardMeta)}</p>
                  </div>
                </a>
              `
            )
            .join("")}
        </div>
      </section>

    </main>

    ${renderFooter(content)}
  `;

  return renderLayout({
    title: content.site.browserTitle,
    description: content.site.metaDescription,
    content,
    body,
    script: renderPublicScript()
  });
}

function renderWorksPage(content) {
  const body = `
    ${renderSiteHeader(content, "/works")}

    <main class="page-shell">
      <section class="projects-section reveal is-visible">
        <div class="section-heading">
          <p>${escapeHtml(content.site.workSectionLabel)}</p>
        </div>
        <div class="project-grid">
          ${content.works
            .map(
              (work) => `
                <a class="project-card" href="/work/${escapeHtml(work.slug)}">
                  <div class="project-thumb ${escapeHtml(work.tone)} ${escapeHtml(work.ratio)}${work.coverImage ? " project-thumb--image" : ""}">
                    ${renderCoverMedia(work, { className: "project-thumb-media", loading: "lazy" })}
                    <span>${escapeHtml(work.badge || "案例占位")}</span>
                  </div>
                  <div class="project-meta">
                    <h2>${escapeHtml(work.title)}</h2>
                    <p>${escapeHtml(work.cardMeta)}</p>
                  </div>
                </a>
              `
            )
            .join("")}
        </div>
      </section>
    </main>

    ${renderFooter(content)}
  `;

  return renderLayout({
    title: `${content.site.navWork} | ${content.site.name}`,
    description: content.site.metaDescription,
    content,
    body,
    script: renderPublicScript()
  });
}

function renderAiCodingPage(content) {
  const body = `
    ${renderSiteHeader(content, "/ai-coding")}

    <main class="case-shell">
      <section class="case-hero reveal is-visible">
        <p class="eyebrow">AI coding</p>
        <h1 class="case-title">AI coding</h1>
        <p class="case-lead">${escapeHtml(content.site.playBody)}</p>
      </section>
    </main>

    ${renderFooter(content)}
  `;

  return renderLayout({
    title: `${content.site.navAbout} | ${content.site.name}`,
    description: content.site.playBody,
    bodyClass: "case-study-page",
    content,
    body,
    script: renderPublicScript()
  });
}

function renderResumePage(content) {
  const body = `
    ${renderSiteHeader(content, "/resume")}

    <main class="case-shell">
      <section class="case-hero reveal is-visible">
        <p class="eyebrow">${escapeHtml(content.site.navResume)}</p>
        <h1 class="case-title">${escapeHtml(content.site.navResume)}</h1>
      </section>

      <section class="case-content reveal is-visible">
        ${content.experiences
          .map(
            (item) => `
              <article class="case-block">
                <p class="case-label">${escapeHtml(item.year)}</p>
                <h2>${escapeHtml(item.company)}</h2>
                <p>${escapeHtml(item.role)}</p>
              </article>
            `
          )
          .join("")}
      </section>
    </main>

    ${renderFooter(content)}
  `;

  return renderLayout({
    title: `${content.site.navResume} | ${content.site.name}`,
    description: content.site.metaDescription,
    bodyClass: "case-study-page",
    content,
    body,
    script: renderPublicScript()
  });
}

function renderWorkPage(content, work) {
  if (work.slug === "zhihu-detail-container-rebuild") {
    return renderZhihuDetailCasePage(content, work);
  }

  const body = `
    ${renderSiteHeader(content, `/work/${work.slug}`)}

    <main class="case-shell">
      <section class="case-hero reveal is-visible">
        <p class="eyebrow">${escapeHtml(work.caseStudy.eyebrow)}</p>
        <h1 class="case-title">${escapeHtml(work.title)}</h1>
        <p class="case-lead">${escapeHtml(work.caseStudy.lead)}</p>
        <div class="case-meta">
          <div>
            <span>项目类型</span>
            <strong>${escapeHtml(work.caseStudy.type)}</strong>
          </div>
          <div>
            <span>项目时间</span>
            <strong>${escapeHtml(work.caseStudy.year)}</strong>
          </div>
          <div>
            <span>我的角色</span>
            <strong>${escapeHtml(work.caseStudy.role)}</strong>
          </div>
        </div>
      </section>

      <section class="case-cover ${escapeHtml(work.tone)}${work.coverImage ? " case-cover--image" : ""} reveal is-visible">
        ${
          work.coverImage
            ? `
              <div class="case-cover-media">
                ${renderCoverMedia(work, { className: "case-cover-media-visual", loading: "eager", eagerVideo: true })}
              </div>
            `
            : ""
        }
        <span>${escapeHtml(work.caseStudy.coverLabel || "封面占位图")}</span>
      </section>

      <section class="case-content reveal is-visible">
        ${work.caseStudy.sections
          .map(
            (section) => `
              <article class="case-block">
                <p class="case-label">${escapeHtml(section.label)}</p>
                <h2>${escapeHtml(section.title)}</h2>
                <p>${escapeHtml(section.body)}</p>
              </article>
            `
          )
          .join("")}
      </section>
    </main>

    ${renderFooter(content)}
  `;

  return renderLayout({
    title: `${work.title} | Case Study`,
    description: work.caseStudy.lead,
    bodyClass: "case-study-page",
    content,
    body,
    script: renderPublicScript()
  });
}

function renderAdminPage(content) {
  const initialContent = safeJson(content);
  const body = `
    ${renderSiteHeader(content, "/admin")}

    <main class="admin-shell">
      <section class="admin-intro">
        <p class="eyebrow">Local CMS</p>
        <h1 class="admin-title">简单后台</h1>
        <p class="admin-lead">
          这里维护首页和所有 case study 内容。保存后会直接写入 <code>data/site-content.json</code>，
          前台页面会立即读取最新内容。
        </p>
      </section>

      <div class="admin-actions">
        <button class="admin-primary" id="saveContent" type="button">保存全部内容</button>
        <button class="admin-secondary" id="reloadContent" type="button">重新载入</button>
        <a class="admin-link" href="/" target="_blank" rel="noreferrer">打开前台网站</a>
        <span id="saveStatus" class="admin-status" aria-live="polite"></span>
      </div>

      <section class="admin-section">
        <div class="admin-section-head">
          <h2>基础信息</h2>
          <p>维护首页最常用的标题、简介和页脚信息。</p>
        </div>
        <div class="admin-grid admin-grid--two">
          <label class="admin-field">
            <span>浏览器标题</span>
            <input id="site-browserTitle" type="text" />
          </label>
          <label class="admin-field">
            <span>Meta 描述</span>
            <textarea id="site-metaDescription" rows="3"></textarea>
          </label>
          <label class="admin-field">
            <span>姓名</span>
            <input id="site-name" type="text" />
          </label>
          <label class="admin-field">
            <span>身份标题</span>
            <input id="site-role" type="text" />
          </label>
          <label class="admin-field">
            <span>首屏眉标题</span>
            <input id="site-heroEyebrow" type="text" />
          </label>
          <label class="admin-field">
            <span>首屏主句前半句</span>
            <input id="site-heroPrefix" type="text" />
          </label>
          <label class="admin-field">
            <span>首屏高亮句</span>
            <input id="site-heroHighlight" type="text" />
          </label>
          <label class="admin-field admin-field--full">
            <span>首屏导语</span>
            <textarea id="site-heroLead" rows="4"></textarea>
          </label>
          <label class="admin-field">
            <span>作品区标题</span>
            <input id="site-workSectionLabel" type="text" />
          </label>
          <label class="admin-field">
            <span>实验区标签</span>
            <input id="site-playLabel" type="text" />
          </label>
          <label class="admin-field">
            <span>实验区标题</span>
            <input id="site-playTitle" type="text" />
          </label>
          <label class="admin-field admin-field--full">
            <span>实验区正文</span>
            <textarea id="site-playBody" rows="3"></textarea>
          </label>
          <label class="admin-field">
            <span>关于区标签</span>
            <input id="site-aboutLabel" type="text" />
          </label>
          <label class="admin-field">
            <span>关于区标题</span>
            <input id="site-aboutTitle" type="text" />
          </label>
          <label class="admin-field admin-field--full">
            <span>关于区正文</span>
            <textarea id="site-aboutBody" rows="3"></textarea>
          </label>
          <label class="admin-field">
            <span>页脚前缀</span>
            <input id="site-footerPrefix" type="text" />
          </label>
          <label class="admin-field">
            <span>页脚署名</span>
            <input id="site-footerName" type="text" />
          </label>
        </div>
      </section>

      <section class="admin-section">
        <div class="admin-section-head">
          <h2>履历</h2>
          <p>首页右侧时间线。</p>
        </div>
        <div id="experiencesList" class="admin-stack"></div>
        <button class="admin-secondary" id="addExperience" type="button">新增履历</button>
      </section>

      <section class="admin-section">
        <div class="admin-section-head">
          <h2>社交链接</h2>
          <p>页脚链接会按这里的顺序渲染。</p>
        </div>
        <div id="socialLinksList" class="admin-stack"></div>
        <button class="admin-secondary" id="addSocialLink" type="button">新增链接</button>
      </section>

      <section class="admin-section">
        <div class="admin-section-head">
          <h2>作品与案例页</h2>
          <p>这里维护作品卡片以及对应 case study 的完整内容。</p>
        </div>
        <div id="worksList" class="admin-stack"></div>
        <button class="admin-secondary" id="addWork" type="button">新增作品</button>
      </section>
    </main>

    <script>
      const initialContent = ${initialContent};
      const toneOptions = ["tone-01", "tone-02", "tone-03", "tone-04", "tone-05", "tone-06", "tone-07", "tone-08"];
      const ratioOptions = ["ratio-wide", "ratio-portrait"];
      let currentContent = structuredClone(initialContent);

      const siteFields = [
        "browserTitle",
        "metaDescription",
        "name",
        "role",
        "heroEyebrow",
        "heroPrefix",
        "heroHighlight",
        "heroLead",
        "workSectionLabel",
        "playLabel",
        "playTitle",
        "playBody",
        "aboutLabel",
        "aboutTitle",
        "aboutBody",
        "footerPrefix",
        "footerName"
      ];

      function escapeHtml(value = "") {
        return String(value).replace(/[&<>"']/g, (char) => {
          switch (char) {
            case "&":
              return "&amp;";
            case "<":
              return "&lt;";
            case ">":
              return "&gt;";
            case '"':
              return "&quot;";
            case "'":
              return "&#39;";
            default:
              return char;
          }
        });
      }

      function setStatus(text, kind = "") {
        const status = document.getElementById("saveStatus");
        status.textContent = text;
        status.dataset.kind = kind;
      }

      function fillSiteFields() {
        siteFields.forEach((field) => {
          const input = document.getElementById(\`site-\${field}\`);
          if (input) {
            input.value = currentContent.site[field] ?? "";
          }
        });
      }

      function renderExperiences() {
        const container = document.getElementById("experiencesList");
        container.innerHTML = currentContent.experiences
          .map(
            (item, index) => \`
              <article class="admin-card" data-exp-item="\${index}">
                <div class="admin-card-head">
                  <h3>履历 \${index + 1}</h3>
                  <button class="admin-remove" type="button" data-remove-exp="\${index}">删除</button>
                </div>
                <div class="admin-grid admin-grid--three">
                  <label class="admin-field"><span>年份</span><input data-exp-field="year" value="\${escapeHtml(item.year)}" /></label>
                  <label class="admin-field"><span>公司 / 项目</span><input data-exp-field="company" value="\${escapeHtml(item.company)}" /></label>
                  <label class="admin-field"><span>角色</span><input data-exp-field="role" value="\${escapeHtml(item.role)}" /></label>
                  <label class="admin-field admin-field--full"><span>链接</span><input data-exp-field="url" value="\${escapeHtml(item.url || "")}" /></label>
                </div>
              </article>
            \`
          )
          .join("");
      }

      function renderSocialLinks() {
        const container = document.getElementById("socialLinksList");
        container.innerHTML = currentContent.socialLinks
          .map(
            (item, index) => \`
              <article class="admin-card" data-social-item="\${index}">
                <div class="admin-card-head">
                  <h3>链接 \${index + 1}</h3>
                  <button class="admin-remove" type="button" data-remove-social="\${index}">删除</button>
                </div>
                <div class="admin-grid admin-grid--two">
                  <label class="admin-field"><span>文案</span><input data-social-field="label" value="\${escapeHtml(item.label)}" /></label>
                  <label class="admin-field"><span>URL</span><input data-social-field="url" value="\${escapeHtml(item.url)}" /></label>
                </div>
              </article>
            \`
          )
          .join("");
      }

      function renderWorkSections(sections, workIndex) {
        return sections
          .map(
            (section, sectionIndex) => \`
              <article class="admin-nested-card" data-section-item="\${sectionIndex}">
                <div class="admin-card-head">
                  <h4>章节 \${sectionIndex + 1}</h4>
                  <button class="admin-remove" type="button" data-remove-section="\${workIndex}:\${sectionIndex}">删除章节</button>
                </div>
                <div class="admin-grid admin-grid--two">
                  <label class="admin-field"><span>标签</span><input data-section-field="label" value="\${escapeHtml(section.label)}" /></label>
                  <label class="admin-field"><span>标题</span><input data-section-field="title" value="\${escapeHtml(section.title)}" /></label>
                  <label class="admin-field admin-field--full"><span>正文</span><textarea rows="3" data-section-field="body">\${escapeHtml(section.body)}</textarea></label>
                </div>
              </article>
            \`
          )
          .join("");
      }

      function renderWorks() {
        const container = document.getElementById("worksList");
        container.innerHTML = currentContent.works
          .map(
            (work, index) => \`
              <article class="admin-card admin-card--work" data-work-item="\${index}">
                <div class="admin-card-head">
                  <h3>作品 \${index + 1}</h3>
                  <button class="admin-remove" type="button" data-remove-work="\${index}">删除作品</button>
                </div>
                <div class="admin-grid admin-grid--three">
                  <label class="admin-field"><span>Slug</span><input data-work-field="slug" value="\${escapeHtml(work.slug)}" /></label>
                  <label class="admin-field"><span>作品标题</span><input data-work-field="title" value="\${escapeHtml(work.title)}" /></label>
                  <label class="admin-field"><span>卡片说明</span><input data-work-field="cardMeta" value="\${escapeHtml(work.cardMeta)}" /></label>
                  <label class="admin-field"><span>卡片角标</span><input data-work-field="badge" value="\${escapeHtml(work.badge || "")}" /></label>
                  <label class="admin-field"><span>封面图片</span><input data-work-field="coverImage" value="\${escapeHtml(work.coverImage || "")}" /></label>
                  <label class="admin-field"><span>动态封面</span><input data-work-field="coverMedia" value="\${escapeHtml(work.coverMedia || "")}" /></label>
                  <label class="admin-field"><span>动态类型</span>
                    <select data-work-field="coverMediaType">
                      \${["video", "image"].map((type) => \`<option value="\${type}" \${(work.coverMediaType || "image") === type ? "selected" : ""}>\${type}</option>\`).join("")}
                    </select>
                  </label>
                  <label class="admin-field"><span>静图动效</span>
                    <select data-work-field="coverMediaAnimated">
                      \${["true", "false"].map((value) => \`<option value="\${value}" \${String(Boolean(work.coverMediaAnimated)) === value ? "selected" : ""}>\${value}</option>\`).join("")}
                    </select>
                  </label>
                  <label class="admin-field"><span>色板</span>
                    <select data-work-field="tone">
                      \${toneOptions.map((tone) => \`<option value="\${tone}" \${tone === work.tone ? "selected" : ""}>\${tone}</option>\`).join("")}
                    </select>
                  </label>
                  <label class="admin-field"><span>比例</span>
                    <select data-work-field="ratio">
                      \${ratioOptions.map((ratio) => \`<option value="\${ratio}" \${ratio === work.ratio ? "selected" : ""}>\${ratio}</option>\`).join("")}
                    </select>
                  </label>
                  <label class="admin-field admin-field--full"><span>案例页导语</span><textarea rows="3" data-case-field="lead">\${escapeHtml(work.caseStudy.lead)}</textarea></label>
                  <label class="admin-field"><span>案例页眉标题</span><input data-case-field="eyebrow" value="\${escapeHtml(work.caseStudy.eyebrow)}" /></label>
                  <label class="admin-field"><span>项目类型</span><input data-case-field="type" value="\${escapeHtml(work.caseStudy.type)}" /></label>
                  <label class="admin-field"><span>项目时间</span><input data-case-field="year" value="\${escapeHtml(work.caseStudy.year)}" /></label>
                  <label class="admin-field"><span>我的角色</span><input data-case-field="role" value="\${escapeHtml(work.caseStudy.role)}" /></label>
                  <label class="admin-field"><span>封面文案</span><input data-case-field="coverLabel" value="\${escapeHtml(work.caseStudy.coverLabel || "")}" /></label>
                </div>
                <div class="admin-subsection">
                  <div class="admin-card-head">
                    <h4>章节内容</h4>
                    <button class="admin-secondary" type="button" data-add-section="\${index}">新增章节</button>
                  </div>
                  <div class="admin-stack">
                    \${renderWorkSections(work.caseStudy.sections, index)}
                  </div>
                </div>
              </article>
            \`
          )
          .join("");
      }

      function renderAll() {
        fillSiteFields();
        renderExperiences();
        renderSocialLinks();
        renderWorks();
      }

      function collectSiteData() {
        const site = { ...currentContent.site };
        siteFields.forEach((field) => {
          const input = document.getElementById(\`site-\${field}\`);
          site[field] = input ? input.value.trim() : "";
        });
        return site;
      }

      function collectExperiences() {
        return [...document.querySelectorAll("[data-exp-item]")].map((card) => ({
          year: card.querySelector('[data-exp-field="year"]').value.trim(),
          company: card.querySelector('[data-exp-field="company"]').value.trim(),
          role: card.querySelector('[data-exp-field="role"]').value.trim(),
          url: card.querySelector('[data-exp-field="url"]').value.trim() || "/#work"
        }));
      }

      function collectSocialLinks() {
        return [...document.querySelectorAll("[data-social-item]")].map((card) => ({
          label: card.querySelector('[data-social-field="label"]').value.trim(),
          url: card.querySelector('[data-social-field="url"]').value.trim()
        }));
      }

      function collectWorks() {
        return [...document.querySelectorAll("[data-work-item]")].map((card) => {
          const sections = [...card.querySelectorAll("[data-section-item]")].map((section) => ({
            label: section.querySelector('[data-section-field="label"]').value.trim(),
            title: section.querySelector('[data-section-field="title"]').value.trim(),
            body: section.querySelector('[data-section-field="body"]').value.trim()
          }));

          return {
            slug: card.querySelector('[data-work-field="slug"]').value.trim(),
            title: card.querySelector('[data-work-field="title"]').value.trim(),
            cardMeta: card.querySelector('[data-work-field="cardMeta"]').value.trim(),
            badge: card.querySelector('[data-work-field="badge"]').value.trim(),
            coverImage: card.querySelector('[data-work-field="coverImage"]').value.trim(),
            coverMedia: card.querySelector('[data-work-field="coverMedia"]').value.trim(),
            coverMediaType: card.querySelector('[data-work-field="coverMediaType"]').value.trim(),
            coverMediaAnimated: card.querySelector('[data-work-field="coverMediaAnimated"]').value.trim() === "true",
            tone: card.querySelector('[data-work-field="tone"]').value.trim(),
            ratio: card.querySelector('[data-work-field="ratio"]').value.trim(),
            caseStudy: {
              eyebrow: card.querySelector('[data-case-field="eyebrow"]').value.trim(),
              lead: card.querySelector('[data-case-field="lead"]').value.trim(),
              type: card.querySelector('[data-case-field="type"]').value.trim(),
              year: card.querySelector('[data-case-field="year"]').value.trim(),
              role: card.querySelector('[data-case-field="role"]').value.trim(),
              coverLabel: card.querySelector('[data-case-field="coverLabel"]').value.trim(),
              sections
            }
          };
        });
      }

      function collectAll() {
        return {
          site: collectSiteData(),
          experiences: collectExperiences(),
          socialLinks: collectSocialLinks(),
          works: collectWorks()
        };
      }

      async function reloadContent() {
        setStatus("正在重新载入...");
        const response = await fetch("/api/content");
        if (!response.ok) {
          setStatus("重新载入失败。", "error");
          return;
        }
        currentContent = await response.json();
        renderAll();
        setStatus("已载入最新内容。", "success");
      }

      async function saveContent() {
        setStatus("正在保存...");
        const payload = collectAll();
        const response = await fetch("/api/content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) {
          setStatus(result.error || "保存失败。", "error");
          return;
        }

        currentContent = payload;
        renderAll();
        setStatus("保存成功，前台已使用最新内容。", "success");
      }

      document.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        if (target.id === "addExperience") {
          currentContent.experiences.push({ year: "", company: "", role: "", url: "/#work" });
          renderExperiences();
          return;
        }

        if (target.id === "addSocialLink") {
          currentContent.socialLinks.push({ label: "", url: "" });
          renderSocialLinks();
          return;
        }

        if (target.id === "addWork") {
          currentContent.works.push({
            slug: "new-work",
            title: "新的作品",
            cardMeta: "作品说明",
            badge: "案例占位",
            coverImage: "",
            coverMedia: "",
            coverMediaType: "image",
            coverMediaAnimated: false,
            tone: "tone-01",
            ratio: "ratio-wide",
            caseStudy: {
              eyebrow: "Case Study / 占位页",
              lead: "请补充项目导语。",
              type: "项目类型",
              year: "2026",
              role: "我的角色",
              coverLabel: "封面占位图",
              sections: [
                { label: "01 背景", title: "背景待补充", body: "这里补背景。" }
              ]
            }
          });
          renderWorks();
          return;
        }

        if (target.id === "saveContent") {
          saveContent();
          return;
        }

        if (target.id === "reloadContent") {
          reloadContent();
          return;
        }

        if (target.dataset.removeExp !== undefined) {
          currentContent.experiences.splice(Number(target.dataset.removeExp), 1);
          renderExperiences();
          return;
        }

        if (target.dataset.removeSocial !== undefined) {
          currentContent.socialLinks.splice(Number(target.dataset.removeSocial), 1);
          renderSocialLinks();
          return;
        }

        if (target.dataset.removeWork !== undefined) {
          currentContent.works.splice(Number(target.dataset.removeWork), 1);
          renderWorks();
          return;
        }

        if (target.dataset.addSection !== undefined) {
          const workIndex = Number(target.dataset.addSection);
          currentContent.works[workIndex].caseStudy.sections.push({
            label: "新章节",
            title: "标题待补充",
            body: "正文待补充"
          });
          renderWorks();
          return;
        }

        if (target.dataset.removeSection !== undefined) {
          const [workIndex, sectionIndex] = target.dataset.removeSection.split(":").map(Number);
          currentContent.works[workIndex].caseStudy.sections.splice(sectionIndex, 1);
          renderWorks();
        }
      });

      renderAll();
    </script>
  `;

  return renderLayout({
    title: `${content.site.name} | 内容后台`,
    description: "本地个人网站后台",
    bodyClass: "admin-page",
    body,
    script: ""
  });
}

async function serveStatic(response, pathname, method = "GET") {
  const filePath = path.join(__dirname, pathname.replace(/^\/+/, ""));
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(__dirname)) {
    sendHtml(response, "Not found", 404);
    return;
  }

  try {
    const stat = await fs.stat(normalized);
    if (!stat.isFile()) {
      sendHtml(response, "Not found", 404);
      return;
    }

    const extension = path.extname(normalized).toLowerCase();
    const contentType = mimeTypes[extension] || "application/octet-stream";
    const data = await fs.readFile(normalized);
    send(response, 200, contentType, data, method);
  } catch {
    sendHtml(response, "Not found", 404, method);
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);
    const isReadRequest = request.method === "GET" || request.method === "HEAD";

    if (pathname === "/api/content" && isReadRequest) {
      const content = await readContent();
      sendJson(response, content, 200, request.method);
      return;
    }

    if (pathname === "/api/content" && request.method === "PUT") {
      const rawBody = await readRequestBody(request);
      const nextContent = JSON.parse(rawBody || "{}");
      const validationError = validateContent(nextContent);

      if (validationError) {
        sendJson(response, { error: validationError }, 400);
        return;
      }

      await writeContent(nextContent);
      sendJson(response, { ok: true });
      return;
    }

    if (pathname === "/index.html") {
      redirect(response, "/");
      return;
    }

    const content = await readContent();

    if (pathname === "/" && isReadRequest) {
      sendHtml(response, renderHomePage(content), 200, request.method);
      return;
    }

    if ((pathname === "/works" || pathname === "/works/" || pathname === "/works.html") && isReadRequest) {
      sendHtml(response, renderWorksPage(content), 200, request.method);
      return;
    }

    if ((pathname === "/ai-coding" || pathname === "/ai-coding/" || pathname === "/ai-coding.html") && isReadRequest) {
      sendHtml(response, renderAiCodingPage(content), 200, request.method);
      return;
    }

    if ((pathname === "/resume" || pathname === "/resume/" || pathname === "/resume.html") && isReadRequest) {
      sendHtml(response, renderResumePage(content), 200, request.method);
      return;
    }

    if ((pathname === "/admin" || pathname === "/admin/") && isReadRequest) {
      sendHtml(response, renderAdminPage(content), 200, request.method);
      return;
    }

    const workMatch = pathname.match(/^\/work\/([^/]+?)(?:\.html)?\/?$/);
    if (workMatch && isReadRequest) {
      const slug = workMatch[1];
      const work = content.works.find((item) => item.slug === slug);

      if (!work) {
        sendHtml(response, renderLayout({
          title: "未找到案例",
          description: "指定的 case study 不存在。",
          body: `<main class="case-shell"><section class="case-hero reveal is-visible"><p class="eyebrow">404</p><h1 class="case-title">没有找到这个案例页</h1><p class="case-lead">请回到首页重新选择作品，或者到后台检查 slug 是否正确。</p></section></main>`
        }), 404, request.method);
        return;
      }

      sendHtml(response, renderWorkPage(content, work), 200, request.method);
      return;
    }

    if (pathname === "/styles.css" || pathname.startsWith("/assets/")) {
      await serveStatic(response, pathname, request.method);
      return;
    }

    sendHtml(response, "Not found", 404, request.method);
  } catch (error) {
    sendJson(
      response,
      { error: error instanceof Error ? error.message : "服务器内部错误。" },
      500,
      request.method
    );
  }
});

server.listen(PORT, () => {
  console.log(`Personal site CMS running at http://127.0.0.1:${PORT}`);
});
