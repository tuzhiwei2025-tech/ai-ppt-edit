import type { FastifyInstance } from 'fastify';
import fs from 'node:fs/promises';

type CapabilityStatus = 'ready' | 'beta' | 'planned';
type CapabilityKind = 'skill' | 'mcp';

interface CapabilityItem {
  id: string;
  kind: CapabilityKind;
  title: Record<'en' | 'zh', string>;
  summary: Record<'en' | 'zh', string>;
  status: CapabilityStatus;
  triggers: Record<'en' | 'zh', string[]>;
}

interface CopyBlock {
  id: string;
  language: 'markdown' | 'json';
  title: Record<'en' | 'zh', string>;
  description: Record<'en' | 'zh', string>;
  body: string;
}

const skillFileUrl = new URL('../../../../skills/ai-ppt-edit/SKILL.md', import.meta.url);

const skills: CapabilityItem[] = [
  {
    id: 'skill-html-deck-repair',
    kind: 'skill',
    title: {
      en: 'HTML deck repair',
      zh: 'HTML 演示稿修复',
    },
    summary: {
      en: 'Detect missing slide roots, invalid deck structure and common AI output issues before opening.',
      zh: '打开前识别缺失 slide 根节点、结构异常和常见 AI 产物问题。',
    },
    status: 'ready',
    triggers: {
      en: ['format check', 'slide root', 'AI output'],
      zh: ['格式检查', 'slide root', 'AI 输出'],
    },
  },
  {
    id: 'skill-template-intake',
    kind: 'skill',
    title: {
      en: 'Template intake',
      zh: '模板接入',
    },
    summary: {
      en: 'Normalize Manus, Cursor, Claude and ChatGPT HTML deck variants into one editing path.',
      zh: '把 Manus、Cursor、Claude、ChatGPT 等 HTML 演示稿变体统一到一条编辑链路。',
    },
    status: 'beta',
    triggers: {
      en: ['Manus', 'Cursor', 'Claude', 'ChatGPT'],
      zh: ['Manus', 'Cursor', 'Claude', 'ChatGPT'],
    },
  },
  {
    id: 'skill-export-packaging',
    kind: 'skill',
    title: {
      en: 'Export packaging',
      zh: '导出打包',
    },
    summary: {
      en: 'Prepare selected pages, watermark state and deck metadata for high-DPI PPTX/PDF output.',
      zh: '整理页码范围、水印状态和演示稿元数据，用于高 DPI PPTX/PDF 输出。',
    },
    status: 'ready',
    triggers: {
      en: ['PPTX', 'PDF', 'page range'],
      zh: ['PPTX', 'PDF', '页码范围'],
    },
  },
];

const mcpServices: CapabilityItem[] = [
  {
    id: 'mcp-filesystem',
    kind: 'mcp',
    title: {
      en: 'Filesystem MCP',
      zh: '文件系统 MCP',
    },
    summary: {
      en: 'Expose approved local deck folders as controlled read/write workspaces for automation.',
      zh: '把授权后的本地演示稿目录暴露为可控读写工作区，供自动化调用。',
    },
    status: 'planned',
    triggers: {
      en: ['local files', 'workspace', 'snapshots'],
      zh: ['本地文件', '工作区', '快照'],
    },
  },
  {
    id: 'mcp-browser-render',
    kind: 'mcp',
    title: {
      en: 'Browser render MCP',
      zh: '浏览器渲染 MCP',
    },
    summary: {
      en: 'Turn rendering, screenshot and export operations into a reusable tool surface.',
      zh: '把渲染、截图和导出操作抽成可复用工具面。',
    },
    status: 'beta',
    triggers: {
      en: ['render', 'screenshot', 'export'],
      zh: ['渲染', '截图', '导出'],
    },
  },
  {
    id: 'mcp-template-registry',
    kind: 'mcp',
    title: {
      en: 'Template registry MCP',
      zh: '模板注册 MCP',
    },
    summary: {
      en: 'Register reusable platform templates and expose them to the home page and editor launcher.',
      zh: '登记可复用平台模板，并暴露给首页与编辑器启动入口。',
    },
    status: 'planned',
    triggers: {
      en: ['templates', 'registry', 'platforms'],
      zh: ['模板', '注册表', '平台'],
    },
  },
];

const fallbackSkillBody = `---
name: ai-ppt-edit
description: Use this skill when working on the AI PPT Edit project: local-first HTML deck opening, visual editing, autosave, PPTX/PDF export, homepage capability modules, or future MCP service support.
---

# AI PPT Edit

Use this skill to maintain AI PPT Edit, a local-first editor for AI-generated HTML presentation decks.
`;

const mcpTemplateBody = JSON.stringify({
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

async function readSkillBody() {
  try {
    return await fs.readFile(skillFileUrl, 'utf8');
  } catch {
    return fallbackSkillBody;
  }
}

async function copyBlocks(): Promise<{ skill: CopyBlock; mcp: CopyBlock }> {
  return {
    skill: {
      id: 'ai-ppt-edit-skill',
      language: 'markdown',
      title: {
        en: 'Copy AI PPT Edit Skill',
        zh: '复制 AI PPT Edit Skill',
      },
      description: {
        en: 'A complete SKILL.md that others can save as a Codex Skill.',
        zh: '可直接给别人保存为 Codex Skill 的完整 SKILL.md。',
      },
      body: await readSkillBody(),
    },
    mcp: {
      id: 'ai-ppt-edit-mcp-template',
      language: 'json',
      title: {
        en: 'Copy MCP config template',
        zh: '复制 MCP 配置模板',
      },
      description: {
        en: 'A future MCP server config template for AI PPT Edit service integration.',
        zh: '用于后续 AI PPT Edit 服务接入的 MCP 配置模板。',
      },
      body: mcpTemplateBody,
    },
  };
}

export async function capabilityRoutes(app: FastifyInstance) {
  app.get('/v1/capabilities', async () => ({
    version: 1,
    generatedAt: new Date().toISOString(),
    skills,
    mcpServices,
    copyBlocks: await copyBlocks(),
    items: [...skills, ...mcpServices],
  }));
}
