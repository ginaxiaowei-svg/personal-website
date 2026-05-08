import { createServer } from "node:http";
import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 4321);
const DATA_FILE = path.join(__dirname, "data", "site-content.json");
const ZHILINK_CASE_FILE = path.join(__dirname, "data", "zhlinkCase.ts");

function loadPlainModule(filePath) {
  const source = readFileSync(filePath, "utf8");
  const module = { exports: {} };
  const wrappedSource = `${source}\n;return module.exports;`;
  return Function("module", "exports", wrappedSource)(module, module.exports);
}

const zhlinkCase = loadPlainModule(ZHILINK_CASE_FILE);

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
    { href: "/#work", label: site.navWork },
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

function buildCaseFooterLinks(content, currentWorkSlug = "") {
  const works = getRenderableWorks(content);
  if (!works.length) {
    return {
      allWorksHref: "/",
      nextWorkHref: "/works"
    };
  }

  const currentIndex = works.findIndex((item) => item.slug === currentWorkSlug);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % works.length : 0;
  const nextWork = works[nextIndex];

  return {
    allWorksHref: "/",
    nextWorkHref: nextWork ? resolveWorkHref(nextWork) : "/works"
  };
}

function resolveWorkHref(work) {
  if (work?.slug === "zhilink-digital-card") {
    return "/work/interest-circle-community#social-zhilink";
  }
  return `/work/${work.slug}`;
}

function getRenderableWorks(content) {
  const works = Array.isArray(content.works) ? content.works : [];
  return works.filter((work) => work.slug !== "zhilink-digital-card");
}

function renderFooter(content, options = {}) {
  const { caseNav = null } = options;
  if (caseNav) {
    return `
      <footer class="site-footer site-footer--case-nav reveal is-visible">
        <div class="footer-links footer-links--case-nav">
          <a href="${escapeHtml(caseNav.allWorksHref)}">查看全部作品</a>
          <a href="${escapeHtml(caseNav.nextWorkHref)}">查看下个作品</a>
        </div>
      </footer>
    `;
  }

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
      const outlines = Array.from(document.querySelectorAll("[data-outline-nav]"));

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

      outlines.forEach((outline) => {
        const line = outline.querySelector("[data-outline-line]");
        const indicator = outline.querySelector("[data-outline-indicator]");
        const links = Array.from(outline.querySelectorAll('a[href^="#"]'));
        const sectionItems = links
          .map((link) => {
            const href = link.getAttribute("href");
            if (!href || href === "#") {
              return null;
            }
            const section = document.querySelector(href);
            if (!section) {
              return null;
            }
            return { link, section, href };
          })
          .filter(Boolean);
        const itemByHref = new Map(sectionItems.map((item) => [item.href, item]));

        if (!sectionItems.length) {
          return;
        }

        const setActiveLink = (activeLink) => {
          links.forEach((link) => {
            link.classList.toggle("is-active", link === activeLink);
          });

          if (!line || !indicator || !activeLink) {
            return;
          }

          const lineRect = line.getBoundingClientRect();
          const linkRect = activeLink.getBoundingClientRect();
          const top = Math.max(0, linkRect.top - lineRect.top);
          const height = Math.max(1, linkRect.height);

          indicator.style.transform = \`translateY(\${top}px)\`;
          indicator.style.height = \`\${height}px\`;
          indicator.style.opacity = "1";
        };

        const pickActiveByScroll = () => {
          const anchorOffset = 160;
          let current = sectionItems[0];

          sectionItems.forEach((item) => {
            const top = item.section.getBoundingClientRect().top;
            if (top <= anchorOffset) {
              current = item;
            }
          });

          setActiveLink(current.link);
        };

        let ticking = false;
        const onScrollOrResize = () => {
          if (ticking) {
            return;
          }
          ticking = true;
          window.requestAnimationFrame(() => {
            pickActiveByScroll();
            ticking = false;
          });
        };

        let scrollCorrectionTimer = null;
        const resolveSectionTop = (section) => Math.max(0, window.scrollY + section.getBoundingClientRect().top - 140);
        const scrollToSection = (section) => {
          if (scrollCorrectionTimer) {
            window.clearTimeout(scrollCorrectionTimer);
            scrollCorrectionTimer = null;
          }
          // Click should land immediately at target.
          window.scrollTo({ top: resolveSectionTop(section), behavior: "auto" });
          // One-shot correction to counter layout shifts from lazy content.
          scrollCorrectionTimer = window.setTimeout(() => {
            window.scrollTo({ top: resolveSectionTop(section), behavior: "auto" });
            scrollCorrectionTimer = null;
          }, 180);
        };

        links.forEach((link) => {
          link.addEventListener("click", (event) => {
            const href = link.getAttribute("href");
            const item = href ? itemByHref.get(href) : null;
            if (!item) {
              return;
            }
            event.preventDefault();
            setActiveLink(link);
            scrollToSection(item.section);
            if (window.history && typeof window.history.replaceState === "function") {
              window.history.replaceState(null, "", href);
            }
          });
        });

        window.addEventListener("scroll", onScrollOrResize, { passive: true });
        window.addEventListener("resize", onScrollOrResize);
        pickActiveByScroll();
      });

      const viewSwitchers = Array.from(document.querySelectorAll("[data-view-switch]"));
      viewSwitchers.forEach((switcher) => {
        const module = switcher.closest("[data-view-module]");
        if (!module) {
          return;
        }

        const tabs = Array.from(switcher.querySelectorAll("[data-view-tab]"));
        const panels = Array.from(module.querySelectorAll("[data-view-panel]"));
        if (!tabs.length || !panels.length) {
          return;
        }
        const isTestWallModule = module.classList.contains("zhihu-test-wall-body");
        let autoplayTimer = null;
        let isImageHovered = false;

        const stopAutoplay = () => {
          if (!autoplayTimer) {
            return;
          }
          window.clearInterval(autoplayTimer);
          autoplayTimer = null;
        };

        const startAutoplay = () => {
          if (!isTestWallModule || tabs.length < 2 || autoplayTimer) {
            return;
          }
          autoplayTimer = window.setInterval(() => {
            if (isImageHovered) {
              return;
            }
            const activeTab = tabs.find((tab) => tab.classList.contains("is-active")) || tabs[0];
            const activeIndex = tabs.indexOf(activeTab);
            const nextTab = tabs[(activeIndex + 1) % tabs.length];
            const nextView = nextTab && nextTab.getAttribute("data-view-tab");
            if (!nextView) {
              return;
            }
            setActiveView(nextView, { animate: true });
          }, 4000);
        };

        const setActiveView = (viewName, options = {}) => {
          const { animate = true } = options;
          const currentPanel = panels.find((panel) => panel.classList.contains("is-active"));
          const nextPanel = panels.find((panel) => panel.getAttribute("data-view-panel") === viewName);
          if (!nextPanel) {
            return;
          }

          if (currentPanel === nextPanel) {
            tabs.forEach((tab) => {
              const isActive = tab.getAttribute("data-view-tab") === viewName;
              tab.classList.toggle("is-active", isActive);
              tab.setAttribute("aria-selected", isActive ? "true" : "false");
            });
            return;
          }

          tabs.forEach((tab) => {
            const isActive = tab.getAttribute("data-view-tab") === viewName;
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", isActive ? "true" : "false");
          });

          if (!animate || !currentPanel) {
            panels.forEach((panel) => {
              const isActive = panel === nextPanel;
              panel.classList.remove("is-entering-right", "is-leaving-left");
              panel.classList.toggle("is-active", isActive);
              panel.setAttribute("aria-hidden", isActive ? "false" : "true");
            });
            return;
          }

          panels.forEach((panel) => {
            if (panel !== currentPanel && panel !== nextPanel) {
              panel.classList.remove("is-active", "is-entering-right", "is-leaving-left");
              panel.setAttribute("aria-hidden", "true");
            }
          });

          currentPanel.classList.remove("is-entering-right");
          currentPanel.classList.add("is-leaving-left");
          currentPanel.setAttribute("aria-hidden", "false");

          nextPanel.classList.remove("is-leaving-left");
          nextPanel.classList.add("is-active", "is-entering-right");
          nextPanel.setAttribute("aria-hidden", "false");

          // Force reflow so entering state is applied before transition.
          void nextPanel.offsetWidth;
          nextPanel.classList.remove("is-entering-right");

          const finishTransition = () => {
            currentPanel.classList.remove("is-active", "is-leaving-left");
            currentPanel.setAttribute("aria-hidden", "true");
            nextPanel.classList.remove("is-entering-right");
          };

          let finished = false;
          const handleTransitionEnd = (event) => {
            if (event.target !== nextPanel || event.propertyName !== "transform" || finished) {
              return;
            }
            finished = true;
            nextPanel.removeEventListener("transitionend", handleTransitionEnd);
            finishTransition();
          };

          nextPanel.addEventListener("transitionend", handleTransitionEnd);
          window.setTimeout(() => {
            if (finished) {
              return;
            }
            finished = true;
            nextPanel.removeEventListener("transitionend", handleTransitionEnd);
            finishTransition();
          }, 420);
        };

        tabs.forEach((tab) => {
          tab.addEventListener("click", () => {
            const nextView = tab.getAttribute("data-view-tab");
            if (!nextView) {
              return;
            }
            setActiveView(nextView, { animate: true });
            if (isTestWallModule) {
              stopAutoplay();
              startAutoplay();
            }
          });
        });

        const defaultTab = tabs.find((tab) => tab.classList.contains("is-active")) || tabs[0];
        const defaultView = defaultTab.getAttribute("data-view-tab");
        if (defaultView) {
          setActiveView(defaultView, { animate: false });
        }

        if (isTestWallModule) {
          const hoverTargets = Array.from(module.querySelectorAll(".zhihu-test-wall-image-panel, .zhihu-test-wall-image"));
          hoverTargets.forEach((target) => {
            target.addEventListener("mouseenter", () => {
              isImageHovered = true;
              stopAutoplay();
            });
            target.addEventListener("mouseleave", () => {
              isImageHovered = false;
              startAutoplay();
            });
          });
          startAutoplay();
        }
      });

      const socialPlanModules = Array.from(document.querySelectorAll("[data-social-plan-module]"));
      socialPlanModules.forEach((module) => {
        const tabs = Array.from(module.querySelectorAll("[data-social-plan-tab]"));
        const slides = Array.from(module.querySelectorAll("[data-social-plan-slide]"));
        const track = module.querySelector(".zhihu-social-carousel-track");
        if (!tabs.length || !slides.length || !(track instanceof HTMLElement)) {
          return;
        }

        const slideKeys = slides.map((slide) => slide.getAttribute("data-social-plan-slide"));
        const interval = 3000;
        let currentIndex = 0;
        let timer = null;

        const setActive = (key) => {
          const nextIndex = slideKeys.indexOf(key);
          if (nextIndex < 0) {
            return;
          }
          currentIndex = nextIndex;
          tabs.forEach((tab) => {
            const isActive = tab.getAttribute("data-social-plan-tab") === key;
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", isActive ? "true" : "false");
          });
          slides.forEach((slide) => {
            slide.classList.toggle("is-active", slide.getAttribute("data-social-plan-slide") === key);
          });
          track.style.transform = "translateX(-" + nextIndex * 100 + "%)";
        };

        const start = () => {
          if (timer || slides.length < 2) {
            return;
          }
          timer = window.setInterval(() => {
            currentIndex = (currentIndex + 1) % slides.length;
            setActive(slideKeys[currentIndex]);
          }, interval);
        };

        const stop = () => {
          if (!timer) {
            return;
          }
          window.clearInterval(timer);
          timer = null;
        };

        tabs.forEach((tab) => {
          tab.addEventListener("click", () => {
            const key = tab.getAttribute("data-social-plan-tab");
            if (!key) {
              return;
            }
            setActive(key);
            stop();
            start();
          });
        });

        module.addEventListener("mouseenter", stop);
        module.addEventListener("mouseleave", start);

        const defaultTab = tabs.find((tab) => tab.classList.contains("is-active")) || tabs[0];
        const defaultKey = defaultTab ? defaultTab.getAttribute("data-social-plan-tab") : null;
        if (defaultKey) {
          setActive(defaultKey);
        }
        start();
      });

      const zoomableImages = Array.from(document.querySelectorAll("img")).filter((image) => {
        return !image.classList.contains("image-zoom-modal-image") && !image.closest(".image-zoom-modal");
      });
      if (zoomableImages.length) {
        const zoomModal = document.createElement("div");
        zoomModal.className = "image-zoom-modal";
        zoomModal.setAttribute("aria-hidden", "true");
        zoomModal.innerHTML = \`
          <button class="image-zoom-backdrop" type="button" data-zoom-close aria-label="关闭放大图片"></button>
          <div class="image-zoom-dialog" role="dialog" aria-modal="true" aria-label="图片预览">
            <button class="image-zoom-nav image-zoom-nav--prev" type="button" data-zoom-nav="prev" aria-label="查看上一张">‹</button>
            <button class="image-zoom-nav image-zoom-nav--next" type="button" data-zoom-nav="next" aria-label="查看下一张">›</button>
            <img class="image-zoom-modal-image" alt="" />
          </div>
        \`;
        document.body.appendChild(zoomModal);

        const zoomModalImage = zoomModal.querySelector(".image-zoom-modal-image");
        const zoomPrevButton = zoomModal.querySelector('[data-zoom-nav="prev"]');
        const zoomNextButton = zoomModal.querySelector('[data-zoom-nav="next"]');
        let isModalOpen = false;
        let openRequestId = 0;
        let currentZoomIndex = 0;
        let currentZoomGallery = [];
        const zoomSourceCache = new Map();

        const dedupeSources = (sources) => Array.from(new Set(sources.filter(Boolean)));

        const splitImageSource = (rawSrc) => {
          if (!rawSrc) {
            return null;
          }
          const [pathPart, queryPart = ""] = rawSrc.split("?");
          const querySuffix = queryPart ? "?" + queryPart : "";
          const extMatch = pathPart.match(/(\.[a-z0-9]+)$/i);
          if (!extMatch) {
            return null;
          }
          const ext = extMatch[1];
          const stem = pathPart.slice(0, -ext.length);
          const scaleMatch = stem.match(/^(.*?)(?:@(\d+)x|-(\d+)x)$/i);
          const baseStem = scaleMatch ? scaleMatch[1] : stem;
          return { ext, querySuffix, baseStem };
        };

        const buildHighResCandidates = (rawSrc) => {
          const sourceParts = splitImageSource(rawSrc);
          if (!sourceParts) {
            return dedupeSources([rawSrc]);
          }
          const { ext, querySuffix, baseStem } = sourceParts;
          return [
            baseStem + "@5x" + ext + querySuffix,
            baseStem + "-5x" + ext + querySuffix,
            baseStem + "@4x" + ext + querySuffix,
            baseStem + "-4x" + ext + querySuffix,
            baseStem + "@3x" + ext + querySuffix,
            baseStem + "-3x" + ext + querySuffix,
            rawSrc
          ];
        };

        const canLoadImage = (src) =>
          new Promise((resolve) => {
            const probe = new Image();
            probe.onload = () => resolve(true);
            probe.onerror = () => resolve(false);
            probe.src = src;
          });

        const resolveZoomSource = async (image) => {
          const explicitZoomSrc = image.dataset.zoomSrc;
          const fallbackSrc = explicitZoomSrc || image.currentSrc || image.src;
          if (zoomSourceCache.has(fallbackSrc)) {
            return zoomSourceCache.get(fallbackSrc);
          }
          const candidates = dedupeSources(buildHighResCandidates(fallbackSrc));
          for (const candidate of candidates) {
            if (await canLoadImage(candidate)) {
              zoomSourceCache.set(fallbackSrc, candidate);
              return candidate;
            }
          }
          zoomSourceCache.set(fallbackSrc, fallbackSrc);
          return fallbackSrc;
        };

        const closeZoomModal = () => {
          if (!isModalOpen) {
            return;
          }
          zoomModal.classList.remove("is-open");
          zoomModal.setAttribute("aria-hidden", "true");
          document.body.style.overflow = "";
          isModalOpen = false;
        };

        const getZoomGallery = (image) => {
          const zoomGroup = image.dataset.zoomGroup;
          if (!zoomGroup) {
            return [image];
          }
          const sameGroup = zoomableImages.filter((candidate) => candidate.dataset.zoomGroup === zoomGroup);
          if (sameGroup.length < 2) {
            return [image];
          }
          return sameGroup
            .slice()
            .sort((a, b) => {
              const aOrder = Number(a.dataset.zoomOrder || 0);
              const bOrder = Number(b.dataset.zoomOrder || 0);
              return aOrder - bOrder;
            });
        };

        const updateZoomNavState = () => {
          const canNavigate = currentZoomGallery.length > 1;
          zoomModal.classList.toggle("has-zoom-nav", canNavigate);
          if (!canNavigate) {
            return;
          }
          const prevImage = currentZoomGallery[(currentZoomIndex - 1 + currentZoomGallery.length) % currentZoomGallery.length];
          const nextImage = currentZoomGallery[(currentZoomIndex + 1) % currentZoomGallery.length];
          const prevLabel = prevImage && prevImage.dataset.zoomView === "interaction" ? "交互图" : prevImage && prevImage.dataset.zoomView === "ui" ? "UI图" : "上一张";
          const nextLabel = nextImage && nextImage.dataset.zoomView === "interaction" ? "交互图" : nextImage && nextImage.dataset.zoomView === "ui" ? "UI图" : "下一张";
          if (zoomPrevButton) {
            zoomPrevButton.setAttribute("aria-label", "查看上一张（" + prevLabel + "）");
          }
          if (zoomNextButton) {
            zoomNextButton.setAttribute("aria-label", "查看下一张（" + nextLabel + "）");
          }
        };

        const openZoomModal = async (image, options = {}) => {
          const { preserveGallery = false } = options;
          if (!preserveGallery) {
            currentZoomGallery = getZoomGallery(image);
            currentZoomIndex = Math.max(0, currentZoomGallery.indexOf(image));
          }
          const requestId = ++openRequestId;
          const fallbackSrc = image.dataset.zoomSrc || image.currentSrc || image.src;
          zoomModalImage.src = fallbackSrc;
          zoomModalImage.alt = image.alt || "放大图片";
          updateZoomNavState();
          zoomModal.classList.add("is-open");
          zoomModal.setAttribute("aria-hidden", "false");
          document.body.style.overflow = "hidden";
          isModalOpen = true;
          const resolvedSrc = await resolveZoomSource(image);
          if (!isModalOpen || requestId !== openRequestId) {
            return;
          }
          zoomModalImage.src = resolvedSrc;
        };

        const stepZoomImage = (step) => {
          if (!isModalOpen || currentZoomGallery.length < 2) {
            return;
          }
          const nextIndex = (currentZoomIndex + step + currentZoomGallery.length) % currentZoomGallery.length;
          currentZoomIndex = nextIndex;
          const nextImage = currentZoomGallery[nextIndex];
          if (!nextImage) {
            return;
          }
          openZoomModal(nextImage, { preserveGallery: true });
        };

        zoomableImages.forEach((image) => {
          image.classList.add("js-zoomable-image");
          image.tabIndex = 0;
          image.addEventListener("click", () => openZoomModal(image));
          image.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openZoomModal(image);
            }
          });
        });

        zoomModal.addEventListener("click", (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) {
            return;
          }
          if (target.closest("[data-zoom-close]")) {
            closeZoomModal();
            return;
          }
          const navButton = target.closest("[data-zoom-nav]");
          if (navButton) {
            const direction = navButton.getAttribute("data-zoom-nav");
            stepZoomImage(direction === "prev" ? -1 : 1);
          }
        });

        window.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            closeZoomModal();
            return;
          }
          if (!isModalOpen) {
            return;
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            stepZoomImage(-1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            stepZoomImage(1);
          }
        });

        const applyZhiLinkImageDensityLimit = () => {
          const section = document.querySelector("#social-zhilink");
          if (!section) {
            return;
          }
          const dpr = Math.max(1, window.devicePixelRatio || 1);
          const images = Array.from(section.querySelectorAll("img.zhihu-social-goal-image, .zhihu-social-profile-image img"));
          images.forEach((img) => {
            const naturalWidth = img.naturalWidth || 0;
            if (!naturalWidth) {
              return;
            }
            const limit = Math.floor(naturalWidth / dpr);
            if (limit <= 0) {
              return;
            }
            img.style.maxWidth = limit + "px";
            img.style.width = "100%";
            img.style.marginLeft = "auto";
            img.style.marginRight = "auto";
          });
        };

        applyZhiLinkImageDensityLimit();
        window.addEventListener("resize", applyZhiLinkImageDensityLimit);
      }
    </script>
  `;
}

const zhihuDetailCase = {
  outline: [
    {
      href: "#overview",
      label: "项目概览",
      tone: "strong",
      children: [
        { href: "#why", label: "业务愿景（Why）" },
        { href: "#scope", label: "范围收敛（Scope）" },
        { href: "#insight", label: "用户行为洞察（Insight）" },
        { href: "#what", label: "阶段目标（What）" }
      ]
    },
    {
      href: "#strategy-1",
      label: "方案落地",
      tone: "strong",
      children: [
        { href: "#strategy-1", label: "设计策略 1" },
        { href: "#strategy-2-attempt-a", label: "设计策略 2 （必读）" },
        { href: "#strategy-3", label: "设计策略 3" }
      ]
    },
    { href: "#metrics", label: "项目收益", tone: "strong" },
    { href: "#reflection", label: "项目沉淀", tone: "strong" }
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
      title: "短容器 cardshow（50%的流量）",
      body: "短容器成为站内第三大流量场"
    },
    {
      value: "40.96",
      title: "短容器人均 Cardshow",
      body: "短容器的用户平均产生 40 次卡片曝光，用户在单个 SESSION 阅读中消费更多内容"
    },
    {
      value: "+4.6%",
      title: "人均总内容互动数",
      body: "赞同、收藏、评论、关注等用户参与互动行为明显增加"
    },
    {
      value: "+14.8%",
      title: "商业广告Adload",
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
      subtitle: "通过实验逐步验证关键假设，为团队决策提供可靠证据"
    },
    {
      tone: "amber",
      title: "四、推动方案落地",
      subtitle: "推动方案进入产品决策与落地，实现验证到全量闭环，结构改版带来消费与商业价值的双提升"
    }
  ]
};

function renderZhihuDetailCasePage(content, work) {
  const normalizeStrategyLabel = (label) => {
    const value = String(label || "");
    const matched = value.match(/^(设计策略\s*\d+)\s*[：:].*$/);
    if (matched) {
      return matched[1];
    }
    return value;
  };

  const navMarkup = zhihuDetailCase.outline
    .map(
      (item) => `
        <div class="zhihu-case-outline-item${item.tone === "medium" ? " zhihu-case-outline-item--medium" : ""}">
          <a href="${escapeHtml(item.href)}" class="zhihu-case-outline-link">${escapeHtml(item.label)}</a>
          ${
            Array.isArray(item.children)
              ? `
                <div class="zhihu-case-outline-children">
                  ${item.children
                    .map(
                      (child) =>
                        `<a href="${escapeHtml(child.href)}" class="zhihu-case-outline-child">${escapeHtml(normalizeStrategyLabel(child.label))}</a>`
                    )
                    .join("")}
                </div>
              `
              : ""
          }
        </div>
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
          ${item.body ? `<p class="zhihu-reflection-body">${escapeHtml(item.body)}</p>` : ""}
        </article>
      `
    )
    .join("");

  const renderStrategyFollowupBlock = (customHtml = "") => `
    <div class="zhihu-strategy-one-detail">
      ${customHtml ||
      `
      <article class="zhihu-strategy-one-row">
        <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
        <div class="zhihu-strategy-one-content">
          <h3>方案决策：</h3>
          <p class="zhihu-strategy-one-summary">待补充</p>
        </div>
      </article>
      <article class="zhihu-strategy-one-row">
        <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
        <div class="zhihu-strategy-one-content">
          <h3>结论与下一步：</h3>
          <p class="zhihu-strategy-one-summary">待补充</p>
        </div>
      </article>
      `}
    </div>
  `;

  const renderStrategyTwoSwitchModule = ({
    title,
    titleClass = "",
    noTitle = false,
    ariaLabel,
    descriptionHtml,
    descriptionItems = [],
    descriptionClass = "",
    interactionImage,
    uiImage,
    customContentHtml = "",
    appendFollowupBlock = false,
    followupHtml = ""
  }) => {
    if (customContentHtml) {
      return `
        <section class="zhihu-test-wall-module">
          ${noTitle ? "" : `<div class="zhihu-test-wall-product-line${titleClass ? ` ${titleClass}` : ""}">${escapeHtml(title)}</div>`}
          <section class="zhihu-test-wall-body">
            ${customContentHtml}
          </section>
        </section>
      `;
    }

    const renderModuleImage = (image, zoomGroup = "", zoomView = "", zoomOrder = "") => {
      const isZoomable = Boolean(image.zoomSrc);
      const zoomSource = image.zoomSrc || image.src;
      return `
        <figure class="zhihu-test-wall-image-panel">
          <img
            class="zhihu-test-wall-image${isZoomable ? " js-zoomable-image" : ""}"
            src="${escapeHtml(image.src)}"
            ${isZoomable ? `data-zoom-src="${escapeHtml(zoomSource)}"` : ""}
            ${zoomGroup ? `data-zoom-group="${escapeHtml(zoomGroup)}"` : ""}
            ${zoomView ? `data-zoom-view="${escapeHtml(zoomView)}"` : ""}
            ${zoomOrder !== "" ? `data-zoom-order="${escapeHtml(String(zoomOrder))}"` : ""}
            alt="${escapeHtml(image.alt)}"
            loading="lazy"
          />
        </figure>
      `;
    };

    return `
      <section class="zhihu-test-wall-module">
        <div class="zhihu-test-wall-product-line${titleClass ? ` ${titleClass}` : ""}">${escapeHtml(title)}</div>
        <section class="zhihu-test-wall-body" data-view-module>
          ${
            descriptionItems.length
              ? `
                <ul class="zhihu-case-list zhihu-case-list--compact zhihu-test-wall-list">
                  ${descriptionItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                </ul>
              `
              : `<p class="zhihu-test-wall-desc${descriptionClass ? ` ${descriptionClass}` : ""}">${descriptionHtml}</p>`
          }
          <div class="zhihu-test-wall-switch-row">
            <div class="zhihu-view-switch" data-view-switch role="tablist" aria-label="${escapeHtml(ariaLabel)}">
              <button type="button" data-view-tab="interaction" class="is-active" role="tab" aria-selected="true">交互</button>
              <button type="button" data-view-tab="ui" role="tab" aria-selected="false">UI</button>
            </div>
          </div>
          <div class="zhihu-view-panels">
            <div class="zhihu-view-panel is-active" data-view-panel="interaction" aria-hidden="false">
              ${renderModuleImage(interactionImage, ariaLabel, "interaction", 0)}
            </div>
            <div class="zhihu-view-panel" data-view-panel="ui" aria-hidden="true">
              ${renderModuleImage(uiImage, ariaLabel, "ui", 1)}
            </div>
          </div>
          ${appendFollowupBlock ? renderStrategyFollowupBlock(followupHtml) : ""}
        </section>
      </section>
    `;
  };

  const strategyTwoModules = [
    {
      title: "产品现状",
      ariaLabel: "尝试B产品现状视图切换",
      descriptionHtml: "仅一个「阅读态」的容器，正向滚动和点击「下一个」按钮都进入同一个容器",
      interactionImage: {
        src: "/assets/case-study/strategy-2-product-interaction-0@3x.png?v=20260427-2142",
        alt: "尝试B交互图"
      },
      uiImage: {
        src: "/assets/case-study/strategy-2-product-ui-0@3x.png?v=20260427-2142",
        alt: "尝试B UI图"
      }
    },
    {
      title: "目标页面（静态页面）",
      titleClass: "zhihu-test-wall-product-line--model-one",
      ariaLabel: "目标页面视图切换",
      descriptionHtml:
        '首篇回答仍然是「长容器」，其他回答是「短容器」<br /><span class="zhihu-test-wall-desc-note">*以后我把「阅读态」称作长容器，把「筛选+阅读态」称作短容器</span>',
      interactionImage: {
        src: "/assets/case-study/strategy-2-target-interaction-static@3x.png?v=20260427-2142",
        alt: "目标页面交互图"
      },
      uiImage: {
        src: "/assets/case-study/strategy-2-target-ui-static@3x.png?v=20260427-2142",
        alt: "目标页面UI图"
      }
    },
    {
      title: "交互模型一",
      titleClass: "zhihu-test-wall-product-line--model-one",
      ariaLabel: "交互模型一视图切换",
      descriptionItems: [
        "仅首篇回答是「长容器」",
        "正向滚动：进入「短容器」",
        "点击「下一个」按钮：进入「短容器」",
        "每进入一个详情就会进入一个更深层级的页面"
      ],
      interactionImage: {
        src: "/assets/case-study/strategy-2-model-1-interaction@3x.png?v=20260427-2142",
        alt: "交互模型一交互图"
      },
      uiImage: {
        src: "/assets/case-study/strategy-2-model-1-ui@3x.png?v=20260427-2148",
        alt: "交互模型一UI图"
      },
      appendFollowupBlock: true,
      followupHtml: `
        <article class="zhihu-strategy-one-row">
          <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
          <div class="zhihu-strategy-one-content">
            <h3>方案决策：</h3>
            <p class="zhihu-strategy-one-summary">
              PROS：离目标（提高消费渗透）最近，且对用户核心消费场景影响最小<br />
              CONS：返回路径存在套娃的问题
            </p>
            <p class="zhihu-strategy-one-summary">
              我们也给出了「合理」的回答：<br />
              - 目前用户每次进入详情页平均消费 1.4 个回答，消费深度不高，新容器套层的问题平均看影响较小；（逻辑谬误）<br />
              - 深度消费用户的占比不高，且用户点了「下一个」按钮，滚动至下方大卡流，如果动态高度策略使至少 70% 的内容在当前展示完全，那用户需要由点进详情页消费的内容占比很小；<br />
              - 研发成本高，业务侧需要在规定时间内能拿到一波数据反馈来验证目标
            </p>
          </div>
        </article>
        <article class="zhihu-strategy-one-row">
          <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
          <div class="zhihu-strategy-one-content">
            <h3>小流量实验：</h3>
            <div class="zhihu-strategy-one-cards">
              <section class="zhihu-strategy-one-card">
                <h4>验证命题</h4>
                <p>长容器后接短容器能带来消费渗透的提升</p>
              </section>
              <section class="zhihu-strategy-one-card">
                <h4>验证指标</h4>
                <p>大盘消费时长（平稳 or ⬆️）<br />首篇回答的消费时长（平稳 or ⬆️）<br />短容器的渗透率 ⬆️</p>
              </section>
            </div>
          </div>
        </article>
        <article class="zhihu-strategy-one-row">
          <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
          <div class="zhihu-strategy-one-content">
            <h3>结论与下一步：</h3>
            <div class="zhihu-strategy-one-cards zhihu-strategy-one-cards--single">
              <section class="zhihu-strategy-one-card">
                <h4>数据指标</h4>
                <p>数据指标：大盘整体消费时长 <span class="zhihu-data-negative">-1.3%</span>，其中 daily 用户消费时长 <span class="zhihu-data-negative">-2.42%</span>，短容器的渗透率 <span class="zhihu-data-positive">+25.3%</span>，短容器的 <span class="zhihu-data-positive">cardshow 800w</span>。</p>
                <p>用户反馈：用户不习惯新的滚动交互（去掉阻尼了）；层级套娃；大卡还要多点一次才能看完整回答，不适应大卡。</p>
              </section>
            </div>
            <p class="zhihu-strategy-one-next">下一步：<br />1）解决层级套娃问题；<br />2）降低用户对大卡的不适应。业务决策：首篇回答核心体验未受影响，仅小部分会下滑消费用户受影响，继续验证提高大卡曝光带来的收益。</p>
          </div>
        </article>
      `
    },
    {
      title: "交互模型二",
      titleClass: "zhihu-test-wall-product-line--model-one",
      ariaLabel: "交互模型二视图切换",
      descriptionItems: [
        "正向滚动：进入「短容器」流",
        "点击「下一个」按钮：进入「长容器」流",
        "总共为 1.5 个层级"
      ],
      interactionImage: {
        src: "/assets/case-study/strategy-2-model-2-interaction@3x.png?v=20260427-2142",
        alt: "交互模型二交互图"
      },
      uiImage: {
        src: "/assets/case-study/strategy-2-model-2-ui@3x.png?v=20260427-2142",
        alt: "交互模型二UI图"
      },
      appendFollowupBlock: true,
      followupHtml: `
        <article class="zhihu-strategy-one-row">
          <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
          <div class="zhihu-strategy-one-content">
            <h3>方案决策：</h3>
            <div class="zhihu-strategy-one-summary">
              1、为什么不直接拍成 1 层，而要保留 1.5 层？<br />
              <ul class="zhihu-inline-bullet-list">
                <li>因为“下一条”是高频用户的习惯路径，强行改成短容器会破坏这部分用户的预期。</li>
              </ul>
              → 所以：点“下一条”仍进入长容器流，保持连续深读体验。
            </div>
            <div class="zhihu-strategy-one-summary">
              2、为什么短容器点进详情要用 1.5 层？<br />
              <ul class="zhihu-inline-bullet-list">
                <li><span class="zhihu-keyword-emphasis">技术约束</span>：短容器是 native，长内容详情是历史 hybrid 承载，无法在当前成本下做到 native 内同层无缝深读。</li>
              </ul>
              → 所以：短容器点击进入详情用 pop（1.5 层）承接，实现 native → hybrid 的过渡，并统一深读仍落在 hybrid。
            </div>
            <div class="zhihu-strategy-one-summary">
              最终形成两条“可共存”的路径：<br />
              <ul class="zhihu-inline-bullet-list">
                <li>路径A（深读用户）：长容器流（保持原习惯）</li>
                <li>路径B（筛选用户）：短容器列表 → pop进入详情 → 返回列表（减少层级叠加）</li>
              </ul>
              <br />
              <span class="zhihu-tech-note">hybrid：核心用 Web 技术，放在 App 的 WebView 里</span><br />
              <span class="zhihu-tech-note">native：用 iOS / Android 原生代码开发</span>
            </div>
          </div>
        </article>
        <article class="zhihu-strategy-one-row">
          <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
          <div class="zhihu-strategy-one-content">
            <h3>小流量实验：</h3>
            <div class="zhihu-strategy-one-cards">
              <section class="zhihu-strategy-one-card">
                <h4>验证命题</h4>
                <p>- 收敛层级 + pop 承接，能否显著降低“套娃感 / 返回复杂”，让用户更容易理解“我在哪、怎么回”？<br />- 1.5 层 pop 是否会引入新的打扰 / 误触？</p>
              </section>
              <section class="zhihu-strategy-one-card">
                <h4>验证指标</h4>
                <p>- 用户对于层级的反馈是否减少？<br />- 大盘消费时长（平稳 or ⬆️）<br />- 首篇回答的消费时长（平稳 or ⬆️）<br />- 短容器的渗透率 ⬆️</p>
              </section>
            </div>
          </div>
        </article>
        <article class="zhihu-strategy-one-row">
          <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
          <div class="zhihu-strategy-one-content">
            <h3>结论与下一步：</h3>
            <div class="zhihu-strategy-one-cards zhihu-strategy-one-cards--single">
              <section class="zhihu-strategy-one-card">
                <h4>用户反馈</h4>
                <p>两层回退问题：从 1.5 层返回首页面需要点两次。</p>
                <p>需要多点一步才能看到详情页（daily 用户不习惯）；动效实际落地效果受技术架构影响，容易误触，iOS 端反馈较多。</p>
                <p>数据反馈：总体数据无大影响，也继续验证了短容器渗透在提升。</p>
              </section>
            </div>
            <p class="zhihu-strategy-one-next">下一步：决定通过用户访谈进一步收集用户真实反馈，为决策提供依据。</p>
          </div>
        </article>
      `
    },
    {
      title: "用户访谈",
      titleClass: "zhihu-test-wall-product-line--model-one",
      noTitle: true,
      customContentHtml: `
        <section class="zhihu-test-wall-interview-card">
          <header class="zhihu-test-wall-interview-head">
            <h2>用户访谈</h2>
            <p class="zhihu-test-wall-interview-lead">
              我主导了 10 位高频用户的结构化访谈，通过行为回溯、对比追问和情绪归因，定位短容器改版中的真实痛点，并为后续方案迭代提供决策依据。
            </p>
          </header>
          <h3 class="zhihu-test-wall-interview-section-title">用户原声</h3>
          <section class="zhihu-test-wall-voices-board">
            <div class="zhihu-test-wall-voices-col">
              <h4>方向没错：短容器确实提升了筛选效率</h4>
              <div class="zhihu-test-wall-voice-stack">
                <div class="zhihu-test-wall-voice-bubble">
                  <img class="zhihu-test-wall-avatar" src="/assets/case-study/interview-avatar-a.png" alt="" loading="lazy" />
                  <p>更方便找感兴趣的回答，不需要再点进去，能更节省时间。</p>
                </div>
                <div class="zhihu-test-wall-voice-bubble">
                  <img class="zhihu-test-wall-avatar" src="/assets/case-study/interview-avatar-b.png" alt="" loading="lazy" />
                  <p>提高了筛选效率，还比较方便。</p>
                </div>
                <div class="zhihu-test-wall-voice-bubble">
                  <img class="zhihu-test-wall-avatar" src="/assets/case-study/interview-avatar-c.png" alt="" loading="lazy" />
                  <p>可以快速看出回答是否专业的，还是故意“玩梗”，可以瞬间过滤掉。</p>
                </div>
              </div>
            </div>
            <div class="zhihu-test-wall-voices-col">
              <h4>核心问题：卡片能筛选，但不能顺滑承接消费</h4>
              <div class="zhihu-test-wall-voice-stack">
                <div class="zhihu-test-wall-voice-bubble">
                  <img class="zhihu-test-wall-avatar" src="/assets/case-study/interview-avatar-d.png" alt="" loading="lazy" />
                  <p>为什么下一条不是直接显示了，而是只能看到一部分，要看下一条还要重新点进去，看着好难受好出戏。</p>
                </div>
                <div class="zhihu-test-wall-voice-bubble">
                  <img class="zhihu-test-wall-avatar" src="/assets/case-study/interview-avatar-e.png" alt="" loading="lazy" />
                  <p>进入 1.5 层，下拉退出时，回到大卡，此动作本身会超出认知预期……认为应该直接到下一个。</p>
                </div>
                <div class="zhihu-test-wall-voice-bubble">
                  <img class="zhihu-test-wall-avatar" src="/assets/case-study/interview-avatar-f.png" alt="" loading="lazy" />
                  <p>在短容器上一刷刷到很多回答，个人就会对这个问答不再感兴趣。</p>
                </div>
              </div>
            </div>
          </section>
          <h3 class="zhihu-test-wall-interview-section-title">访谈结论</h3>
          <section class="zhihu-test-wall-interview-insights">
            <article>
              <h4>筛选成立，但消费被打断</h4>
              <p>用户认可短容器提升筛选效率，但不接受消费完后退回卡片列表。</p>
            </article>
            <article>
              <h4>路径不符合旧习惯</h4>
              <p>下拉、返回、问题页进入后的层级关系与原有消费习惯冲突。</p>
            </article>
            <article>
              <h4>知乎感被削弱</h4>
              <p>非正文元素变多，信息密度下降，专业感变弱。</p>
            </article>
          </section>
          <h3 class="zhihu-test-wall-interview-section-title">对决策的作用</h3>
          <section class="zhihu-test-wall-interview-actions">
            <article>
              <h4>确认方向成立</h4>
              <p>短容器的筛选价值是成立的，用户会用它快速判断内容值不值得看。</p>
            </article>
            <article>
              <h4>确认核心问题</h4>
              <p>问题不在“要不要做卡片”，而在“卡片之后怎么继续消费”——能筛选，但消费不顺、路径不符合旧习惯。</p>
            </article>
            <article>
              <h4>推动下一步决策</h4>
              <p>不再继续打磨细节，转向提升原地消费能力，并推进图文混排，减少跳转，恢复沉浸感。</p>
            </article>
          </section>
        </section>
      `
    },
    {
      title: "交互模三（最终版）",
      titleClass: "zhihu-test-wall-product-line--model-one",
      ariaLabel: "交互模三视图切换",
      descriptionItems: [
        "正向滚动：进入「短容器」",
        "每次点击「下一个」按钮：同层替换，进入「长容器」",
        "仅 1 个层级"
      ],
      interactionImage: {
        src: "/assets/case-study/strategy-2-model-3-interaction@3x.png?v=20260427-2142",
        alt: "交互模三交互图"
      },
      uiImage: {
        src: "/assets/case-study/strategy-2-model-3-ui@3x.png?v=20260427-2142",
        alt: "交互模三UI图"
      },
      appendFollowupBlock: true,
      followupHtml: `
        <article class="zhihu-strategy-one-row">
          <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
          <div class="zhihu-strategy-one-content">
            <h3>方案决策（非常关键）：</h3>
            <p class="zhihu-strategy-one-summary">
              交互模型2和用户访谈验证：短容器筛选成立，但消费体验不足。<br />
              关键决策：<span class="zhihu-keyword-emphasis">结构化 or 截断化</span>？
            </p>
            <figure class="zhihu-test-wall-image-panel">
              <img class="zhihu-test-wall-image" src="/assets/case-study/strategy-2-model-3-structure-cut@3x.png?v=20260427-1856" alt="交互模型三结构化与截断化图" loading="lazy" />
            </figure>
            <figure class="zhihu-test-wall-image-panel">
              <img class="zhihu-test-wall-image" src="/assets/case-study/strategy-2-model-3-product-triangle.png?v=20260427-1935" alt="短容器 Product Triangle 图" loading="lazy" />
            </figure>
            <p class="zhihu-triangle-note">我整理了用户研究、业务目标与技术约束等信息，为方案选择提供决策支持</p>
          </div>
        </article>
        <article class="zhihu-strategy-one-row">
          <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
          <div class="zhihu-strategy-one-content">
            <h3>小流量实验：</h3>
            <div class="zhihu-strategy-one-cards">
              <section class="zhihu-strategy-one-card">
                <h4>验证命题</h4>
                <p>- 短容器（截断化方案）内容呈现，能否承接更多阅读行为，实现真正的筛选 + 阅读内容消费场</p>
              </section>
              <section class="zhihu-strategy-one-card">
                <h4>验证指标</h4>
                <p>- 用户对当前方案的反馈和接受度 ⬆️<br />- 短容器的渗透率 ⬆️<br />- 大盘消费时长（平稳 or ⬆️）<br />- 首篇回答的消费时长（平稳 or ⬆️）</p>
              </section>
            </div>
          </div>
        </article>
        <article class="zhihu-strategy-one-row">
          <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
          <div class="zhihu-strategy-one-content">
            <h3>结论与下一步：</h3>
            <div class="zhihu-strategy-one-cards zhihu-strategy-one-cards--single">
              <section class="zhihu-strategy-one-card">
                <h4>数据反馈</h4>
                <p>待补充</p>
              </section>
            </div>
            <p class="zhihu-strategy-one-next">下一步：<br />1）改造首篇回答（短回答），提升首屏的利用率，增加短容器的曝光。<br />2）将想法详情页能力整合进短容器，最终实现统一消费结构。</p>
          </div>
        </article>
      `
    }
  ];

  const body = `
    ${renderSiteHeader(content, `/work/${work.slug}`)}

    <main class="case-shell zhihu-case-shell">
      <aside class="zhihu-case-rail reveal is-visible" aria-label="章节导航">
        <div class="zhihu-case-outline case-outline" data-outline-nav>
          <span class="zhihu-case-outline-line case-outline-line" data-outline-line aria-hidden="true">
            <span class="zhihu-case-outline-indicator case-outline-indicator" data-outline-indicator></span>
          </span>
          <div class="zhihu-case-outline-content">
            ${navMarkup}
          </div>
        </div>
      </aside>

      <div class="zhihu-case-main">
        <section class="zhihu-case-hero reveal is-visible" id="overview">
          <img class="zhihu-case-brand" src="/assets/zhicon_brand_zhihu_logo.svg" alt="知乎 Logo" />
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
            <li>统一的容器 & 互动（本项目不讲）提升消费效率，降低认知成本（不同内容形态/规则不一致，用户需要反复适应）｜</li>
          </ul>
        </section>

        <section class="zhihu-case-section reveal is-visible" id="scope">
          <h2>范围收敛（Scope）</h2>
          <p class="zhihu-case-muted">当前的内容组织形式有 3 种，用户认知成本高（如下图，3 种容器）</p>
          <p class="zhihu-case-kicker">阶段聚焦：先做核心消费容器 A（回答 / 文章 - 长图文内容）</p>
          <ul class="zhihu-case-list">
            <li>回答/文章是知乎最核心的消费载体，（消费时长/消费深度/互动量/变现）等关键指标上贡献最高，因此本轮结构统一优先聚焦回答/文章容器，先把核心消费链路跑顺，再逐步扩展到其他形态。</li>
            <li>视频不在业务中心 → 可以暂不纳入本轮结构统一</li>
          </ul>

          <figure class="zhihu-figure zhihu-figure--panel">
            <img
              class="js-zoomable-image"
              src="/assets/case-study/40000371-127413.png"
              data-zoom-src="/assets/case-study/40000371-127413.png"
              alt="知乎现有三种内容容器对比图"
              loading="lazy"
            />
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

        <section class="zhihu-case-section reveal is-visible" id="what">
          <h2>阶段目标（What）</h2>
          <ul class="zhihu-case-list">
            <li>让用户在一个问题下更容易继续筛选更多回答，提升消费深度，多看几条。</li>
          </ul>
        </section>

        <section class="zhihu-case-section reveal is-visible" id="strategy-1">
          <h2>设计策略 1：首篇回答内——增强“还有内容可看”的感知</h2>
          <div class="zhihu-scroll-figure">
            <figure class="zhihu-figure zhihu-figure--wide">
              <img
                class="js-zoomable-image"
                src="/assets/case-study/40000371-128588.png"
                data-zoom-src="/assets/case-study/40000371-128588.png"
                alt="首篇回答内增强内容连续感的多种尝试方案"
                loading="lazy"
              />
            </figure>
          </div>
          <div class="zhihu-strategy-one-detail">
            <article class="zhihu-strategy-one-row">
              <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
              <div class="zhihu-strategy-one-content">
                <h3>方案决策：</h3>
                <ul class="zhihu-strategy-one-list">
                  <li>A（小流量实验）：明确按钮含义</li>
                  <li>B1（淘汰）：将「下一条」放到内容顶部 → 过早切换，不符合阅读顺序</li>
                  <li>B2（淘汰）：强提醒常驻底部 → 挤压互动区，影响互动量，打扰感强</li>
                  <li>B3（淘汰）：滑到底部再提示 → 触达太晚；大量用户 10 秒内退出，覆盖不到核心人群，强推荐感。</li>
                </ul>
                <p class="zhihu-strategy-one-summary zhihu-strategy-two-decision-copy">
                  <strong>方案选择：A</strong>
                  （在不影响首篇阅读与互动体验底盘的前提下，尝试触达更早、干扰更小、研发改动小且验证成本低的方案）
                </p>
              </div>
            </article>

            <article class="zhihu-strategy-one-row">
              <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
              <div class="zhihu-strategy-one-content">
                <h3>小流量实验：</h3>
                <div class="zhihu-strategy-one-cards">
                  <section class="zhihu-strategy-one-card">
                    <h4>验证命题</h4>
                    <p>用户能否在首条回答内感知“下面还有更多内容”，从而降低 10 秒内退出？</p>
                  </section>
                  <section class="zhihu-strategy-one-card">
                    <h4>验证指标</h4>
                    <p>10 秒退出率降低 ⬇️<br />「下一个」按钮点击率上升 ⬆️<br />消费深度上升 ⬆️</p>
                  </section>
                </div>
              </div>
            </article>

            <article class="zhihu-strategy-one-row">
              <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
              <div class="zhihu-strategy-one-content">
                <h3>结论与下一步：</h3>
                <div class="zhihu-strategy-one-cards">
                  <section class="zhihu-strategy-one-card">
                    <h4>数据指标</h4>
                    <p>XXX</p>
                  </section>
                  <section class="zhihu-strategy-one-card">
                    <h4>用户反馈</h4>
                    <p>遮挡正文 / 易误触 / 希望隐藏「下个回答」按钮</p>
                  </section>
                </div>
                <p class="zhihu-strategy-one-next">下一步：首篇回答内的可尝试空间不大，进入策略 2</p>
              </div>
            </article>
          </div>
        </section>

        <section class="zhihu-case-section reveal is-visible zhihu-strategy-two" id="strategy-2-attempt-a">
          <h2>设计策略 2：其他回答——让“筛选 + 阅读”并存（结构改造）</h2>

          <figure class="zhihu-figure zhihu-figure--panel zhihu-attempt-a-image">
            <img
              class="js-zoomable-image"
              src="/assets/case-study/40000371-130053-3x.png"
              data-zoom-src="/assets/case-study/40000371-130053-3x.png"
              alt="设计策略2尝试A页面结构图"
              loading="lazy"
            />
          </figure>

          <div class="zhihu-strategy-one-detail">
            <article class="zhihu-strategy-one-row">
              <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
              <div class="zhihu-strategy-one-content">
                <h3>方案决策：</h3>
                <p class="zhihu-strategy-one-summary">
                  优点：能同时满足消费和筛选的需求，还能简化层级，所有入口进去都是一个页面，实现「内容连续消费」体验<br />
                  缺点：回答页和问题页的流量路径：<br />
                  <span class="zhihu-strategy-one-indent-line">90.6% 的用户会从推荐/搜索/关注页直接进入回答页消费</span><br />
                  <span class="zhihu-strategy-one-indent-line">9.4% 的用户会从热榜进入问题页——再进入回答页消费</span><br />
                  首页进入内容详情页应该是一个「阅读态」，而非「筛选态」<br /><br />
                  ❌ 放弃此方案：影响 90% 用户的消费和互动体验
                </p>
              </div>
            </article>

            <article class="zhihu-strategy-one-row">
              <span class="zhihu-strategy-one-line" aria-hidden="true"></span>
              <div class="zhihu-strategy-one-content">
                <h3>结论与下一步：</h3>
                <p class="zhihu-strategy-one-summary">该尝试引导团队从数据层重新关注流量来源，把重心收回回答页，明确首页进入第一篇回答应保持「阅读态」。</p>
                <p class="zhihu-strategy-one-next">下一步：在不影响首篇阅读与互动底盘的前提下，继续尝试提升消费渗透（进入 Test B）。</p>
              </div>
            </article>
          </div>
        </section>

        <section class="zhihu-case-section reveal is-visible" id="strategy-2">
          <article class="zhihu-attempt-b-shell zhihu-test-wall" aria-label="尝试方案B容器背景">
            <h3 class="zhihu-test-wall-title">尝试 B：回答详情页的探索</h3>
            ${strategyTwoModules.map((module) => renderStrategyTwoSwitchModule(module)).join("")}
          </article>
        </section>

        <section class="zhihu-case-section reveal is-visible" id="strategy-3">
          <h2>设计策略 3：改造首篇回答，提升短容器曝光</h2>
          <figure class="zhihu-figure zhihu-figure--panel">
            <img
              class="js-zoomable-image"
              src="/assets/case-study/40000371-132867.png"
              data-zoom-src="/assets/case-study/40000371-132867.png"
              alt="改造首篇回答前后的对比示意图"
              loading="lazy"
            />
          </figure>
        </section>

        <section class="zhihu-case-section reveal is-visible" id="unified-container">
          <h2>目标达成：容器最终统一</h2>
          <figure class="zhihu-figure zhihu-figure--panel">
            <img
              class="js-zoomable-image"
              src="/assets/case-study/40000371-133580@3x.png"
              data-zoom-src="/assets/case-study/40000371-133580@3x.png"
              alt="短容器统一后的想法详情页、回答详情页与文章详情页效果图"
              loading="lazy"
            />
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

        <section class="zhihu-case-closing reveal is-visible" id="closing">
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

function renderZhihuSocialDesignCasePage(content, work) {
  const isInteractionBarRevampPage = work.slug === "zhihu-interaction-bar-revamp-2026";
  const overviewLabel = isInteractionBarRevampPage ? "设计概述" : "知乎社交是如何发生的？";
  const outlineItems = isInteractionBarRevampPage
    ? [
      { href: "#social-overview", label: "设计概述" },
      { href: "#interaction-essence", label: "互动的本质" },
      { href: "#interaction-problem", label: "定义问题" },
      { href: "#interaction-plan", label: "方案尝试" },
      { href: "#interaction-data-conclusion", label: "数据结论" },
      { href: "#interaction-validation", label: "用户质疑" },
      { href: "#interaction-final-decision", label: "最终决策" },
      { href: "#interaction-componentization", label: "设计组件化" }
    ]
    : [
      { href: "#social-overview", label: overviewLabel },
      { href: "#social-profile", label: "个人页：打造人设，提升「人」的影响力" },
      { href: "#social-diagnosis", label: "问题诊断", bullet: true },
      { href: "#social-goal", label: "目标拆解", bullet: true },
      { href: "#social-plan", label: "方案落地", bullet: true },
      { href: "#social-result", label: "项目收益", bullet: true },
      { href: "#social-zhilink", label: "ZhiLink：弱连接之外的场景补充" },
      { href: "#social-zhilink-goal", label: "目标定义", bullet: true },
      { href: "#social-zhilink-flow", label: "核心流程", bullet: true },
      { href: "#social-zhilink-result", label: "项目结果", bullet: true },
      { href: "#social-circle", label: "知乎圈子：基于兴趣的社交连接" },
      { href: "#social-circle-definition", label: "产品定义", bullet: true },
      { href: "#social-circle-flow", label: "完整链路", bullet: true },
      { href: "#social-circle-key-design", label: "关键设计", bullet: true },
      { href: "#social-circle-result", label: "取得成果", bullet: true }
    ];

  const body = `
    ${renderSiteHeader(content, `/work/${work.slug}`)}

    <main class="case-shell zhihu-social-shell">
      <aside class="zhihu-social-rail reveal is-visible" aria-label="章节导航">
        <div class="zhihu-social-outline case-outline" data-outline-nav>
          <span class="zhihu-case-outline-line case-outline-line" data-outline-line aria-hidden="true">
            <span class="zhihu-case-outline-indicator case-outline-indicator" data-outline-indicator></span>
          </span>
          <div class="zhihu-social-outline-content">
            ${outlineItems
              .map((item) => `<a href="${escapeHtml(item.href)}" class="zhihu-social-outline-link${item.bullet ? " zhihu-social-outline-link--bullet" : ""}">${escapeHtml(item.label)}</a>`)
              .join("")}
          </div>
        </div>
      </aside>

      <div class="zhihu-social-main">
        <section class="zhihu-social-hero reveal is-visible" id="social-overview">
          <div class="zhihu-social-hero-head">
            <img class="zhihu-social-brand" src="/assets/zhicon_brand_zhihu_logo.svg" alt="知乎 Logo" />
            <h1 class="zhihu-social-title">${escapeHtml(work.title)}</h1>
          </div>

          <div class="zhihu-social-meta">
            <div>
              <span>我的角色</span>
              <strong>产品设计 Owner</strong>
            </div>
            <div>
              <span>项目时间</span>
              <strong>2024 年</strong>
            </div>
          </div>

          <div class="zhihu-social-divider" aria-hidden="true"></div>
          <h2 class="zhihu-social-subtitle">${escapeHtml(overviewLabel)}</h2>
          ${
            isInteractionBarRevampPage
              ? `<h2 class="zhihu-social-diagnosis-title" id="interaction-intro-title">在「提升互动率」与「用户表达」之间的设计决策</h2>`
              : `<p class="zhihu-social-lead">在「提升互动率」与「用户表达」之间的设计决策</p>`
          }
          ${
            isInteractionBarRevampPage
              ? `
                <div class="interaction-revamp-tag-row" aria-label="项目标签">
                  <span class="interaction-revamp-tag interaction-revamp-tag--green">目标：提升互动率、统一互动结构</span>
                  <span class="interaction-revamp-tag interaction-revamp-tag--blue">场景：知乎回答 / 文章 / 想法详情页</span>
                </div>
                <p class="zhihu-social-copy">在提升整体互动率、支撑多内容形态统一分发的目标下，我重新梳理了知乎互动结构，通过多轮设计探索与实验，在增长目标与社区表达文化之间通过设计做出决策，并将互动能力沉淀为可复用的组件体系。</p>
              `
              : `<p class="zhihu-social-copy">知乎的连接建立在内容之上，用户先认同观点，再决定是否关注答主，因此天然是弱社交关系。<br/>在弱社交结构下，用户缺乏直接的关系驱动，<span class="zhihu-social-copy--strong">设计需要承担从内容到人的转化责任，使社交关系发生并强化。</span></p>`
          }
          ${
            isInteractionBarRevampPage
              ? `
                <div class="zhihu-social-image-placeholder interaction-revamp-compare-board--spaced">
                  <img class="zhihu-social-image-placeholder-img" src="/assets/case-study/zhihu-social-interaction-bar-4x.png?v=20260504-1449" alt="互动 bar 改版前后对比图" loading="lazy" />
                </div>
                <div class="zhihu-social-diagnosis-head interaction-revamp-subtitle-block" id="interaction-essence">
                  <p class="zhihu-social-diagnosis-label">互动的本质</p>
                  <h2 class="zhihu-social-diagnosis-title">不仅是点击行为，而是内容的一部分</h2>
                </div>
                <h3 class="zhilink-third-title">互动 bar 的作用</h3>
                <div class="zhilink-third-copy">
                  <p>互动设计，本质是在定义用户如何参与内容</p>
                </div>
                <figure class="interaction-revamp-third-image">
                  <img src="https://www.figma.com/api/mcp/asset/b1a8a043-bfff-428e-bac6-70a5c1c5ee84" alt="互动 bar 作用 4x 示意图" loading="lazy" />
                </figure>
                <h3 class="zhilink-third-title">改版目标</h3>
                <div class="zhilink-third-copy">
                  <p>互动设计，本质是在定义用户如何参与内容</p>
                </div>
                <div class="interaction-revamp-goal-cards" aria-label="改版目标卡片">
                  <article class="interaction-revamp-goal-card interaction-revamp-goal-card--first">
                    <p class="interaction-revamp-goal-label">目标1</p>
                    <p class="interaction-revamp-goal-main">提升整体互动率</p>
                    <p class="interaction-revamp-goal-sub">以“赞同”为核心</p>
                  </article>
                  <article class="interaction-revamp-goal-card interaction-revamp-goal-card--second">
                    <p class="interaction-revamp-goal-label">目标2</p>
                    <p class="interaction-revamp-goal-main">统一互动方式</p>
                    <p class="interaction-revamp-goal-sub">短容器流将混推：想法 / 回答 / 文章</p>
                  </article>
                </div>
                <div class="zhihu-social-image-placeholder interaction-revamp-goal-image">
                  <img class="zhihu-social-image-placeholder-img" src="/assets/case-study/1.png?v=20260507-1854" alt="改版目标配图 1" loading="lazy" />
                </div>
                <div class="zhihu-social-diagnosis-head zhihu-social-diagnosis-head--after-image" id="interaction-problem">
                  <p class="zhihu-social-diagnosis-label">定义问题</p>
                  <h2 class="zhihu-social-diagnosis-title">用户表达有门槛</h2>
                </div>
                <div class="zhihu-social-image-placeholder interaction-revamp-image-plain">
                  <img class="zhihu-social-image-placeholder-img" src="/assets/case-study/2.png" alt="定义问题配图 2" loading="lazy" />
                </div>
                <div class="zhihu-social-diagnosis-head zhihu-social-diagnosis-head--after-image" id="interaction-plan">
                  <p class="zhihu-social-diagnosis-label">方案尝试</p>
                  <h2 class="zhihu-social-diagnosis-title">从降低门槛到重新定义互动表达方式</h2>
                </div>
                <h3 class="zhilink-third-title">方向 1 ：互动类型多，是否减少互动类型</h3>
                <div class="zhilink-third-copy">
                  <p>赞同与喜欢在“表达支持”上存在重叠，尝试是否可以取其一 or 合并，反对收起</p>
                </div>
                <div class="zhihu-social-image-placeholder interaction-revamp-image-plain">
                  <img class="zhihu-social-image-placeholder-img" src="/assets/case-study/hudong6.png?v=20260508-2204" alt="方向1方案配图 3" loading="lazy" />
                </div>
                <div class="zhihu-social-image-placeholder interaction-revamp-image-plain">
                  <img class="zhihu-social-image-placeholder-img" src="/assets/case-study/hudong4.png?v=20260508-2144" alt="方向1方案配图 4" loading="lazy" />
                </div>
                <div class="zhihu-social-image-placeholder interaction-revamp-image-plain">
                  <img class="zhihu-social-image-placeholder-img" src="/assets/case-study/hudong5.png?v=20260508-2144" alt="方向1方案配图 5" loading="lazy" />
                </div>
                <section class="interaction-revamp-decision-module interaction-revamp-decision-module--analysis" aria-label="方案决策分析模块">
                  <h3 class="interaction-revamp-decision-title">设计方案决策</h3>
                  <div class="interaction-revamp-decision-table" aria-label="方案决策分析表格">
                    <div class="interaction-revamp-decision-table-header">
                      <span>方案</span>
                      <span>使用门槛</span>
                      <span>内容适配性-回答/文章</span>
                      <span>内容适配性-想法</span>
                      <span>核心问题</span>
                    </div>
                    <div class="interaction-revamp-decision-table-body">
                      <div class="interaction-revamp-decision-table-row">
                        <div class="interaction-revamp-decision-table-cell interaction-revamp-decision-table-cell--plan">
                          <span class="interaction-revamp-decision-plan-badge">A</span>
                          <span>以「赞同」为主互动</span>
                        </div>
                        <div class="interaction-revamp-decision-table-cell">中：用户更谨慎</div>
                        <div class="interaction-revamp-decision-table-cell">中：适合观点表达</div>
                        <div class="interaction-revamp-decision-table-cell">低：对轻内容偏重</div>
                        <div class="interaction-revamp-decision-table-cell interaction-revamp-decision-table-cell--warning">
                          <p>表达门槛较高</p>
                          <p>对轻内容场景不友好</p>
                        </div>
                      </div>
                      <div class="interaction-revamp-decision-table-row">
                        <div class="interaction-revamp-decision-table-cell interaction-revamp-decision-table-cell--plan">
                          <span class="interaction-revamp-decision-plan-badge">B</span>
                          <span>以「喜欢」为主互动</span>
                        </div>
                        <div class="interaction-revamp-decision-table-cell">低：点击成本低</div>
                        <div class="interaction-revamp-decision-table-cell">低：难承载观点表达</div>
                        <div class="interaction-revamp-decision-table-cell">高：适合轻表达</div>
                        <div class="interaction-revamp-decision-table-cell interaction-revamp-decision-table-cell--warning">表达能力不足，无法统一</div>
                      </div>
                      <div class="interaction-revamp-decision-table-row">
                        <div class="interaction-revamp-decision-table-cell interaction-revamp-decision-table-cell--plan">
                          <span class="interaction-revamp-decision-plan-badge">C</span>
                          <span>以「赞同+喜欢」为主互动</span>
                        </div>
                        <div class="interaction-revamp-decision-table-cell">高：需重新理解</div>
                        <div class="interaction-revamp-decision-table-cell">低：语义不清</div>
                        <div class="interaction-revamp-decision-table-cell">低：认知复杂</div>
                        <div class="interaction-revamp-decision-table-cell interaction-revamp-decision-table-cell--warning">表达边界模糊，增加理解成本</div>
                      </div>
                    </div>
                  </div>
                  <div class="interaction-revamp-decision-note">
                    <span class="interaction-revamp-decision-note-line" aria-hidden="true"></span>
                    <div class="interaction-revamp-decision-note-text">
                      <p class="interaction-revamp-decision-note-heading">在多目标冲突下做决策</p>
                      <p>在这一阶段我发现，不同内容类型确实存在更适合的表达方式：「赞同」更适合回答/文章，「喜欢」更适合想法。<br />但如果继续维持这种差异，在未来统一分发的场景下，用户将始终面对不一致的表达方式。</p>
                      <p class="interaction-revamp-decision-note-heading interaction-revamp-decision-note-heading--conclusion">结论与下一步：</p>
                      <p>局部最优 ≠ 整体最优<br />因此我选择优先保证表达方式的一致性，而不是每个内容类型的局部最优。<br />下一步尝试在表达一致性的前提下，进一步降低使用门槛。</p>
                    </div>
                  </div>
                </section>
                <h3 class="zhilink-third-title">方向 2 ：降低使用门槛</h3>
                <div class="zhilink-third-copy">
                  <p>赞同与喜欢在“表达支持”上存在重叠，尝试是否可以取其一 or 合并，反对收起</p>
                </div>
                <div class="zhihu-social-image-placeholder interaction-revamp-image-pair">
                  <div class="interaction-revamp-image-pair-grid">
                    <img class="zhihu-social-image-placeholder-img" src="/assets/case-study/6.png" alt="方向2方案配图 6" loading="lazy" />
                    <img class="zhihu-social-image-placeholder-img" src="/assets/case-study/7.png" alt="方向2方案配图 7" loading="lazy" />
                  </div>
                </div>
                <div class="zhihu-social-image-placeholder interaction-revamp-image-plain">
                  <img class="zhihu-social-image-placeholder-img" src="/assets/case-study/8.png" alt="方向2方案配图 8" loading="lazy" />
                </div>
                <section class="interaction-revamp-decision-module" aria-label="方案决策分析模块">
                  <div class="interaction-revamp-decision-note">
                    <span class="interaction-revamp-decision-note-line" aria-hidden="true"></span>
                    <div class="interaction-revamp-decision-note-text interaction-revamp-decision-note-text--analysis">
                      <p class="interaction-revamp-decision-note-heading">方案决策</p>
                      <p>A1 通过「赞/踩」替代「赞同/反对」，并收拢喜欢等次要互动，降低主区选择成本，但在想法场景中“反对”不适配，同时关注入口仍存在误触问题，本质仍是局部优化。</p>
                      <p>A2 则从整体表达方式出发重构互动结构：收拢次要互动、强化主互动入口，并统一不同内容的表达路径，在降低决策成本的同时，带动了赞同、关注与分享的整体提升。</p>
                      <p class="interaction-revamp-decision-note-heading interaction-revamp-decision-note-heading--conclusion">结论与下一步：</p>
                      <ul class="interaction-revamp-decision-list">
                        <li>最终选择 A2，并明确：以「赞同」为核心表达，构建主次分层的表达方式。</li>
                        <li>B1 & B2 不冲突，一起小流量实验。</li>
                        <li>同时开启实验验证「赞/踩 👍👎」的心理门槛低于「赞同/反对 △▽」。</li>
                      </ul>
                    </div>
                  </div>
                </section>
                <div class="zhihu-social-diagnosis-head zhihu-social-diagnosis-head--after-image" id="interaction-data-conclusion">
                  <p class="zhihu-social-diagnosis-label">数据表现</p>
                  <h2 class="zhihu-social-diagnosis-title">在统一表达的前提下，「赞/踩」优于「赞同/反对」</h2>
                </div>
                <div class="zhihu-social-image-placeholder interaction-revamp-image-plain">
                  <img class="zhihu-social-image-placeholder-img" src="/assets/case-study/9.png" alt="数据结论配图 9" loading="lazy" />
                </div>
                <section class="interaction-revamp-data-module" aria-label="详细指标对比表">
                  <header class="interaction-revamp-data-header">
                    <h3>详细指标对比表</h3>
                    <p>完整的互动指标变化率数据</p>
                  </header>

                  <div class="interaction-revamp-data-table-wrap">
                    <table class="interaction-revamp-data-table">
                      <thead>
                        <tr>
                          <th>指标</th>
                          <th>实验 A</th>
                          <th>实验 B</th>
                          <th>差异</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td class="interaction-revamp-data-key">赞同量</td>
                          <td><span class="is-pos">+6.36%</span> <span class="interaction-revamp-data-badge">s</span> <img class="interaction-revamp-trend-icon" src="/assets/case-study/trend-up.svg?v=20260508-1055" alt="" aria-hidden="true" /></td>
                          <td><span class="is-pos">+13.12%</span> <span class="interaction-revamp-data-badge">s</span> <img class="interaction-revamp-trend-icon" src="/assets/case-study/trend-up.svg?v=20260508-1055" alt="" aria-hidden="true" /></td>
                          <td class="is-pos">+6.76pp</td>
                        </tr>
                        <tr>
                          <td class="interaction-revamp-data-key">收藏量</td>
                          <td><span class="is-pos">+5.87%</span> <span class="interaction-revamp-data-badge">s</span> <img class="interaction-revamp-trend-icon" src="/assets/case-study/trend-up.svg?v=20260508-1055" alt="" aria-hidden="true" /></td>
                          <td><span class="is-pos">+4.42%</span> <span class="interaction-revamp-data-badge">s</span> <img class="interaction-revamp-trend-icon" src="/assets/case-study/trend-up.svg?v=20260508-1055" alt="" aria-hidden="true" /></td>
                          <td class="is-neg">-1.45pp</td>
                        </tr>
                        <tr>
                          <td class="interaction-revamp-data-key">分享量</td>
                          <td><span class="is-pos">+6.50%</span> <span class="interaction-revamp-data-badge">s</span> <img class="interaction-revamp-trend-icon" src="/assets/case-study/trend-up.svg?v=20260508-1055" alt="" aria-hidden="true" /></td>
                          <td><span class="is-pos">+7.53%</span> <span class="interaction-revamp-data-badge">s</span> <img class="interaction-revamp-trend-icon" src="/assets/case-study/trend-up.svg?v=20260508-1055" alt="" aria-hidden="true" /></td>
                          <td class="is-pos">+1.03pp</td>
                        </tr>
                        <tr>
                          <td class="interaction-revamp-data-key">评论量</td>
                          <td><span class="is-pos">+0.21%</span> <span class="interaction-revamp-data-badge interaction-revamp-data-badge--n">n</span> <img class="interaction-revamp-trend-icon" src="/assets/case-study/trend-up.svg?v=20260508-1055" alt="" aria-hidden="true" /></td>
                          <td><span class="is-pos">+3.96%</span> <span class="interaction-revamp-data-badge interaction-revamp-data-badge--n">n</span> <img class="interaction-revamp-trend-icon" src="/assets/case-study/trend-up.svg?v=20260508-1055" alt="" aria-hidden="true" /></td>
                          <td class="is-pos">+3.75pp</td>
                        </tr>
                        <tr>
                          <td class="interaction-revamp-data-key">喜欢量</td>
                          <td><span class="is-neg">-90.00%</span> <span class="interaction-revamp-data-badge">s</span> <img class="interaction-revamp-trend-icon" src="/assets/case-study/trend-down.svg?v=20260508-1055" alt="" aria-hidden="true" /></td>
                          <td><span class="is-neg">-90.00%</span> <span class="interaction-revamp-data-badge">s</span> <img class="interaction-revamp-trend-icon" src="/assets/case-study/trend-down.svg?v=20260508-1055" alt="" aria-hidden="true" /></td>
                          <td class="is-muted">+0.00pp</td>
                        </tr>
                        <tr>
                          <td class="interaction-revamp-data-key">总互动量</td>
                          <td><span class="is-neg">-5.10%</span> <span class="interaction-revamp-data-badge">s</span> <img class="interaction-revamp-trend-icon" src="/assets/case-study/trend-down.svg?v=20260508-1055" alt="" aria-hidden="true" /></td>
                          <td><span class="is-neg">-1.60%</span> <span class="interaction-revamp-data-badge interaction-revamp-data-badge--n">n</span> <img class="interaction-revamp-trend-icon" src="/assets/case-study/trend-down.svg?v=20260508-1055" alt="" aria-hidden="true" /></td>
                          <td class="is-pos">+3.50pp</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="interaction-revamp-data-subtitle">「赞/赞同」数据的用户频次分布</div>

                  <div class="interaction-revamp-data-table-wrap">
                    <table class="interaction-revamp-data-table interaction-revamp-data-table--users">
                      <thead>
                        <tr>
                          <th>用户类型</th>
                          <th>实验 A</th>
                          <th>实验 B</th>
                          <th>差异</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td class="interaction-revamp-data-key">F3 用户</td>
                          <td class="is-pos">+3.7%</td>
                          <td class="is-pos">+2.4%</td>
                          <td class="is-neg">-1.3pp</td>
                        </tr>
                        <tr>
                          <td class="interaction-revamp-data-key">F2 用户</td>
                          <td class="is-pos">+8.1%</td>
                          <td class="is-pos">+7.5%</td>
                          <td class="is-muted">-0.6pp</td>
                        </tr>
                        <tr>
                          <td class="interaction-revamp-data-key">F1 用户</td>
                          <td class="is-pos">+8.6%</td>
                          <td class="is-pos">+12.0%</td>
                          <td class="is-pos">+3.4pp</td>
                        </tr>
                        <tr>
                          <td class="interaction-revamp-data-key">新用户</td>
                          <td class="is-pos">+4.3%</td>
                          <td class="is-pos">+19.4%</td>
                          <td class="is-pos">+15.1pp</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
                <section class="interaction-revamp-kpi-module" aria-label="实验指标摘要模块">
                  <div class="interaction-revamp-kpi-column">
                    <article class="interaction-revamp-kpi-card">
                      <div class="interaction-revamp-kpi-content">
                        <p class="interaction-revamp-kpi-title">实验 A - 赞同量增长</p>
                        <p class="interaction-revamp-kpi-value interaction-revamp-kpi-value--pos">+13.12%</p>
                        <p class="interaction-revamp-kpi-meta">统计显著</p>
                      </div>
                      <span class="interaction-revamp-kpi-icon-wrap interaction-revamp-kpi-icon-wrap--blue">
                        <img class="interaction-revamp-kpi-icon interaction-revamp-kpi-icon--lg" src="https://www.figma.com/api/mcp/asset/5e7d69c7-b96c-4f57-8dc5-1a234ff72d73" alt="" aria-hidden="true" />
                      </span>
                    </article>

                    <article class="interaction-revamp-kpi-card">
                      <div class="interaction-revamp-kpi-content">
                        <p class="interaction-revamp-kpi-title">实验 A - 总互动量</p>
                        <p class="interaction-revamp-kpi-value interaction-revamp-kpi-value--neg">-1.60%</p>
                        <p class="interaction-revamp-kpi-meta">不显著</p>
                      </div>
                      <span class="interaction-revamp-kpi-icon-wrap interaction-revamp-kpi-icon-wrap--yellow">
                        <img class="interaction-revamp-kpi-icon" src="https://www.figma.com/api/mcp/asset/f9386a77-49fb-4a94-9890-82b8e0597da8" alt="" aria-hidden="true" />
                      </span>
                    </article>

                    <article class="interaction-revamp-kpi-card">
                      <div class="interaction-revamp-kpi-content">
                        <p class="interaction-revamp-kpi-title">实验 A - 折算赞同变化</p>
                        <p class="interaction-revamp-kpi-value interaction-revamp-kpi-value--pos">+14.2万</p>
                        <p class="interaction-revamp-kpi-meta">全量后赞同量</p>
                      </div>
                      <span class="interaction-revamp-kpi-icon-wrap interaction-revamp-kpi-icon-wrap--green">
                        <img class="interaction-revamp-kpi-icon" src="https://www.figma.com/api/mcp/asset/fe06f935-3f76-475e-a7cc-d56c29e88571" alt="" aria-hidden="true" />
                      </span>
                    </article>
                  </div>

                  <div class="interaction-revamp-kpi-column">
                    <article class="interaction-revamp-kpi-card">
                      <div class="interaction-revamp-kpi-content">
                        <p class="interaction-revamp-kpi-title">实验 B-赞同量增长</p>
                        <p class="interaction-revamp-kpi-value interaction-revamp-kpi-value--pos">+6.36%</p>
                        <p class="interaction-revamp-kpi-meta">统计显著</p>
                      </div>
                      <span class="interaction-revamp-kpi-icon-wrap interaction-revamp-kpi-icon-wrap--blue">
                        <img class="interaction-revamp-kpi-icon interaction-revamp-kpi-icon--lg" src="https://www.figma.com/api/mcp/asset/2866859b-a925-48b2-b0e6-e16cc2db6059" alt="" aria-hidden="true" />
                      </span>
                    </article>

                    <article class="interaction-revamp-kpi-card">
                      <div class="interaction-revamp-kpi-content">
                        <p class="interaction-revamp-kpi-title">实验 B - 总互动量</p>
                        <p class="interaction-revamp-kpi-value interaction-revamp-kpi-value--neg">-5.10%</p>
                        <p class="interaction-revamp-kpi-meta">统计显著</p>
                      </div>
                      <span class="interaction-revamp-kpi-icon-wrap interaction-revamp-kpi-icon-wrap--purple">
                        <img class="interaction-revamp-kpi-icon" src="https://www.figma.com/api/mcp/asset/42c88524-9992-49ca-afec-0f2b70cd01b4" alt="" aria-hidden="true" />
                      </span>
                    </article>

                    <article class="interaction-revamp-kpi-card">
                      <div class="interaction-revamp-kpi-content">
                        <p class="interaction-revamp-kpi-title">实验 B - 折算赞同变化</p>
                        <p class="interaction-revamp-kpi-value interaction-revamp-kpi-value--neg">-15万</p>
                        <p class="interaction-revamp-kpi-meta">全量后赞同量</p>
                      </div>
                      <span class="interaction-revamp-kpi-icon-wrap interaction-revamp-kpi-icon-wrap--red">
                        <img class="interaction-revamp-kpi-icon" src="https://www.figma.com/api/mcp/asset/ad2f7156-ccdf-4750-999d-6c882d2ed7b2" alt="" aria-hidden="true" />
                      </span>
                    </article>
                  </div>
                </section>
                <section class="interaction-revamp-decision-module interaction-revamp-decision-module--data-validation interaction-revamp-decision-module--final-data" aria-label="设计方案分析模块">
                  <h3 class="interaction-revamp-decision-title interaction-revamp-decision-title--semibold">方案决策</h3>
                  <div class="interaction-revamp-decision-note">
                    <span class="interaction-revamp-decision-note-line" aria-hidden="true"></span>
                    <div class="interaction-revamp-decision-note-text">
                      <p class="interaction-revamp-decision-note-heading interaction-revamp-decision-note-heading--dark">数据结论</p>
                      <ul class="interaction-revamp-decision-list interaction-revamp-decision-list--data-validation">
                        <li>「赞/踩」显著提升表达量，折算后赞同量 <strong>+14.2w（vs 赞同/反对 -15w）</strong></li>
                        <li>新用户与低频用户增长更明显</li>
                        <li>分享、评论等互动同步提升</li>
                      </ul>
                      <p class="interaction-revamp-decision-note-heading interaction-revamp-decision-note-heading--serif">数据验证降低表达门槛，可以有效提升用户的表达参与度</p>
                      <p class="interaction-revamp-decision-note-heading interaction-revamp-decision-note-heading--dark">下一步</p>
                      <p class="interaction-revamp-decision-note-copy interaction-revamp-decision-note-copy--small">实验扩量继续观察</p>
                    </div>
                  </div>
                </section>
                <div class="zhihu-social-diagnosis-head zhihu-social-diagnosis-head--after-image" id="interaction-validation">
                  <p class="zhihu-social-diagnosis-label">用户质疑</p>
                  <h2 class="zhihu-social-diagnosis-title">实验扩量后，核心用户并不买账</h2>
                </div>
                <div class="zhihu-social-image-placeholder interaction-revamp-image-plain interaction-revamp-validation-image">
                  <p class="interaction-revamp-validation-caption">当前扩量方案</p>
                  <img class="zhihu-social-image-placeholder-img" src="/assets/case-study/10.png" alt="用户验证配图 10" loading="lazy" />
                </div>
                <section class="interaction-revamp-feedback-module" aria-label="用户反馈总结模块">
                  <p>我们累计收到 170条反馈</p>
                  <p>用户明确表示：找不到反对按钮，赞≠赞同</p>
                </section>
                <section class="interaction-revamp-voice-module" aria-label="用户原声反馈模块">
                  <article class="interaction-revamp-voice-column">
                    <div class="interaction-revamp-voice-copy">
                      <h3>用户原声—正向反馈</h3>
                      <ul>
                        <li>创作者并不反对改版本身，他们更关注的是：这次调整能否真正帮助内容涨粉、涨赞和提升传播效率。</li>
                        <li>相比样式变化，他们更认可那些能提升关注转化、集中高价值互动、并降低用户表达顾虑的设计。</li>
                      </ul>
                    </div>
                    <div class="interaction-revamp-voice-image">
                      <img class="interaction-revamp-voice-image-img" src="/assets/case-study/11.png" alt="用户原声正向反馈配图 11" loading="lazy" />
                    </div>
                  </article>
                  <article class="interaction-revamp-voice-column">
                    <div class="interaction-revamp-voice-copy">
                      <h3>用户原声—负向反馈</h3>
                      <ul>
                        <li>赞同不是赞，是理解和认同，是一种更深的表达，现在这种感觉没了，赞同的“含金量”被稀释了。</li>
                        <li>用户开始质疑平台在限制表达。</li>
                        <li>赞同与反对被拆分，表达结构被破坏。</li>
                      </ul>
                    </div>
                    <div class="interaction-revamp-voice-image">
                      <img class="interaction-revamp-voice-image-img" src="/assets/case-study/12.png" alt="用户原声负向反馈配图 12" loading="lazy" />
                    </div>
                  </article>
                </section>
                <section class="interaction-revamp-negative-data-module" aria-label="用户负反馈数据模块">
                  <div class="interaction-revamp-negative-data-copy">
                    <h3>用户负反馈数据</h3>
                    <ul>
                      <li>负反馈用户画像特征：互动率高、活跃频率高、创建账号时间长</li>
                      <li>被影响的不是普通用户，而是<strong>最依赖表达能力的核心用户</strong></li>
                    </ul>
                  </div>
                  <div class="interaction-revamp-negative-data-cards">
                    <article class="interaction-revamp-negative-data-card">
                      <p class="interaction-revamp-negative-data-label">170 条反馈中提到反对按钮</p>
                      <p class="interaction-revamp-negative-data-value interaction-revamp-negative-data-value--pos">26.1%</p>
                    </article>
                    <article class="interaction-revamp-negative-data-card">
                      <p class="interaction-revamp-negative-data-label">F3 频次</p>
                      <p class="interaction-revamp-negative-data-value">79.22%</p>
                    </article>
                    <article class="interaction-revamp-negative-data-card">
                      <p class="interaction-revamp-negative-data-label">创建账号2年以上</p>
                      <p class="interaction-revamp-negative-data-value">93.42%</p>
                    </article>
                    <article class="interaction-revamp-negative-data-card">
                      <p class="interaction-revamp-negative-data-label">这些用户的互动率是大盘的</p>
                      <p class="interaction-revamp-negative-data-value">14 <span>倍</span></p>
                    </article>
                  </div>
                </section>
                <div class="zhihu-social-diagnosis-head zhihu-social-diagnosis-head--after-image" id="interaction-final-decision">
                  <p class="zhihu-social-diagnosis-label">最终决策</p>
                  <h2 class="zhihu-social-diagnosis-title">在增长与表达之间，我们选择保证用户表达的完整性与准确性</h2>
                </div>
                <div class="zhihu-social-image-placeholder interaction-revamp-image-plain interaction-revamp-image-plain--with-copy">
                  <div class="interaction-revamp-image-copy">
                    <p>回答/文章外露「反对」，想法不支持反对</p>
                    <p>以「赞同」为主互动</p>
                  </div>
                  <img class="zhihu-social-image-placeholder-img" src="/assets/case-study/13.png" alt="最终决策配图 13" loading="lazy" />
                </div>
                <section class="interaction-revamp-decision-module interaction-revamp-decision-module--data-validation" aria-label="设计方案分析模块">
                  <h3 class="interaction-revamp-decision-title interaction-revamp-decision-title--semibold">反对外露最终数据</h3>
                  <div class="interaction-revamp-decision-note">
                    <span class="interaction-revamp-decision-note-line" aria-hidden="true"></span>
                    <div class="interaction-revamp-decision-note-text">
                      <p class="interaction-revamp-decision-note-heading interaction-revamp-decision-note-heading--dark">反对外露后</p>
                      <ul class="interaction-revamp-decision-list interaction-revamp-decision-list--data-validation">
                        <li>反对行为大幅增长（+133.39%）</li>
                        <li>赞同仅小幅下降（-2.21%）</li>
                        <li>整体消费与分发无显著影响</li>
                      </ul>
                      <p class="interaction-revamp-decision-note-heading interaction-revamp-decision-note-heading--dark interaction-revamp-final-conclusion-heading" style="margin-top: 20px;">结论</p>
                      <p class="interaction-revamp-decision-note-copy interaction-revamp-decision-note-copy--small">反对行为大幅增长，而整体消费未受影响，<br />说明用户表达被恢复，且未以整体效率为代价</p>
                      <p class="interaction-revamp-decision-note-heading interaction-revamp-decision-note-heading--serif interaction-revamp-final-proof-line">这验证了：反对并非负向噪音，而是必要表达</p>
                    </div>
                  </div>
                </section>
                <div class="zhihu-social-diagnosis-head zhihu-social-diagnosis-head--after-image" id="interaction-componentization">
                  <p class="zhihu-social-diagnosis-label">组件化沉淀</p>
                  <h2 class="zhihu-social-diagnosis-title">把互动 bar 沉淀为可复用的产品能力</h2>
                </div>
                <h3 class="zhilink-third-title">背景&问题</h3>
                <div class="zhilink-third-copy">
                  <p>在互动 bar 改版过程中，我们同时耦合了短容器与多端迭代：<br /><br />- 多版本实验并行（不同交互方案）<br />- 多端差异（iOS / Android / Hybrid）<br />- 多研发与不同技术实现<br /><br />导致设计侧 & 研发侧做了大量的重复工作</p>
                </div>
                <h3 class="zhilink-third-title">设计思路</h3>
                <div class="zhilink-third-copy">
                  <p>将互动 bar 从“页面设计”，抽象为“可配置的业务组件”</p>
                </div>
                <section class="interaction-revamp-module-split interaction-revamp-module-split--a">
                  <h3>A-模块拆分</h3>
                  <ul>
                    <li>插件区：承载关注 / 评论 / 商业能力</li>
                    <li>互动区：承载赞同 / 反对 / 收藏 / 评论/分享</li>
                  </ul>
                </section>
                <div class="zhihu-social-image-placeholder interaction-revamp-image-plain">
                  <img class="zhihu-social-image-placeholder-img" src="/assets/case-study/14.png" alt="模块拆分配图 14" loading="lazy" />
                </div>
                <section class="interaction-revamp-module-split interaction-revamp-module-split--bc">
                  <h3>B-能力抽象</h3>
                  <div class="interaction-revamp-module-split-copy">
                    <p>定义组件的可配置能力：</p>
                    <ul>
                      <li>组件形态：可切换不同的组件（简版 & plus 版）</li>
                      <li>表达方式：图标支持可替换</li>
                      <li>交互反馈：支持 toast / 动效统一</li>
                      <li>功能扩展：支持关注、商业、评论等接入</li>
                    </ul>
                  </div>
                </section>
                <section class="interaction-revamp-module-split interaction-revamp-module-split--bc">
                  <h3>C-布局与适配</h3>
                </section>
                <div class="zhihu-social-image-placeholder interaction-revamp-image-plain">
                  <img class="zhihu-social-image-placeholder-img" src="/assets/case-study/15.png" alt="布局与适配配图 15" loading="lazy" />
                </div>
                <p class="interaction-revamp-pdf-note">查看完整组件文档请点击 👉 <a class="interaction-revamp-pdf-note-link" href="#" aria-label="查看完整组件文档 PDF">PDF 文档</a></p>
                <h3 class="zhilink-third-title">组件化价值 & 个人贡献</h3>
                <section class="interaction-revamp-decision-module interaction-revamp-decision-module--contribution" aria-label="组件化价值与个人贡献模块">
                  <div class="interaction-revamp-decision-note">
                    <span class="interaction-revamp-decision-note-line" aria-hidden="true"></span>
                    <div class="interaction-revamp-decision-note-text interaction-revamp-decision-note-text--contribution">
                      <div class="interaction-revamp-contribution-block">
                        <p class="interaction-revamp-decision-note-heading">组件化价值</p>
                        <ul class="interaction-revamp-decision-list interaction-revamp-contribution-list">
                          <li>多内容场景（回答 / 想法 / 短容器）统一复用</li>
                          <li>多端实现一致，显著降低沟通与实现成本</li>
                          <li>实验方案可快速切换，提高验证效率</li>
                          <li>商业与关注能力灵活接入，直接带来业务增长</li>
                        </ul>
                      </div>
                      <div class="interaction-revamp-contribution-block">
                        <p class="interaction-revamp-decision-note-heading">我的关键贡献</p>
                        <p class="interaction-revamp-contribution-subtitle">项目把控</p>
                        <ul class="interaction-revamp-decision-list interaction-revamp-contribution-list">
                          <li>梳理多版本方案与节奏，确保复杂改版稳定推进</li>
                        </ul>
                        <p class="interaction-revamp-contribution-subtitle">风险预判</p>
                        <ul class="interaction-revamp-decision-list interaction-revamp-contribution-list">
                          <li>识别多实验并行带来的体验与数据问题</li>
                          <li>推动统一方案降低不确定性</li>
                        </ul>
                        <p class="interaction-revamp-contribution-subtitle">资源协调</p>
                        <ul class="interaction-revamp-decision-list interaction-revamp-contribution-list">
                          <li>在短容器资源受限下推进三端统一落地</li>
                          <li>平衡效率与体验，保证最终效果</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>
              `
              : `
                <div class="zhihu-social-overview-diagram" aria-label="弱社交关系下连接发生路径图">
                  <div class="zhihu-social-flow-diagram">
                    <div class="zhihu-social-flow-diagram-top">
                      <article class="zhihu-social-flow-card zhihu-social-flow-card--content">
                        <h4>内容页</h4>
                        <p>产生兴趣</p>
                      </article>
                      <article class="zhihu-social-flow-card zhihu-social-flow-card--profile">
                        <h4>个人页</h4>
                        <p>理解人</p>
                      </article>
                    </div>
                    <div class="zhihu-social-flow-diagram-rates" aria-hidden="true">
                      <div class="zhihu-social-flow-rate zhihu-social-flow-rate--content">
                        <span class="zhihu-social-flow-rate-arrow">↓</span>
                        <span class="zhihu-social-flow-rate-value">38.5%</span>
                      </div>
                      <div class="zhihu-social-flow-rate zhihu-social-flow-rate--profile">
                        <span class="zhihu-social-flow-rate-arrow">↓</span>
                        <span class="zhihu-social-flow-rate-value">40%</span>
                      </div>
                    </div>
                    <article class="zhihu-social-flow-card zhihu-social-flow-card--follow">
                      <h4>关注行为</h4>
                      <p>建立连接</p>
                    </article>
                    <p class="zhihu-social-flow-caption">用户先被内容吸引，再决定是否连接这个人</p>
                  </div>
                </div>
                <section class="zhihu-social-content-module">
                  <div class="zhihu-social-content-copy">
                    <h3>内容页</h3>
                    <p>在内容页建立连接，是整个社交链路中最关键的一环。<br/>围绕提升关注转化，我持续迭代互动 bar 设计，并在数据与体验上取得了稳定提升（该项目已单独作为案例展开）。</p>
                  </div>
                  <a class="zhihu-social-content-link" href="#" aria-label="知乎互动 bar 改版项目">
                    知乎互动 bar 改版项目
                    <img class="zhihu-social-content-link-icon" src="/assets/case-study/zhihu-social-link-icon.svg" alt="" aria-hidden="true" />
                  </a>
                </section>
                <div class="zhihu-social-image-placeholder">
                  <img class="zhihu-social-image-placeholder-img" src="/assets/case-study/zhihu-social-interaction-bar-4x.png?v=20260504-1449" alt="知乎互动 bar 改版项目配图" loading="lazy" />
                </div>
                <section class="zhihu-social-content-module">
                  <div class="zhihu-social-content-copy">
                    <h3>个人页</h3>
                    <p>在知乎，用户的连接建立在内容之上：先认同观点，再决定是否关注这个人。<br/>因此，在进入个人页时，用户的核心目标不是继续消费内容，而是快速判断“这个人是谁，是否值得关注”</p>
                  </div>
                </section>
              `
          }
        </section>

        ${isInteractionBarRevampPage ? "" : `
        <section class="zhihu-social-section reveal is-visible" id="social-profile">
          <article class="zhihu-social-profile-module">
            <p class="zhihu-social-profile-tag">1. 个人页</p>
            <h2 class="zhihu-social-profile-title">个人页：建立人设，提升「人」的影响力</h2>
            <p class="zhihu-social-profile-subtitle">个人页不仅展示信息，更需要形成清晰的人设表达，帮助用户在短时间内完成认知与决策。</p>
            <figure class="zhihu-social-profile-image">
              <img src="/assets/case-study/zhihu-social-profile-module.png?v=20260504-1153" alt="个人页改前改后模块图" loading="lazy" />
            </figure>
          </article>
        </section>

        <section class="zhihu-social-section reveal is-visible" id="social-diagnosis">
          ${SecondaryTitleBlock({
            label: "01/问题诊断",
            title: "关注决策链路在个人页发生断裂"
          })}
          <div class="zhihu-social-diagnosis-paths" aria-label="问题诊断路径对比">
            <article class="zhihu-social-diagnosis-path zhihu-social-diagnosis-path--ideal">
              <p class="zhihu-social-diagnosis-path-label zhihu-social-diagnosis-path-label--ideal">✓ 理想路径</p>
              <div class="zhihu-social-diagnosis-path-flow">
                <div class="zhihu-social-diagnosis-node">内容页</div>
                <div class="zhihu-social-diagnosis-arrow" aria-hidden="true"></div>
                <div class="zhihu-social-diagnosis-node">个人页</div>
                <div class="zhihu-social-diagnosis-arrow" aria-hidden="true"></div>
                <div class="zhihu-social-diagnosis-node">认知</div>
                <div class="zhihu-social-diagnosis-arrow" aria-hidden="true"></div>
                <div class="zhihu-social-diagnosis-node">信任</div>
                <div class="zhihu-social-diagnosis-arrow" aria-hidden="true"></div>
                <div class="zhihu-social-diagnosis-node zhihu-social-diagnosis-node--focus">关注</div>
              </div>
            </article>

            <article class="zhihu-social-diagnosis-path zhihu-social-diagnosis-path--problem">
              <p class="zhihu-social-diagnosis-path-label zhihu-social-diagnosis-path-label--problem">✕ 问题路径</p>
              <div class="zhihu-social-diagnosis-path-flow">
                <div class="zhihu-social-diagnosis-node zhihu-social-diagnosis-node--muted">内容页</div>
                <div class="zhihu-social-diagnosis-arrow zhihu-social-diagnosis-arrow--muted" aria-hidden="true"></div>
                <div class="zhihu-social-diagnosis-node zhihu-social-diagnosis-node--muted">个人页</div>
                <div class="zhihu-social-diagnosis-arrow zhihu-social-diagnosis-arrow--muted" aria-hidden="true"></div>
                <div class="zhihu-social-diagnosis-breakpoint">
                  <p><strong>断点1：人设表达不足 · </strong><span>信息分散</span></p>
                  <p><strong>断点2：优质内容未参与判断</strong></p>
                  <p><strong>断点3：决策路径断裂 · </strong><span>按钮缺少承接</span></p>
                </div>
                <div class="zhihu-social-diagnosis-arrow zhihu-social-diagnosis-arrow--muted" aria-hidden="true"></div>
                <div class="zhihu-social-diagnosis-node zhihu-social-diagnosis-node--muted">放弃关注</div>
              </div>
            </article>
          </div>
          <div class="zhihu-social-gradient-card zhihu-social-gradient-card--large zhihu-social-goal-image-box">
            <img class="zhihu-social-goal-image" src="/assets/case-study/zhihu-social-goal-4x.png?v=20260504-1826" alt="问题路径问题点示意图" loading="lazy" />
          </div>
          <div class="zhihu-social-diagnosis-quote">
            <span class="zhihu-social-diagnosis-quote-line" aria-hidden="true"></span>
            <p class="zhihu-social-diagnosis-quote-text">
              关注决策链路在个人页发生断裂，其中关键原因是人设表达不足，导致用户难以形成对“人”的快速认知。<br />
              <span class="zhihu-social-diagnosis-quote-highlight">因此，将建立人设作为设计目标，降低用户的关注决策成本</span>
            </p>
          </div>
        </section>

        <section class="zhihu-social-section reveal is-visible" id="social-goal">
          ${SecondaryTitleBlock({
            label: "02/目标拆解",
            title: "建立人设，降低用户的关注决策成本"
          })}
          <div class="zhihu-social-gradient-card zhihu-social-gradient-card--large zhihu-social-goal-image-box">
            <img class="zhihu-social-goal-image" src="/assets/case-study/zhihu-social-goal-target-4x.png?v=20260504-2147" alt="建立人设，降低用户关注决策成本配图" loading="lazy" />
          </div>
        </section>

        <section class="zhihu-social-section reveal is-visible" id="social-plan">
          ${SecondaryTitleBlock({
            label: "03/方案落地",
            title: "客人态：围绕身份、价值与信任，重构关注决策表达",
            desc: "针对决策链路中的认知断点，从身份、价值与信任三个层面，重构个人页的信息表达方式。"
          })}
          <div class="zhihu-social-plan-module" data-social-plan-module>
            <div class="zhihu-social-carousel zhihu-social-carousel--plan" aria-label="方案落地轮播图">
              <div class="zhihu-social-plan-switch-row">
                <div class="zhihu-view-switch zhihu-social-plan-tabs" role="tablist" aria-label="方案落地视角切换">
                  <button type="button" class="zhihu-social-plan-tab is-active" role="tab" aria-selected="true" data-social-plan-tab="identity">身份</button>
                  <button type="button" class="zhihu-social-plan-tab" role="tab" aria-selected="false" data-social-plan-tab="value">价值</button>
                  <button type="button" class="zhihu-social-plan-tab" role="tab" aria-selected="false" data-social-plan-tab="trust">信任</button>
                </div>
              </div>
              <div class="zhihu-social-carousel-track">
                <figure class="zhihu-social-carousel-slide is-active" data-social-plan-slide="identity">
                  <img class="js-zoomable-image" data-zoom-group="social-plan-carousel" data-zoom-view="identity" data-zoom-order="0" src="/assets/case-study/zhihu-social-plan-1-4x.png?v=20260504-2258" alt="方案落地身份图" loading="eager" />
                </figure>
                <figure class="zhihu-social-carousel-slide" data-social-plan-slide="value">
                  <img class="js-zoomable-image" data-zoom-group="social-plan-carousel" data-zoom-view="value" data-zoom-order="1" src="/assets/case-study/zhihu-social-plan-2-4x.png?v=20260504-2258" alt="方案落地价值图" loading="lazy" />
                </figure>
                <figure class="zhihu-social-carousel-slide" data-social-plan-slide="trust">
                  <img class="js-zoomable-image" data-zoom-group="social-plan-carousel" data-zoom-view="trust" data-zoom-order="2" src="/assets/case-study/zhihu-social-plan-3-4x.png?v=20260504-2258" alt="方案落地信任图" loading="lazy" />
                </figure>
              </div>
            </div>
          </div>

          <article class="zhihu-social-owner-module">
            <h3 class="zhihu-social-owner-title">主人态：引导用户完善表达，建立清晰身份</h3>
            <p class="zhihu-social-owner-subtitle">通过任务引导与信息结构设计，帮助用户补全关键资料，使其更容易被理解与关注</p>
            ${OwnerCaption("a、针对全新用户做 0～1 的强引导：")}
            <figure class="zhihu-social-owner-image">
              <img src="/assets/case-study/zhihu-social-owner-module.png?v=20260504-1207" alt="主人态模块示意图" loading="lazy" />
            </figure>
            ${OwnerCaption("b、简化编辑资料流程", { secondary: true })}
            <figure class="zhihu-social-owner-image zhihu-social-owner-image--secondary">
              <img src="/assets/case-study/zhihu-social-owner-module-b.png?v=20260504-1220" alt="主人态资料编辑流程模块图" loading="lazy" />
            </figure>
          </article>
        </section>

        <section class="zhihu-social-section reveal is-visible" id="social-result">
          ${SecondaryTitleBlock({
            label: "04/项目收益",
            title: "人设表达优化，显著提升关注决策效率：<span class=\"zhihu-social-diagnosis-highlight\">关注CTR +12%</span>",
            titleIsHtml: true
          })}
        </section>
        `}

        ${isInteractionBarRevampPage ? "" : `
        <section class="zhihu-social-section reveal is-visible" id="social-zhilink">
          <div class="zhihu-social-divider zhihu-social-divider--spacious" aria-hidden="true"></div>
          <article class="zhihu-social-profile-module">
            <p class="zhihu-social-profile-tag">2. ${escapeHtml(zhlinkCase.hero.title.split("：")[0] || "ZhiLink")}</p>
            <h2 class="zhihu-social-profile-title">${escapeHtml(zhlinkCase.hero.title)}</h2>
            <p class="zhihu-social-profile-subtitle" style="margin-bottom: 0;">${escapeHtml(zhlinkCase.hero.desc)}</p>
            ${ImageBlock(zhlinkCase.hero.image, "ZhiLink 插图")}
            ${SecondaryTitleBlock({
              label: zhlinkCase.hero.goalLabel || "",
              title: Array.isArray(zhlinkCase.hero.summary) ? zhlinkCase.hero.summary[0] || "" : "",
              desc: Array.isArray(zhlinkCase.hero.summary) ? zhlinkCase.hero.summary[1] || "" : "",
              sectionClass: "zhihu-social-diagnosis-head--after-image",
              sectionId: "social-zhilink-goal"
            })}
            ${InfoCards(zhlinkCase.infoCards)}
            ${zhlinkCase.hero?.coreFlow
              ? SecondaryTitleBlock({
                  label: zhlinkCase.hero.coreFlow.label || "",
                  title: zhlinkCase.hero.coreFlow.title || "",
                  sectionClass: "zhihu-social-diagnosis-head--after-image",
                  sectionId: "social-zhilink-flow"
                })
              : ""}
            ${Array.isArray(zhlinkCase.sections) && zhlinkCase.sections[0]?.title
              ? `<h3 class="zhilink-third-title">${escapeHtml(zhlinkCase.sections[0].title)}</h3>`
              : ""}
            ${Array.isArray(zhlinkCase.sections) && Array.isArray(zhlinkCase.sections[0]?.introLines)
              ? `
                <div class="zhilink-third-copy">
                  ${zhlinkCase.sections[0].introLines[0] ? `<p>${escapeHtml(zhlinkCase.sections[0].introLines[0])}</p>` : ""}
                  ${zhlinkCase.sections[0].introLines[1] ? `<p class="zhilink-third-copy-emphasis">${escapeHtml(zhlinkCase.sections[0].introLines[1])}</p>` : ""}
                  ${zhlinkCase.sections[0].introLines[2] ? `<p>${escapeHtml(zhlinkCase.sections[0].introLines[2])}</p>` : ""}
                </div>
              `
              : ""}
            ${Array.isArray(zhlinkCase.sections) && zhlinkCase.sections[0]?.module
              ? `
                <article class="zhihu-social-owner-module">
                  ${zhlinkCase.sections[0].module.title ? `<h3 class="zhihu-social-owner-title">${escapeHtml(zhlinkCase.sections[0].module.title)}</h3>` : ""}
                  ${zhlinkCase.sections[0].module.subtitle ? `<p class="zhihu-social-owner-subtitle">${escapeHtml(zhlinkCase.sections[0].module.subtitle)}</p>` : ""}
                  ${OwnerCaption(zhlinkCase.sections[0].module.caption || "")}
                  ${(() => {
                    const primaryImages = Array.isArray(zhlinkCase.sections[0].module.images)
                      ? zhlinkCase.sections[0].module.images
                      : zhlinkCase.sections[0].module.image
                        ? [zhlinkCase.sections[0].module.image]
                        : [];
                    if (!primaryImages.length) {
                      return "";
                    }
                    return `
                      <div class="zhihu-social-gradient-card zhihu-social-gradient-card--large zhihu-social-goal-image-box">
                        <div class="zhilink-module-image-stack">
                          ${primaryImages
                            .map(
                              (src, index) =>
                                `<img class="zhihu-social-goal-image" src="${escapeHtml(src || "")}" alt="方案 a 交互示意图 ${index + 1}" loading="lazy" />`
                            )
                            .join("")}
                        </div>
                      </div>
                    `;
                  })()}
                  ${OwnerCaption(zhlinkCase.sections[0].module.secondaryCaption || "", { secondary: true })}
                  ${(Array.isArray(zhlinkCase.sections[0].module.secondaryImages)
                    ? zhlinkCase.sections[0].module.secondaryImages
                    : zhlinkCase.sections[0].module.secondaryImage
                      ? [zhlinkCase.sections[0].module.secondaryImage]
                      : []
                  )
                    .map(
                      (src, index) => `
                        <div class="zhihu-social-gradient-card zhihu-social-gradient-card--large zhihu-social-goal-image-box${index > 0 ? " zhilink-module-image-container--stacked" : ""}">
                          <img class="zhihu-social-goal-image" src="${escapeHtml(src || "")}" alt="方案 b 交互示意图 ${index + 1}" loading="lazy" />
                        </div>
                      `
                    )
                    .join("")}
                  ${zhlinkCase.sections[0].module.decisionNote
                    ? `
                        <div class="zhihu-social-diagnosis-quote">
                          <span class="zhihu-social-diagnosis-quote-line" aria-hidden="true"></span>
                          <p class="zhihu-social-diagnosis-quote-text">
                            <strong>${escapeHtml(zhlinkCase.sections[0].module.decisionNote.title || "")}</strong><br />
                            ${escapeHtml(zhlinkCase.sections[0].module.decisionNote.body || "")}
                            ${escapeHtml(zhlinkCase.sections[0].module.decisionNote.summary || "")}
                          </p>
                        </div>
                      `
                    : ""}
                </article>
              `
              : ""}
            ${Array.isArray(zhlinkCase.sections) && zhlinkCase.sections[1]
              ? `
                  <h3 class="zhilink-third-title">${escapeHtml(zhlinkCase.sections[1].title || "")}</h3>
                  ${zhlinkCase.sections[1].content
                    ? `<div class="zhilink-third-copy"><p>${escapeHtml(zhlinkCase.sections[1].content)}</p></div>`
                    : ""}
                  ${zhlinkCase.sections[1].image
                    ? `
                        <div class="zhihu-social-gradient-card zhihu-social-gradient-card--large zhihu-social-goal-image-box">
                          <img class="zhihu-social-goal-image" src="${escapeHtml(zhlinkCase.sections[1].image)}" alt="精美展示模块示意图" loading="lazy" />
                        </div>
                      `
                    : ""}
                `
              : ""}
            ${Array.isArray(zhlinkCase.sections) && zhlinkCase.sections[2]
              ? `
                  <h3 class="zhilink-third-title">${escapeHtml(zhlinkCase.sections[2].title || "")}</h3>
                  ${zhlinkCase.sections[2].content
                    ? `<div class="zhilink-third-copy"><p>${escapeHtml(zhlinkCase.sections[2].content)}</p></div>`
                    : ""}
                  <div class="zhihu-social-gradient-card zhihu-social-gradient-card--large zhihu-social-goal-image-box zhilink-image-box--full-bleed">
                    ${zhlinkCase.sections[2].image ? `<img class="zhihu-social-goal-image zhilink-image--full-bleed" src="${escapeHtml(zhlinkCase.sections[2].image)}" alt="乐意分享模块示意图" loading="lazy" />` : ""}
                  </div>
                `
              : ""}
            ${zhlinkCase.resultSection
              ? SecondaryTitleBlock({
                  label: zhlinkCase.resultSection.label || "",
                  title: zhlinkCase.resultSection.title || "",
                  sectionClass: "zhihu-social-diagnosis-head--after-image",
                  sectionId: "social-zhilink-result"
                })
              : ""}
            ${renderZhilinkResultGrid(zhlinkCase.resultSection?.cards)}
            ${zhlinkCase.resultSection?.note
              ? `
                  <div class="zhihu-social-diagnosis-quote">
                    <span class="zhihu-social-diagnosis-quote-line" aria-hidden="true"></span>
                    <p class="zhihu-social-diagnosis-quote-text">
                      ${Array.isArray(zhlinkCase.resultSection.note.lines)
                        ? zhlinkCase.resultSection.note.lines.map((line) => `${escapeHtml(line)}<br />`).join("")
                        : ""}
                      <br />
                      ${escapeHtml(zhlinkCase.resultSection.note.summary || "")}
                    </p>
                  </div>
                `
              : ""}
          </article>
        </section>

        <section class="zhihu-social-section reveal is-visible" id="social-circle">
          <div class="zhihu-social-divider zhihu-social-divider--spacious" aria-hidden="true"></div>
          <p class="zhihu-social-profile-tag">3. 知乎圈子</p>
          <h2>知乎圈子：基于兴趣的社交连接</h2>
          <p>在以「内容」为基础的建立的弱连接之外，提供一个基于「兴趣」的聚合场景，构建知乎“半私域场”，让用户能够持续互动，并形成更稳定的连接关系，提升用户活跃与留存</p>
          <div class="zhihu-social-gradient-card zhihu-social-gradient-card--large zhihu-social-goal-image-box zhilink-image-box--full-bleed">
            <img class="zhihu-social-goal-image zhilink-image--full-bleed" src="/assets/case-study/zhihu-circle-showcase-01-20260505.png?v=20260505-2230" alt="知乎圈子模块示意图" loading="lazy" />
          </div>
          ${zhlinkCase.circleDefinition
            ? SecondaryTitleBlock({
                label: zhlinkCase.circleDefinition.label || "",
                title: zhlinkCase.circleDefinition.title || "",
                sectionClass: "zhihu-social-diagnosis-head--after-image",
                sectionId: "social-circle-definition"
              })
            : ""}
          ${Array.isArray(zhlinkCase.circleDefinition?.paragraphs) && zhlinkCase.circleDefinition.paragraphs.length
            ? `
                <div class="zhilink-third-copy">
                  ${zhlinkCase.circleDefinition.paragraphs
                    .map((text) => {
                      const safeText = escapeHtml(text || "");
                      const mutedText = safeText.replace(/（[^）]+）/g, (match) => `<span class="zhihu-tech-note">${match}</span>`);
                      return `<p>${mutedText}</p>`;
                    })
                    .join("")}
                </div>
              `
            : ""}
          <div class="zhihu-social-gradient-card zhihu-social-gradient-card--large zhihu-social-goal-image-box">
            <img class="zhihu-social-goal-image zhilink-image--623" src="/assets/case-study/zhihu-circle-showcase-02-20260505.png?v=20260506-0828" alt="知乎圈子补充示意图" loading="lazy" />
          </div>
          ${zhlinkCase.circleFlowSection
            ? SecondaryTitleBlock({
                label: zhlinkCase.circleFlowSection.label || "",
                title: zhlinkCase.circleFlowSection.title || "",
                desc: zhlinkCase.circleFlowSection.desc || "",
                sectionClass: "zhihu-social-diagnosis-head--after-image",
                sectionId: "social-circle-flow"
              })
            : ""}
          <div class="zhihu-social-gradient-card zhihu-social-gradient-card--large zhihu-social-goal-image-box">
            <img class="zhihu-social-goal-image zhilink-image--568" src="/assets/case-study/zhihu-circle-chain-showcase-01-20260506.png?v=20260507-0003" alt="圈子完整链路示意图" loading="lazy" />
          </div>
          ${zhlinkCase.circleInnerSection
            ? `
                <h3 class="zhilink-third-title zhilink-third-title--muted" style="font-size: 20px;">${escapeHtml(zhlinkCase.circleInnerSection.title || "")}</h3>
                ${zhlinkCase.circleInnerSection.content ? `<div class="zhilink-third-copy"><p>${escapeHtml(zhlinkCase.circleInnerSection.content)}</p></div>` : ""}
                <div class="zhihu-social-gradient-card zhihu-social-gradient-card--large zhihu-social-goal-image-box">
                  ${zhlinkCase.circleInnerSection.image ? `<img class="zhihu-social-goal-image zhilink-image--668" src="${escapeHtml(zhlinkCase.circleInnerSection.image)}" alt="圈子向内构建兴趣场示意图" loading="lazy" />` : ""}
                </div>
              `
            : ""}
          ${zhlinkCase.circleOuterUpSection
            ? `
                <h3 class="zhilink-third-title zhilink-third-title--muted" style="font-size: 20px;">${escapeHtml(zhlinkCase.circleOuterUpSection.title || "")}</h3>
                ${zhlinkCase.circleOuterUpSection.content ? `<div class="zhilink-third-copy"><p>${escapeHtml(zhlinkCase.circleOuterUpSection.content)}</p></div>` : ""}
                <div class="zhihu-social-gradient-card zhihu-social-gradient-card--large zhihu-social-goal-image-box">
                  ${zhlinkCase.circleOuterUpSection.image ? `<img class="zhihu-social-goal-image zhilink-image--668" src="${escapeHtml(zhlinkCase.circleOuterUpSection.image)}" alt="圈子向外承接与向上反哺示意图" loading="lazy" />` : ""}
                </div>
              `
            : ""}
          ${zhlinkCase.circleDownSection
            ? `
                <h3 class="zhilink-third-title zhilink-third-title--muted" style="font-size: 20px;">${escapeHtml(zhlinkCase.circleDownSection.title || "")}</h3>
                ${zhlinkCase.circleDownSection.content ? `<div class="zhilink-third-copy"><p>${escapeHtml(zhlinkCase.circleDownSection.content)}</p></div>` : ""}
                <div class="zhihu-social-gradient-card zhihu-social-gradient-card--large zhihu-social-goal-image-box">
                  ${zhlinkCase.circleDownSection.image ? `<img class="zhihu-social-goal-image zhilink-image--668" src="${escapeHtml(zhlinkCase.circleDownSection.image)}" alt="圈子向下沉淀用户关系示意图" loading="lazy" />` : ""}
                </div>
              `
            : ""}
          ${zhlinkCase.circleKeyDesignSection
            ? SecondaryTitleBlock({
                label: zhlinkCase.circleKeyDesignSection.label || "",
                title: zhlinkCase.circleKeyDesignSection.title || "",
                desc: zhlinkCase.circleKeyDesignSection.desc || "",
                sectionClass: "zhihu-social-diagnosis-head--after-image",
                sectionId: "social-circle-key-design"
              })
            : ""}
          ${zhlinkCase.circleKeyDesignSection?.image
            ? `
                <div class="zhihu-social-gradient-card zhihu-social-gradient-card--large zhihu-social-goal-image-box">
                  <img class="zhihu-social-goal-image zhilink-image--668" src="${escapeHtml(zhlinkCase.circleKeyDesignSection.image)}" alt="圈子关键设计双层容器架构示意图" loading="lazy" />
                </div>
              `
            : ""}
          ${zhlinkCase.circleKeyDesignVisualSection
            ? `
                <h3 class="zhilink-third-title">${escapeHtml(zhlinkCase.circleKeyDesignVisualSection.title || "")}</h3>
                ${zhlinkCase.circleKeyDesignVisualSection.content ? `<div class="zhilink-third-copy"><p>${escapeHtml(zhlinkCase.circleKeyDesignVisualSection.content)}</p></div>` : ""}
                <div class="zhihu-social-gradient-card zhihu-social-gradient-card--large zhihu-social-goal-image-box">
                  ${zhlinkCase.circleKeyDesignVisualSection.image ? `<img class="zhihu-social-goal-image zhilink-image--668" src="${escapeHtml(zhlinkCase.circleKeyDesignVisualSection.image)}" alt="圈子视觉与氛围构建示意图" loading="lazy" />` : ""}
                </div>
              `
            : ""}
          ${zhlinkCase.circleResultSection
            ? SecondaryTitleBlock({
                label: zhlinkCase.circleResultSection.label || "",
                title: zhlinkCase.circleResultSection.title || "",
                sectionClass: "zhihu-social-diagnosis-head--after-image",
                sectionId: "social-circle-result"
              })
            : ""}
          ${Array.isArray(zhlinkCase.circleResultModules) && zhlinkCase.circleResultModules.length
            ? zhlinkCase.circleResultModules
                .map((module, index) => {
                  const cards = Array.isArray(module?.cards) ? module.cards : [];
                  const summary = module?.summary && typeof module.summary === "object" ? module.summary : null;
                  return `
                    <article class="zhilink-result-module">
                      <h3 class="zhilink-third-title zhilink-third-title--muted" style="font-size: 20px;">${escapeHtml(module?.title || "")}</h3>
                      ${renderZhilinkResultGrid(cards, module?.gridVariant)}
                      ${
                        summary
                          ? `<div class="zhilink-third-copy zhilink-result-summary">
                              ${summary.intro ? `<p>${escapeHtml(summary.intro)}</p>` : ""}
                              ${
                                Array.isArray(summary.bullets) && summary.bullets.length
                                  ? `<ul class="zhilink-result-summary-list">
                                      ${summary.bullets
                                        .map((bullet) => {
                                          const renderedBullet = escapeHtml(String(bullet || "")).replace(
                                            "用户活跃与互动率",
                                            '<span class="zhilink-result-summary-strong">用户活跃与互动率</span>'
                                          );
                                          return `<li>${renderedBullet}</li>`;
                                        })
                                        .join("")}
                                    </ul>`
                                  : ""
                              }
                              ${summary.conclusion ? `<p>${escapeHtml(summary.conclusion)}</p>` : ""}
                            </div>`
                          : ""
                      }
                    </article>
                  `;
                })
                .join("")
            : ""}
          ${zhlinkCase.circleConnectWaysSection
            ? `
                <div class="zhihu-social-divider zhihu-social-divider--spacious" aria-hidden="true"></div>
                <article class="zhihu-social-connect-ways zhihu-social-connect-ways--with-divider">
                  <div class="zhihu-social-connect-ways-head">
                    <h2 class="zhihu-social-connect-ways-title">${escapeHtml(zhlinkCase.circleConnectWaysSection.title || "")}</h2>
                    ${zhlinkCase.circleConnectWaysSection.desc ? `<p class="zhihu-social-connect-ways-desc">${escapeHtml(zhlinkCase.circleConnectWaysSection.desc)}</p>` : ""}
                  </div>
                  ${
                    Array.isArray(zhlinkCase.circleConnectWaysSection.cards) && zhlinkCase.circleConnectWaysSection.cards.length
                      ? `<div class="zhihu-social-connect-ways-grid">
                          ${zhlinkCase.circleConnectWaysSection.cards
                            .map((item, index) => {
                              const text = String(item || "");
                              const parts = text.split("\n").filter(Boolean);
                              return `
                                <article class="zhihu-social-connect-way-card zhihu-social-connect-way-card--${index + 1}">
                                  <p class="zhihu-social-connect-way-text">
                                    ${parts.map((line) => escapeHtml(line)).join("<br />")}
                                  </p>
                                </article>
                              `;
                            })
                            .join("")}
                        </div>`
                      : ""
                  }
                </article>
              `
            : ""}
        </section>
        `}

      </div>
    </main>

    ${renderFooter(content, { caseNav: buildCaseFooterLinks(content, work.slug) })}
  `;

  return renderLayout({
    title: `${work.title} | Case Study`,
    description: work.caseStudy.lead || "知乎社交设计案例",
    bodyClass: `case-study-page case-study-page--zhihu-social${isInteractionBarRevampPage ? " case-study-page--interaction-revamp-lite" : ""}`,
    content,
    body,
    script: renderPublicScript()
  });
}

function SecondaryTitleBlock({ label = "", title = "", desc = "", sectionClass = "", titleIsHtml = false, sectionId = "" }) {
  const headingClass = `zhihu-social-diagnosis-head${sectionClass ? ` ${sectionClass}` : ""}${sectionId ? " zhihu-social-anchor-target" : ""}`;
  const resolvedTitle = titleIsHtml ? title : escapeHtml(title);
  const resolvedId = sectionId ? ` id="${escapeHtml(sectionId)}"` : "";
  return `
    <div class="${headingClass}"${resolvedId}>
      ${label ? `<p class="zhihu-social-diagnosis-label">${escapeHtml(label)}</p>` : ""}
      <h2 class="zhihu-social-diagnosis-title">${resolvedTitle}</h2>
      ${desc ? `<p class="zhihu-social-diagnosis-copy">${escapeHtml(desc)}</p>` : ""}
    </div>
  `;
}

function OwnerCaption(text = "", { secondary = false } = {}) {
  if (!text) return "";
  return `<p class="zhihu-social-owner-caption${secondary ? " zhihu-social-owner-caption--secondary" : ""}">${escapeHtml(text)}</p>`;
}

function renderZhilinkResultGrid(cards = [], gridVariant = "") {
  if (!Array.isArray(cards) || !cards.length) return "";
  const gridClass = `zhilink-result-grid${gridVariant === "compact" ? " zhilink-result-grid--compact" : ""}`;
  return `
    <div class="${gridClass}">
      ${cards
        .map((item) => {
          const rawValue = String(item?.value || "");
          const match = rawValue.match(/^([^（(]+?)([（(].*[）)])$/);
          const valueMain = match ? match[1].trim() : rawValue;
          const valueNote = match ? match[2].trim() : "";
          return `
            <article class="zhilink-result-card">
              <p class="zhilink-result-card-label">${escapeHtml(item?.label || "")}</p>
              <div class="zhilink-result-card-value-row">
                <strong class="zhilink-result-card-value">${escapeHtml(valueMain)}</strong>
                ${valueNote ? `<span class="zhilink-result-card-note">${escapeHtml(valueNote)}</span>` : ""}
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function ImageBlock(image, ariaLabel = "案例图片容器预留位") {
  if (!image || typeof image !== "object" || !image.src) {
    return `<div class="zhilink-empty-image-container" aria-label="${escapeHtml(ariaLabel)}"></div>`;
  }

  const frameClass = image.dark ? "zhilink-image-frame zhilink-image-frame--dark" : "zhilink-image-frame";
  return `
    <figure class="${frameClass}">
      <img class="zhilink-image" src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || "案例配图")}" loading="lazy" />
    </figure>
  `;
}

function HeroSection(hero = {}) {
  const summaryList = Array.isArray(hero.summary) ? hero.summary : [];
  const imageConfig =
    hero.image && typeof hero.image === "object"
      ? hero.image
      : null;

  return `
    <section class="zhilink-case-hero reveal is-visible" id="zhilink-overview">
      <p class="zhilink-case-tag">${escapeHtml(hero.tag || "")}</p>
      <h1 class="zhihu-social-title zhilink-case-title">${escapeHtml(hero.title || "")}</h1>
      <p class="zhilink-case-lead">${escapeHtml(hero.desc || "")}</p>
      ${ImageBlock(imageConfig, "ZhiLink 图片容器预留位")}
      ${SecondaryTitleBlock({
        label: hero.goalLabel || "",
        title: summaryList[0] || "",
        desc: summaryList[1] || "",
        sectionClass: "zhihu-social-diagnosis-head--after-image"
      })}
    </section>
  `;
}

function InfoCards(cards = []) {
  if (!cards.length) {
    return "";
  }

  return `
    <div class="zhilink-info-cards">
      ${cards
        .map(
          (item) => `
            <article class="zhilink-info-card">
              <span class="case-label">${escapeHtml(item.title || "")}</span>
              <p>${escapeHtml(item.desc || "")}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function SectionBlock(section = {}) {
  const images = Array.isArray(section.images) ? section.images : [];
  return `
    <section class="zhihu-social-section zhilink-case-section reveal is-visible" id="${escapeHtml(section.id || "")}">
      ${SecondaryTitleBlock({
        title: section.title || "",
        desc: section.content || ""
      })}
      ${images
        .map((image, index) =>
          ImageBlock(
            image && typeof image === "object" ? image : null,
            `${escapeHtml(section.title || "章节")} 图片容器预留位 ${index + 1}`
          )
        )
        .join("")}
    </section>
  `;
}

function DataCards(data = [], title = "") {
  if (!data.length) {
    return "";
  }

  return `
    <section class="zhihu-social-section zhilink-case-section reveal is-visible" id="zhilink-metrics">
      ${SecondaryTitleBlock({ title })}
      <div class="zhilink-data-grid">
        ${data
          .map(
            (item) => `
              <article class="zhilink-data-card">
                <p class="zhilink-data-label">${escapeHtml(item.label || "")}</p>
                <strong>${escapeHtml(item.value || "")}</strong>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function ConclusionBlock(conclusion = "") {
  return `
    <section class="zhihu-social-section zhilink-case-section reveal is-visible" id="zhilink-closing">
      <p class="zhilink-closing-text">${escapeHtml(conclusion)}</p>
    </section>
  `;
}

function CaseTemplate({ outlineItems = [], hero = {}, infoCards = [], sections = [], data = [], dataTitle = "", conclusion = "" }) {
  return `
    <main class="case-shell zhihu-social-shell zhilink-case-shell">
      <aside class="zhihu-social-rail reveal is-visible" aria-label="章节导航">
        <div class="zhihu-social-outline case-outline" data-outline-nav>
          <span class="zhihu-case-outline-line case-outline-line" data-outline-line aria-hidden="true">
            <span class="zhihu-case-outline-indicator case-outline-indicator" data-outline-indicator></span>
          </span>
          <div class="zhihu-social-outline-content">
            ${outlineItems
              .map((item) => `<a href="${escapeHtml(item.href)}" class="zhihu-social-outline-link${item.bullet ? " zhihu-social-outline-link--bullet" : ""}">${escapeHtml(item.label)}</a>`)
              .join("")}
          </div>
        </div>
      </aside>

      <div class="zhihu-social-main zhilink-case-main">
        ${HeroSection(hero)}
        ${InfoCards(infoCards)}
        ${sections.map((section) => SectionBlock(section)).join("")}
        ${DataCards(data, dataTitle)}
        ${ConclusionBlock(conclusion)}
      </div>
    </main>
  `;
}

function renderZhihuZhiLinkCasePage(content, work) {
  const sectionItems = Array.isArray(zhlinkCase.sections) ? zhlinkCase.sections : [];
  const outlineItems = [
    { href: "#zhilink-overview", label: "第二部分：ZhiLink" },
    { href: "/work/interest-circle-community#social-profile", label: "第一部分：个人页（已存在）", bullet: true },
    ...sectionItems.map((section) => ({
      href: `#${section.id}`,
      label: section.title,
      bullet: true
    })),
    { href: "#zhilink-metrics", label: "04 项目结果", bullet: true },
    { href: "#zhilink-closing", label: "结尾", bullet: true }
  ];

  const caseSections = sectionItems.map((section) => ({
    id: section.id,
    title: section.title,
    content: section.content,
    images: Array.isArray(section.images)
      ? section.images.map((item, index) =>
          typeof item === "object" && item
            ? item
            : { alt: `${section.title} 图片 ${index + 1}` }
        )
      : []
  }));

  const body = `
    ${renderSiteHeader(content, `/work/${work.slug}`)}
    ${CaseTemplate({
      outlineItems,
      hero: zhlinkCase.hero,
      infoCards: zhlinkCase.infoCards,
      sections: caseSections,
      data: zhlinkCase.data,
      dataTitle: zhlinkCase.dataTitle,
      conclusion: zhlinkCase.conclusion
    })}

    ${renderFooter(content, { caseNav: buildCaseFooterLinks(content, work.slug) })}
  `;

  return renderLayout({
    title: `${work.title} | Case Study`,
    description: work.caseStudy.lead || "ZhiLink：弱连接之外的场景补充",
    bodyClass: "case-study-page case-study-page--zhihu-social",
    content,
    body,
    script: renderPublicScript()
  });
}

function renderZhihuInteractionBarRevampCasePage(content, work) {
  const outlineItems = [
    { href: "#interaction-overview", label: "知乎社交是如何发生的？" },
    { href: "#interaction-compare", label: "改版前后对比" },
    { href: "#interaction-section-1", label: "章节 01（待填写）", bullet: true },
    { href: "#interaction-section-2", label: "章节 02（待填写）", bullet: true },
    { href: "#interaction-section-3", label: "章节 03（待填写）", bullet: true }
  ];

  const placeholderSections = [
    { id: "interaction-section-1", label: "章节 01", title: "请填写一级标题", body: "这里预留正文内容，按你的新案例结构直接替换即可。" },
    { id: "interaction-section-2", label: "章节 02", title: "请填写二级标题", body: "这里预留正文内容，按你的新案例结构直接替换即可。" },
    { id: "interaction-section-3", label: "章节 03", title: "请填写三级标题", body: "这里预留正文内容，按你的新案例结构直接替换即可。" }
  ];

  const body = `
    ${renderSiteHeader(content, `/work/${work.slug}`)}

    <main class="case-shell zhihu-social-shell interaction-revamp-shell">
      <aside class="zhihu-social-rail reveal is-visible" aria-label="章节导航">
        <div class="zhihu-social-outline case-outline" data-outline-nav>
          <span class="zhihu-case-outline-line case-outline-line" data-outline-line aria-hidden="true">
            <span class="zhihu-case-outline-indicator case-outline-indicator" data-outline-indicator></span>
          </span>
          <div class="zhihu-social-outline-content">
            ${outlineItems
              .map((item) => `<a href="${escapeHtml(item.href)}" class="zhihu-social-outline-link${item.bullet ? " zhihu-social-outline-link--bullet" : ""}">${escapeHtml(item.label)}</a>`)
              .join("")}
          </div>
        </div>
      </aside>

      <div class="zhihu-social-main interaction-revamp-main">
        <section class="zhihu-social-hero reveal is-visible" id="interaction-overview">
          <div class="interaction-revamp-intro">
            <div class="interaction-revamp-headline">
              <img class="interaction-revamp-brand" src="/assets/zhicon_brand_zhihu_logo.svg" alt="知乎 Logo" />
              <h1 class="interaction-revamp-title">知乎互动 bar 改版</h1>
            </div>

            <div class="interaction-revamp-meta">
              <div class="interaction-revamp-meta-item interaction-revamp-meta-item--role">
                <span>我的角色</span>
                <strong>产品设计 Owner</strong>
              </div>
              <div class="interaction-revamp-meta-item">
                <span>项目时间</span>
                <strong>2025 年</strong>
              </div>
            </div>
          </div>

          <div class="zhihu-social-divider" aria-hidden="true"></div>
          <p class="zhihu-social-subtitle">${escapeHtml(overviewLabel)}</p>
          <p class="zhihu-social-lead">在「提升互动率」与「用户表达」之间的设计决策</p>
          <p class="zhihu-social-copy">
            知乎的互动建立在内容表达之上，用户先认同观点，再决定是否通过互动参与讨论，因此互动结构需要同时服务增长目标与表达体验。<br />
            在多内容形态持续扩展下，<span class="zhihu-social-copy--strong">设计需要承担统一互动结构与降低表达门槛的责任，让互动更自然地发生。</span>
          </p>
        </section>

        <section class="zhihu-social-section interaction-revamp-section reveal is-visible" id="interaction-compare">
          <div class="interaction-revamp-compare-board" aria-label="改版前后对比容器">
            <div class="interaction-revamp-compare-grid">
              <article class="interaction-revamp-device-card">
                <div class="interaction-revamp-device">
                  <div class="interaction-revamp-device-top"></div>
                  <div class="interaction-revamp-device-lines">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span class="interaction-revamp-device-line-short"></span>
                  </div>
                  <div class="interaction-revamp-device-image"></div>
                </div>
                <div class="interaction-revamp-action-bar interaction-revamp-action-bar--before">
                  <span class="interaction-revamp-vote">▲ 赞同 888</span>
                  <span>♡ 508</span>
                  <span>☆ 4508</span>
                  <span>◔ 450</span>
                  <span class="interaction-revamp-avatar">+ 关注</span>
                </div>
              </article>

              <article class="interaction-revamp-device-card">
                <div class="interaction-revamp-device">
                  <div class="interaction-revamp-device-top"></div>
                  <div class="interaction-revamp-device-lines">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span class="interaction-revamp-device-line-short"></span>
                  </div>
                  <div class="interaction-revamp-device-image"></div>
                </div>
                <div class="interaction-revamp-action-bar interaction-revamp-action-bar--after">
                  <span class="interaction-revamp-avatar">未远不远 + 关注</span>
                  <span>△</span>
                  <span>▽</span>
                  <span>☆ 4508</span>
                  <span>◔ 450</span>
                  <span>⋮</span>
                </div>
              </article>
            </div>

            <div class="interaction-revamp-compare-labels">
              <p>改前</p>
              <p>改后</p>
            </div>
          </div>
        </section>

        ${placeholderSections
          .map(
            (section) => `
              <section class="zhihu-social-section interaction-revamp-section reveal is-visible" id="${escapeHtml(section.id)}">
                <div class="zhihu-social-diagnosis-head">
                  <p class="zhihu-social-diagnosis-label">${escapeHtml(section.label)}</p>
                  <h2 class="zhihu-social-diagnosis-title">${escapeHtml(section.title)}</h2>
                  <p class="zhihu-social-diagnosis-copy">${escapeHtml(section.body)}</p>
                </div>
              </section>
            `
          )
          .join("")}
      </div>
    </main>

    ${renderFooter(content, { caseNav: buildCaseFooterLinks(content, work.slug) })}
  `;

  return renderLayout({
    title: `${work.title} | Case Study`,
    description: work.caseStudy.lead || "知乎互动 bar 改版案例页",
    bodyClass: "case-study-page case-study-page--zhihu-social case-study-page--interaction-revamp",
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
    <link rel="stylesheet" href="/styles.css?v=20260508-1928" />
  </head>
  <body class="${escapeHtml(bodyClass)}">
    ${content ? '<div class="cursor-dot" aria-hidden="true"></div>' : ""}
    ${body}
    ${script}
  </body>
</html>`;
}

function renderHomePage(content) {
  const renderableWorks = getRenderableWorks(content);
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
          ${renderableWorks
            .map(
              (work) => `
                <a class="project-card" href="${escapeHtml(resolveWorkHref(work))}">
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
  const renderableWorks = getRenderableWorks(content);
  const body = `
    ${renderSiteHeader(content, "/works")}

    <main class="page-shell">
      <section class="projects-section reveal is-visible">
        <div class="section-heading">
          <p>${escapeHtml(content.site.workSectionLabel)}</p>
        </div>
        <div class="project-grid">
          ${renderableWorks
            .map(
              (work) => `
                <a class="project-card" href="${escapeHtml(resolveWorkHref(work))}">
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
  if (work.slug === "interest-circle-community") {
    return renderZhihuSocialDesignCasePage(content, work);
  }
  if (work.slug === "zhihu-interaction-bar-revamp-2026") {
    return renderZhihuSocialDesignCasePage(content, work);
  }
  const caseSections = Array.isArray(work.caseStudy?.sections) ? work.caseStudy.sections : [];
  const sectionAnchors = caseSections.map((section, index) => ({
    id: `section-${index + 1}`,
    navLabel: section.label || section.title || `章节 ${index + 1}`,
    title: section.title || `章节 ${index + 1}`,
    body: section.body || "待补充。"
  }));

  const body = `
    ${renderSiteHeader(content, `/work/${work.slug}`)}

    <main class="template-case-shell">
      <aside class="template-case-rail reveal is-visible" aria-label="章节导航">
        <div class="template-case-outline" data-outline-nav>
          ${sectionAnchors
            .map(
              (item) =>
                `<a class="template-case-outline-link" href="#${escapeHtml(item.id)}">${escapeHtml(item.navLabel)}</a>`
            )
            .join("")}
        </div>
      </aside>

      <div class="template-case-main">
        <section class="template-case-hero reveal is-visible">
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

        <section class="template-case-content">
          ${sectionAnchors
            .map(
              (section) => `
                <article class="template-case-block reveal is-visible" id="${escapeHtml(section.id)}">
                  <p class="case-label">${escapeHtml(section.navLabel)}</p>
                  <h2>${escapeHtml(section.title)}</h2>
                  <p>${escapeHtml(section.body).replace(/\n/g, "<br />")}</p>
                </article>
              `
            )
            .join("")}
        </section>
      </div>
    </main>

    ${renderFooter(content, { caseNav: buildCaseFooterLinks(content, work.slug) })}
  `;

  return renderLayout({
    title: `${work.title} | Case Study`,
    description: work.caseStudy.lead,
    bodyClass: "case-study-page case-study-page--template",
    content,
    body,
    script: renderPublicScript()
  });
}

function renderLegacyWorkPage(content, work) {
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

    ${renderFooter(content, { caseNav: buildCaseFooterLinks(content, work.slug) })}
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

function buildCaseTemplateSections() {
  return [
    {
      label: "01 项目背景",
      title: "业务背景与问题定义",
      body: "补充项目背景、现状问题与机会点。"
    },
    {
      label: "02 项目目标",
      title: "目标与范围收敛",
      body: "补充阶段目标、成功指标和不做范围。"
    },
    {
      label: "03 角色与方法",
      title: "我的职责与推进方式",
      body: "补充你在项目中的职责、协作方式与关键方法。"
    },
    {
      label: "04 方案过程",
      title: "核心方案与关键决策",
      body: "补充方案探索、实验验证、方案收敛与关键取舍。"
    },
    {
      label: "05 项目结果",
      title: "结果数据与业务影响",
      body: "补充关键结果、指标变化与业务价值。"
    },
    {
      label: "06 复盘沉淀",
      title: "方法沉淀与后续方向",
      body: "补充项目复盘、经验总结与下一步规划。"
    }
  ];
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
        <div class="admin-actions">
          <button class="admin-secondary" id="addWorkTemplate" type="button">按母版新增案例</button>
          <button class="admin-secondary" id="addWork" type="button">新增空白作品</button>
        </div>
      </section>
    </main>

    <script>
      const initialContent = ${initialContent};
      const toneOptions = ["tone-01", "tone-02", "tone-03", "tone-04", "tone-05", "tone-06", "tone-07", "tone-08"];
      const ratioOptions = ["ratio-wide", "ratio-portrait"];
      let currentContent = structuredClone(initialContent);
      const templateSections = ${safeJson(buildCaseTemplateSections())};

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

      function createUniqueSlug(baseSlug) {
        const usedSlugs = new Set(currentContent.works.map((item) => item.slug));
        if (!usedSlugs.has(baseSlug)) {
          return baseSlug;
        }

        let index = 2;
        let nextSlug = baseSlug + "-" + index;
        while (usedSlugs.has(nextSlug)) {
          index += 1;
          nextSlug = baseSlug + "-" + index;
        }
        return nextSlug;
      }

      function createEmptyWork() {
        return {
          slug: createUniqueSlug("new-work"),
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
        };
      }

      function createTemplateWork() {
        return {
          slug: createUniqueSlug("case-template"),
          title: "案例标题（母版）",
          cardMeta: "项目类型 · 时间",
          badge: "母版",
          coverImage: "",
          coverMedia: "",
          coverMediaType: "image",
          coverMediaAnimated: false,
          tone: "tone-01",
          ratio: "ratio-wide",
          caseStudy: {
            eyebrow: "Case Study / 项目名",
            lead: "一句话说明项目目标、场景和你负责的核心内容。",
            type: "项目类型",
            year: "2026",
            role: "产品设计师",
            coverLabel: "案例封面",
            sections: templateSections.map((section) => ({ ...section }))
          }
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
          currentContent.works.push(createEmptyWork());
          renderWorks();
          return;
        }

        if (target.id === "addWorkTemplate") {
          currentContent.works.push(createTemplateWork());
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
      redirect(response, "/#work");
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
      if (slug === "zhilink-digital-card") {
        redirect(response, "/work/interest-circle-community#social-zhilink");
        return;
      }
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
