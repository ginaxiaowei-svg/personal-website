#!/usr/bin/env python3

from __future__ import annotations

import html
import json
import os
import re
import socket
import subprocess
import shutil
import time
import urllib.request
from pathlib import Path

from site_data import ABOUT, CASE_STUDIES, EXPERIMENTS, EXPERIMENTS_PAGE, HOME, LEGACY_PORTFOLIO_PAGE, SITE


ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
ASSETS_SRC = ROOT / "assets"
PERSONAL_SITE_ROOT = Path("/Users/zhihu/Desktop/个人网站")
PERSONAL_SITE_CONTENT = PERSONAL_SITE_ROOT / "data" / "site-content.json"
PERSONAL_SITE_CASE_SLUGS = [
    "zhihu-detail-container-rebuild",
    "interest-circle-community",
    "zhihu-interaction-bar-revamp-2026",
]
RESUME_PDF_SOURCE = Path("/Users/zhihu/Desktop/吕晓维-简历 ｜ 产品设计师.pdf")
RESUME_PDF_DIST = "assets/custom/lvxiaowei-resume-product-designer.pdf"
LEGACY_PORTFOLIO_IMAGE_SOURCE_DIR = Path("/Users/zhihu/Desktop/2021 作品集")
LEGACY_PORTFOLIO_IMAGE_NAMES = [*[f"a{i}.png" for i in range(1, 20)], *[f"c{i}.png" for i in range(1, 5)]]
CONTACT_PHONE = "15600132844"
CONTACT_EMAIL = "ginaxiaowei@gmail.com"


CSS = r"""
@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@700&display=swap");

:root {
  --bg: #ffffff;
  --surface: #ffffff;
  --surface-soft: #f0f1f3;
  --text: #344556;
  --muted: #7a8592;
  --line: rgba(52, 69, 86, 0.1);
  --radius-xl: 24px;
  --radius-lg: 18px;
  --radius-md: 14px;
  --page-pad: clamp(20px, 4vw, 56px);
  --content-max: 1120px;
  --font-body: "IBM Plex Sans", "Aptos", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: var(--font-body);
  color: var(--text);
  background: var(--bg);
  line-height: 1.55;
}

img, video { display: block; max-width: 100%; }
a { color: inherit; text-decoration: none; }
button { font: inherit; }

.site-shell {
  width: min(100%, var(--content-max));
  margin: 0 auto;
  padding: 0 var(--page-pad) 120px;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  padding-top: 18px;
}

.topbar-inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 10px 14px;
  border: 1px solid rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.62);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  backdrop-filter: blur(22px) saturate(150%);
  border-radius: 999px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.7),
    0 18px 40px rgba(52, 69, 86, 0.08);
}

.topbar-inner::before {
  content: "";
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0.08));
  pointer-events: none;
}

.brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(52,69,86,0.05);
}

.brand img {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  object-fit: cover;
  filter: brightness(1.04) contrast(1.06) saturate(1.08);
}

.brand--back {
  width: auto;
  height: auto;
  gap: 6px;
  padding: 0;
  background: transparent;
  border: 0;
}

.back-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  color: rgba(50, 64, 79, 0.5);
  border: 1px solid rgba(50, 64, 79, 0.1);
  background: rgba(255,255,255,0.92);
  transition: color .25s ease, border-color .25s ease, transform .25s ease;
}

.back-icon svg {
  width: 20px;
  height: 20px;
  display: block;
}

.back-label {
  font-family: "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  color: rgba(50, 64, 79, 0.6);
  transition: color .25s ease, transform .25s ease;
}

.brand--back:hover .back-icon,
.brand--back:focus-visible .back-icon {
  color: #32404F;
  border-color: rgba(50, 64, 79, 0.18);
  transform: translateX(-2px);
}

.brand--back:hover .back-label,
.brand--back:focus-visible .back-label {
  color: #32404F;
}

.nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.nav a,
.nav-contact-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  font-size: 12px;
  color: var(--muted);
  border-radius: 999px;
  transition: transform .25s ease, background-color .25s ease, color .25s ease;
}

.nav-contact-toggle {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.nav a:hover,
.nav a:focus-visible,
.nav a.is-active,
.nav-contact-toggle:hover,
.nav-contact-toggle:focus-visible,
.nav-contact.is-open .nav-contact-toggle {
  color: #fff;
  background: #7b8493;
  transform: translateY(-1px);
}

.nav-contact {
  position: relative;
}

.contact-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: min(380px, calc(100vw - 48px));
  padding: 10px 20px;
  border-radius: 28px;
  border: 1px solid rgba(50, 64, 79, 0.08);
  background: rgba(255, 255, 255, 0.96);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    0 20px 46px rgba(52, 69, 86, 0.12);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  backdrop-filter: blur(22px) saturate(140%);
}

.contact-popover::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: -10px;
  height: 10px;
}

.contact-popover[hidden] {
  display: none;
}

.contact-popover-list {
  display: grid;
  gap: 12px;
  justify-items: stretch;
}

.contact-popover-item {
  display: flex;
  align-items: center;
  justify-content: start;
  gap: 16px;
  width: 100%;
  padding: 14px 14px 14px 20px;
  border-radius: 22px;
  border: 1px solid rgba(50, 64, 79, 0.06);
  background: rgba(255, 255, 255, 0.88);
  transition: transform .25s ease, border-color .25s ease, background-color .25s ease;
}

.contact-popover-item:hover,
.contact-popover-item:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(50, 64, 79, 0.12);
  background: rgba(255, 255, 255, 1);
}

.contact-popover-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: start;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(50, 64, 79, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(242, 244, 247, 0.9));
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: rgba(50, 64, 79, 0.68);
}

.contact-popover-copy {
  display: grid;
  flex: 1;
  gap: 4px;
  justify-self: start;
  text-align: left;
}

.contact-popover-copy strong {
  font-size: 14px;
  color: #32404F;
}

.contact-popover-copy span {
  font-size: 12px;
  color: rgba(50, 64, 79, 0.66);
  word-break: break-all;
}

.cn-nav-page .topbar-inner {
  border-color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.58);
}

.cn-nav-page .nav {
  gap: 12px;
}

.cn-nav-page .nav a,
.cn-nav-page .nav-contact-toggle {
  font-family: "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  color: rgba(50, 64, 79, 0.5);
  padding: 12px 20px;
}

.cn-nav-page .nav a:hover,
.cn-nav-page .nav a:focus-visible,
.cn-nav-page .nav a.is-active,
.cn-nav-page .nav-contact-toggle:hover,
.cn-nav-page .nav-contact-toggle:focus-visible,
.cn-nav-page .nav-contact.is-open .nav-contact-toggle {
  color: #32404F;
  background: rgba(50, 64, 79, 0.08);
}

.cn-nav-page .brand {
  border-color: rgba(50, 64, 79, 0.08);
}

.hero {
  padding: 62px 0 28px;
}

.hero--compact {
  padding-top: 40px;
  padding-bottom: 40px;
}

.hero-copy h1,
.section-heading h2,
.case-header h1 {
  margin: 0;
  font-size: clamp(34px, 6vw, 62px);
  line-height: 1;
  letter-spacing: -.05em;
  text-wrap: balance;
}

.hero-copy p,
.case-header p,
.section-heading p {
  margin: 14px 0 0;
  max-width: 620px;
  font-size: clamp(16px, 1.8vw, 20px);
  color: var(--muted);
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  font-size: 10px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--muted);
}

.pill-button,
.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  border-radius: 999px;
  border: 1px solid rgba(52,69,86,0.08);
  transition: transform .25s ease, background-color .25s ease;
  font-size: 12px;
}

.pill-button {
  background: #7b8493;
  color: white;
}

.ghost-button {
  background: rgba(255,255,255,0.92);
}

.pill-button:hover,
.ghost-button:hover,
.card-link:hover,
.card-link:focus-visible {
  transform: translateY(-2px);
}

.hero-stage,
.media-frame,
.video-frame {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-xl);
  background: #eceef1;
  border: 1px solid rgba(52,69,86,0.04);
}

.hero-stage {
  margin-top: 18px;
  aspect-ratio: 1.62 / 1;
}

.hero-stage img,
.hero-stage video,
.media-frame img,
.media-frame video,
.video-frame video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.section {
  padding-top: 68px;
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.eyebrow {
  margin: 0 0 12px;
  font-size: 11px;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--muted);
}

.card-grid {
  display: grid;
  gap: 28px;
}

.study-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: rgba(255,255,255,0.78);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.study-card .media-frame {
  border: 0;
  border-radius: 0;
  min-height: 230px;
  order: 2;
}

.card-content {
  padding: 28px 30px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-content h3,
.timeline-card h3,
.principle-card h3,
.stat-card strong,
.archive-card h3,
.experiment-card h3,
.chapter-card h3 {
  margin: 0;
}

.card-label {
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--muted);
  letter-spacing: .14em;
  text-transform: uppercase;
}

.card-title {
  font-size: clamp(22px, 2.8vw, 36px);
  line-height: 1.08;
  letter-spacing: -.04em;
}

.card-summary {
  margin-top: 12px;
  color: var(--muted);
  font-size: 15px;
  max-width: 320px;
}

.card-link {
  margin-top: 18px;
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  padding: 11px 30px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,0.94);
  color: var(--text);
  transition: transform .25s ease;
}

.three-up {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.archive-card,
.principle-card,
.timeline-card,
.publication-card,
.mentor-card,
.stat-card,
.chapter-card,
.detail-card,
.contact-card,
.experiment-card {
  background: rgba(255,255,255,0.78);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 22px;
}

.archive-card--link {
  display: block;
  transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease, background-color .25s ease;
}

.archive-card--link:hover,
.archive-card--link:focus-visible {
  transform: translateY(-3px);
  border-color: rgba(52, 69, 86, 0.18);
  box-shadow: 0 20px 36px rgba(52, 69, 86, 0.08);
}

.archive-card h3,
.principle-card h3,
.timeline-card h3,
.publication-card h3,
.mentor-card h3,
.detail-card h3,
.experiment-card h3 {
  font-size: 24px;
  letter-spacing: -.04em;
}

.muted {
  color: var(--muted);
}

.hobby-grid,
.experiment-showcase {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.hobby-card,
.experiment-tile {
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,0.78);
}

.hobby-card img,
.experiment-tile img {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
}

.hobby-card .copy,
.experiment-tile .copy {
  padding: 18px;
}

.contact-section {
  margin-top: 90px;
  background: rgba(255,255,255,0.82);
  border: 1px solid var(--line);
  border-radius: 28px;
  padding: 28px;
}

.contact-grid {
  display: grid;
  grid-template-columns: 1.2fr .8fr;
  gap: 24px;
  align-items: start;
}

.social-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.social-list a {
  padding: 12px 16px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,0.8);
}

.footer-note {
  margin-top: 18px;
  color: var(--muted);
  font-size: 14px;
}

.portfolio-footer {
  margin-top: 96px;
  padding-top: 24px;
  border-top: 1px solid rgba(52, 69, 86, 0.08);
}

.portfolio-footer-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
  align-items: start;
}

.portfolio-footer-title {
  margin: 0;
}

.portfolio-footer-title {
  font-size: 12px;
  color: var(--text);
}

.portfolio-footer-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 20px;
}

.portfolio-footer-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 20px;
}

.portfolio-footer-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.portfolio-footer-links a {
  color: var(--muted);
  font-size: 12px;
}

.portfolio-footer-copy-button {
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(50, 64, 79, 0.12);
  background: rgba(255,255,255,0.88);
  color: rgba(50, 64, 79, 0.8);
  font: inherit;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: border-color .2s ease, color .2s ease, background .2s ease;
}

.portfolio-footer-copy-button:hover,
.portfolio-footer-copy-button:focus-visible {
  border-color: rgba(50, 64, 79, 0.2);
  color: var(--text);
}

.portfolio-footer-copy-button.is-copied {
  background: rgba(50, 64, 79, 0.08);
  border-color: rgba(50, 64, 79, 0.16);
  color: var(--text);
}

.portfolio-footer-links a:hover,
.portfolio-footer-links a:focus-visible {
  color: var(--text);
}

.about-layout { display: block; }

.portrait-panel .media-frame {
  aspect-ratio: 1.58 / 1;
}

.stack {
  display: grid;
  gap: 20px;
}

.timeline {
  display: grid;
  gap: 16px;
}

.timeline-card small,
.publication-card small {
  display: block;
  margin-bottom: 10px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.case-header {
  padding-top: 42px;
}

.case-header-grid {
  display: grid;
  grid-template-columns: .9fr 1.1fr;
  gap: 22px;
  align-items: center;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-top: 18px;
}

.detail-card span,
.chapter-card span,
.stat-card span {
  display: block;
  font-size: 12px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 10px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.stat-card strong {
  display: block;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 1;
  letter-spacing: -.05em;
}

.chapter-grid {
  display: grid;
  gap: 18px;
}

.chapter-card .tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0 18px;
}

.chapter-card .tags b {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(35,49,63,0.06);
  color: var(--muted);
}

.quote {
  margin-top: 16px;
  padding-left: 16px;
  border-left: 2px solid rgba(35,49,63,0.14);
  color: var(--text);
}

.gallery {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.gallery .media-frame,
.gallery .video-frame {
  min-height: 280px;
}

.gallery .media-frame img,
.gallery .video-frame video {
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.reveal {
  opacity: 1;
  transform: none;
}

.home-page {
  --home-title: #32404F;
  --home-text: rgba(50, 64, 79, 0.5);
  --home-brand: #0066FF;
  --home-gap-60: 60px;
  --home-gap-40: 40px;
  --home-gap-20: 20px;
  --home-gap-12: 12px;
  font-family: "PingFang SC", "Helvetica Neue", Arial, sans-serif;
}

.home-page .site-shell {
  padding-bottom: 60px;
}

.home-page .topbar-inner {
  border-color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.58);
}

.home-page .nav {
  gap: var(--home-gap-12);
}

.home-page .nav a {
  font-family: "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  color: var(--home-text);
  padding: 12px 20px;
}

.home-page .nav a:hover,
.home-page .nav a:focus-visible,
.home-page .nav a.is-active {
  color: var(--home-title);
  background: rgba(50, 64, 79, 0.08);
}

.home-page .brand {
  border-color: rgba(50, 64, 79, 0.08);
}

.home-hero-title,
.home-section-title,
.home-card-title,
.home-contact-title {
  font-family: "Source Han Serif SC", "Source Han Serif CN", "Songti SC", serif;
  font-weight: 500;
  color: var(--home-title);
}

.home-page .home-hero-title {
  font-size: 40px;
  line-height: 1.08;
  letter-spacing: 2px;
}

.home-section-title,
.home-contact-title {
  font-size: clamp(40px, 4.6vw, 56px);
  line-height: 1.12;
  letter-spacing: 0;
}

.home-card-title {
  font-size: clamp(28px, 2.8vw, 36px);
  line-height: 1.18;
  color: var(--home-title);
}

.home-page .hero-copy p,
.home-page .card-summary,
.home-page .footer-note,
.home-page .contact-copy,
.home-page .archive-card p {
  font-family: "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.8;
  color: var(--home-text);
}

.home-page .hero-copy p {
  margin-top: 24px;
  margin-bottom: 24px;
  font-size: 16px;
  color: #32404F;
}

.home-page .card-summary {
  max-width: 463px;
  color: rgba(50, 64, 79, 0.8);
}

.home-page .eyebrow,
.home-page .card-label,
.home-page .hero-meta,
.home-page .detail-card span {
  font-family: "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  letter-spacing: 0;
  text-transform: none;
  color: var(--home-text);
}

.home-page .hero {
  padding: 30px 0 0;
}

.home-page .home-hero-head {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--home-gap-20);
  align-items: start;
}

.home-page .hero-meta {
  margin-top: 0;
  gap: var(--home-gap-12);
}

.home-page .hero-stage {
  margin-top: 0;
  width: 80%;
  margin-left: auto;
  margin-right: auto;
  aspect-ratio: 1.68 / 1;
  background: #111;
  border: 1px solid rgba(50, 64, 79, 0.08);
}

.home-page .hero-stage::after,
.home-page .home-media-placeholder::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.24), transparent 40%),
    linear-gradient(315deg, rgba(50,64,79,0.04), transparent 45%);
}

.home-page .hero-stage::after {
  display: none;
}

.home-page .hero-stage iframe {
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: inherit;
  display: block;
}

.home-page .section {
  padding-top: var(--home-gap-60);
}

.home-page .section-heading {
  margin-bottom: var(--home-gap-20);
}

.home-page .card-grid,
.home-page .hobby-grid,
.home-page .three-up {
  gap: var(--home-gap-20);
}

.home-page #other-works .home-section-title {
  color: rgba(50, 64, 79, 0.8);
}

.home-page .study-card {
  background: #fff;
  border-radius: 20px;
  border: 1px solid rgba(50, 64, 79, 0.08);
  box-shadow: none;
  height: 474px;
}

.home-page .study-card .media-frame,
.home-page .home-media-placeholder {
  min-height: 240px;
  background: #E5E7EB;
  border: none;
}

.home-page .home-media-placeholder {
  position: relative;
  overflow: hidden;
  border-radius: 0;
}

.home-page .card-content {
  padding: 20px 30px;
  height: 100%;
}

.home-page .card-link,
.home-page .ghost-button,
.home-page .pill-button,
.home-page .social-list a {
  font-family: "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  border-color: rgba(50, 64, 79, 0.1);
}

.home-page .pill-button {
  background: var(--home-brand);
}

.home-page .ghost-button,
.home-page .card-link,
.home-page .social-list a {
  background: #fff;
  color: var(--home-title);
}

.home-page .card-link {
  background: #32404F;
  color: #fff;
}

.home-page .card-link.is-disabled {
  background: #E5E7EB;
  color: rgba(50, 64, 79, 0.56);
  border-color: rgba(50, 64, 79, 0.08);
  pointer-events: none;
  box-shadow: none;
}

.home-page .hobby-card {
  background: #fff;
  border: 1px solid rgba(50, 64, 79, 0.08);
}

.home-page .hobby-card .home-media-placeholder {
  aspect-ratio: 4 / 5;
  min-height: 0;
}

.home-page .archive-card,
.home-page .contact-section,
.home-page .contact-card {
  background: #fff;
  border-color: rgba(50, 64, 79, 0.08);
  box-shadow: none;
}

.home-page .archive-section {
  overflow: hidden;
}

.home-page .archive-intro {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 14px;
  max-width: 760px;
  margin: 0 auto;
}

.home-page .archive-intro .eyebrow {
  margin: 0 0 12px;
}

.home-page .archive-intro .home-section-title {
  margin: 0;
  font-size: 30px;
}

.home-page .archive-intro-copy {
  max-width: 640px;
  margin: 20px 0 0;
  font-size: 14px;
}

.home-page .archive-cta {
  margin-top: 6px;
  padding: 12px 30px;
  background: #32404F;
  color: #fff;
}

.home-page .archive-gallery {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 20px;
  margin-top: 48px;
  align-items: start;
}

.home-page .archive-gallery-item {
  margin: 0;
}

.home-page .archive-gallery-item img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 20px;
  border: 1px solid rgba(50, 64, 79, 0.08);
  background: #fff;
}

.pdf-preview-shell {
  padding-top: 30px;
  display: grid;
  gap: 24px;
}

.pdf-preview-head {
  display: grid;
  gap: 14px;
  max-width: 760px;
}

.pdf-preview-head h1,
.pdf-preview-head p {
  margin: 0;
}

.pdf-preview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.pdf-preview-frame {
  width: 100%;
  min-height: calc(100vh - 260px);
  border: 1px solid rgba(50, 64, 79, 0.08);
  border-radius: 24px;
  overflow: hidden;
  background: #fff;
}

.pdf-preview-frame iframe {
  width: 100%;
  height: min(90vh, 1400px);
  border: 0;
  display: block;
}

.pdf-preview-empty {
  padding: 48px 32px;
  text-align: center;
  color: rgba(50, 64, 79, 0.72);
}

.legacy-gallery-shell {
  padding-top: 30px;
  display: grid;
  gap: 24px;
}

.legacy-gallery-head {
  display: grid;
  gap: 14px;
  max-width: 760px;
}

.legacy-gallery-head h1,
.legacy-gallery-head p {
  margin: 0;
}

.legacy-gallery-head h1 {
  font-family: "Source Han Serif SC", "Source Han Serif CN", "Source Han Serif", "Songti SC", serif;
  font-weight: 500;
  color: #32404F;
}

.legacy-gallery {
  display: grid;
  gap: 12px;
}

.legacy-gallery-item {
  margin: 0;
}

.legacy-gallery-item img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 18px;
  border: 1px solid rgba(50, 64, 79, 0.08);
  background: #fff;
}

.legacy-gallery-empty {
  padding: 40px 24px;
  border-radius: 24px;
  border: 1px solid rgba(50, 64, 79, 0.08);
  text-align: center;
  color: rgba(50, 64, 79, 0.72);
  background: #fff;
}

.legacy-page {
  background:
    radial-gradient(circle at top left, rgba(240, 241, 243, 0.92), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #fbfbfc 100%);
}

.legacy-page .site-shell {
  padding-bottom: 96px;
}

.legacy-page-shell {
  padding-top: 30px;
  display: grid;
  gap: 22px;
}

.legacy-hero-panel,
.legacy-gallery-panel {
  position: relative;
  overflow: hidden;
  border-radius: 32px;
  border: 1px solid rgba(52, 69, 86, 0.08);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.96), rgba(246,247,248,0.94)),
    #fff;
  box-shadow: 0 26px 60px rgba(52, 69, 86, 0.06);
}

.legacy-hero-panel {
  padding: clamp(26px, 4vw, 42px);
}

.legacy-hero-panel::after,
.legacy-gallery-panel::after {
  content: "";
  position: absolute;
  inset: auto auto -60px -80px;
  width: 240px;
  height: 240px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(123, 132, 147, 0.12), transparent 70%);
  pointer-events: none;
}

.legacy-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 22px;
  align-items: end;
}

.legacy-hero-copy {
  display: grid;
  gap: 14px;
}

.legacy-hero-copy h1,
.legacy-intro h2,
.legacy-gallery-intro h2 {
  margin: 0;
  font-family: "Source Han Serif SC", "Source Han Serif CN", "Source Han Serif", "Songti SC", serif;
  font-weight: 500;
  color: #32404F;
  line-height: 1.04;
  letter-spacing: -.04em;
}

.legacy-hero-copy h1 {
  font-size: clamp(40px, 6vw, 68px);
}

.legacy-hero-copy p,
.legacy-intro p,
.legacy-gallery-intro p,
.legacy-feature-copy p,
.legacy-practice-card p,
.legacy-project-card p {
  margin: 0;
  color: var(--muted);
  text-wrap: pretty;
}

.legacy-stat-grid,
.legacy-practice-grid,
.legacy-project-grid {
  display: grid;
  gap: 18px;
}

.legacy-stat-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.legacy-stat-card,
.legacy-practice-card,
.legacy-project-card {
  min-height: 100%;
  border-radius: 22px;
  border: 1px solid rgba(52, 69, 86, 0.08);
  background: rgba(255,255,255,0.72);
}

.legacy-stat-card {
  padding: 18px;
}

.legacy-stat-card span,
.legacy-feature-copy .card-label,
.legacy-practice-card .card-label,
.legacy-project-card .card-label,
.legacy-gallery-intro .eyebrow {
  display: inline-flex;
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #7b8493;
}

.legacy-stat-card strong {
  display: block;
  margin-top: 10px;
  font-size: clamp(18px, 2vw, 22px);
  letter-spacing: -.03em;
}

.legacy-feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.legacy-feature-card {
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(52, 69, 86, 0.08);
  background: rgba(255,255,255,0.86);
}

.legacy-feature-card img {
  width: 100%;
  height: 380px;
  object-fit: cover;
  object-position: top center;
}

.legacy-feature-copy {
  padding: 22px;
  display: grid;
  gap: 10px;
  font-size: 14px;
}

.legacy-feature-copy h3,
.legacy-practice-card h3,
.legacy-project-card h3 {
  margin: 0;
  font-family: "Source Han Serif SC", "Source Han Serif CN", "Source Han Serif", "Songti SC", serif;
  font-weight: 500;
  color: #32404F;
  font-size: 24px;
  line-height: 1.08;
  letter-spacing: -.05em;
}

.legacy-feature-meta {
  font-size: 13px;
  color: #5d6975;
}

.legacy-section-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr);
  gap: 18px;
}

.legacy-intro {
  padding: 26px;
  border-radius: 28px;
  border: 1px solid rgba(52, 69, 86, 0.08);
  background: rgba(255,255,255,0.86);
}

.legacy-intro h2 {
  font-size: clamp(28px, 4vw, 40px);
}

.legacy-practice-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.legacy-project-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.legacy-practice-card,
.legacy-project-card {
  padding: 22px;
  display: grid;
  gap: 10px;
}

.legacy-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}

.legacy-tag-list span {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(240, 241, 243, 0.92);
  color: #5d6975;
  font-size: 12px;
}

.legacy-gallery-panel {
  padding: clamp(24px, 3vw, 32px);
  display: grid;
  gap: 22px;
}

.legacy-gallery-intro {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: end;
}

.legacy-gallery-intro h2 {
  font-size: clamp(30px, 4.2vw, 46px);
}

.legacy-gallery {
  gap: 14px;
}

.legacy-gallery-item img {
  border-radius: 22px;
}

.home-page .archive-stack {
  position: relative;
  height: 430px;
  margin-top: 48px;
}

.home-page .archive-section .archive-card {
  position: absolute;
  bottom: 0;
  width: min(31vw, 360px);
  min-height: 360px;
  padding: 26px 26px 0;
  border-radius: 32px;
  overflow: hidden;
}

.home-page .archive-card-copy {
  position: relative;
  z-index: 1;
}

.home-page .archive-card-copy h3,
.home-page .archive-card-copy p {
  margin: 0;
}

.home-page .archive-card-copy p {
  margin-top: 8px;
}

.home-page .archive-card-media {
  margin-top: 28px;
  height: 220px;
  background: #E5E7EB;
  border-radius: 120px 120px 0 0 / 86px 86px 0 0;
  position: relative;
  overflow: hidden;
}

.home-page .archive-card-media::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.24), transparent 40%),
    linear-gradient(315deg, rgba(50,64,79,0.04), transparent 45%);
}

.home-page .archive-card--1 {
  left: 12%;
  transform: rotate(-6deg);
  z-index: 1;
}

.home-page .archive-card--2 {
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
}

.home-page .archive-card--3 {
  right: 12%;
  transform: rotate(6deg);
  z-index: 2;
}

.home-page .contact-section {
  padding: 40px;
}

@media (max-width: 900px) {
  .home-page .home-hero-head {
    grid-template-columns: 1fr;
  }

  .home-page .home-hero-title {
    font-size: 40px;
    line-height: 1.12;
  }

  .home-section-title,
  .home-contact-title {
    font-size: 32px;
  }

  .home-card-title {
    font-size: 24px;
  }

  .home-page .archive-stack {
    height: auto;
    display: grid;
    gap: 20px;
    margin-top: 32px;
  }

  .home-page .archive-section .archive-card {
    position: relative;
    left: auto;
    right: auto;
    bottom: auto;
    width: 100%;
    min-height: 0;
    transform: none;
  }
}

@media (max-width: 1120px) {
  .case-header-grid,
  .contact-grid {
    grid-template-columns: 1fr;
  }

  .hobby-grid,
  .experiment-showcase,
  .three-up,
  .gallery,
  .detail-grid,
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .study-card {
    grid-template-columns: 1fr;
  }

  .home-page .study-card {
    height: auto;
    min-height: 474px;
  }

  .home-page .archive-gallery {
    margin-top: 36px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .home-page .archive-gallery-item {
    width: auto;
  }

  .study-card .media-frame {
    order: 0;
  }

  .portfolio-footer-grid {
    grid-template-columns: 1fr;
  }

  .legacy-hero-grid,
  .legacy-section-grid,
  .legacy-gallery-intro {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .legacy-practice-grid,
  .legacy-project-grid,
  .legacy-stat-grid,
  .legacy-feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .portfolio-footer-actions,
  .portfolio-footer-links {
    justify-items: start;
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .site-shell {
    padding-bottom: 80px;
  }

  .home-page .archive-gallery {
    grid-template-columns: 1fr;
  }

  .topbar-inner {
    border-radius: 28px;
    align-items: start;
    flex-direction: column;
  }

  .nav {
    width: 100%;
    justify-content: flex-start;
  }

  .nav-contact {
    width: 100%;
  }

  .nav-contact-toggle {
    width: 100%;
    justify-content: flex-start;
  }

  .contact-popover {
    left: 0;
    right: auto;
    width: min(100%, calc(100vw - 48px));
  }

  .hero-stage {
    width: 100%;
    aspect-ratio: 1.1 / 1;
  }

  .section-heading {
    flex-direction: column;
    align-items: start;
  }

  .hobby-grid,
  .experiment-showcase,
  .three-up,
  .gallery,
  .detail-grid,
  .stat-grid {
    grid-template-columns: 1fr;
  }

  .legacy-practice-grid,
  .legacy-project-grid,
  .legacy-stat-grid,
  .legacy-feature-grid {
    grid-template-columns: 1fr;
  }

  .contact-section {
    padding: 24px;
    border-radius: 28px;
  }
}
"""


CONTACT_MENU_INLINE_JS = r"""
const openContactMenu = (menu) => {
  const toggle = menu.querySelector(".nav-contact-toggle");
  const popover = menu.querySelector(".contact-popover");
  if (!toggle || !popover) return;
  closeContactMenus(menu);
  menu.classList.add("is-open");
  toggle.setAttribute("aria-expanded", "true");
  popover.hidden = false;
};

const closeContactMenu = (menu) => {
  const toggle = menu.querySelector(".nav-contact-toggle");
  const popover = menu.querySelector(".contact-popover");
  if (!toggle || !popover) return;
  menu.classList.remove("is-open");
  toggle.setAttribute("aria-expanded", "false");
  popover.hidden = true;
};

const closeContactMenus = (exceptMenu) => {
  document.querySelectorAll("[data-contact-menu]").forEach((menu) => {
    if (exceptMenu && menu === exceptMenu) return;
    closeContactMenu(menu);
  });
};

document.querySelectorAll("[data-contact-menu]").forEach((menu) => {
  const toggle = menu.querySelector(".nav-contact-toggle");
  const popover = menu.querySelector(".contact-popover");
  if (!toggle || !popover) return;
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    const isOpen = menu.classList.contains("is-open");
    if (isOpen) {
      closeContactMenu(menu);
    } else {
      openContactMenu(menu);
    }
  });
  menu.addEventListener("mouseenter", () => {
    openContactMenu(menu);
  });
  menu.addEventListener("mouseleave", () => {
    closeContactMenu(menu);
  });
  menu.addEventListener("focusin", () => {
    openContactMenu(menu);
  });
  menu.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!menu.contains(document.activeElement)) {
        closeContactMenu(menu);
      }
    }, 0);
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-contact-menu]")) {
    closeContactMenus();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeContactMenus();
  }
});

"""


JS = CONTACT_MENU_INLINE_JS + r"""
document.querySelectorAll("[data-local-time]").forEach((node) => {
  const zone = node.getAttribute("data-local-time") || "Asia/Singapore";
  const format = () => {
    const text = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: zone,
    }).format(new Date());
    node.textContent = text;
  };
  format();
  setInterval(format, 60000);
});

document.querySelectorAll(".reveal").forEach((element, index) => {
  element.animate(
    [
      { opacity: 0, transform: "translateY(18px)" },
      { opacity: 1, transform: "translateY(0)" }
    ],
    {
      duration: 520,
      delay: Math.min(index * 35, 360),
      easing: "cubic-bezier(.2,.8,.2,1)",
      fill: "both"
    }
  );
});

document.querySelectorAll("[data-copy-text]").forEach((button) => {
  const defaultLabel = button.textContent;
  button.addEventListener("click", async () => {
    const text = button.getAttribute("data-copy-text") || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "已复制";
      button.classList.add("is-copied");
      window.setTimeout(() => {
        button.textContent = defaultLabel;
        button.classList.remove("is-copied");
      }, 1600);
    } catch (error) {
      button.textContent = "复制失败";
      window.setTimeout(() => {
        button.textContent = defaultLabel;
      }, 1600);
    }
  });
});

(() => {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const initBeforeAfter = (root) => {
    const stage = root.querySelector(".ba-compare__stage");
    const handle = root.querySelector(".ba-handle");
    if (!stage || !handle) return;

    const start = Number(root.dataset.baStart);
    let pos = Number.isFinite(start) ? clamp(start, 0, 100) : 50;
    let dragging = false;
    let activePointerId = null;

    const apply = (p) => {
      pos = clamp(p, 0, 100);
      root.style.setProperty("--ba-pos", pos + "%");
      handle.setAttribute("aria-valuenow", String(Math.round(pos)));
    };

    const positionFromEvent = (clientX) => {
      const rect = stage.getBoundingClientRect();
      const x = clientX - rect.left;
      return (x / rect.width) * 100;
    };

    const stopDragging = () => {
      dragging = false;
      activePointerId = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    const onPointerDown = (event) => {
      event.preventDefault();
      dragging = true;
      activePointerId = event.pointerId;
      apply(positionFromEvent(event.clientX));
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    };

    const onPointerMove = (event) => {
      if (!dragging) return;
      if (activePointerId !== null && event.pointerId !== activePointerId) return;
      event.preventDefault();
      apply(positionFromEvent(event.clientX));
    };

    const onPointerUp = (event) => {
      if (activePointerId !== null && event.pointerId !== activePointerId) return;
      stopDragging();
    };

    stage.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointerdown", onPointerDown);

    handle.addEventListener("keydown", (event) => {
      const step = event.shiftKey ? 10 : 2;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        apply(pos - step);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        apply(pos + step);
      } else if (event.key === "Home") {
        event.preventDefault();
        apply(0);
      } else if (event.key === "End") {
        event.preventDefault();
        apply(100);
      }
    });

    apply(pos);
  };

  document.querySelectorAll("[data-ba]").forEach(initBeforeAfter);
})();

"""


NAV_ITEMS = [
    ("Home", "/"),
    ("About me", "/about/"),
    ("Case studies", "/case-studies/"),
    ("Experiments", "/experiments/"),
    ("Contact", "#contact"),
]

CHINESE_NAV_ITEMS = [
    ("首页", "/"),
    ("更多作品", "/case-studies/more-works/"),
    ("简历", "/about/"),
    ("联系我", "/#contact"),
]

PERSONAL_SITE_CASE_NAV_OVERRIDES = r"""
/* Codex rebuild: align imported case-page header with the static home nav */
.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  width: min(100%, 1120px);
  margin: 0 auto;
  padding: 18px clamp(20px, 4vw, 56px) 0;
}

.topbar-inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.58);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  backdrop-filter: blur(22px) saturate(150%);
  border-radius: 999px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 18px 40px rgba(52, 69, 86, 0.08);
}

.topbar-inner::before {
  content: "";
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.08));
  pointer-events: none;
}

.topbar .brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(50, 64, 79, 0.08);
  min-width: 0;
}

.topbar .brand--back {
  width: auto;
  height: auto;
  gap: 6px;
  padding: 0;
  background: transparent;
  border: 0;
}

.topbar .back-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  color: rgba(50, 64, 79, 0.5);
  border: 1px solid rgba(50, 64, 79, 0.1);
  background: rgba(255, 255, 255, 0.92);
  transition: color .25s ease, border-color .25s ease, transform .25s ease;
}

.topbar .back-icon svg {
  width: 20px;
  height: 20px;
  display: block;
}

.topbar .back-label {
  font-family: "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  letter-spacing: 0;
  color: rgba(50, 64, 79, 0.6);
  transition: color .25s ease, transform .25s ease;
}

.topbar .brand--back:hover .back-icon,
.topbar .brand--back:focus-visible .back-icon {
  color: #32404F;
  border-color: rgba(50, 64, 79, 0.18);
  transform: translateX(-2px);
}

.topbar .brand--back:hover .back-label,
.topbar .brand--back:focus-visible .back-label {
  color: #32404F;
}

.topbar .nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.topbar .nav a,
.topbar .nav-contact-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  border-radius: 999px;
  font-family: "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  letter-spacing: 0;
  color: rgba(50, 64, 79, 0.5);
  transition: transform .25s ease, background-color .25s ease, color .25s ease;
}

.topbar .nav-contact-toggle {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.topbar .nav a:hover,
.topbar .nav a:focus-visible,
.topbar .nav a.is-active,
.topbar .nav-contact-toggle:hover,
.topbar .nav-contact-toggle:focus-visible,
.topbar .nav-contact.is-open .nav-contact-toggle {
  color: #32404F;
  background: rgba(50, 64, 79, 0.08);
  transform: translateY(-1px);
}

.topbar .nav-contact {
  position: relative;
}

.topbar .contact-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: min(380px, calc(100vw - 48px));
  padding: 10px 20px;
  border-radius: 28px;
  border: 1px solid rgba(50, 64, 79, 0.08);
  background: rgba(255, 255, 255, 0.96);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    0 20px 46px rgba(52, 69, 86, 0.12);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  backdrop-filter: blur(22px) saturate(140%);
}

.topbar .contact-popover::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: -10px;
  height: 10px;
}

.topbar .contact-popover[hidden] {
  display: none;
}

.topbar .contact-popover-list {
  display: grid;
  gap: 12px;
  justify-items: stretch;
}

.topbar .contact-popover-item {
  display: flex;
  align-items: center;
  justify-content: start;
  gap: 16px;
  width: 100%;
  padding: 14px 14px 14px 20px;
  border-radius: 22px;
  border: 1px solid rgba(50, 64, 79, 0.06);
  background: rgba(255, 255, 255, 0.88);
  transition: transform .25s ease, border-color .25s ease, background-color .25s ease;
}

.topbar .contact-popover-item:hover,
.topbar .contact-popover-item:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(50, 64, 79, 0.12);
  background: rgba(255, 255, 255, 1);
}

.topbar .contact-popover-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: start;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(50, 64, 79, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(242, 244, 247, 0.9));
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: rgba(50, 64, 79, 0.68);
}

.topbar .contact-popover-copy {
  display: grid;
  flex: 1;
  gap: 4px;
  justify-self: start;
  text-align: left;
}

.topbar .contact-popover-copy strong {
  font-size: 14px;
  color: #32404F;
}

.topbar .contact-popover-copy span {
  font-size: 12px;
  color: rgba(50, 64, 79, 0.66);
  word-break: break-all;
}

@media (max-width: 820px) {
  .topbar {
    padding-top: 14px;
  }

  .topbar-inner {
    gap: 12px;
    flex-wrap: wrap;
  }

  .topbar .nav {
    width: 100%;
    justify-content: flex-start;
  }

  .topbar .nav-contact {
    width: 100%;
  }

  .topbar .nav-contact-toggle {
    width: 100%;
    justify-content: flex-start;
  }

  .topbar .contact-popover {
    left: 0;
    right: auto;
    width: min(100%, calc(100vw - 48px));
  }
}
"""

PERSONAL_SITE_PORTFOLIO_FOOTER_OVERRIDES = r"""
/* Codex rebuild: align imported case-page footer with the static home footer */
.portfolio-footer {
  width: min(100%, 1120px);
  box-sizing: border-box;
  margin: 0 auto 0;
  padding: 24px clamp(20px, 4vw, 56px) 60px;
  border-top: 1px solid rgba(52, 69, 86, 0.08);
}

.portfolio-footer-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
  align-items: start;
}

.portfolio-footer-title {
  margin: 0;
  font-size: 12px;
  color: #344556;
  font-family: "IBM Plex Sans", "Aptos", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
}

.portfolio-footer-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 20px;
}

.portfolio-footer-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 20px;
}

.portfolio-footer-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.portfolio-footer-links a {
  color: #7a8592;
  font-size: 12px;
  font-family: "IBM Plex Sans", "Aptos", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
}

.portfolio-footer-copy-button {
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(50, 64, 79, 0.12);
  background: rgba(255, 255, 255, 0.88);
  color: rgba(50, 64, 79, 0.8);
  font-family: "IBM Plex Sans", "Aptos", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: border-color .2s ease, color .2s ease, background .2s ease;
}

.portfolio-footer-copy-button:hover,
.portfolio-footer-copy-button:focus-visible {
  border-color: rgba(50, 64, 79, 0.2);
  color: #344556;
}

.portfolio-footer-copy-button.is-copied {
  background: rgba(50, 64, 79, 0.08);
  border-color: rgba(50, 64, 79, 0.16);
  color: #344556;
}

.portfolio-footer-links a:hover,
.portfolio-footer-links a:focus-visible {
  color: #344556;
}

@media (max-width: 960px) {
  .portfolio-footer-grid {
    grid-template-columns: 1fr;
  }

  .portfolio-footer-actions,
  .portfolio-footer-links {
    justify-content: flex-start;
  }
}
"""

PERSONAL_SITE_PORTFOLIO_FOOTER_SCRIPT = r"""
<script>
  document.querySelectorAll("[data-copy-text]").forEach((button) => {
    if (button.dataset.copyBound === "true") return;
    button.dataset.copyBound = "true";
    const defaultLabel = button.textContent;
    button.addEventListener("click", async () => {
      const text = button.getAttribute("data-copy-text") || "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "已复制";
        button.classList.add("is-copied");
        window.setTimeout(() => {
          button.textContent = defaultLabel;
          button.classList.remove("is-copied");
        }, 1600);
      } catch (error) {
        button.textContent = "复制失败";
        window.setTimeout(() => {
          button.textContent = defaultLabel;
        }, 1600);
      }
    });
  });
</script>
"""

PERSONAL_SITE_CASE_INTERACTION_SCRIPT = r"""
<script>
(() => {
  const cursor = document.querySelector(".cursor-dot");
  if (cursor && window.matchMedia("(pointer:fine)").matches) {
    window.addEventListener("mousemove", (event) => {
      cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
      cursor.style.opacity = "1";
    });

    window.addEventListener("mouseout", () => {
      cursor.style.opacity = "0";
    });
  }

  const outlines = Array.from(document.querySelectorAll("[data-outline-nav]"));
  outlines.forEach((outline) => {
    const line = outline.querySelector("[data-outline-line]");
    const indicator = outline.querySelector("[data-outline-indicator]");
    const links = Array.from(outline.querySelectorAll('a[href^="#"]'));
    const items = links
      .map((link) => {
        const href = link.getAttribute("href");
        if (!href || href === "#") return null;
        const section = document.querySelector(href);
        if (!section) return null;
        return { link, section };
      })
      .filter(Boolean);

    if (!items.length) return;

    const setActive = (activeLink) => {
      links.forEach((link) => {
        link.classList.toggle("is-active", link === activeLink);
      });

      if (!line || !indicator || !activeLink) return;

      const lineRect = line.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      const top = Math.max(0, linkRect.top - lineRect.top);
      const height = Math.max(1, linkRect.height);
      indicator.style.transform = `translateY(${top}px)`;
      indicator.style.height = `${height}px`;
      indicator.style.opacity = "1";
    };

    const resolveTop = (section) => Math.max(0, window.scrollY + section.getBoundingClientRect().top - 140);

    const pickActiveByScroll = () => {
      const anchorOffset = 160;
      let current = items[0];
      items.forEach((item) => {
        if (item.section.getBoundingClientRect().top <= anchorOffset) {
          current = item;
        }
      });
      setActive(current.link);
    };

    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        const item = items.find((entry) => entry.link === link);
        if (!item) return;
        event.preventDefault();
        setActive(link);
        window.scrollTo({ top: resolveTop(item.section), behavior: "auto" });
        if (window.history && typeof window.history.replaceState === "function") {
          window.history.replaceState(null, "", link.getAttribute("href") || "");
        }
      });
    });

    let ticking = false;
    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        pickActiveByScroll();
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    pickActiveByScroll();
  });

  const carousels = Array.from(document.querySelectorAll("[data-pc-trend-carousel]"));
  carousels.forEach((carousel) => {
    const track = carousel.querySelector("[data-pc-trend-track]");
    const slides = Array.from(carousel.querySelectorAll("[data-pc-trend-slide]"));
    const dots = Array.from(carousel.querySelectorAll("[data-pc-trend-dot]"));
    if (!(track instanceof HTMLElement) || slides.length < 2) return;

    let currentIndex = 0;
    let timer = null;

    const setActive = (nextIndex) => {
      currentIndex = (nextIndex + slides.length) % slides.length;
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      slides.forEach((slide, index) => {
        slide.classList.toggle("is-active", index === currentIndex);
      });
      dots.forEach((dot, index) => {
        dot.classList.toggle("is-active", index === currentIndex);
        dot.setAttribute("aria-selected", index === currentIndex ? "true" : "false");
      });
    };

    const start = () => {
      if (timer) return;
      timer = window.setInterval(() => {
        setActive(currentIndex + 1);
      }, 3000);
    };

    const stop = () => {
      if (!timer) return;
      window.clearInterval(timer);
      timer = null;
    };

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        setActive(index);
        stop();
        start();
      });
    });

    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("mouseleave", start);
    carousel.addEventListener("focusin", stop);
    carousel.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (!carousel.contains(document.activeElement)) {
          start();
        }
      }, 0);
    });

    setActive(0);
    start();
  });

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  document.querySelectorAll("[data-ba]").forEach((root) => {
    const stage = root.querySelector(".ba-compare__stage");
    const handle = root.querySelector(".ba-handle");
    if (!stage || !handle) return;

    const start = Number(root.dataset.baStart);
    let pos = Number.isFinite(start) ? clamp(start, 0, 100) : 50;
    let dragging = false;
    let activePointerId = null;

    const apply = (p) => {
      pos = clamp(p, 0, 100);
      root.style.setProperty("--ba-pos", pos + "%");
      handle.setAttribute("aria-valuenow", String(Math.round(pos)));
    };

    const positionFromEvent = (clientX) => {
      const rect = stage.getBoundingClientRect();
      const x = clientX - rect.left;
      return (x / rect.width) * 100;
    };

    const onPointerMove = (event) => {
      if (!dragging) return;
      if (activePointerId !== null && event.pointerId !== activePointerId) return;
      event.preventDefault();
      apply(positionFromEvent(event.clientX));
    };

    const stopDragging = () => {
      dragging = false;
      activePointerId = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    const onPointerUp = (event) => {
      if (activePointerId !== null && event.pointerId !== activePointerId) return;
      stopDragging();
    };

    const onPointerDown = (event) => {
      event.preventDefault();
      dragging = true;
      activePointerId = event.pointerId;
      apply(positionFromEvent(event.clientX));
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    };

    stage.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointerdown", onPointerDown);

    handle.addEventListener("keydown", (event) => {
      const step = event.shiftKey ? 10 : 2;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        apply(pos - step);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        apply(pos + step);
      } else if (event.key === "Home") {
        event.preventDefault();
        apply(0);
      } else if (event.key === "End") {
        event.preventDefault();
        apply(100);
      }
    });

    apply(pos);
  });
})();
</script>
"""

PERSONAL_SITE_ZHIHU_PC_CASE_OVERRIDES = r"""
/* Codex rebuild: zhihu pc case page */
.zhihu-pc-case-shell {
  padding-top: 52px;
}

.zhihu-pc-case-main {
  width: 100%;
}

.zhihu-pc-summary-grid {
  margin-top: 20px;
}

.zhihu-pc-lead-image .zhihu-social-image-placeholder-img {
  width: 100%;
  max-width: 100%;
}

.zhihu-pc-bullet-list {
  margin: 16px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 10px;
}

.zhihu-pc-bullet-list li {
  color: #32404f;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 14px;
  line-height: 1.65;
}

.zhihu-pc-principle-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.zhihu-pc-principle-card,
.zhihu-pc-compare-card {
  padding: 20px;
  border: 1px solid rgba(50, 64, 79, 0.08);
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
}

.zhihu-pc-principle-card h3,
.zhihu-pc-compare-card h3 {
  margin: 8px 0 0;
  color: #32404f;
  font-family: "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", "STSong", serif;
  font-size: 22px;
  font-weight: 500;
  line-height: 1.35;
}

.zhihu-pc-principle-card p,
.zhihu-pc-compare-card p {
  margin: 12px 0 0;
  color: #32404fcc;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 14px;
  line-height: 1.65;
}

.zhihu-pc-decision-stack {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.zhihu-pc-compare-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.zhihu-pc-compare-card .zhilink-image-frame {
  margin-top: 14px;
}

.zhihu-pc-compare-card .zhihu-pc-bullet-list {
  margin-top: 14px;
}

.zhihu-pc-ba-wrap {
  max-width: var(--case-content-width);
}

.zhihu-pc-ba-wrap + .zhihu-pc-ba-wrap {
  margin-top: 28px;
}

.zhihu-pc-ba-title {
  margin: 0 0 20px;
  font-family: "Source Han Serif SC", "Source Han Serif CN", "Source Han Serif", "Songti SC", serif;
  font-size: 24px;
  font-weight: 500;
  line-height: 1.3;
  color: rgba(50, 64, 79, 0.8);
}

.ba-compare {
  position: relative;
  width: 100%;
  background: #f1f1f1;
  border-radius: 24px;
  padding: 24px;
  user-select: none;
  -webkit-user-select: none;
  --ba-pos: 50%;
}

.ba-compare__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.ba-compare__stage {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: #ffffff;
  touch-action: none;
  cursor: ew-resize;
}

.ba-img {
  display: block;
  width: 100%;
  height: auto;
  pointer-events: none;
  -webkit-user-drag: none;
  user-select: none;
}

.ba-img--before {
  position: relative;
  z-index: 1;
  display: block;
}

.ba-img--after {
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  clip-path: inset(0 0 0 var(--ba-pos));
}

.ba-label {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  border-radius: 999px;
  white-space: nowrap;
  font-family: -apple-system, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

.ba-label--before {
  background: #ffffff;
  color: #1d1d1f;
}

.ba-label--after {
  background: #1d1d1f;
  color: #ffffff;
}

.ba-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--ba-pos);
  width: 2px;
  margin-left: -1px;
  background: #ffffff;
  z-index: 3;
  pointer-events: none;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04);
}

.ba-handle {
  position: absolute;
  top: 50%;
  left: var(--ba-pos);
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border: 1px solid rgba(29, 29, 31, 0.08);
  border-radius: 999px;
  background: #ffffff;
  color: rgba(29, 29, 31, 0.55);
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  box-shadow: 0 0 12px rgba(29, 29, 31, 0.04);
  transition: transform 120ms ease;
  padding: 0;
  touch-action: none;
}

.ba-handle:active {
  cursor: grabbing;
  transform: translate(-50%, -50%) scale(0.96);
}

.ba-handle:focus-visible {
  outline: 2px solid #0066ff;
  outline-offset: 3px;
}

.ba-handle svg {
  width: 16px;
  height: 16px;
  display: block;
}

.zhihu-pc-closing-note {
  margin-top: 20px;
}

.zhihu-pc-trend-carousel {
  margin-top: 20px;
}

.zhihu-pc-trend-frame {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(50, 64, 79, 0.08);
  border-radius: 16px;
  background: linear-gradient(180deg, #f9fafb 0%, #ffffff 100%);
  aspect-ratio: 16 / 10;
}

.zhihu-pc-trend-track {
  display: flex;
  transition: transform 520ms var(--ease);
  will-change: transform;
}

.zhihu-pc-trend-slide {
  min-width: 100%;
  padding: 0;
}

.zhihu-pc-trend-shot {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  background: #fff;
}

.zhihu-pc-trend-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.zhihu-pc-trend-dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(50, 64, 79, 0.18);
  cursor: pointer;
  transition: transform 180ms var(--ease), background-color 180ms var(--ease);
}

.zhihu-pc-trend-dot:hover,
.zhihu-pc-trend-dot:focus-visible {
  background: rgba(50, 64, 79, 0.4);
}

.zhihu-pc-trend-dot.is-active {
  background: #32404f;
  transform: scale(1.15);
}

@media (max-width: 1100px) {
  .zhihu-pc-principle-grid,
  .zhihu-pc-compare-grid,
  .zhihu-pc-decision-stack {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .zhihu-pc-principle-card,
  .zhihu-pc-compare-card,
  .zhilink-decision-card {
    padding: 18px;
  }

  .zhihu-pc-principle-card h3,
  .zhihu-pc-compare-card h3 {
    font-size: 20px;
  }

  .zhihu-pc-trend-frame {
    border-radius: 14px;
  }

  .ba-compare {
    padding: 14px;
  }

  .ba-compare__header {
    margin-bottom: 14px;
  }

  .ba-label {
    padding: 6px 12px;
    font-size: 12px;
  }

  .ba-handle {
    width: 36px;
    height: 36px;
  }

  .ba-handle svg {
    width: 14px;
    height: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ba-handle {
    transition: none;
  }
}
"""

PERSONAL_SITE_AIR_CLOCK_CASE_OVERRIDES = r"""
/* Codex rebuild: air clock case page */
.case-study-page--air-clock .header-inner,
.case-study-page--air-clock .site-footer {
  width: min(100%, 1120px);
}

.air-clock-shell {
  padding-top: 52px;
}

.air-clock-main {
  width: 100%;
}

.air-clock-hero {
  border-bottom: 1px solid rgba(50, 64, 79, 0.1);
}

.air-clock-brand {
  display: block;
  width: 100px;
  height: 100px;
  border-radius: 20px;
  object-fit: cover;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.case-study-page--air-clock .zhihu-social-title {
  font-size: clamp(44px, 4.2vw, 52px);
  white-space: nowrap;
}

.air-clock-title {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
}

.air-clock-title-en {
  font-family: "Iowan Old Style", "Baskerville", "Times New Roman", serif;
  letter-spacing: -0.02em;
}

.air-clock-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 40px;
  max-width: 320px;
  margin-top: 40px;
}

.air-clock-meta span {
  display: block;
  margin-bottom: 12px;
  color: rgba(50, 64, 79, 0.5);
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 12px;
  line-height: 1.4;
}

.air-clock-meta strong {
  color: #32404f;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
}

.air-clock-overview {
  padding-top: 60px;
}

.air-clock-overview > .air-clock-image-frame:first-child {
  margin-bottom: 60px;
}

.air-clock-overview + .air-clock-section {
  margin-top: 60px;
}

.air-clock-section + .air-clock-section {
  margin-top: 60px;
}

.air-clock-section-head {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.air-clock-section-title {
  margin: 0;
  color: rgba(50, 64, 79, 0.8);
  font-family: "Source Han Serif SC", "Source Han Serif CN", "Source Han Serif", "Songti SC", serif;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.44;
}

.air-clock-section-copy {
  margin: 0;
  color: rgba(50, 64, 79, 0.5);
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 14px;
  line-height: 1.65;
}

.air-clock-image-frame {
  width: 100%;
  margin: 0;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(50, 64, 79, 0.08);
  background: linear-gradient(180deg, #f9fafb 0%, #ffffff 100%);
  box-shadow: 0 18px 40px rgba(52, 69, 86, 0.06);
}

.air-clock-image-frame img {
  display: block;
  width: 100%;
  height: auto;
}

.air-clock-gallery {
  display: grid;
  gap: 20px;
}

.air-clock-gallery--themes {
  gap: 20px;
}

.air-clock-gallery--download {
  grid-template-columns: 1fr;
}

.legacy-feature-card--link {
  transition:
    transform 220ms ease,
    box-shadow 220ms ease,
    border-color 220ms ease;
}

.legacy-feature-card--link:hover,
.legacy-feature-card--link:focus-visible {
  transform: translateY(-3px);
  border-color: rgba(52, 69, 86, 0.16);
  box-shadow: 0 24px 50px rgba(52, 69, 86, 0.1);
}

@media (max-width: 1100px) {
  .air-clock-meta {
    gap: 20px;
  }
}

@media (max-width: 720px) {
  .air-clock-shell {
    padding-top: 28px;
  }

  .air-clock-brand {
    width: 88px;
    height: 88px;
    border-radius: 18px;
  }

  .case-study-page--air-clock .zhihu-social-title {
    white-space: normal;
  }

  .air-clock-meta {
    grid-template-columns: 1fr;
    gap: 20px;
    margin-top: 28px;
  }

  .air-clock-overview {
    gap: 40px;
    padding-top: 40px;
  }

  .air-clock-section + .air-clock-section {
    margin-top: 40px;
  }

}
"""


def escape(value: str) -> str:
    return html.escape(value, quote=True)


def contact_popover_markup(label: str) -> str:
    return f"""
    <div class="nav-contact" data-contact-menu>
      <button class="nav-contact-toggle" type="button" aria-expanded="false">
        {escape(label)}
      </button>
      <div class="contact-popover" hidden>
        <div class="contact-popover-list">
          <a class="contact-popover-item" href="mailto:{CONTACT_EMAIL}">
            <span class="contact-popover-icon" aria-hidden="true">@</span>
            <span class="contact-popover-copy">
              <strong>邮箱</strong>
              <span>{CONTACT_EMAIL}</span>
            </span>
          </a>
          <a class="contact-popover-item" href="tel:{CONTACT_PHONE}">
            <span class="contact-popover-icon" aria-hidden="true">TEL</span>
            <span class="contact-popover-copy">
              <strong>电话</strong>
              <span>{CONTACT_PHONE}</span>
            </span>
          </a>
        </div>
      </div>
    </div>
    """


def render_nav(items: list[tuple[str, str]], active_href: str | None) -> str:
    rendered_items: list[str] = []
    for label, href in items:
        if href in {"#contact", "/#contact"}:
            rendered_items.append(contact_popover_markup(label))
        else:
            rendered_items.append(
                f'<a href="{href}" class="{"is-active" if href == active_href else ""}">{escape(label)}</a>'
            )
    return "".join(rendered_items)


def personal_site_footer() -> str:
    return portfolio_footer()


def personal_site_case_header() -> str:
    nav = render_nav(CHINESE_NAV_ITEMS, None)
    return f"""
    <header class="topbar">
      <div class="topbar-inner">
        <a href="/" class="brand brand--back">
          {back_brand_markup()}
        </a>

        <nav class="nav" aria-label="Primary">
          {nav}
        </nav>
      </div>
    </header>
    """


def personal_site_case_layout(title: str, description: str, body: str, body_class: str = "case-study-page case-study-page--zhihu-social") -> str:
    return f"""<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{escape(title)}</title>
    <meta name="description" content="{escape(description)}" />
    <link rel="stylesheet" href="/styles.css?v=20260512-1302" />
  </head>
  <body class="{escape(body_class)}">
    <div class="cursor-dot" aria-hidden="true"></div>
    {personal_site_case_header()}
    {body}
    {personal_site_footer()}
    {PERSONAL_SITE_CASE_INTERACTION_SCRIPT}
    <script>{CONTACT_MENU_INLINE_JS}</script>
    {PERSONAL_SITE_PORTFOLIO_FOOTER_SCRIPT}
  </body>
</html>"""


def back_brand_markup() -> str:
    return """
        <span class="back-icon" aria-hidden="true">
          <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" focusable="false">
            <path d="M580.625 271.15625h-331.875l111.09375-111.09375c15.375-15.375 15.375-40.21875 0-55.5-15.375-15.375-40.21875-15.375-55.5 0L130.15625 278.65625c-8.4375 8.4375-12 19.6875-11.25 30.65625-0.84375 10.96875 2.8125 22.21875 11.25 30.65625l174.09375 174.09375c7.6875 7.6875 17.71875 11.53125 27.75 11.53125s20.0625-3.84375 27.75-11.53125c15.375-15.375 15.375-40.21875 0-55.5L250.90625 349.71875h324.75c137.15625 0 252.75 108 255.84375 245.15625 3.1875 140.90625-110.53125 256.59375-250.78125 256.59375h-50.25c-0.5625 0-1.21875-0.09375-1.78125-0.09375H191.65625c-0.65625 0-1.21875 0.09375-1.78125 0.09375-18.75 0.84375-33.9375 14.71875-36.9375 32.8125v12.9375c3 18 18.1875 31.875 36.75 32.8125H574.8125c180.5625 0 331.875-142.875 335.15625-323.34375 3.375-184.40625-145.6875-335.53125-329.34375-335.53125z" fill="currentColor"></path>
          </svg>
        </span>
        <span class="back-label">返回</span>
    """


def page_shell(
    title: str,
    description: str,
    active_href: str | None,
    body: str,
    nav_items: list[tuple[str, str]] | None = None,
    body_class: str = "",
    back_brand: bool = False,
) -> str:
    items = nav_items or NAV_ITEMS
    nav = render_nav(items, active_href)
    brand_class = "brand brand--back" if back_brand else "brand"
    brand_markup = back_brand and back_brand_markup() or f'<img src="{SITE["brand_mark_light"]}" alt="">'
    brand_aria_label = "返回首页" if back_brand else "Mr March home"
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(description)}">
  <link rel="icon" href="{SITE["brand_mark_light"]}">
  <script>
    if ("scrollRestoration" in history) {{
      history.scrollRestoration = "manual";
    }}
    const navigationEntry = performance.getEntriesByType
      ? performance.getEntriesByType("navigation")[0]
      : null;
    const isReload = navigationEntry
      ? navigationEntry.type === "reload"
      : performance.navigation && performance.navigation.type === 1;
    if (isReload && window.location.hash) {{
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }}
    window.addEventListener("load", () => {{
      if (isReload) {{
        window.scrollTo(0, 0);
      }}
    }});
  </script>
  <style>{CSS}</style>
</head>
<body class="{escape(body_class)}">
  <div class="site-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <a class="{brand_class}" href="/" aria-label="{brand_aria_label}">
          {brand_markup}
        </a>
        <nav class="nav" aria-label="Primary">
          {nav}
        </nav>
      </div>
    </header>
    {body}
  </div>
  <script>{JS}</script>
</body>
</html>
"""


def footer_contact() -> str:
    socials = "".join(f'<a href="{href}" target="_blank" rel="noreferrer">{escape(label)}</a>' for label, href in SITE["socials"])
    return f"""
    <section class="contact-section reveal" id="contact">
      <div class="contact-grid">
        <div>
          <p class="eyebrow">Get in touch</p>
          <div class="section-heading" style="margin-bottom: 0;">
            <div>
              <h2>Feel free to reach out if you want to have a chat, or have any questions.</h2>
              <p>Open to design conversations, product collaboration, mentoring, and thoughtful work at the edge of design and technology.</p>
            </div>
          </div>
        </div>
        <div class="contact-card">
          <a class="pill-button" href="{SITE["email"]}">Contact me</a>
          <div class="social-list" style="margin-top: 18px;">
            {socials}
          </div>
          <div class="footer-note">Copyright © 2025 Konrad Marzec. All rights reserved.</div>
        </div>
      </div>
    </section>
    """


def portfolio_footer() -> str:
    return """
    <footer class="portfolio-footer reveal" id="contact">
      <div class="portfolio-footer-grid">
        <div>
          <p class="portfolio-footer-title">Designed and built by Xiaowei</p>
        </div>
        <div class="portfolio-footer-actions">
          <div class="portfolio-footer-links">
            <span class="portfolio-footer-item">
              <a href="tel:15600132844">电话：15600132844</a>
              <button class="portfolio-footer-copy-button" type="button" data-copy-text="15600132844">复制</button>
            </span>
            <span class="portfolio-footer-item">
              <a href="mailto:ginaxiaowei@gmail.com">邮箱：ginaxiaowei@gmail.com</a>
              <button class="portfolio-footer-copy-button" type="button" data-copy-text="ginaxiaowei@gmail.com">复制</button>
            </span>
          </div>
        </div>
      </div>
    </footer>
    """


def render_case_cards(limit: int | None = None) -> str:
    studies = CASE_STUDIES[:limit] if limit is not None else CASE_STUDIES
    cards = []
    for item in studies:
        cards.append(
            f"""
            <article class="study-card reveal">
              <div class="media-frame">
                <img src="{item["card_media"]}" alt="{escape(item["title"])} preview">
              </div>
              <div class="card-content">
                <div class="card-label">{escape(item["eyebrow"])}</div>
                <h3 class="card-title">{escape(item["title"])}</h3>
                <p class="card-summary">{escape(item["summary"])}</p>
                <a class="card-link" href="/case-studies/{item["slug"]}/">View case study</a>
              </div>
            </article>
            """
        )
    return "".join(cards)


def render_hobbies() -> str:
    cards = []
    for item in EXPERIMENTS:
        cards.append(
            f"""
            <article class="hobby-card reveal">
              <img src="{item["media"]}" alt="{escape(item["title"])}">
              <div class="copy">
                <div class="card-label">Hobby</div>
                <h3>{escape(item["title"])}</h3>
                <p class="muted">{escape(item["subtitle"])}</p>
              </div>
            </article>
            """
        )
    return "".join(cards)


def home_page() -> str:
    archive_body = escape(HOME["archive_body"]).replace("\n", "<br>")
    archive_display_cards = [HOME["archive_cards"][0], HOME["archive_cards"][2], HOME["archive_cards"][1]]
    archive_cards = "".join(
        f"""
        <article class="archive-card archive-card--{index} reveal">
          <div class="archive-card-copy">
            <h3>{escape(title)}</h3>
            <p class="muted">{escape(summary)}</p>
          </div>
          <div class="archive-card-media" aria-hidden="true"></div>
        </article>
        """
        for index, (title, summary) in enumerate(archive_display_cards, start=1)
    )
    case_cards = "".join(
        f"""
        <article class="study-card reveal">
          <div class="card-content">
            <div class="card-label">{escape(item["eyebrow"])}</div>
            <h3 class="home-card-title">{escape(item["title"])}</h3>
            <p class="card-summary">{escape(item["summary"])}</p>
            {
                f'<a class="card-link" href="{item["href"]}">{escape(item.get("button_label", "查看作品"))}</a>'
                if item.get("href")
                else f'<span class="card-link is-disabled">{escape(item.get("button_label", "查看作品"))}</span>'
            }
          </div>
          {
              f'<div class="media-frame"><img src="{item["card_media"]}" alt="{escape(item["title"])}"></div>'
              if item.get("card_media")
              else '<div class="home-media-placeholder" aria-hidden="true"></div>'
          }
        </article>
        """
        for item in HOME["featured_cards"]
    )
    body = f"""
    <section class="hero">
      <div class="home-hero-head reveal">
        <div class="hero-copy">
          <h1 class="home-hero-title">{escape(HOME["hero_title"])}</h1>
          <p style="max-width: 1008px;">{escape(HOME["hero_body"])}</p>
        </div>
      </div>
      <div class="hero-stage reveal">
        <iframe
          src="https://www.youtube-nocookie.com/embed/wPW3jaMJVXU?rel=0&modestbranding=1"
          title="吕晓维自我介绍视频"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen></iframe>
      </div>
    </section>

    <section class="section" id="other-works" style="padding-top: 42px;">
      <div class="section-heading reveal">
        <div>
          <h2 class="home-section-title" style="font-size: 24px;">{escape(HOME["featured_section_title"])}</h2>
        </div>
      </div>
      <div class="card-grid">
        {case_cards}
      </div>
    </section>

    <section class="section archive-section">
      <div class="archive-intro reveal">
        <div style="display:grid; justify-items:center;">
          <p class="eyebrow">{escape(HOME["archive_period"])}</p>
          <h2 class="home-section-title">{escape(HOME["archive_title"])}</h2>
          <p class="archive-intro-copy">{archive_body}</p>
        </div>
        <a class="pill-button archive-cta" href="{HOME["archive_cta_href"]}">{escape(HOME["archive_cta"])}</a>
      </div>
      <div class="archive-gallery reveal">
        {"".join(f'<figure class="archive-gallery-item"><a href="{HOME["archive_cta_href"]}" aria-label="查看更早期的作品"><img src="{src}" alt="更早期作品展示"></a></figure>' for src in HOME["archive_gallery"])}
      </div>
    </section>

    {portfolio_footer()}

    """
    return page_shell(SITE["title"], SITE["description"], "/", body, nav_items=CHINESE_NAV_ITEMS, body_class="home-page cn-nav-page")


def about_page() -> str:
    resume_href = f"/{RESUME_PDF_DIST}"
    if RESUME_PDF_SOURCE.exists():
        body = f"""
        <section class="section hero--compact">
          <div class="pdf-preview-shell">
            <div class="pdf-preview-actions reveal">
              <a class="ghost-button" href="{resume_href}" download="吕晓维-简历-产品设计师.pdf">Download PDF</a>
            </div>
            <div class="pdf-preview-frame reveal">
              <iframe
                src="{resume_href}#view=FitH"
                title="Lv Xiaowei Resume PDF"
                loading="lazy"></iframe>
            </div>
          </div>
        </section>
        """
    else:
        body = """
        <section class="section hero--compact">
          <div class="pdf-preview-shell">
            <div class="pdf-preview-head reveal">
              <h1>Resume</h1>
              <p>简历文件暂时未找到，稍后把 PDF 放回桌面后我就可以继续接上预览。</p>
            </div>
            <div class="pdf-preview-empty reveal">Resume PDF is currently unavailable.</div>
          </div>
        </section>
        """
    return page_shell("Resume", SITE["description"], "/about/", body, nav_items=CHINESE_NAV_ITEMS, body_class="cn-nav-page")


def legacy_portfolio_page() -> str:
    gallery_images = [
        f"/assets/custom/{name}"
        for name in LEGACY_PORTFOLIO_IMAGE_NAMES
        if (DIST / "assets" / "custom" / name).exists()
    ]
    gallery_block = (
        '<div class="legacy-gallery reveal">'
        + "".join(
            f'<figure class="legacy-gallery-item"><img src="{src}" alt="早期作品展示"></figure>'
            for src in gallery_images
        )
        + "</div>"
        if gallery_images
        else """
        <div class="legacy-gallery-empty reveal">
          暂时没有可展示的早期作品图片，请稍后重试。
        </div>
        """
    )
    body = f"""
    <main class="legacy-gallery-shell">
      <section class="legacy-gallery-head reveal">
        <h1>更早期的作品</h1>
        <p>早期专注于金融产品与增长设计，围绕用户转化、信任建立与复杂流程体验进行持续优化。<br>这段经历让我逐渐建立起对复杂用户行为与全流程产品设计的系统性理解。</p>
      </section>
      <section id="legacy-gallery">
        {gallery_block}
      </section>
    </main>
    """
    return page_shell("金融与增长设计作品", SITE["description"], None, body, nav_items=CHINESE_NAV_ITEMS, body_class="cn-nav-page", back_brand=True)


def more_works_page() -> str:
    feature_cards_markup: list[str] = []
    for item in LEGACY_PORTFOLIO_PAGE["feature_cards"]:
        href = item.get("href")
        tag = "a" if href else "article"
        href_attr = f' href="{href}"' if href else ""
        link_class = " legacy-feature-card--link" if href else ""
        feature_cards_markup.append(
            f"""
        <{tag} class="legacy-feature-card{link_class} reveal"{href_attr}>
          <img src="{item["media"]}" alt="{escape(item["title"])}">
          <div class="legacy-feature-copy">
            <h3>{escape(item["title"])}</h3>
            <p>{escape(item["body"])}</p>
            <div class="legacy-feature-meta">{escape(item["meta"])}</div>
          </div>
        </{tag}>
        """
        )
    feature_cards = "".join(feature_cards_markup)
    body = f"""
    <main class="legacy-page-shell">
      <section class="legacy-feature-grid">
        {feature_cards}
      </section>
    </main>
    """
    return page_shell("更多作品", SITE["description"], "/case-studies/more-works/", body, nav_items=CHINESE_NAV_ITEMS, body_class="legacy-page cn-nav-page")


def zhihu_pc_case_page() -> str:
    compare_pairs = [
        ("首页", "/assets/case-study/首页-改版前.png", "/assets/case-study/首页-改版后.png"),
        ("回答页", "/assets/case-study/回答页-改版前.png", "/assets/case-study/回答页-改版后.png"),
        ("关注页", "/assets/case-study/关注页-改版前.png", "/assets/case-study/关注页-改版后.png"),
        ("热榜页", "/assets/case-study/热榜页-改版前.png", "/assets/case-study/热榜页-改版后.png"),
        ("个人主页", "/assets/case-study/个人主页-改版前.png", "/assets/case-study/个人主页-改版后.png"),
        ("问题页", "/assets/case-study/问题页-改版前.png", "/assets/case-study/问题页-改版后.png"),
    ]
    compare_blocks = "".join(
        f"""
          <div class="zhihu-pc-ba-wrap">
            <h3 class="zhihu-pc-ba-title">{escape(name)}</h3>
            <div class="ba-compare" data-ba data-ba-start="50">
              <div class="ba-compare__header">
                <span class="ba-label ba-label--before">Before</span>
                <span class="ba-label ba-label--after">After</span>
              </div>

              <div class="ba-compare__stage">
                <img class="ba-img ba-img--before" src="{escape(before_src)}" alt="{escape(name)}改版前" loading="lazy" />
                <img class="ba-img ba-img--after" src="{escape(after_src)}" alt="{escape(name)}改版后" loading="lazy" />
                <div class="ba-divider" aria-hidden="true"></div>
                <button
                  type="button"
                  class="ba-handle"
                  aria-label="拖动以对比{escape(name)}改版前后"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow="50"
                  role="slider">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M10 6L5 12L10 18"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round" />
                    <path
                      d="M14 6L19 12L14 18"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        """
        for name, before_src, after_src in compare_pairs
    )
    body = f"""
    <main class="case-shell zhihu-social-shell zhilink-case-shell zhihu-pc-case-shell">
      <aside class="zhihu-social-rail reveal is-visible" aria-label="章节导航">
        <div class="zhihu-social-outline case-outline" data-outline-nav>
          <span class="zhihu-case-outline-line case-outline-line" data-outline-line aria-hidden="true">
            <span class="zhihu-case-outline-indicator case-outline-indicator" data-outline-indicator></span>
          </span>
          <div class="zhihu-social-outline-content">
            <a href="#pc-overview" class="zhihu-social-outline-link">设计概述</a>
            <a href="#pc-insight" class="zhihu-social-outline-link">用户行为洞察</a>
            <a href="#pc-trends" class="zhihu-social-outline-link">竞品趋势调研</a>
            <a href="#pc-principles" class="zhihu-social-outline-link">产品设计原则</a>
            <a href="#pc-decisions" class="zhihu-social-outline-link">核心设计决策</a>
            <a href="#pc-compare" class="zhihu-social-outline-link">Before / After</a>
          </div>
        </div>
      </aside>

      <div class="zhihu-social-main zhihu-pc-case-main">
        <section class="zhihu-social-hero reveal is-visible" id="pc-overview">
          <div class="zhihu-social-hero-head">
            <img class="zhihu-social-brand" src="/assets/zhicon_brand_zhihu_logo.svg" alt="知乎 Logo" />
            <h1 class="zhihu-social-title">知乎 PC 端整体体验升级</h1>
          </div>

          <div class="zhihu-social-meta">
            <div>
              <span>我的角色</span>
              <strong>产品设计 Owner</strong>
            </div>
            <div>
              <span>项目时间</span>
              <strong>2026年</strong>
            </div>
          </div>

          <div class="zhihu-social-divider" aria-hidden="true"></div>
          <h2 class="zhihu-social-subtitle">设计概述</h2>
          <h2 class="zhihu-social-diagnosis-title">为桌面场景重新定义更低噪音、更内容优先的阅读体验</h2>
          <div class="interaction-revamp-tag-row" aria-label="项目标签">
            <span class="interaction-revamp-tag interaction-revamp-tag--green">场景：工作间隙 / 学习场景 / 多任务浏览</span>
            <span class="interaction-revamp-tag interaction-revamp-tag--blue">目标：降低视觉噪音，提升桌面阅读稳定性</span>
          </div>
          <p class="zhihu-social-copy">知乎 PC 端长期以业务迭代为主，顶部导航不断叠加功能入口，页面逐渐出现信息拥挤、层级厚重、阅读干扰增强等问题。在缺少明确业务推动的情况下，我主动发起了这次 PC 端整体体验升级，希望重新思考知乎在桌面场景下的内容消费体验与未来方向。</p>

          <div class="zhilink-info-cards zhihu-pc-summary-grid">
            <article class="zhilink-info-card">
              <span class="case-label">项目背景</span>
              <p>信息持续叠加，顶部结构开始挤压阅读体验</p>
            </article>
            <article class="zhilink-info-card">
              <span class="case-label">核心场景</span>
              <p>办公语境下的快速浏览与长时桌面阅读</p>
            </article>
            <article class="zhilink-info-card">
              <span class="case-label">设计目标</span>
              <p>建立低噪音、低打扰、内容优先的 PC 阅读结构</p>
            </article>
          </div>
        </section>

        <section class="zhihu-social-section reveal is-visible" id="pc-insight">
          <div class="zhihu-social-diagnosis-head">
            <p class="zhihu-social-diagnosis-label">用户行为洞察</p>
            <h2 class="zhihu-social-diagnosis-title">PC 用户正在形成更偏办公场景的内容消费方式</h2>
          </div>
          <div class="zhilink-third-copy">
            <p>在针对桌面阅读场景的调研中发现，越来越多用户会在工作间隙、学习场景与多任务切换过程中高频浏览知乎内容。</p>
          </div>
          <ul class="zhihu-pc-bullet-list">
            <li>更长时间的桌面阅读</li>
            <li>更高频的信息浏览</li>
            <li>更低干扰的阅读偏好</li>
            <li>更偏办公场景下的内容消费行为</li>
          </ul>
          <div class="zhihu-social-diagnosis-quote zhihu-pc-closing-note">
            <span class="zhihu-social-diagnosis-quote-line" aria-hidden="true"></span>
            <p class="zhihu-social-diagnosis-quote-text">用户更需要一种<strong class="zhihu-social-diagnosis-quote-highlight">低噪音、低打扰、内容优先</strong>的阅读体验。</p>
          </div>
        </section>

        <section class="zhihu-social-section reveal is-visible" id="pc-trends">
          <div class="zhihu-social-diagnosis-head">
            <p class="zhihu-social-diagnosis-label">竞品趋势调研</p>
            <h2 class="zhihu-social-diagnosis-title">内容社区产品的桌面体验正整体走向更轻、更平、更沉浸</h2>
          </div>
          <div class="zhilink-third-copy">
            <p>调研覆盖 X、Reddit、Medium、YouTube、Bilibili、小红书与长桥，发现内容社区产品逐渐呈现出一组稳定趋势。</p>
          </div>
          <div class="zhihu-pc-trend-carousel" data-pc-trend-carousel aria-label="竞品趋势轮播">
            <div class="zhihu-pc-trend-frame">
              <div class="zhihu-pc-trend-track" data-pc-trend-track>
                <article class="zhihu-pc-trend-slide" data-pc-trend-slide>
                  <img class="zhihu-pc-trend-shot" src="/assets/case-study/X.png" alt="X 桌面端界面截图" loading="lazy" />
                </article>
                <article class="zhihu-pc-trend-slide" data-pc-trend-slide>
                  <img class="zhihu-pc-trend-shot" src="/assets/case-study/Medium.png" alt="Medium 桌面端界面截图" loading="lazy" />
                </article>
                <article class="zhihu-pc-trend-slide" data-pc-trend-slide>
                  <img class="zhihu-pc-trend-shot" src="/assets/case-study/Reddit.png" alt="Reddit 桌面端界面截图" loading="lazy" />
                </article>
                <article class="zhihu-pc-trend-slide" data-pc-trend-slide>
                  <img class="zhihu-pc-trend-shot" src="/assets/case-study/longbridge.png" alt="Longbridge 桌面端界面截图" loading="lazy" />
                </article>
              </div>
            </div>
            <div class="zhihu-pc-trend-dots" role="tablist" aria-label="竞品趋势切换">
              <button class="zhihu-pc-trend-dot is-active" type="button" data-pc-trend-dot aria-selected="true" aria-label="查看第 1 张图片"></button>
              <button class="zhihu-pc-trend-dot" type="button" data-pc-trend-dot aria-selected="false" aria-label="查看第 2 张图片"></button>
              <button class="zhihu-pc-trend-dot" type="button" data-pc-trend-dot aria-selected="false" aria-label="查看第 3 张图片"></button>
              <button class="zhihu-pc-trend-dot" type="button" data-pc-trend-dot aria-selected="false" aria-label="查看第 4 张图片"></button>
            </div>
          </div>
          <ul class="zhihu-pc-bullet-list">
            <li>顶部导航向侧边导航迁移</li>
            <li>页面层级更扁平</li>
            <li>UI 存在感降低</li>
            <li>内容分区更清晰</li>
            <li>更强调阅读沉浸感</li>
          </ul>
          <div class="zhilink-third-copy">
            <p>基于这些趋势，我重新定义了知乎 PC 端的整体阅读体验与页面布局，让桌面场景下的内容消费更稳定、更克制，也更适合长期演进。</p>
          </div>
        </section>

        <section class="zhihu-social-section reveal is-visible" id="pc-principles">
          <div class="zhihu-social-diagnosis-head">
            <p class="zhihu-social-diagnosis-label">产品设计原则</p>
            <h2 class="zhihu-social-diagnosis-title">用统一原则约束视觉表达，而不是靠局部修修补补</h2>
          </div>
          <div class="zhihu-pc-principle-grid">
            <article class="zhihu-pc-principle-card">
              <p class="zhihu-social-diagnosis-label">01</p>
              <h3>文本优先</h3>
              <p>降低界面存在感，让用户注意力重新回归内容本身。</p>
            </article>
            <article class="zhihu-pc-principle-card">
              <p class="zhihu-social-diagnosis-label">02</p>
              <h3>低噪音</h3>
              <p>减少高饱和、高对比与强装饰元素，降低页面视觉干扰。</p>
            </article>
            <article class="zhihu-pc-principle-card">
              <p class="zhihu-social-diagnosis-label">03</p>
              <h3>Office Friendly</h3>
              <p>建立更适合办公场景下快速浏览与持续阅读的桌面体验。</p>
            </article>
            <article class="zhihu-pc-principle-card">
              <p class="zhihu-social-diagnosis-label">04</p>
              <h3>品牌克制</h3>
              <p>仅在关键操作与核心信息中使用品牌色，保留识别度但不打断阅读。</p>
            </article>
          </div>
        </section>

        <section class="zhihu-social-section reveal is-visible" id="pc-decisions">
          <div class="zhihu-social-diagnosis-head">
            <p class="zhihu-social-diagnosis-label">核心设计决策</p>
            <h2 class="zhihu-social-diagnosis-title">从结构到视觉，统一收敛到一套更稳定的桌面阅读语言</h2>
          </div>
          <div class="zhihu-pc-decision-stack">
            <article class="zhihu-pc-principle-card">
              <p class="zhihu-social-diagnosis-label">01</p>
              <h3>导航体系升级</h3>
              <p>将顶部导航升级为侧边导航，释放顶部空间，降低阅读压迫感，并建立更稳定的业务扩展体系。</p>
            </article>
            <article class="zhihu-pc-principle-card">
              <p class="zhihu-social-diagnosis-label">02</p>
              <h3>页面布局重构</h3>
              <p>全站升级为三栏布局，明确划分左侧导航区、中间内容区与右侧功能区，提升信息分区清晰度与内容聚焦感。</p>
            </article>
            <article class="zhihu-pc-principle-card">
              <p class="zhihu-social-diagnosis-label">03</p>
              <h3>视觉语言升级</h3>
              <p>整体视觉向更扁平、更克制的方向调整，弱化阴影、减少描边、降低色彩饱和度，并提升留白比例，建立更现代化的桌面阅读体验。</p>
            </article>
            <article class="zhihu-pc-principle-card">
              <p class="zhihu-social-diagnosis-label">04</p>
              <h3>内容阅读优化</h3>
              <p>缩小详情页标题尺寸，降低滚动过程中的视觉暴露感；将图片由左侧调整至右侧，减少对文本阅读流的打断；统一 4:3 图片比例，提升桌面阅读节奏稳定性。</p>
            </article>
          </div>
        </section>

        <section class="zhihu-social-section reveal is-visible" id="pc-compare">
{compare_blocks}
        </section>

      </div>
    </main>
    """
    return personal_site_case_layout(
        "知乎 PC 端整体体验升级 | Case Study",
        "围绕桌面阅读场景与办公语境，重构知乎 PC 端导航、布局与视觉语言，建立更低噪音、更内容优先的长期阅读体验。",
        body,
        body_class="case-study-page case-study-page--zhihu-social case-study-page--zhihu-pc",
    )


def air_clock_case_page() -> str:
    theme_images = [f"/assets/case-study/air{i}.png" for i in range(4, 15)]
    overview_feature_image = ("/assets/case-study/air2.png", "空气时钟主视觉预览")
    overview_detail_image = ("/assets/case-study/air3.png", "空气时钟概览界面")
    overview_title = "首页"
    overview_copy = "精心打磨的界面设计，从字体到色彩，从动画到过渡效果，每一处都体现出时间的艺术，让你的时钟告别平庸。"
    sections = [
        {
            "id": "air-themes",
            "label": "10 种主题",
            "copy": "可爱有趣的猫爪小组件、漂亮精致的透明小组件，无论时间显示还是日历，无论倒计时还是像素风都轻松整合进你的主屏。",
            "images": [(src, "空气时钟主题展示") for src in theme_images],
            "gallery_class": "air-clock-gallery air-clock-gallery--themes",
        },
        {
            "id": "air-widget",
            "label": "充电自动启动",
            "copy": "当设备进入充电状态后，自动切换为桌面时钟模式。",
            "images": [("/assets/case-study/air16.png", "空气时钟充电自动启动展示")],
            "gallery_class": "air-clock-gallery",
        },
        {
            "id": "air-settings",
            "label": "设置",
            "copy": "围绕真实使用场景，对时钟体验进行更细致的个性化控制。",
            "images": [("/assets/case-study/air17.png", "空气时钟设置界面展示")],
            "gallery_class": "air-clock-gallery",
        },
        {
            "id": "air-paid",
            "label": "付费",
            "copy": "成为空气时钟会员，解锁所有高级功能，享受无广告的完整体验，并免费获取未来的所有更新。",
            "images": [("/assets/case-study/air18.png", "空气时钟会员与付费界面")],
            "gallery_class": "air-clock-gallery",
        },
        {
            "id": "air-store",
            "label": "欢迎下载体验 - App Store",
            "copy": "已上架苹果应用商店。",
            "images": [("/assets/case-study/air19.png", "空气时钟 App Store 预览")],
            "gallery_class": "air-clock-gallery air-clock-gallery--download",
        },
    ]
    outline_links = "".join(
        f'<a href="#{section["id"]}" class="zhihu-social-outline-link">{escape(section["label"])}</a>'
        for section in sections
    )
    overview_nav_link = '<a href="#air-home" class="zhihu-social-outline-link">首页</a>'
    overview_feature_markup = f"""
        <figure class="air-clock-image-frame reveal is-visible">
          <img src="{overview_feature_image[0]}" alt="{overview_feature_image[1]}" loading="lazy" />
        </figure>
    """
    overview_detail_markup = f"""
        <figure class="air-clock-image-frame reveal is-visible">
          <img src="{overview_detail_image[0]}" alt="{overview_detail_image[1]}" loading="lazy" />
        </figure>
    """
    section_markup: list[str] = []
    for section in sections:
        images: list[str] = []
        for index, (src, alt) in enumerate(section["images"]):
            crop_class = " air-clock-image-frame--crop" if section["id"] == "air-store" and index == 0 else ""
            images.append(
                f"""
              <figure class="air-clock-image-frame{crop_class}">
                <img src="{src}" alt="{alt}" loading="lazy" />
              </figure>
              """
            )
        section_markup.append(
            f"""
        <section class="air-clock-section reveal is-visible" id="{section["id"]}">
          <div class="air-clock-section-head">
            <h2 class="air-clock-section-title">{escape(section["label"])}</h2>
            <p class="air-clock-section-copy">{escape(section["copy"])}</p>
          </div>
          <div class="{section["gallery_class"]}">
            {"".join(images)}
          </div>
        </section>
        """
        )

    body = f"""
    <main class="case-shell zhihu-social-shell air-clock-shell">
      <aside class="zhihu-social-rail reveal is-visible" aria-label="章节导航">
        <div class="zhihu-social-outline case-outline" data-outline-nav>
          <span class="zhihu-case-outline-line case-outline-line" data-outline-line aria-hidden="true">
            <span class="zhihu-case-outline-indicator case-outline-indicator" data-outline-indicator></span>
          </span>
          <div class="zhihu-social-outline-content">
            {overview_nav_link}
            {outline_links}
          </div>
        </div>
      </aside>

      <div class="zhihu-social-main air-clock-main">
        <section class="zhihu-social-hero air-clock-hero reveal is-visible" id="air-overview">
          <div class="zhihu-social-hero-head">
            <img class="air-clock-brand" src="/assets/case-study/air_logo.png" alt="空气时钟 App 图标" />
            <h1 class="zhihu-social-title air-clock-title"><span>空气时钟</span><span class="air-clock-title-en">Air O’clock</span></h1>
          </div>

          <div class="air-clock-meta">
            <div>
              <span>我的角色</span>
              <strong>产品+设计</strong>
            </div>
            <div>
              <span>项目时间</span>
              <strong>2025年</strong>
            </div>
          </div>
        </section>

        <section class="air-clock-overview reveal is-visible" id="air-home" aria-label="空气时钟概览图">
          {overview_feature_markup}
          <div class="air-clock-section-head">
            <h2 class="air-clock-section-title">{overview_title}</h2>
            <p class="air-clock-section-copy">{overview_copy}</p>
          </div>
          {overview_detail_markup}
        </section>

        {"".join(section_markup)}
      </div>
    </main>
    """
    return personal_site_case_layout(
        "空气时钟-Air O’clock | Case Study",
        "空气时钟案例页，展示主题、桌面 widget、设置、付费与 App Store 页面设计。",
        body,
        body_class="case-study-page case-study-page--zhihu-social case-study-page--air-clock",
    )


def case_studies_page() -> str:
    archive_cards = "".join(
        f"""
        <a class="archive-card archive-card--link reveal" href="{HOME["archive_cta_href"]}">
          <div class="card-label">Archive</div>
          <h3>{escape(title)}</h3>
          <p class="muted">{escape(summary)}</p>
        </a>
        """
        for title, summary in HOME["archive_cards"]
    )
    body = f"""
    <section class="section hero--compact">
      <div class="section-heading reveal">
        <div>
          <h1 style="font-size: clamp(34px, 5vw, 54px); line-height: 1;">Case studies</h1>
        </div>
      </div>
      <div class="card-grid">
        {render_case_cards(4)}
      </div>
    </section>
    <section class="section">
      <div class="section-heading reveal">
        <div>
          <p class="eyebrow">Earlier work</p>
          <h2>Previous portfolio</h2>
          <p>With over a decade of experience, there is more work beyond the public case studies shown here.</p>
        </div>
        <a class="ghost-button" href="{HOME["archive_cta_href"]}">View archive page</a>
      </div>
      <div class="three-up">
        {archive_cards}
      </div>
    </section>
    {portfolio_footer()}
    """
    return page_shell(SITE["title"], SITE["description"], "/case-studies/more-works/", body, nav_items=CHINESE_NAV_ITEMS, body_class="cn-nav-page")


def experiments_page() -> str:
    hero_tiles = "".join(
        f"""
        <article class="experiment-tile reveal">
          <img src="{item["media"]}" alt="{escape(item["title"])}">
          <div class="copy">
            <div class="card-label">{escape(item["title"])}</div>
            <h3>{escape(item["subtitle"])}</h3>
          </div>
        </article>
        """
        for item in EXPERIMENTS_PAGE["feature_cards"][:2]
    )
    tiles = "".join(
        f"""
        <article class="experiment-tile reveal">
          <img src="{item["media"]}" alt="{escape(item["title"])}">
          <div class="copy">
            <div class="card-label">{escape(item["title"])}</div>
            <h3>{escape(item["subtitle"])}</h3>
          </div>
        </article>
        """
        for item in EXPERIMENTS_PAGE["feature_cards"][2:]
    )
    body = f"""
    <section class="hero hero--compact">
      <div class="hero-copy reveal">
        <h1>{escape(EXPERIMENTS_PAGE["hero_title"])}</h1>
        <p>{escape(EXPERIMENTS_PAGE["hero_body"])}</p>
      </div>
      <div class="experiment-showcase" style="grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 26px;">
        {hero_tiles}
      </div>
    </section>
    <section class="section" style="padding-top: 140px;">
      <div class="experiment-showcase" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
        {tiles}
      </div>
    </section>
    {footer_contact()}
    """
    return page_shell(SITE["title"], SITE["description"], "/experiments/", body, nav_items=CHINESE_NAV_ITEMS, body_class="cn-nav-page")


def render_case_study_page(case: dict) -> str:
    details = "".join(
        f"""
        <article class="detail-card reveal">
          <span>{escape(label)}</span>
          <h3>{escape(value)}</h3>
        </article>
        """
        for label, value in case["details"]
    )
    stats = "".join(
        f"""
        <article class="stat-card reveal">
          <span>{escape(label)}</span>
          <strong>{escape(value)}</strong>
        </article>
        """
        for value, label in case["highlights"]
    )
    sections = "".join(
        f"""
        <article class="chapter-card reveal">
          <span>{escape(section["chapter"])}</span>
          <h3>{escape(section["title"])}</h3>
          <div class="tags">{"".join(f"<b>{escape(tag)}</b>" for tag in section["tags"])}</div>
          <p class="muted">{escape(section["body"])}</p>
          {'<p class="quote">' + escape(section["note"]) + '</p>' if section.get("note") else ''}
        </article>
        """
        for section in case["sections"]
    )
    gallery = "".join(
        (
            f"""
            <div class="video-frame reveal">
              <video src="{src}" controls muted playsinline preload="metadata"></video>
            </div>
            """
            if kind == "video"
            else f"""
            <div class="media-frame reveal">
              <img src="{src}" alt="{escape(case["title"])} media">
            </div>
            """
        )
        for src, kind in case["gallery"]
    )
    retros = "".join(
        f"""
        <article class="archive-card reveal">
          <div class="card-label">Retrospective</div>
          <p class="muted">{escape(item)}</p>
        </article>
        """
        for item in case["retrospective"]
    )
    body = f"""
    <section class="case-header">
      <div class="case-header-grid">
        <div class="reveal">
          <p class="eyebrow">{escape(case["eyebrow"])}</p>
          <h1>{escape(case["title"])}</h1>
          <p>{escape(case["summary"])}</p>
          <div style="margin-top: 28px; display:flex; gap:12px; flex-wrap:wrap;">
            <a class="pill-button" href="/case-studies/">Back to all case studies</a>
            <a class="ghost-button" href="#gallery">Jump to gallery</a>
          </div>
        </div>
        <div class="media-frame reveal">
          <img src="{case["hero_media"]}" alt="{escape(case["title"])} hero image">
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-heading reveal">
        <div>
          <p class="eyebrow">Overview</p>
          <h2>Problem and role</h2>
          <p>{escape(case["problem"])}</p>
        </div>
      </div>
      <div class="detail-grid">
        {details}
      </div>
    </section>

    <section class="section">
      <div class="section-heading reveal">
        <div>
          <p class="eyebrow">Highlights</p>
          <h2>Outcomes at a glance</h2>
        </div>
      </div>
      <div class="stat-grid">
        {stats}
      </div>
    </section>

    <section class="section">
      <div class="section-heading reveal">
        <div>
          <p class="eyebrow">Process</p>
          <h2>How the work unfolded</h2>
        </div>
      </div>
      <div class="chapter-grid">
        {sections}
      </div>
    </section>

    <section class="section" id="gallery">
      <div class="section-heading reveal">
        <div>
          <p class="eyebrow">Gallery</p>
          <h2>Artifacts, screens, and motion studies</h2>
        </div>
      </div>
      <div class="gallery">
        {gallery}
      </div>
    </section>

    <section class="section">
      <div class="section-heading reveal">
        <div>
          <p class="eyebrow">Retrospective</p>
          <h2>Lessons and tradeoffs</h2>
        </div>
      </div>
      <div class="three-up">
        {retros}
      </div>
    </section>

    {footer_contact()}
    """
    return page_shell(
        SITE["title"],
        case["summary"],
        None,
        body,
        nav_items=CHINESE_NAV_ITEMS,
        body_class="cn-nav-page",
        back_brand=True,
    )


def write_file(relative_path: str, content: str) -> None:
    target = DIST / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def ensure_dist() -> None:
    shutil.rmtree(DIST, ignore_errors=True)
    DIST.mkdir(parents=True, exist_ok=True)
    shutil.copytree(ASSETS_SRC, DIST / "assets")
    if RESUME_PDF_SOURCE.exists():
        target = DIST / RESUME_PDF_DIST
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(RESUME_PDF_SOURCE, target)
    if LEGACY_PORTFOLIO_IMAGE_SOURCE_DIR.exists():
        custom_dir = DIST / "assets" / "custom"
        custom_dir.mkdir(parents=True, exist_ok=True)
        for name in LEGACY_PORTFOLIO_IMAGE_NAMES:
            source = LEGACY_PORTFOLIO_IMAGE_SOURCE_DIR / name
            if source.exists():
                shutil.copy2(source, custom_dir / name)


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def wait_for_url(url: str, timeout: float = 15.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2):
                return
        except Exception:
            time.sleep(0.2)
    raise RuntimeError(f"Timed out waiting for {url}")


def fetch_text(url: str) -> str:
    with urllib.request.urlopen(url, timeout=15) as response:
        return response.read().decode("utf-8")


def rewrite_personal_site_html(content: str) -> str:
    rewritten = (
        content.replace('href="/#work"', 'href="/#other-works"')
        .replace('href="/resume"', 'href="/about/"')
        .replace('href="/ai-coding"', 'href="/experiments/"')
    )
    rewritten = re.sub(
        r"<header class=\"site-header\">.*?</header>",
        personal_site_case_header(),
        rewritten,
        count=1,
        flags=re.DOTALL,
    )
    rewritten = re.sub(
        r'<footer class="site-footer(?: [^"]*)? reveal(?: is-visible)?">.*?</footer>',
        personal_site_footer(),
        rewritten,
        flags=re.DOTALL,
    )
    return rewritten.replace(
        "</body>",
        f"<script>{CONTACT_MENU_INLINE_JS}</script>\n{PERSONAL_SITE_PORTFOLIO_FOOTER_SCRIPT}\n</body>",
    )


def import_personal_site_cases() -> None:
    if not PERSONAL_SITE_ROOT.exists():
        print(f"Skipped personal site case import: missing {PERSONAL_SITE_ROOT}")
        return

    source_styles = PERSONAL_SITE_ROOT / "styles.css"
    if source_styles.exists():
        shutil.copy2(source_styles, DIST / "styles.css")
        styles_path = DIST / "styles.css"
        existing_styles = styles_path.read_text(encoding="utf-8")
        injected_styles = existing_styles
        if "Codex rebuild: align imported case-page header" not in injected_styles:
            injected_styles += "\n\n" + PERSONAL_SITE_CASE_NAV_OVERRIDES + "\n"
        if "Codex rebuild: align imported case-page footer" not in injected_styles:
            injected_styles += "\n\n" + PERSONAL_SITE_PORTFOLIO_FOOTER_OVERRIDES + "\n"
        if "Codex rebuild: zhihu pc case page" not in injected_styles:
            injected_styles += "\n\n" + PERSONAL_SITE_ZHIHU_PC_CASE_OVERRIDES + "\n"
        if "Codex rebuild: air clock case page" not in injected_styles:
            injected_styles += "\n\n" + PERSONAL_SITE_AIR_CLOCK_CASE_OVERRIDES + "\n"
        styles_path.write_text(injected_styles, encoding="utf-8")

    source_assets = PERSONAL_SITE_ROOT / "assets"
    if source_assets.exists():
        shutil.copytree(source_assets, DIST / "assets", dirs_exist_ok=True)

    port = find_free_port()
    server = subprocess.Popen(
        ["node", "server.js"],
        cwd=PERSONAL_SITE_ROOT,
        env={**os.environ, "PORT": str(port)},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    base_url = f"http://127.0.0.1:{port}"

    try:
        wait_for_url(f"{base_url}/")
        for slug in PERSONAL_SITE_CASE_SLUGS:
            html = fetch_text(f"{base_url}/work/{slug}")
            write_file(f"work/{slug}/index.html", rewrite_personal_site_html(html))
            print(f"Built work/{slug}/index.html")
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=5)


def main() -> None:
    ensure_dist()
    write_file("index.html", home_page())
    write_file("about/index.html", about_page())
    write_file("resume/index.html", about_page())
    write_file("legacy-portfolio/index.html", legacy_portfolio_page())
    write_file("case-studies/index.html", case_studies_page())
    write_file("case-studies/earlier-work/index.html", legacy_portfolio_page())
    write_file("case-studies/more-works/index.html", more_works_page())
    write_file("experiments/index.html", experiments_page())
    for case in CASE_STUDIES:
        write_file(f"case-studies/{case['slug']}/index.html", render_case_study_page(case))
        print(f"Built case-studies/{case['slug']}/index.html")
    import_personal_site_cases()
    write_file("work/air-oclock/index.html", air_clock_case_page())
    print("Built work/air-oclock/index.html")
    write_file("work/zhihu-pc-reading-experience-revamp/index.html", zhihu_pc_case_page())
    print("Built work/zhihu-pc-reading-experience-revamp/index.html")
    print("Built index.html")
    print("Built about/index.html")
    print("Built resume/index.html")
    print("Built legacy-portfolio/index.html")
    print("Built case-studies/index.html")
    print("Built case-studies/earlier-work/index.html")
    print("Built case-studies/more-works/index.html")
    print("Built experiments/index.html")


if __name__ == "__main__":
    main()
