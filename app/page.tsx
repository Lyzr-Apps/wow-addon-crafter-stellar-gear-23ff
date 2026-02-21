'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  FiCode, FiEye, FiFolder, FiSettings, FiSend, FiGithub,
  FiPackage, FiChevronDown, FiChevronUp, FiFile, FiSearch, FiTrash2,
  FiEdit3, FiDownload, FiClock, FiCheck, FiX, FiLoader,
  FiZap, FiMonitor, FiCpu, FiUsers, FiShield,
  FiMessageSquare, FiExternalLink, FiCopy, FiInfo
} from 'react-icons/fi'

// ---- Constants ----

const AGENT_IDS = {
  ADDON_MANAGER: '699a2e6ebade9b14a87bd520',
  ITERATION_FEEDBACK: '699a2e8e7a83a1f004cc0d4c',
  GITHUB_DELIVERY: '699a2ea12e5953640779a316',
  ADDON_PACKAGER: '699a2e8fa01aa32678e1d82e',
} as const

const AGENTS_INFO = [
  { id: AGENT_IDS.ADDON_MANAGER, name: 'Addon Development Manager', purpose: 'Generates complete WoW addon code from specs' },
  { id: AGENT_IDS.ITERATION_FEEDBACK, name: 'Iteration Feedback Agent', purpose: 'Refines addon code from developer feedback' },
  { id: AGENT_IDS.GITHUB_DELIVERY, name: 'GitHub Delivery Agent', purpose: 'Commits addon files to GitHub repositories' },
  { id: AGENT_IDS.ADDON_PACKAGER, name: 'Addon Packager Agent', purpose: 'Packages addon into a downloadable ZIP' },
]

type ScreenType = 'workspace' | 'codeReview' | 'history' | 'settings'
type StatusType = 'idle' | 'generating' | 'ready' | 'refining' | 'committing' | 'packaging'

interface AddonFile {
  filename: string
  content: string
  file_type: string
  description?: string
}

interface FeedbackEntry {
  role: 'user' | 'agent'
  message: string
}

interface Project {
  id: string
  name: string
  type: string
  files: AddonFile[]
  createdAt: string
  iterationCount: number
  status: string
  fileTree: string
  specSummary: string
}

interface AddonConfig {
  addonType: string
  addonName: string
  features: string
  uiLayout: string
  behavior: string
  tocVersion: string
  tocAuthor: string
  tocDeps: string
  tocInterface: string
}

interface SettingsData {
  defaultInterface: string
  defaultAuthor: string
  defaultDeps: string
}

// ---- Sample Data ----

const SAMPLE_FILES: AddonFile[] = [
  {
    filename: 'MyAddon.toc',
    content: '## Interface: 110002\n## Title: DPS Meter Pro\n## Notes: Advanced DPS meter with raid analytics\n## Author: AddonForge\n## Version: 1.0.0\n## SavedVariables: DPSMeterProDB\n\nCore.lua\nUI.lua\nUI.xml',
    file_type: 'toc',
    description: 'Table of Contents file with addon metadata'
  },
  {
    filename: 'Core.lua',
    content: 'local addonName, addon = ...\nlocal DPSMeterPro = LibStub("AceAddon-3.0"):NewAddon(addonName)\n\n-- Database defaults\nlocal defaults = {\n  profile = {\n    minimap = { hide = false },\n    width = 250,\n    height = 300,\n    showRank = true,\n  }\n}\n\nfunction DPSMeterPro:OnInitialize()\n  self.db = LibStub("AceDB-3.0"):New("DPSMeterProDB", defaults, true)\n  self:RegisterEvent("COMBAT_LOG_EVENT_UNFILTERED")\n  self:Print("DPS Meter Pro loaded successfully!")\nend\n\nfunction DPSMeterPro:OnEnable()\n  self:UpdateDisplay()\nend\n\nfunction DPSMeterPro:COMBAT_LOG_EVENT_UNFILTERED()\n  local timestamp, event, _, sourceGUID = CombatLogGetCurrentEventInfo()\n  if event == "SWING_DAMAGE" or event == "SPELL_DAMAGE" then\n    -- Track damage\n    self:ProcessDamageEvent(sourceGUID)\n  end\nend\n\nfunction DPSMeterPro:ProcessDamageEvent(guid)\n  -- Process and store damage data\n  local name = select(6, GetPlayerInfoByGUID(guid))\n  if name then\n    self.db.profile.data = self.db.profile.data or {}\n    self.db.profile.data[name] = (self.db.profile.data[name] or 0) + 1\n  end\nend',
    file_type: 'lua',
    description: 'Core addon logic with event handling'
  },
  {
    filename: 'UI.lua',
    content: 'local addonName, addon = ...\nlocal DPSMeterPro = LibStub("AceAddon-3.0"):GetAddon(addonName)\n\nfunction DPSMeterPro:CreateMainFrame()\n  local frame = CreateFrame("Frame", "DPSMeterProFrame", UIParent, "BackdropTemplate")\n  frame:SetSize(self.db.profile.width, self.db.profile.height)\n  frame:SetPoint("CENTER")\n  frame:SetMovable(true)\n  frame:EnableMouse(true)\n  frame:RegisterForDrag("LeftButton")\n  frame:SetScript("OnDragStart", frame.StartMoving)\n  frame:SetScript("OnDragStop", frame.StopMovingOrSizing)\n  \n  -- Backdrop\n  frame:SetBackdrop({\n    bgFile = "Interface\\\\Tooltips\\\\UI-Tooltip-Background",\n    edgeFile = "Interface\\\\Tooltips\\\\UI-Tooltip-Border",\n    tile = true, tileSize = 16, edgeSize = 16,\n    insets = { left = 4, right = 4, top = 4, bottom = 4 }\n  })\n  frame:SetBackdropColor(0, 0, 0, 0.8)\n  \n  self.mainFrame = frame\n  return frame\nend\n\nfunction DPSMeterPro:UpdateDisplay()\n  if not self.mainFrame then\n    self:CreateMainFrame()\n  end\n  -- Refresh bars\nend',
    file_type: 'lua',
    description: 'UI creation and management'
  },
  {
    filename: 'UI.xml',
    content: '<Ui xmlns="http://www.blizzard.com/wow/ui/">\n  <Frame name="DPSMeterProTemplate" virtual="true">\n    <Size x="200" y="20"/>\n    <Layers>\n      <Layer level="BACKGROUND">\n        <Texture name="$parentBar" setAllPoints="true">\n          <Color r="0.2" g="0.6" b="1.0" a="0.8"/>\n        </Texture>\n      </Layer>\n      <Layer level="OVERLAY">\n        <FontString name="$parentName" inherits="GameFontNormal">\n          <Anchors>\n            <Anchor point="LEFT" x="4" y="0"/>\n          </Anchors>\n        </FontString>\n        <FontString name="$parentDPS" inherits="GameFontNormal">\n          <Anchors>\n            <Anchor point="RIGHT" x="-4" y="0"/>\n          </Anchors>\n        </FontString>\n      </Layer>\n    </Layers>\n  </Frame>\n</Ui>',
    file_type: 'xml',
    description: 'XML frame templates for DPS bars'
  }
]

const SAMPLE_FEEDBACK: FeedbackEntry[] = [
  { role: 'user', message: 'Can you add a minimap button to toggle the addon window?' },
  { role: 'agent', message: 'Added LibDBIcon-1.0 integration for minimap button. The addon now registers a minimap icon that toggles the main frame visibility on click. Updated Core.lua with minimap initialization and UI.lua with toggle functionality.' },
]

// ---- Syntax Highlighting ----

const LUA_KEYWORDS = new Set([
  'local', 'function', 'end', 'if', 'then', 'else', 'elseif', 'for', 'do',
  'while', 'return', 'nil', 'true', 'false', 'not', 'and', 'or', 'in',
  'repeat', 'until', 'break', 'goto', 'self'
])

function highlightLua(code: string): React.ReactNode[] {
  const lines = code.split('\n')
  return lines.map((line, lineIdx) => {
    if (line.trimStart().startsWith('--')) {
      return (
        <div key={lineIdx} className="flex">
          <span className="w-10 flex-shrink-0 text-right pr-3 select-none text-muted-foreground/50 text-xs leading-6">{lineIdx + 1}</span>
          <span className="text-muted-foreground italic">{line}</span>
        </div>
      )
    }
    const tokens = line.split(/(\b\w+\b|"[^"]*"|'[^']*'|\d+\.?\d*|--.*$|\s+|[^\w\s])/g)
    return (
      <div key={lineIdx} className="flex">
        <span className="w-10 flex-shrink-0 text-right pr-3 select-none text-muted-foreground/50 text-xs leading-6">{lineIdx + 1}</span>
        <span>
          {tokens.map((token, i) => {
            if (!token) return null
            if (LUA_KEYWORDS.has(token)) {
              return <span key={i} className="text-primary font-semibold">{token}</span>
            }
            if (/^["']/.test(token)) {
              return <span key={i} className="text-accent">{token}</span>
            }
            if (/^\d+\.?\d*$/.test(token)) {
              return <span key={i} className="text-[hsl(191,97%,70%)]">{token}</span>
            }
            if (/^\w+$/.test(token) && tokens[i + 1] === '(') {
              return <span key={i} className="text-[hsl(191,97%,70%)]">{token}</span>
            }
            return <span key={i}>{token}</span>
          })}
        </span>
      </div>
    )
  })
}

function highlightXml(code: string): React.ReactNode[] {
  const lines = code.split('\n')
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(<\/?[\w:]+|>|\/?>|[\w:]+="[^"]*"|<!--.*?-->)/g)
    return (
      <div key={lineIdx} className="flex">
        <span className="w-10 flex-shrink-0 text-right pr-3 select-none text-muted-foreground/50 text-xs leading-6">{lineIdx + 1}</span>
        <span>
          {parts.map((part, i) => {
            if (!part) return null
            if (part.startsWith('<!--')) {
              return <span key={i} className="text-muted-foreground italic">{part}</span>
            }
            if (part.startsWith('</') || part.startsWith('<')) {
              return <span key={i} className="text-primary">{part}</span>
            }
            if (part === '>' || part === '/>') {
              return <span key={i} className="text-primary">{part}</span>
            }
            const attrMatch = part.match(/^([\w:]+)=("[^"]*")$/)
            if (attrMatch) {
              return (
                <span key={i}>
                  <span className="text-[hsl(326,100%,68%)]">{attrMatch[1]}</span>
                  <span>=</span>
                  <span className="text-accent">{attrMatch[2]}</span>
                </span>
              )
            }
            return <span key={i}>{part}</span>
          })}
        </span>
      </div>
    )
  })
}

function highlightToc(code: string): React.ReactNode[] {
  const lines = code.split('\n')
  return lines.map((line, lineIdx) => {
    if (line.trimStart().startsWith('##')) {
      const colonIdx = line.indexOf(':')
      if (colonIdx !== -1) {
        return (
          <div key={lineIdx} className="flex">
            <span className="w-10 flex-shrink-0 text-right pr-3 select-none text-muted-foreground/50 text-xs leading-6">{lineIdx + 1}</span>
            <span>
              <span className="text-muted-foreground">##</span>
              <span className="text-[hsl(191,97%,70%)]">{line.slice(2, colonIdx)}</span>
              <span className="text-muted-foreground">:</span>
              <span className="text-foreground">{line.slice(colonIdx + 1)}</span>
            </span>
          </div>
        )
      }
      return (
        <div key={lineIdx} className="flex">
          <span className="w-10 flex-shrink-0 text-right pr-3 select-none text-muted-foreground/50 text-xs leading-6">{lineIdx + 1}</span>
          <span className="text-muted-foreground">{line}</span>
        </div>
      )
    }
    return (
      <div key={lineIdx} className="flex">
        <span className="w-10 flex-shrink-0 text-right pr-3 select-none text-muted-foreground/50 text-xs leading-6">{lineIdx + 1}</span>
        <span className="text-foreground">{line}</span>
      </div>
    )
  })
}

function highlightCode(code: string, fileType: string): React.ReactNode[] {
  if (fileType === 'lua') return highlightLua(code)
  if (fileType === 'xml') return highlightXml(code)
  if (fileType === 'toc') return highlightToc(code)
  return code.split('\n').map((line, i) => (
    <div key={i} className="flex">
      <span className="w-10 flex-shrink-0 text-right pr-3 select-none text-muted-foreground/50 text-xs leading-6">{i + 1}</span>
      <span>{line}</span>
    </div>
  ))
}

// ---- Markdown Renderer ----

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">{part}</strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

// ---- Error Boundary ----

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---- Helper: Generate ID ----

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ---- Status Badge ----

function StatusBadge({ status }: { status: StatusType }) {
  const configs: Record<StatusType, { label: string; className: string; pulse: boolean }> = {
    idle: { label: 'Idle', className: 'bg-muted text-muted-foreground', pulse: false },
    generating: { label: 'Generating', className: 'bg-primary text-primary-foreground', pulse: true },
    ready: { label: 'Ready', className: 'bg-accent text-accent-foreground', pulse: false },
    refining: { label: 'Refining', className: 'bg-primary text-primary-foreground', pulse: true },
    committing: { label: 'Committing', className: 'bg-[hsl(250,66%,60%)] text-white', pulse: true },
    packaging: { label: 'Packaging', className: 'bg-[hsl(197,72%,54%)] text-white', pulse: true },
  }
  const cfg = configs[status]
  return (
    <Badge className={cn('text-xs', cfg.className, cfg.pulse && 'animate-pulse')}>
      {cfg.label}
    </Badge>
  )
}

// ---- Addon Type Selector ----

const ADDON_TYPES = [
  { id: 'ui', label: 'UI Enhancement', icon: FiMonitor },
  { id: 'data', label: 'Data Display', icon: FiCpu },
  { id: 'auto', label: 'Automation', icon: FiZap },
  { id: 'social', label: 'Social', icon: FiUsers },
  { id: 'combat', label: 'Combat', icon: FiShield },
]

function AddonTypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {ADDON_TYPES.map((t) => {
        const Icon = t.icon
        const isActive = value === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 text-xs font-medium',
              isActive
                ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate w-full text-center">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---- File Tree Renderer ----

function FileTreeView({ tree, files, onSelectFile }: { tree: string; files: AddonFile[]; onSelectFile: (idx: number) => void }) {
  if (tree) {
    return (
      <div className="font-mono text-xs space-y-1 p-2">
        {tree.split('\n').map((line, i) => (
          <div key={i} className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-default">
            {line.includes('.') ? <FiFile className="h-3 w-3 text-accent flex-shrink-0" /> : <FiFolder className="h-3 w-3 text-primary flex-shrink-0" />}
            <span className="truncate">{line.replace(/[|`\-\s]/g, '').trim() || line}</span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="font-mono text-xs space-y-0.5 p-2">
      {files.map((f, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelectFile(i)}
          className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <FiFile className="h-3 w-3 text-accent flex-shrink-0" />
          <span className="truncate">{f.filename}</span>
        </button>
      ))}
    </div>
  )
}

// ---- Workspace Screen ----

function WorkspaceScreen({
  addonConfig,
  setAddonConfig,
  onGenerate,
  isGenerating,
  showSample,
  settings,
}: {
  addonConfig: AddonConfig
  setAddonConfig: React.Dispatch<React.SetStateAction<AddonConfig>>
  onGenerate: () => void
  isGenerating: boolean
  showSample: boolean
  settings: SettingsData
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const sampleConfig: AddonConfig = {
    addonType: 'combat',
    addonName: 'DPSMeterPro',
    features: 'Real-time DPS tracking with per-player breakdown.\nRaid-wide damage analysis with boss encounter timeline.\nMinimap button toggle with LibDBIcon integration.\nSaved variables for persistent settings across sessions.\nSlash command /dps to toggle the main window.',
    uiLayout: 'Main frame: 250x300px movable window anchored center.\nDPS bars: Horizontal bars sorted by damage, showing player name and DPS value.\nHeader: Addon title with close/minimize buttons.\nColor-coded class bars using RAID_CLASS_COLORS.',
    behavior: 'Events: COMBAT_LOG_EVENT_UNFILTERED for damage tracking.\nSlash command: /dps to toggle visibility.\nSaved variables: DPSMeterProDB for settings and data persistence.\nLibraries: AceAddon-3.0, AceDB-3.0, LibDBIcon-1.0.',
    tocVersion: '1.0.0',
    tocAuthor: 'AddonForge',
    tocDeps: 'Ace3',
    tocInterface: '110002',
  }

  const cfg = showSample ? sampleConfig : addonConfig

  const updateField = (field: keyof AddonConfig, value: string) => {
    if (!showSample) {
      setAddonConfig(prev => ({ ...prev, [field]: value }))
    }
  }

  const specPreview = useMemo(() => {
    const c = cfg
    const lines: string[] = []
    if (c.addonName) lines.push(`**Addon Name:** ${c.addonName}`)
    const typeLabel = ADDON_TYPES.find(t => t.id === c.addonType)?.label
    if (typeLabel) lines.push(`**Type:** ${typeLabel}`)
    if (c.features) lines.push(`\n### Features\n${c.features}`)
    if (c.uiLayout) lines.push(`\n### UI Layout\n${c.uiLayout}`)
    if (c.behavior) lines.push(`\n### Behavior & API\n${c.behavior}`)
    if (c.tocInterface || c.tocVersion || c.tocAuthor) {
      lines.push(`\n### TOC Metadata`)
      if (c.tocInterface) lines.push(`- Interface: ${c.tocInterface}`)
      if (c.tocVersion) lines.push(`- Version: ${c.tocVersion}`)
      if (c.tocAuthor) lines.push(`- Author: ${c.tocAuthor}`)
      if (c.tocDeps) lines.push(`- Dependencies: ${c.tocDeps}`)
    }
    return lines.join('\n')
  }, [cfg])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Left - Form */}
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="space-y-5 pr-4">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Addon Type</Label>
            <AddonTypeSelector value={cfg.addonType} onChange={(v) => updateField('addonType', v)} />
          </div>

          <div>
            <Label htmlFor="addonName" className="text-sm font-semibold mb-2 block">Addon Name</Label>
            <Input
              id="addonName"
              placeholder="e.g., MyAwesomeAddon"
              value={cfg.addonName}
              onChange={(e) => updateField('addonName', e.target.value)}
              className="bg-input border-border"
              readOnly={showSample}
            />
            {cfg.addonName && !/^[A-Za-z][A-Za-z0-9_]*$/.test(cfg.addonName) && (
              <p className="text-destructive text-xs mt-1">Name must start with a letter, and contain only letters, numbers, underscores</p>
            )}
          </div>

          <div>
            <Label htmlFor="features" className="text-sm font-semibold mb-2 block">Feature Description</Label>
            <Textarea
              id="features"
              placeholder="Describe what your addon should do..."
              value={cfg.features}
              onChange={(e) => updateField('features', e.target.value)}
              className="bg-input border-border min-h-[120px]"
              readOnly={showSample}
            />
          </div>

          <div>
            <Label htmlFor="uiLayout" className="text-sm font-semibold mb-2 block">UI Layout Preferences</Label>
            <Textarea
              id="uiLayout"
              placeholder="Describe the visual layout, frames, positioning..."
              value={cfg.uiLayout}
              onChange={(e) => updateField('uiLayout', e.target.value)}
              className="bg-input border-border min-h-[100px]"
              readOnly={showSample}
            />
          </div>

          <div>
            <Label htmlFor="behavior" className="text-sm font-semibold mb-2 block">Behavior & API Requirements</Label>
            <Textarea
              id="behavior"
              placeholder="Events to hook, slash commands, saved variables, libraries..."
              value={cfg.behavior}
              onChange={(e) => updateField('behavior', e.target.value)}
              className="bg-input border-border min-h-[100px]"
              readOnly={showSample}
            />
          </div>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between text-sm text-muted-foreground hover:text-foreground">
                <span>Advanced TOC Options</span>
                {advancedOpen ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tocVersion" className="text-xs mb-1 block">Version</Label>
                  <Input
                    id="tocVersion"
                    placeholder={settings.defaultInterface ? '1.0.0' : '1.0.0'}
                    value={cfg.tocVersion}
                    onChange={(e) => updateField('tocVersion', e.target.value)}
                    className="bg-input border-border text-sm"
                    readOnly={showSample}
                  />
                </div>
                <div>
                  <Label htmlFor="tocInterface" className="text-xs mb-1 block">Interface Number</Label>
                  <Input
                    id="tocInterface"
                    placeholder={settings.defaultInterface || '110002'}
                    value={cfg.tocInterface}
                    onChange={(e) => updateField('tocInterface', e.target.value)}
                    className="bg-input border-border text-sm"
                    readOnly={showSample}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="tocAuthor" className="text-xs mb-1 block">Author</Label>
                <Input
                  id="tocAuthor"
                  placeholder={settings.defaultAuthor || 'Your name'}
                  value={cfg.tocAuthor}
                  onChange={(e) => updateField('tocAuthor', e.target.value)}
                  className="bg-input border-border text-sm"
                  readOnly={showSample}
                />
              </div>
              <div>
                <Label htmlFor="tocDeps" className="text-xs mb-1 block">Dependencies</Label>
                <Input
                  id="tocDeps"
                  placeholder={settings.defaultDeps || 'e.g., Ace3, LibDataBroker'}
                  value={cfg.tocDeps}
                  onChange={(e) => updateField('tocDeps', e.target.value)}
                  className="bg-input border-border text-sm"
                  readOnly={showSample}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button
            onClick={onGenerate}
            disabled={isGenerating || (!cfg.addonName && !showSample) || (!cfg.features && !showSample)}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20"
          >
            {isGenerating ? (
              <>
                <FiLoader className="mr-2 h-5 w-5 animate-spin" />
                Generating Addon...
              </>
            ) : (
              <>
                <FiZap className="mr-2 h-5 w-5" />
                Generate Addon
              </>
            )}
          </Button>
        </div>
      </ScrollArea>

      {/* Right - Live Spec Preview */}
      <Card className="bg-card border-border shadow-xl shadow-black/20 rounded-xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FiEye className="h-4 w-4 text-primary" />
            Specification Preview
          </CardTitle>
          <CardDescription className="text-xs">Live preview of your addon configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-16rem)]">
            {specPreview.trim() ? (
              <div className="text-foreground">{renderMarkdown(specPreview)}</div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FiEdit3 className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">Fill in the form to see a live preview</p>
                <p className="text-xs mt-1 opacity-70">Your addon specification will appear here</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Code Review Screen ----

function CodeReviewScreen({
  files,
  fileTree,
  addonName,
  specSummary,
  genSummary,
  selectedFile,
  setSelectedFile,
  feedbackHistory,
  onRefine,
  onCommit,
  onPackage,
  status,
  iterationCount,
  commitResult,
  packageResult,
  statusMessage,
}: {
  files: AddonFile[]
  fileTree: string
  addonName: string
  specSummary: string
  genSummary: string
  selectedFile: number
  setSelectedFile: (i: number) => void
  feedbackHistory: FeedbackEntry[]
  onRefine: (feedback: string) => void
  onCommit: () => void
  onPackage: () => void
  status: StatusType
  iterationCount: number
  commitResult: { repoUrl?: string; gistUrl?: string; message?: string } | null
  packageResult: { packageName?: string; installPath?: string; message?: string; downloadUrl?: string } | null
  statusMessage: string
}) {
  const [feedbackInput, setFeedbackInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const safeFiles = Array.isArray(files) ? files : []
  const currentFile = safeFiles[selectedFile] ?? null

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feedbackHistory])

  const handleSendFeedback = () => {
    if (feedbackInput.trim() && status !== 'refining') {
      onRefine(feedbackInput.trim())
      setFeedbackInput('')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      {/* Top action bar */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold tracking-tight">{addonName || 'Unnamed Addon'}</h2>
          <Badge variant="outline" className="text-xs">v{iterationCount}</Badge>
          <StatusBadge status={status} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCommit}
            disabled={status === 'committing' || safeFiles.length === 0}
            className="border-border"
          >
            {status === 'committing' ? <FiLoader className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FiGithub className="mr-1.5 h-3.5 w-3.5" />}
            Commit to GitHub
          </Button>
          <Button
            size="sm"
            onClick={onPackage}
            disabled={status === 'packaging' || safeFiles.length === 0}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {status === 'packaging' ? <FiLoader className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FiPackage className="mr-1.5 h-3.5 w-3.5" />}
            Package & Download
          </Button>
        </div>
      </div>

      {/* Status messages */}
      {statusMessage && (
        <div className="flex-shrink-0 px-3 py-2 rounded-lg border border-border bg-secondary/50 text-sm text-foreground">
          {statusMessage}
        </div>
      )}

      {/* Commit result */}
      {commitResult && (
        <div className="flex-shrink-0 px-3 py-2 rounded-lg border border-accent/30 bg-accent/5 text-sm space-y-1">
          <p className="font-semibold text-accent flex items-center gap-1.5"><FiCheck className="h-4 w-4" /> {commitResult.message ?? 'Committed successfully'}</p>
          {commitResult.repoUrl && (
            <a href={commitResult.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
              <FiExternalLink className="h-3 w-3" /> {commitResult.repoUrl}
            </a>
          )}
          {commitResult.gistUrl && (
            <a href={commitResult.gistUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
              <FiExternalLink className="h-3 w-3" /> Gist: {commitResult.gistUrl}
            </a>
          )}
        </div>
      )}

      {/* Package result */}
      {packageResult && (
        <div className="flex-shrink-0 px-3 py-2 rounded-lg border border-accent/30 bg-accent/5 text-sm space-y-1">
          <p className="font-semibold text-accent flex items-center gap-1.5"><FiCheck className="h-4 w-4" /> {packageResult.message ?? 'Packaged successfully'}</p>
          {packageResult.packageName && <p className="text-xs text-muted-foreground">Package: {packageResult.packageName}</p>}
          {packageResult.installPath && <p className="text-xs text-muted-foreground">Install to: {packageResult.installPath}</p>}
          {packageResult.downloadUrl && (
            <a href={packageResult.downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <FiDownload className="h-3 w-3" /> Download ZIP
            </a>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left: File tree + Code viewer */}
        <div className="lg:col-span-2 flex gap-3 min-h-0">
          {/* File tree sidebar */}
          <Card className="w-48 flex-shrink-0 bg-card border-border shadow-xl shadow-black/20 rounded-xl overflow-hidden">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <FiFolder className="h-3 w-3" /> Files
              </CardTitle>
            </CardHeader>
            <ScrollArea className="h-[calc(100%-3rem)]">
              <div className="px-1 pb-2">
                {fileTree ? (
                  <FileTreeView tree={fileTree} files={safeFiles} onSelectFile={setSelectedFile} />
                ) : (
                  <div className="font-mono text-xs space-y-0.5 p-1">
                    {addonName && (
                      <div className="flex items-center gap-1.5 px-2 py-1 text-primary font-semibold">
                        <FiFolder className="h-3 w-3" />
                        <span>{addonName}/</span>
                      </div>
                    )}
                    {safeFiles.map((f, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedFile(i)}
                        className={cn(
                          'flex items-center gap-1.5 w-full text-left px-2 py-1 rounded text-xs transition-colors',
                          selectedFile === i
                            ? 'bg-primary/15 text-primary'
                            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                        )}
                      >
                        <FiFile className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{f.filename}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Code viewer */}
          <Card className="flex-1 bg-card border-border shadow-xl shadow-black/20 rounded-xl overflow-hidden flex flex-col min-w-0">
            {safeFiles.length > 0 ? (
              <>
                <div className="flex-shrink-0 border-b border-border">
                  <ScrollArea className="w-full">
                    <div className="flex px-1 pt-1">
                      {safeFiles.map((f, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedFile(i)}
                          className={cn(
                            'px-3 py-1.5 text-xs font-mono whitespace-nowrap rounded-t-lg transition-colors border-b-2',
                            selectedFile === i
                              ? 'bg-background text-foreground border-primary'
                              : 'text-muted-foreground hover:text-foreground border-transparent'
                          )}
                        >
                          {f.filename}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                {currentFile && (
                  <div className="flex-shrink-0 px-4 py-2 border-b border-border/50 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{currentFile.description ?? currentFile.file_type ?? ''}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        if (currentFile?.content) {
                          navigator.clipboard.writeText(currentFile.content).catch(() => {})
                        }
                      }}
                    >
                      <FiCopy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                  </div>
                )}
                <ScrollArea className="flex-1">
                  <pre className="p-4 font-mono text-xs leading-6 text-foreground">
                    {currentFile ? highlightCode(currentFile.content ?? '', currentFile.file_type ?? '') : null}
                  </pre>
                </ScrollArea>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <FiCode className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No files generated yet</p>
                  <p className="text-xs mt-1 opacity-70">Generate an addon from the Workspace</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Feedback chat panel */}
        <Card className="bg-card border-border shadow-xl shadow-black/20 rounded-xl overflow-hidden flex flex-col min-h-0">
          <CardHeader className="py-3 px-4 flex-shrink-0 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FiMessageSquare className="h-4 w-4 text-primary" />
              Feedback & Iterations
            </CardTitle>
          </CardHeader>

          {/* Spec/Gen summaries at top of chat */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {specSummary && (
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                  <p className="text-xs font-semibold text-primary mb-1">Specification Summary</p>
                  <div className="text-xs text-muted-foreground">{renderMarkdown(specSummary)}</div>
                </div>
              )}
              {genSummary && (
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                  <p className="text-xs font-semibold text-accent mb-1">Generation Summary</p>
                  <div className="text-xs text-muted-foreground">{renderMarkdown(genSummary)}</div>
                </div>
              )}
              {feedbackHistory.length === 0 && !specSummary && !genSummary && (
                <div className="text-center py-8 text-muted-foreground">
                  <FiMessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Send feedback to refine your addon</p>
                </div>
              )}
              {feedbackHistory.map((entry, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-3 rounded-lg text-xs',
                    entry.role === 'user'
                      ? 'bg-primary/10 border border-primary/20 ml-4'
                      : 'bg-secondary/50 border border-border/50 mr-4'
                  )}
                >
                  <p className="font-semibold mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {entry.role === 'user' ? 'You' : 'Agent'}
                  </p>
                  <div className="text-foreground">{renderMarkdown(entry.message)}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Chat input */}
          <div className="flex-shrink-0 p-3 border-t border-border">
            <div className="flex gap-2">
              <Textarea
                placeholder="Describe changes you want..."
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                className="bg-input border-border text-sm min-h-[60px] max-h-[120px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendFeedback()
                  }
                }}
              />
            </div>
            <Button
              size="sm"
              onClick={handleSendFeedback}
              disabled={!feedbackInput.trim() || status === 'refining'}
              className="w-full mt-2 bg-primary hover:bg-primary/90"
            >
              {status === 'refining' ? (
                <>
                  <FiLoader className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Refining...
                </>
              ) : (
                <>
                  <FiSend className="mr-1.5 h-3.5 w-3.5" />
                  Refine Addon
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ---- Projects History Screen ----

function HistoryScreen({
  projects,
  onResume,
  onDelete,
  showSample,
}: {
  projects: Project[]
  onResume: (project: Project) => void
  onDelete: (id: string) => void
  showSample: boolean
}) {
  const [searchQuery, setSearchQuery] = useState('')

  const sampleProjects: Project[] = [
    { id: '1', name: 'DPSMeterPro', type: 'combat', files: SAMPLE_FILES, createdAt: '2025-01-15T10:30:00Z', iterationCount: 3, status: 'ready', fileTree: '', specSummary: 'DPS tracking addon' },
    { id: '2', name: 'GuildRoster+', type: 'social', files: [], createdAt: '2025-01-12T14:20:00Z', iterationCount: 1, status: 'ready', fileTree: '', specSummary: 'Enhanced guild roster' },
    { id: '3', name: 'AutoRepair', type: 'auto', files: [], createdAt: '2025-01-10T08:15:00Z', iterationCount: 2, status: 'ready', fileTree: '', specSummary: 'Auto-repair at vendors' },
  ]

  const displayProjects = showSample ? sampleProjects : projects
  const filtered = displayProjects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-input border-border"
          />
        </div>
        <Badge variant="secondary" className="text-xs">{filtered.length} project{filtered.length !== 1 ? 's' : ''}</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-card border-border shadow-xl shadow-black/20 rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FiFolder className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-sm font-semibold text-muted-foreground mb-1">No projects found</p>
            <p className="text-xs text-muted-foreground/70">Head to the Workspace to create your first addon</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const typeInfo = ADDON_TYPES.find(t => t.id === project.type)
            const TypeIcon = typeInfo?.icon ?? FiCode
            return (
              <Card key={project.id} className="bg-card border-border shadow-xl shadow-black/20 rounded-xl hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TypeIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">{project.name}</CardTitle>
                        <CardDescription className="text-xs">{typeInfo?.label ?? 'Addon'}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">v{project.iterationCount}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  {project.specSummary && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{project.specSummary}</p>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <FiClock className="h-3 w-3" />
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    <span className="mx-1">|</span>
                    <FiFile className="h-3 w-3" />
                    <span>{Array.isArray(project.files) ? project.files.length : 0} files</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-7 border-border" onClick={() => onResume(project)}>
                    <FiEdit3 className="mr-1 h-3 w-3" /> Resume
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive hover:text-destructive" onClick={() => onDelete(project.id)}>
                    <FiTrash2 className="h-3 w-3" />
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- Settings Screen ----

function SettingsScreen({
  settings,
  setSettings,
}: {
  settings: SettingsData
  setSettings: React.Dispatch<React.SetStateAction<SettingsData>>
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <Card className="bg-card border-border shadow-xl shadow-black/20 rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FiGithub className="h-4 w-4 text-primary" />
            GitHub Connection
          </CardTitle>
          <CardDescription className="text-xs">The GitHub Delivery Agent handles repository operations via Composio integration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border/50">
            <FiInfo className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              GitHub authentication is managed by the agent. Simply provide a repository name when committing and the agent will handle the rest.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-xl shadow-black/20 rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FiSettings className="h-4 w-4 text-primary" />
            Default TOC Settings
          </CardTitle>
          <CardDescription className="text-xs">These defaults will pre-fill in the Workspace form</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="defaultInterface" className="text-xs mb-1 block">Default Interface Number</Label>
            <Input
              id="defaultInterface"
              placeholder="110002"
              value={settings.defaultInterface}
              onChange={(e) => setSettings(prev => ({ ...prev, defaultInterface: e.target.value }))}
              className="bg-input border-border text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Retail: 110002 | Classic Era: 11503 | Classic Cata: 40400</p>
          </div>
          <div>
            <Label htmlFor="defaultAuthor" className="text-xs mb-1 block">Default Author</Label>
            <Input
              id="defaultAuthor"
              placeholder="Your name"
              value={settings.defaultAuthor}
              onChange={(e) => setSettings(prev => ({ ...prev, defaultAuthor: e.target.value }))}
              className="bg-input border-border text-sm"
            />
          </div>
          <div>
            <Label htmlFor="defaultDeps" className="text-xs mb-1 block">Default Dependencies</Label>
            <Input
              id="defaultDeps"
              placeholder="e.g., Ace3, LibDataBroker"
              value={settings.defaultDeps}
              onChange={(e) => setSettings(prev => ({ ...prev, defaultDeps: e.target.value }))}
              className="bg-input border-border text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-xl shadow-black/20 rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FiZap className="h-4 w-4 text-primary" />
            Generation Preferences
          </CardTitle>
          <CardDescription className="text-xs">Customize how addons are generated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border/50">
            <FiInfo className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Generation is handled by the Addon Development Manager agent. You can influence output through detailed specifications in the Workspace form.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- GitHub Dialog ----

function GitHubDialog({
  open,
  onOpenChange,
  onCommit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCommit: (repoName: string, branch: string, commitMsg: string) => void
  isLoading: boolean
}) {
  const [repoName, setRepoName] = useState('')
  const [branch, setBranch] = useState('main')
  const [commitMsg, setCommitMsg] = useState('Initial addon commit')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border shadow-2xl shadow-black/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FiGithub className="h-5 w-5 text-primary" />
            Commit to GitHub
          </DialogTitle>
          <DialogDescription>
            Push your addon files to a GitHub repository
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="repoName" className="text-sm font-medium mb-1 block">Repository Name *</Label>
            <Input
              id="repoName"
              placeholder="e.g., my-wow-addon"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              className="bg-input border-border"
            />
          </div>
          <div>
            <Label htmlFor="branch" className="text-sm font-medium mb-1 block">Branch</Label>
            <Input
              id="branch"
              placeholder="main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="bg-input border-border"
            />
          </div>
          <div>
            <Label htmlFor="commitMsg" className="text-sm font-medium mb-1 block">Commit Message</Label>
            <Input
              id="commitMsg"
              placeholder="Initial addon commit"
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              className="bg-input border-border"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">
            Cancel
          </Button>
          <Button
            onClick={() => onCommit(repoName, branch, commitMsg)}
            disabled={!repoName.trim() || isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <FiLoader className="mr-1.5 h-4 w-4 animate-spin" />
                Committing...
              </>
            ) : (
              <>
                <FiGithub className="mr-1.5 h-4 w-4" />
                Commit Files
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Agent Activity Panel ----

function AgentPanel({ activeAgentId }: { activeAgentId: string | null }) {
  return (
    <Card className="bg-card border-border shadow-xl shadow-black/20 rounded-xl">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <FiCpu className="h-3 w-3" /> Agent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="space-y-1.5">
          {AGENTS_INFO.map((agent) => {
            const isActive = activeAgentId === agent.id
            return (
              <div
                key={agent.id}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors',
                  isActive ? 'bg-primary/10 border border-primary/20' : ''
                )}
              >
                <div className={cn(
                  'h-1.5 w-1.5 rounded-full flex-shrink-0',
                  isActive ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'
                )} />
                <div className="min-w-0">
                  <p className={cn('font-medium truncate', isActive ? 'text-primary' : 'text-muted-foreground')}>
                    {agent.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 truncate">{agent.purpose}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Main Page ----

export default function Page() {
  // Navigation
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('workspace')

  // Workspace state
  const [addonConfig, setAddonConfig] = useState<AddonConfig>({
    addonType: 'ui',
    addonName: '',
    features: '',
    uiLayout: '',
    behavior: '',
    tocVersion: '',
    tocAuthor: '',
    tocDeps: '',
    tocInterface: '',
  })

  // Code Review state
  const [generatedFiles, setGeneratedFiles] = useState<AddonFile[]>([])
  const [addonName, setAddonName] = useState('')
  const [fileTree, setFileTree] = useState('')
  const [specSummary, setSpecSummary] = useState('')
  const [genSummary, setGenSummary] = useState('')
  const [selectedFile, setSelectedFile] = useState(0)
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackEntry[]>([])
  const [iterationCount, setIterationCount] = useState(0)

  // Status
  const [status, setStatus] = useState<StatusType>('idle')
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // GitHub dialog
  const [ghDialogOpen, setGhDialogOpen] = useState(false)
  const [commitResult, setCommitResult] = useState<{ repoUrl?: string; gistUrl?: string; message?: string } | null>(null)
  const [packageResult, setPackageResult] = useState<{ packageName?: string; installPath?: string; message?: string; downloadUrl?: string } | null>(null)

  // Projects & Settings
  const [projects, setProjects] = useState<Project[]>([])
  const [settings, setSettings] = useState<SettingsData>({
    defaultInterface: '',
    defaultAuthor: '',
    defaultDeps: '',
  })

  // Sample data toggle
  const [showSample, setShowSample] = useState(false)

  // Persist projects to localStorage
  useEffect(() => {
    try {
      const savedProjects = localStorage.getItem('wow-addon-forge-projects')
      if (savedProjects) {
        const parsed = JSON.parse(savedProjects)
        if (Array.isArray(parsed)) setProjects(parsed)
      }
      const savedSettings = localStorage.getItem('wow-addon-forge-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        if (parsed && typeof parsed === 'object') setSettings(parsed)
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('wow-addon-forge-projects', JSON.stringify(projects))
    } catch {
      // ignore
    }
  }, [projects])

  useEffect(() => {
    try {
      localStorage.setItem('wow-addon-forge-settings', JSON.stringify(settings))
    } catch {
      // ignore
    }
  }, [settings])

  // Build prompt from addon config
  const buildPrompt = useCallback((cfg: AddonConfig) => {
    const typeLabel = ADDON_TYPES.find(t => t.id === cfg.addonType)?.label ?? 'Custom'
    let prompt = `Create a World of Warcraft addon named "${cfg.addonName}" of type "${typeLabel}".`
    if (cfg.features) prompt += `\n\nFeature Requirements:\n${cfg.features}`
    if (cfg.uiLayout) prompt += `\n\nUI Layout Preferences:\n${cfg.uiLayout}`
    if (cfg.behavior) prompt += `\n\nBehavior & API Requirements:\n${cfg.behavior}`
    prompt += `\n\nTOC Metadata:`
    if (cfg.tocInterface) prompt += `\n- Interface: ${cfg.tocInterface}`
    if (cfg.tocVersion) prompt += `\n- Version: ${cfg.tocVersion}`
    if (cfg.tocAuthor) prompt += `\n- Author: ${cfg.tocAuthor}`
    if (cfg.tocDeps) prompt += `\n- Dependencies: ${cfg.tocDeps}`
    prompt += `\n\nPlease generate all required files (.toc, .lua, .xml as needed) with complete, production-ready code. Include a file_tree showing the addon directory structure, a specification_summary, and a generation_summary.`
    return prompt
  }, [])

  // ---- Agent Handlers ----

  const handleGenerate = useCallback(async () => {
    setStatus('generating')
    setIsGenerating(true)
    setActiveAgentId(AGENT_IDS.ADDON_MANAGER)
    setStatusMessage('Generating your addon...')
    setErrorMessage('')
    setCommitResult(null)
    setPackageResult(null)

    const cfg = showSample ? {
      addonType: 'combat',
      addonName: 'DPSMeterPro',
      features: 'Real-time DPS tracking with raid analytics',
      uiLayout: 'Movable main frame with sorted DPS bars',
      behavior: 'COMBAT_LOG_EVENT_UNFILTERED, /dps slash command, SavedVariables',
      tocVersion: '1.0.0',
      tocAuthor: 'AddonForge',
      tocDeps: 'Ace3',
      tocInterface: '110002',
    } : addonConfig

    const prompt = buildPrompt(cfg)

    try {
      const result = await callAIAgent(prompt, AGENT_IDS.ADDON_MANAGER)
      if (result.success) {
        const data = result?.response?.result
        const files = Array.isArray(data?.files) ? data.files : []
        const name = data?.addon_name || cfg.addonName || 'MyAddon'

        setGeneratedFiles(files)
        setAddonName(name)
        setFileTree(data?.file_tree ?? '')
        setSpecSummary(data?.specification_summary ?? '')
        setGenSummary(data?.generation_summary ?? '')
        setIterationCount(1)
        setSelectedFile(0)
        setFeedbackHistory([])
        setCurrentScreen('codeReview')
        setStatus('ready')
        setStatusMessage('Addon generated successfully!')

        // Save to projects
        const newProject: Project = {
          id: genId(),
          name,
          type: cfg.addonType,
          files,
          createdAt: new Date().toISOString(),
          iterationCount: 1,
          status: 'ready',
          fileTree: data?.file_tree ?? '',
          specSummary: data?.specification_summary ?? '',
        }
        setProjects(prev => [newProject, ...prev])
      } else {
        setStatus('idle')
        setErrorMessage(result?.error ?? 'Failed to generate addon')
        setStatusMessage('')
      }
    } catch (err) {
      setStatus('idle')
      setErrorMessage('An unexpected error occurred')
      setStatusMessage('')
    }

    setIsGenerating(false)
    setActiveAgentId(null)
  }, [addonConfig, buildPrompt, showSample])

  const handleRefine = useCallback(async (feedback: string) => {
    setStatus('refining')
    setActiveAgentId(AGENT_IDS.ITERATION_FEEDBACK)
    setStatusMessage('Applying your feedback...')
    setErrorMessage('')

    const prompt = `Current addon "${addonName}" files:\n${JSON.stringify(generatedFiles)}\n\nDeveloper Feedback: ${feedback}\n\nPlease analyze the feedback and produce updated files with the requested changes.`

    try {
      const result = await callAIAgent(prompt, AGENT_IDS.ITERATION_FEEDBACK)
      if (result.success) {
        const data = result?.response?.result
        const updatedFiles = Array.isArray(data?.updated_files) ? data.updated_files : []
        const modifications = Array.isArray(data?.modifications) ? data.modifications : []

        if (updatedFiles.length > 0) {
          setGeneratedFiles(updatedFiles)
        }
        setIterationCount(prev => prev + 1)

        let agentMsg = data?.feedback_summary ?? 'Changes applied'
        if (modifications.length > 0) {
          agentMsg += '\n\nModifications:\n' + modifications.map((m: { filename?: string; change_description?: string }) =>
            `- **${m?.filename ?? 'unknown'}**: ${m?.change_description ?? 'updated'}`
          ).join('\n')
        }

        setFeedbackHistory(prev => [
          ...prev,
          { role: 'user', message: feedback },
          { role: 'agent', message: agentMsg },
        ])
        setStatusMessage('Refinement complete!')

        // Update project in list
        setProjects(prev => prev.map(p =>
          p.name === addonName
            ? { ...p, files: updatedFiles.length > 0 ? updatedFiles : p.files, iterationCount: p.iterationCount + 1 }
            : p
        ))
      } else {
        setErrorMessage(result?.error ?? 'Failed to refine addon')
        setFeedbackHistory(prev => [
          ...prev,
          { role: 'user', message: feedback },
          { role: 'agent', message: `Error: ${result?.error ?? 'Failed to process feedback'}` },
        ])
      }
    } catch {
      setErrorMessage('An unexpected error occurred during refinement')
    }

    setStatus('ready')
    setActiveAgentId(null)
  }, [addonName, generatedFiles])

  const handleCommitOpen = useCallback(() => {
    setGhDialogOpen(true)
  }, [])

  const handleCommit = useCallback(async (repoName: string, branch: string, commitMsg: string) => {
    setGhDialogOpen(false)
    setStatus('committing')
    setActiveAgentId(AGENT_IDS.GITHUB_DELIVERY)
    setStatusMessage('Committing to GitHub...')
    setErrorMessage('')
    setCommitResult(null)

    const prompt = `Create a GitHub repository and commit these WoW addon files.\nRepository: ${repoName}\nBranch: ${branch || 'main'}\nCommit message: ${commitMsg || 'Initial addon commit'}\nAddon name: ${addonName}\n\nFiles:\n${JSON.stringify(generatedFiles)}`

    try {
      const result = await callAIAgent(prompt, AGENT_IDS.GITHUB_DELIVERY)
      if (result.success) {
        const data = result?.response?.result
        setCommitResult({
          repoUrl: data?.repository_url ?? '',
          gistUrl: data?.gist_url ?? '',
          message: data?.message ?? data?.status ?? 'Files committed successfully',
        })
        setStatusMessage('Committed to GitHub!')
      } else {
        setErrorMessage(result?.error ?? 'Failed to commit to GitHub')
        setStatusMessage('')
      }
    } catch {
      setErrorMessage('GitHub commit failed')
      setStatusMessage('')
    }

    setStatus('ready')
    setActiveAgentId(null)
  }, [addonName, generatedFiles])

  const handlePackage = useCallback(async () => {
    setStatus('packaging')
    setActiveAgentId(AGENT_IDS.ADDON_PACKAGER)
    setStatusMessage('Packaging addon...')
    setErrorMessage('')
    setPackageResult(null)

    const prompt = `Package these WoW addon files into a ZIP named ${addonName || 'Addon'}.zip for direct extraction into Interface/AddOns folder:\n${JSON.stringify(generatedFiles)}`

    try {
      const result = await callAIAgent(prompt, AGENT_IDS.ADDON_PACKAGER)
      if (result.success) {
        const data = result?.response?.result
        // Access module_outputs at TOP level of result
        const artifacts = result?.module_outputs?.artifact_files
        let downloadUrl = ''
        if (Array.isArray(artifacts) && artifacts.length > 0) {
          downloadUrl = artifacts[0]?.file_url ?? ''
          if (downloadUrl) {
            window.open(downloadUrl, '_blank')
          }
        }
        setPackageResult({
          packageName: data?.package_name ?? `${addonName}.zip`,
          installPath: data?.installation_path ?? 'World of Warcraft/_retail_/Interface/AddOns/',
          message: data?.message ?? data?.status ?? 'Package created successfully',
          downloadUrl,
        })
        setStatusMessage('Package ready for download!')
      } else {
        setErrorMessage(result?.error ?? 'Failed to package addon')
        setStatusMessage('')
      }
    } catch {
      setErrorMessage('Packaging failed')
      setStatusMessage('')
    }

    setStatus('ready')
    setActiveAgentId(null)
  }, [addonName, generatedFiles])

  const handleResumeProject = useCallback((project: Project) => {
    setGeneratedFiles(Array.isArray(project.files) ? project.files : [])
    setAddonName(project.name)
    setFileTree(project.fileTree ?? '')
    setSpecSummary(project.specSummary ?? '')
    setGenSummary('')
    setIterationCount(project.iterationCount)
    setSelectedFile(0)
    setFeedbackHistory([])
    setCommitResult(null)
    setPackageResult(null)
    setStatusMessage('')
    setErrorMessage('')
    setStatus('ready')
    setCurrentScreen('codeReview')
  }, [])

  const handleDeleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
  }, [])

  // Nav items
  const navItems = [
    { id: 'workspace' as ScreenType, label: 'Workspace', icon: FiCode },
    { id: 'codeReview' as ScreenType, label: 'Code Review', icon: FiEye },
    { id: 'history' as ScreenType, label: 'Projects', icon: FiFolder },
    { id: 'settings' as ScreenType, label: 'Settings', icon: FiSettings },
  ]

  // When sample mode is on and we're on codeReview, show sample data
  useEffect(() => {
    if (showSample && currentScreen === 'codeReview' && generatedFiles.length === 0) {
      setGeneratedFiles(SAMPLE_FILES)
      setAddonName('DPSMeterPro')
      setFileTree('')
      setSpecSummary('A combat DPS tracking addon with real-time per-player damage breakdown, raid-wide analytics, minimap toggle, and persistent settings.')
      setGenSummary('Generated 4 files: .toc metadata, Core.lua with event handling, UI.lua with frame management, and UI.xml with bar templates.')
      setIterationCount(1)
      setFeedbackHistory(SAMPLE_FEEDBACK)
      setStatus('ready')
    }
  }, [showSample, currentScreen, generatedFiles.length])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 border-r border-border bg-card flex flex-col h-screen sticky top-0">
          {/* Logo */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <FiZap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">WoW Addon Forge</h1>
                <p className="text-[10px] text-muted-foreground">AI-Powered Addon Builder</p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentScreen === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentScreen(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                  {item.id === 'codeReview' && iterationCount > 0 && (
                    <Badge className="ml-auto text-[10px] h-4 px-1.5 bg-primary/20 text-primary border-0">v{iterationCount}</Badge>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Agent Activity */}
          <div className="p-2 border-t border-border">
            <AgentPanel activeAgentId={activeAgentId} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Top bar */}
          <header className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0 bg-card/50">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold tracking-tight">
                {navItems.find(n => n.id === currentScreen)?.label ?? 'Workspace'}
              </h2>
              <StatusBadge status={status} />
            </div>
            <div className="flex items-center gap-3">
              {errorMessage && (
                <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-2.5 py-1 rounded-lg border border-destructive/20">
                  <FiX className="h-3 w-3" />
                  <span className="max-w-xs truncate">{errorMessage}</span>
                  <button type="button" onClick={() => setErrorMessage('')} className="ml-1 hover:text-foreground">
                    <FiX className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Label htmlFor="sampleToggle" className="text-xs text-muted-foreground">Sample Data</Label>
                <Switch
                  id="sampleToggle"
                  checked={showSample}
                  onCheckedChange={setShowSample}
                />
              </div>
            </div>
          </header>

          {/* Content area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {currentScreen === 'workspace' && (
              <WorkspaceScreen
                addonConfig={addonConfig}
                setAddonConfig={setAddonConfig}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                showSample={showSample}
                settings={settings}
              />
            )}

            {currentScreen === 'codeReview' && (
              <CodeReviewScreen
                files={showSample && generatedFiles.length === 0 ? SAMPLE_FILES : generatedFiles}
                fileTree={fileTree}
                addonName={addonName || (showSample ? 'DPSMeterPro' : '')}
                specSummary={specSummary}
                genSummary={genSummary}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                feedbackHistory={showSample && feedbackHistory.length === 0 ? SAMPLE_FEEDBACK : feedbackHistory}
                onRefine={handleRefine}
                onCommit={handleCommitOpen}
                onPackage={handlePackage}
                status={status}
                iterationCount={iterationCount || (showSample ? 1 : 0)}
                commitResult={commitResult}
                packageResult={packageResult}
                statusMessage={statusMessage}
              />
            )}

            {currentScreen === 'history' && (
              <HistoryScreen
                projects={projects}
                onResume={handleResumeProject}
                onDelete={handleDeleteProject}
                showSample={showSample}
              />
            )}

            {currentScreen === 'settings' && (
              <SettingsScreen
                settings={settings}
                setSettings={setSettings}
              />
            )}
          </div>
        </main>

        {/* GitHub commit dialog */}
        <GitHubDialog
          open={ghDialogOpen}
          onOpenChange={setGhDialogOpen}
          onCommit={handleCommit}
          isLoading={status === 'committing'}
        />
      </div>
    </ErrorBoundary>
  )
}
