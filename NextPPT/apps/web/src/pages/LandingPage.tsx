import { useRef } from 'react';
import { useOpenDeck, DIR_API_SUPPORTED, FILE_API_SUPPORTED, FS_API_SUPPORTED } from '../fs/useOpenDeck.js';
import { gsap, useGSAP, revealOnScroll } from '../lib/gsap.js';
import { useGuideNav } from '../hooks/useGuideNav.js';
import { SiteHeader } from '../components/SiteHeader.js';
import { EditorPreview } from '../components/EditorPreview.js';
import { OpenDeckErrorAlert } from '../components/OpenDeckErrorAlert.js';
import AnimatedFooter from '../components/ui/animated-footer.js';
import { CinematicFooter } from '../components/ui/motion-footer.js';
import { PerspectiveMarquee } from '../components/ui/remocn-perspective-marquee.js';

const platformTemplates = [
  'Manus',
  'Cursor',
  'Claude',
  'ChatGPT',
  'Gemini',
  'Code',
  'Gamma',
  'Canva',
  'Notion',
  'Deck.html',
];

const modules = [
  {
    title: 'HTML PPT',
    status: 'Now',
    copy: '面向 AI 生成的 deck.html，提供点选编辑、拖拽布局、图片替换和 PPTX/PDF 导出。',
  },
  {
    title: 'Template Hub',
    status: 'Next',
    copy: '按 Manus、Code、Cursor、Claude 等 AI 产物组织模板，形成可复用的演示稿入口。',
  },
  {
    title: 'DOCX HTML',
    status: 'Planned',
    copy: '后续把 docx 转换后的 HTML 文档纳入同一编辑层，支持段落、图片、版式模块化调整。',
  },
  {
    title: 'Export Core',
    status: 'Open',
    copy: '继续保留本地优先导出服务，把截图、PDF、PPTX 能力拆成清晰的开源模块。',
  },
];

const footerLeftLinks = [
  { href: '#top', label: 'Home' },
  { href: '#templates', label: 'Templates' },
  { href: '#modules', label: 'Modules' },
  { href: '#roadmap', label: 'Roadmap' },
];

const footerRightLinks = [
  { href: '/sample-deck.html', label: 'Sample deck' },
  { href: '#preview', label: 'Editor preview' },
  { href: '#top', label: 'Back to top' },
];

export function LandingPage() {
  const { openGuide } = useGuideNav();
  const {
    loading,
    error,
    formatError,
    dragOver,
    setDragOver,
    handlePickFolder,
    handlePickFile,
    handleRecall,
    loadSampleTemplate,
    handleDrop,
  } = useOpenDeck();

  const rootRef = useRef<HTMLDivElement>(null);

  const openPrimary = () => {
    if (loading) return;
    if (FILE_API_SUPPORTED) void handlePickFile();
    else if (DIR_API_SUPPORTED) void handlePickFolder();
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.75 } })
          .from('.np-hero-kicker', { autoAlpha: 0, y: 16 })
          .from('.np-hero-title', { autoAlpha: 0, y: 24 }, '-=0.55')
          .from('.np-hero-copy', { autoAlpha: 0, y: 18 }, '-=0.5')
          .from('.np-hero-actions', { autoAlpha: 0, y: 14 }, '-=0.45')
          .from('.np-hero-panel', { autoAlpha: 0, y: 32 }, '-=0.45');

        revealOnScroll('.np-module-card', { trigger: '#modules', stagger: 0.1, y: 24 });
        revealOnScroll('.np-roadmap-item', { trigger: '#roadmap', stagger: 0.1, y: 22 });
      });
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(['.np-hero-kicker', '.np-hero-title', '.np-hero-copy', '.np-hero-actions', '.np-hero-panel',
          '.np-module-card', '.np-roadmap-item'], { autoAlpha: 1, y: 0 });
      });
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      className="min-h-screen overflow-x-hidden bg-[#f7f7f2] text-[#101113] dark:bg-[#111113] dark:text-[#f5f5f7]"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="fixed inset-3 z-[60] pointer-events-none rounded-2xl border-2 border-dashed border-[#7e14ff] bg-[#7e14ff]/10" aria-hidden="true" />
      )}

      <SiteHeader />

      <main>
        <section id="top" className="relative px-5 sm:px-8 pt-14 sm:pt-20 pb-16">
          <div className="absolute inset-x-0 top-0 h-px bg-[#101113]/10 dark:bg-white/10" aria-hidden="true" />
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:items-center">
            <div>
              <p className="np-hero-kicker text-xs font-bold uppercase tracking-[0.24em] text-[#0f766e] dark:text-[#2dd4bf]">
                Open-source AI presentation editor
              </p>
              <h1 className="np-hero-title mt-5 max-w-3xl text-5xl font-black leading-[0.96] tracking-normal sm:text-6xl">
                不只是打开 HTML PPT，
                <span className="block text-[#7e14ff] dark:text-[#a855ff]">而是整理 <span className="sm:whitespace-nowrap">AI 模板生态。</span></span>
              </h1>
              <p className="np-hero-copy mt-6 max-w-2xl text-base leading-8 text-[#4e5357] dark:text-[#b7bbc1]">
                NextPPT 现在专注 AI 生成的 HTML 演示稿：点选编辑、拖拽版式、导出 PPTX/PDF。后续会把 DOCX 转 HTML 的在线编辑也拆成独立模块接入同一个开源工作台。
              </p>

              {error && (
                <OpenDeckErrorAlert
                  className="mt-6 max-w-xl text-left"
                  error={error}
                  formatError={formatError}
                  onGoToGuide={() => openGuide('generate')}
                />
              )}

              <div className="np-hero-actions mt-8 flex flex-wrap gap-3">
                {FS_API_SUPPORTED ? (
                  <button onClick={openPrimary} disabled={loading} className="hds-btn-primary px-6 py-3 text-sm font-semibold disabled:opacity-50">
                    {loading ? 'Opening...' : '打开 HTML PPT'}
                  </button>
                ) : (
                  <span className="rounded-md border border-[#101113]/10 px-4 py-3 text-sm text-[#4e5357] dark:border-white/10 dark:text-[#b7bbc1]">
                    需要 Chromium 内核浏览器
                  </span>
                )}
                <button onClick={loadSampleTemplate} disabled={loading} className="hds-btn px-5 py-3 text-sm font-semibold disabled:opacity-40">
                  试用样例
                </button>
                <button onClick={() => openGuide('generate')} className="hds-btn px-5 py-3 text-sm font-semibold">
                  AI 生成指南
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-[#62676d] dark:text-[#9ca3af]">
                <span className="rounded-full border border-[#101113]/10 px-3 py-1 dark:border-white/10">MIT open source</span>
                <span className="rounded-full border border-[#101113]/10 px-3 py-1 dark:border-white/10">HTML first</span>
                <span className="rounded-full border border-[#101113]/10 px-3 py-1 dark:border-white/10">Future DOCX HTML</span>
              </div>
            </div>

            <div className="np-hero-panel relative">
              <div className="rounded-[8px] border border-[#101113]/12 bg-white p-2 shadow-[0_28px_80px_rgba(16,17,19,0.18)] dark:border-white/12 dark:bg-[#18181b]">
                <EditorPreview />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                {['Prompt', 'Template', 'Export'].map((item, index) => (
                  <div key={item} className="rounded-[7px] border border-[#101113]/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                    <span className="font-mono text-[#7e14ff] dark:text-[#c084fc]">0{index + 1}</span>
                    <span className="ml-2 font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="templates" className="border-y border-[#101113]/10 bg-[#101113] py-14 text-white dark:border-white/10">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2dd4bf]">Template platform layer</p>
                <h2 className="mt-3 text-3xl font-black tracking-normal sm:text-5xl">支持不同 AI 平台产出的 PPT 模板</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-white/62">
                先把 HTML PPT 这条链路做稳，再把 Manus、Code、Cursor、Claude 等平台模板归档为可编辑入口。
              </p>
            </div>

            <div className="relative h-[280px] overflow-hidden rounded-[8px] border border-white/10 bg-[#050505]">
              <PerspectiveMarquee
                items={platformTemplates}
                fontSize={82}
                color="#f7f7f2"
                background="#050505"
                fadeColor="#050505"
                rotateY={-24}
                rotateX={9}
                pixelsPerFrame={2.1}
              />
            </div>
          </div>
        </section>

        <section id="modules" className="px-5 py-16 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0f766e] dark:text-[#2dd4bf]">Modular editor roadmap</p>
              <h2 className="mt-3 text-3xl font-black tracking-normal sm:text-5xl">从 HTML PPT 开始，拆成更清晰的编辑模块。</h2>
            </div>

            <div className="mt-10 grid gap-3 md:grid-cols-2">
              {modules.map((module) => (
                <article key={module.title} className="np-module-card rounded-[8px] border border-[#101113]/10 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-2xl font-black tracking-normal">{module.title}</h3>
                    <span className="rounded-full border border-[#101113]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#7e14ff] dark:border-white/10 dark:text-[#c084fc]">
                      {module.status}
                    </span>
                  </div>
                  <p className="mt-5 text-sm leading-7 text-[#555b60] dark:text-[#b7bbc1]">{module.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="preview" className="border-y border-[#101113]/10 bg-white px-5 py-16 dark:border-white/10 dark:bg-[#18181b] sm:px-8 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7e14ff] dark:text-[#c084fc]">Current capability</p>
              <h2 className="mt-3 text-3xl font-black tracking-normal sm:text-5xl">当前只做 HTML 格式 PPT，但入口要为更多文档类型预留。</h2>
              <p className="mt-5 text-sm leading-7 text-[#555b60] dark:text-[#b7bbc1]">
                首页现在明确把项目定位成开源 AI PPT 编辑器：模板来源是 AI 平台，当前核心是 HTML deck，后续模块是 DOCX HTML、模板仓库和导出服务。
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                {DIR_API_SUPPORTED && (
                  <button onClick={handlePickFolder} disabled={loading} className="hds-btn-primary px-4 py-2 text-sm disabled:opacity-40">打开文件夹</button>
                )}
                {FILE_API_SUPPORTED && (
                  <button onClick={handlePickFile} disabled={loading} className="hds-btn px-4 py-2 text-sm disabled:opacity-40">打开单个 HTML</button>
                )}
                {DIR_API_SUPPORTED && (
                  <button onClick={handleRecall} disabled={loading} className="hds-btn px-4 py-2 text-sm disabled:opacity-40">恢复上次目录</button>
                )}
              </div>
            </div>
            <div className="rounded-[8px] border border-[#101113]/10 bg-[#f7f7f2] p-3 dark:border-white/10 dark:bg-[#111113]">
              <EditorPreview />
            </div>
          </div>
        </section>

        <section id="roadmap" className="px-5 py-16 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0f766e] dark:text-[#2dd4bf]">Open-source build path</p>
            <div className="mt-6 grid gap-3 lg:grid-cols-3">
              {[
                ['01', '模板入口', '按 AI 平台和用途整理 HTML PPT 模板，降低从 prompt 到可编辑文件的成本。'],
                ['02', '编辑内核', '把 iframe runtime、属性面板、拖拽布局和历史记录抽成稳定的编辑层。'],
                ['03', 'DOCX 扩展', '在 HTML PPT 稳定后，接入 docx 转 HTML 的在线编辑与导出流程。'],
              ].map(([step, title, copy]) => (
                <article key={step} className="np-roadmap-item rounded-[8px] border border-[#101113]/10 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="font-mono text-sm text-[#7e14ff] dark:text-[#c084fc]">{step}</p>
                  <h3 className="mt-4 text-xl font-black">{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-[#555b60] dark:text-[#b7bbc1]">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <CinematicFooter />

        <div className="h-[560px] lg:h-screen">
          <AnimatedFooter
            leftLinks={footerLeftLinks}
            rightLinks={footerRightLinks}
            copyrightText="2026 NextPPT · Open-source AI deck editor"
            barCount={18}
          />
        </div>
      </main>
    </div>
  );
}
