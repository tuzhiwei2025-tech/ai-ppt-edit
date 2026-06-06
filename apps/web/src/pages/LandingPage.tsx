import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, CheckCircle2, ClipboardCheck, Copy, PlugZap } from 'lucide-react';
import { useOpenDeck, DIR_API_SUPPORTED, FILE_API_SUPPORTED, FS_API_SUPPORTED } from '../fs/useOpenDeck.js';
import { gsap, useGSAP, revealOnScroll } from '../lib/gsap.js';
import { useGuideNav } from '../hooks/useGuideNav.js';
import { LandingHeader } from '../components/LandingHeader.js';
import { EditorPreview } from '../components/EditorPreview.js';
import { OpenDeckErrorAlert } from '../components/OpenDeckErrorAlert.js';
import { CinematicFooter } from '../components/ui/motion-footer.js';
import { PerspectiveMarquee } from '../components/ui/remocn-perspective-marquee.js';
import IntroAnimation from '../components/ui/scroll-morph-hero.js';
import { PrismFluxLoader } from '../components/ui/prism-flux-loader.js';
import { BrutalButton } from '../components/ui/brutal-button.js';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

type CapabilityStatus = 'ready' | 'beta' | 'planned';
type CapabilityKind = 'skill' | 'mcp';

interface LocalizedCapabilityItem {
  id: string;
  kind: CapabilityKind;
  title: string;
  summary: string;
  status: CapabilityStatus;
  triggers: string[];
}

interface ApiCapabilityItem {
  id: string;
  kind: CapabilityKind;
  title: Record<'en' | 'zh', string>;
  summary: Record<'en' | 'zh', string>;
  status: CapabilityStatus;
  triggers: Record<'en' | 'zh', string[]>;
}

interface LocalizedCopyBlock {
  id: string;
  language: 'markdown' | 'json';
  title: string;
  description: string;
  body: string;
}

interface ApiCopyBlock {
  id: string;
  language: 'markdown' | 'json';
  title: Record<'en' | 'zh', string>;
  description: Record<'en' | 'zh', string>;
  body: string;
}

const FALLBACK_SKILL_BODY = `---
name: ai-ppt-edit
description: Use this skill when working on the AI PPT Edit project: local-first HTML deck opening, visual editing, autosave, PPTX/PDF export, homepage capability modules, or future MCP service support.
---

# AI PPT Edit

Use this skill to maintain AI PPT Edit, a local-first editor for AI-generated HTML presentation decks.
`;

const FALLBACK_MCP_BODY = JSON.stringify({
  mcpServers: {
    'ai-ppt-edit': {
      command: 'node',
      args: ['./packages/mcp-server/dist/index.js'],
      env: {
        AI_PPT_EDIT_API_BASE: 'http://localhost:3000',
        AI_PPT_EDIT_WORKSPACE: '<approved-local-deck-folder>',
      },
    },
  },
}, null, 2);

function CopyArtifact({
  block,
  copyLabel,
  copiedLabel,
  copied,
  onCopy,
}: {
  block: LocalizedCopyBlock;
  copyLabel: string;
  copiedLabel: string;
  copied: boolean;
  onCopy: (block: LocalizedCopyBlock) => void;
}) {
  return (
    <div className="np-copy-artifact">
      <div className="np-copy-artifact-head">
        <div>
          <p className="np-copy-artifact-language">{block.language}</p>
          <h4>{block.title}</h4>
          <p>{block.description}</p>
        </div>
        <button type="button" onClick={() => onCopy(block)} className="np-copy-button">
          {copied ? <ClipboardCheck size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          <span>{copied ? copiedLabel : copyLabel}</span>
        </button>
      </div>
      <pre><code>{block.body}</code></pre>
    </div>
  );
}

export function LandingPage() {
  const { t, i18n } = useTranslation('landing');
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
  const previewHighlights = t('newHome.preview.highlights', { returnObjects: true }) as string[];
  const platformTemplates = t('newHome.templates.platforms', { returnObjects: true }) as string[];
  const footerMarqueeItems = t('newHome.footer.marqueeItems', { returnObjects: true }) as string[];
  const fallbackSkills = t('newHome.capabilities.skills.items', { returnObjects: true }) as LocalizedCapabilityItem[];
  const fallbackMcpServices = t('newHome.capabilities.mcp.items', { returnObjects: true }) as LocalizedCapabilityItem[];
  const [remoteSkills, setRemoteSkills] = useState<LocalizedCapabilityItem[] | null>(null);
  const [remoteMcpServices, setRemoteMcpServices] = useState<LocalizedCapabilityItem[] | null>(null);
  const [remoteCopyBlocks, setRemoteCopyBlocks] = useState<{ skill: LocalizedCopyBlock; mcp: LocalizedCopyBlock } | null>(null);
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
  const [capabilitySource, setCapabilitySource] = useState<'api' | 'local'>('local');
  const localeKey: 'en' | 'zh' = i18n.language.startsWith('en') ? 'en' : 'zh';
  const loadingButtonStyle = loading
    ? { backgroundColor: '#000', borderColor: '#fff', boxShadow: 'none', color: '#fff', opacity: 1 }
    : undefined;

  const openPrimary = () => {
    if (loading) return;
    if (FILE_API_SUPPORTED) void handlePickFile();
    else if (DIR_API_SUPPORTED) void handlePickFolder();
  };

  useEffect(() => {
    let cancelled = false;
    const localize = (items: ApiCapabilityItem[] = []) => items.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title[localeKey] ?? item.title.en,
      summary: item.summary[localeKey] ?? item.summary.en,
      status: item.status,
      triggers: item.triggers[localeKey] ?? item.triggers.en,
    }));
    const localizeCopyBlock = (block: ApiCopyBlock): LocalizedCopyBlock => ({
      id: block.id,
      language: block.language,
      title: block.title[localeKey] ?? block.title.en,
      description: block.description[localeKey] ?? block.description.en,
      body: block.body,
    });

    fetch(`${API_BASE}/v1/capabilities`)
      .then((res) => {
        if (!res.ok) throw new Error(`Capabilities request failed: ${res.status}`);
        return res.json() as Promise<{
          skills?: ApiCapabilityItem[];
          mcpServices?: ApiCapabilityItem[];
          copyBlocks?: {
            skill?: ApiCopyBlock;
            mcp?: ApiCopyBlock;
          };
          items?: ApiCapabilityItem[];
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        const apiSkills = Array.isArray(data.skills)
          ? data.skills
          : (data.items ?? []).filter((item) => item.kind === 'skill');
        const apiMcpServices = Array.isArray(data.mcpServices)
          ? data.mcpServices
          : (data.items ?? []).filter((item) => item.kind === 'mcp');
        setRemoteSkills(localize(apiSkills));
        setRemoteMcpServices(localize(apiMcpServices));
        if (data.copyBlocks?.skill && data.copyBlocks?.mcp) {
          setRemoteCopyBlocks({
            skill: localizeCopyBlock(data.copyBlocks.skill),
            mcp: localizeCopyBlock(data.copyBlocks.mcp),
          });
        }
        setCapabilitySource('api');
      })
      .catch(() => {
        if (!cancelled) {
          setRemoteSkills(null);
          setRemoteMcpServices(null);
          setRemoteCopyBlocks(null);
          setCapabilitySource('local');
        }
      });
    return () => { cancelled = true; };
  }, [localeKey]);

  const skillItems = remoteSkills ?? fallbackSkills;
  const mcpItems = remoteMcpServices ?? fallbackMcpServices;
  const fallbackCopyBlocks = useMemo(() => ({
    skill: {
      id: 'ai-ppt-edit-skill-fallback',
      language: 'markdown' as const,
      title: t('newHome.capabilities.copyBlocks.skillTitle'),
      description: t('newHome.capabilities.copyBlocks.skillDescription'),
      body: FALLBACK_SKILL_BODY,
    },
    mcp: {
      id: 'ai-ppt-edit-mcp-fallback',
      language: 'json' as const,
      title: t('newHome.capabilities.copyBlocks.mcpTitle'),
      description: t('newHome.capabilities.copyBlocks.mcpDescription'),
      body: FALLBACK_MCP_BODY,
    },
  }), [t]);
  const copyBlocks = remoteCopyBlocks ?? fallbackCopyBlocks;
  const capabilityCounts = useMemo(() => ({
    skills: skillItems.length,
    mcp: mcpItems.length,
  }), [skillItems.length, mcpItems.length]);

  const handleCopyBlock = async (block: LocalizedCopyBlock) => {
    try {
      await navigator.clipboard.writeText(block.body);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = block.body;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedBlockId(block.id);
    window.setTimeout(() => setCopiedBlockId((current) => (current === block.id ? null : current)), 1800);
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

        revealOnScroll('.np-preview-brief', { trigger: '#preview', stagger: 0.08, y: 20 });
      });
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(['.np-hero-kicker', '.np-hero-title', '.np-hero-copy', '.np-hero-actions', '.np-hero-panel',
          '.np-preview-brief'], { autoAlpha: 1, y: 0 });
      });
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      className="np-landing-shell min-h-screen overflow-x-hidden text-foreground"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="fixed inset-3 z-[60] pointer-events-none rounded-2xl border-2 border-dashed border-primary bg-primary/10" aria-hidden="true" />
      )}

      <LandingHeader
        onOpenEditor={openPrimary}
        onOpenFolder={handlePickFolder}
        onOpenSingle={handlePickFile}
        onRecall={handleRecall}
        canOpenFolder={DIR_API_SUPPORTED}
        canOpenSingle={FILE_API_SUPPORTED}
        loading={loading}
      />

      <main className="np-landing-main">
        <section className="np-section np-section-morph relative h-[calc(100svh-3.5rem)] min-h-[600px] overflow-hidden">
          <IntroAnimation
            introTitle={t('newHome.morph.overlayTitle')}
            scrollLabel={t('newHome.morph.scrollLabel')}
            activeTitle={t('newHome.morph.title')}
            activeDescription={t('newHome.morph.description')}
            cardBackTitle={t('newHome.morph.cardBackTitle')}
            cardBackSubtitle={t('newHome.morph.cardLabel')}
            cardAlt={t('newHome.morph.cardAlt')}
          />
          <div className="np-section-fade np-section-fade-hero pointer-events-none absolute inset-x-0 bottom-0" aria-hidden="true" />
        </section>

        <section id="top" className="np-section np-section-hero-detail relative px-5 sm:px-8 pt-14 sm:pt-20 pb-16">
          <div className="np-section-aura np-section-aura-top pointer-events-none absolute inset-x-0 top-0" aria-hidden="true" />
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,0.86fr)_minmax(430px,1.14fr)] lg:items-center">
            <div className="min-w-0">
              <p className="np-hero-kicker text-xs font-bold uppercase tracking-[0.18em] text-primary">
                {t('newHome.hero.eyebrow')}
              </p>
              <h1 className="np-hero-title mt-5 max-w-3xl text-4xl font-black leading-[1.02] tracking-normal sm:text-6xl lg:text-7xl">
                {t('newHome.hero.title')}
                <span className="block text-primary">{t('newHome.hero.titleAccent')}</span>
              </h1>
              <p className="np-hero-copy mt-6 max-w-xl text-base leading-8 text-muted-foreground">
                {t('newHome.hero.copy')}
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
                  <BrutalButton
                    onClick={openPrimary}
                    disabled={loading}
                    variant="primary"
                    className="px-6 py-3 text-sm"
                    style={loadingButtonStyle}
                  >
                    {loading ? <PrismFluxLoader compact size={16} speed={4} label={t('newHome.loading.opening')} /> : t('newHome.actions.openHtml')}
                  </BrutalButton>
                ) : (
                  <span className="rounded-md border border-border px-4 py-3 text-sm text-muted-foreground">
                    {t('hero.unsupported')}
                  </span>
                )}
                <BrutalButton onClick={loadSampleTemplate} disabled={loading} variant="secondary" className="px-5 py-3 text-sm">
                  {t('newHome.actions.sample')}
                </BrutalButton>
                <BrutalButton onClick={() => openGuide('generate')} variant="secondary" className="px-5 py-3 text-sm">
                  {t('newHome.actions.guide')}
                </BrutalButton>
              </div>
            </div>

            <div className="np-hero-panel relative">
              <div className="rounded-[8px] border border-border bg-card p-2 shadow-[0_28px_80px_color-mix(in_srgb,var(--foreground)_18%,transparent)]">
                <EditorPreview />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                {(t('newHome.hero.steps', { returnObjects: true }) as string[]).map((item, index) => (
                  <div key={item} className="rounded-[7px] border border-border bg-card/70 px-3 py-2">
                    <span className="font-mono text-primary">0{index + 1}</span>
                    <span className="ml-2 font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="templates" className="np-section np-section-templates py-8 text-foreground">
          <div className="relative h-[150px] w-full overflow-hidden bg-transparent">
            <PerspectiveMarquee
              items={platformTemplates}
              fontSize={56}
              color="var(--foreground)"
              background="transparent"
              fadeColor="transparent"
              rotateY={-18}
              rotateX={6}
              pixelsPerFrame={1.7}
            />
          </div>
        </section>

        <section id="capabilities" className="np-section np-section-capabilities px-5 py-16 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 lg:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)] lg:items-start">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{t('newHome.capabilities.eyebrow')}</p>
                <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal sm:text-5xl">
                  {t('newHome.capabilities.title')}
                </h2>
                <p className="mt-5 text-sm leading-7 text-muted-foreground">
                  {t('newHome.capabilities.copy')}
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-[8px] border border-border bg-card px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span>{capabilitySource === 'api' ? t('newHome.capabilities.sourceApi') : t('newHome.capabilities.sourceLocal')}</span>
                </div>
                <div className="np-capability-metrics mt-6 grid max-w-sm grid-cols-2 border-y border-border">
                  <div className="py-4 pr-4">
                    <p className="text-3xl font-black leading-none">{capabilityCounts.skills}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('newHome.capabilities.skills.metric')}</p>
                  </div>
                  <div className="border-l border-border py-4 pl-4">
                    <p className="text-3xl font-black leading-none">{capabilityCounts.mcp}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('newHome.capabilities.mcp.metric')}</p>
                  </div>
                </div>
              </div>

              <div className="np-capability-workbench">
                <section className="np-capability-panel np-capability-panel-skill">
                  <div className="np-capability-panel-head">
                    <span className="np-capability-icon" aria-hidden="true"><Bot size={18} /></span>
                    <div>
                      <p className="np-capability-label">{t('newHome.capabilities.skills.label')}</p>
                      <h3>{t('newHome.capabilities.skills.title')}</h3>
                    </div>
                  </div>
                  <p className="np-capability-panel-copy">{t('newHome.capabilities.skills.copy')}</p>

                  <CopyArtifact
                    block={copyBlocks.skill}
                    copyLabel={t('newHome.capabilities.copyBlocks.copy')}
                    copiedLabel={t('newHome.capabilities.copyBlocks.copied')}
                    copied={copiedBlockId === copyBlocks.skill.id}
                    onCopy={handleCopyBlock}
                  />

                  <div className="np-capability-rows">
                    {skillItems.map((item) => (
                      <article key={item.id} className="np-capability-row">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4>{item.title}</h4>
                            <span className={`np-status np-status-${item.status}`}>{t(`newHome.capabilities.status.${item.status}`)}</span>
                          </div>
                          <p>{item.summary}</p>
                        </div>
                        <div className="np-capability-tags">
                          {item.triggers.map((trigger) => <span key={trigger}>{trigger}</span>)}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="np-capability-panel np-capability-panel-mcp">
                  <div className="np-capability-panel-head">
                    <span className="np-capability-icon" aria-hidden="true"><PlugZap size={18} /></span>
                    <div>
                      <p className="np-capability-label">{t('newHome.capabilities.mcp.label')}</p>
                      <h3>{t('newHome.capabilities.mcp.title')}</h3>
                    </div>
                  </div>
                  <p className="np-capability-panel-copy">{t('newHome.capabilities.mcp.copy')}</p>

                  <CopyArtifact
                    block={copyBlocks.mcp}
                    copyLabel={t('newHome.capabilities.copyBlocks.copy')}
                    copiedLabel={t('newHome.capabilities.copyBlocks.copied')}
                    copied={copiedBlockId === copyBlocks.mcp.id}
                    onCopy={handleCopyBlock}
                  />

                  <div className="np-mcp-service-list">
                    {mcpItems.map((item) => (
                      <article key={item.id} className="np-mcp-service">
                        <div>
                          <h4>{item.title}</h4>
                          <p>{item.summary}</p>
                        </div>
                        <div className="np-mcp-service-meta">
                          <span className={`np-status np-status-${item.status}`}>{t(`newHome.capabilities.status.${item.status}`)}</span>
                          <div className="np-capability-tags">
                            {item.triggers.map((trigger) => <span key={trigger}>{trigger}</span>)}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>

        <section id="preview" className="np-section np-section-preview relative px-5 py-14 sm:px-8 lg:py-20">
          <div className="np-section-fade np-section-fade-preview-top pointer-events-none absolute inset-x-0 top-0" aria-hidden="true" />
          <div className="np-section-fade np-section-fade-preview-bottom pointer-events-none absolute inset-x-0 bottom-0" aria-hidden="true" />
          <div className="mx-auto grid max-w-6xl gap-9 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] lg:items-center">
            <div className="np-preview-brief min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{t('newHome.preview.eyebrow')}</p>
              <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight tracking-normal sm:text-4xl lg:text-5xl">{t('newHome.preview.title')}</h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground">
                {t('newHome.preview.copy')}
              </p>
              <div className="mt-7 space-y-3">
                {previewHighlights.map((item) => (
                  <div key={item} className="np-preview-brief flex gap-3 border-t border-border pt-3 text-sm leading-6 text-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="np-preview-brief rounded-[8px] border border-border bg-background p-2 sm:p-3">
              <EditorPreview />
            </div>
          </div>
        </section>

        <CinematicFooter
          copy={{
            marqueeItems: footerMarqueeItems,
            giantText: t('newHome.footer.giantText'),
            heading: t('newHome.footer.heading'),
            primaryOpen: t('newHome.footer.primaryOpen'),
            primarySample: t('newHome.footer.primarySample'),
            preview: t('newHome.footer.preview'),
            templates: t('newHome.footer.templates'),
            copyright: t('newHome.footer.copyright'),
            builtFor: t('newHome.footer.builtFor'),
            audience: t('newHome.footer.audience'),
            backToTop: t('newHome.footer.backToTop'),
          }}
        />
      </main>
    </div>
  );
}
