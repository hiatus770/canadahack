export const AVATARS = {
  JD: { initials: 'JD', bg: 'var(--blue-400)'   },
  MK: { initials: 'MK', bg: 'var(--green-400)'  },
  AL: { initials: 'AL', bg: 'var(--purple-400)' },
  TC: { initials: 'TC', bg: 'var(--orange-400)' },
}

// ── My Drive ────────────────────────────────────────────────────────────────

export const MY_DRIVE_FOLDERS = [
  { name: 'ACL Configs',        slug: 'acl-configs',        fill: '#ADC7FC', stroke: '#5A82DE' },
  { name: 'Deployment Scripts', slug: 'deployment-scripts', fill: '#CBF4C9', stroke: '#33C27F' },
  { name: 'Tailnet Backups',    slug: 'tailnet-backups',    fill: '#F8E5B9', stroke: '#BB5504' },
  { name: 'Shared Configs',     slug: 'shared-configs',     fill: '#EFDDFD', stroke: '#995FC3' },
  { name: 'Team Docs',          slug: 'team-docs',          fill: '#ADC7FC', stroke: '#5A82DE' },
]

export const MY_DRIVE_FILES = [
  { name: 'tailnet-policy.acl.json',       kind: 'document',     collabs: ['JD', 'MK'] },
  { name: 'deploy-nodes.sh',               kind: 'script',       collabs: [] },
  { name: 'node-inventory.csv',            kind: 'spreadsheet',  collabs: ['AL'] },
  { name: 'subnet-routes-plan.md',         kind: 'document',     collabs: [] },
  { name: 'Q1 Tailnet Review.pptx',        kind: 'presentation', collabs: ['JD', 'TC', 'MK'] },
  { name: 'tailnet-backup-2026-03.tar.gz', kind: 'backup',       collabs: [] },
]

// ── Folder contents ──────────────────────────────────────────────────────────

export const FOLDER_CONTENTS = {
  'acl-configs': {
    name: 'ACL Configs',
    fill: '#ADC7FC', stroke: '#5A82DE',
    files: [
      { name: 'tailnet-policy.acl.json', kind: 'document', collabs: ['JD', 'MK'] },
      { name: 'emergency-access.acl',    kind: 'config',   collabs: [] },
      { name: 'staging.acl.json',        kind: 'document', collabs: ['AL'] },
    ],
  },
  'deployment-scripts': {
    name: 'Deployment Scripts',
    fill: '#CBF4C9', stroke: '#33C27F',
    files: [
      { name: 'deploy-nodes.sh',  kind: 'script', collabs: [] },
      { name: 'rollback.sh',      kind: 'script', collabs: ['MK'] },
      { name: 'update-acls.py',   kind: 'script', collabs: [] },
      { name: 'health-check.sh',  kind: 'script', collabs: ['TC'] },
    ],
  },
  'tailnet-backups': {
    name: 'Tailnet Backups',
    fill: '#F8E5B9', stroke: '#BB5504',
    files: [
      { name: 'tailnet-backup-2026-03.tar.gz', kind: 'backup', collabs: [] },
      { name: 'tailnet-backup-2026-02.tar.gz', kind: 'backup', collabs: [] },
      { name: 'tailnet-backup-2026-01.tar.gz', kind: 'backup', collabs: [] },
    ],
  },
  'shared-configs': {
    name: 'Shared Configs',
    fill: '#EFDDFD', stroke: '#995FC3',
    files: [
      { name: 'dns-config.json',    kind: 'config', collabs: ['JD'] },
      { name: 'subnet-routes.conf', kind: 'config', collabs: [] },
      { name: 'exit-nodes.json',    kind: 'config', collabs: ['MK', 'TC'] },
    ],
  },
  'team-docs': {
    name: 'Team Docs',
    fill: '#ADC7FC', stroke: '#5A82DE',
    files: [
      { name: 'subnet-routes-plan.md',     kind: 'document',     collabs: [] },
      { name: 'onboarding-guide.md',       kind: 'document',     collabs: ['TC'] },
      { name: 'architecture-overview.pdf', kind: 'document',     collabs: ['JD', 'MK', 'TC'] },
      { name: 'Q1 Tailnet Review.pptx',    kind: 'presentation', collabs: ['JD', 'TC', 'MK'] },
    ],
  },
}

// ── Shared with me ────────────────────────────────────────────────────────────

export const SHARED_FILES = [
  { name: 'infra-diagram.pdf',    kind: 'document',     collabs: ['JD'],       sharedBy: 'JD', when: '3 days ago' },
  { name: 'onboarding-guide.md',  kind: 'document',     collabs: ['TC'],       sharedBy: 'TC', when: '1 week ago' },
  { name: 'firewall-rules.xlsx',  kind: 'spreadsheet',  collabs: ['MK'],       sharedBy: 'MK', when: '2 days ago' },
  { name: 'network-topology.pdf', kind: 'document',     collabs: ['AL'],       sharedBy: 'AL', when: 'Yesterday'  },
  { name: 'team-roadmap.pptx',    kind: 'presentation', collabs: ['JD', 'TC'], sharedBy: 'JD', when: 'Today'      },
]

// ── Recent ────────────────────────────────────────────────────────────────────

export const RECENT_FILES = [
  { name: 'tailnet-policy.acl.json',       kind: 'document',     collabs: ['JD', 'MK'],     when: '5 min ago'  },
  { name: 'deploy-nodes.sh',               kind: 'script',       collabs: [],               when: '2 hr ago'   },
  { name: 'subnet-routes-plan.md',         kind: 'document',     collabs: [],               when: 'Yesterday'  },
  { name: 'Q1 Tailnet Review.pptx',        kind: 'presentation', collabs: ['JD', 'TC', 'MK'], when: '2 days ago' },
  { name: 'node-inventory.csv',            kind: 'spreadsheet',  collabs: ['AL'],           when: '3 days ago' },
  { name: 'onboarding-guide.md',           kind: 'document',     collabs: ['TC'],           when: 'Last week'  },
]

// ── Starred ───────────────────────────────────────────────────────────────────

export const STARRED_FILES = [
  { name: 'tailnet-policy.acl.json', kind: 'document',     collabs: ['JD', 'MK'] },
  { name: 'deploy-nodes.sh',         kind: 'script',       collabs: [] },
  { name: 'Q1 Tailnet Review.pptx',  kind: 'presentation', collabs: ['JD', 'TC', 'MK'] },
  { name: 'subnet-routes-plan.md',   kind: 'document',     collabs: [] },
]

// ── Tailnet drives ────────────────────────────────────────────────────────────

export const DRIVE_CONTENTS = {
  'prod-server': {
    label: 'prod-server',
    ip: '100.64.1.10',
    folders: [
      { name: 'logs',    fill: '#F8E5B9', stroke: '#BB5504' },
      { name: 'config',  fill: '#ADC7FC', stroke: '#5A82DE' },
      { name: 'scripts', fill: '#CBF4C9', stroke: '#33C27F' },
    ],
    files: [
      { name: 'tailscaled.log',  kind: 'log',    collabs: [] },
      { name: 'nginx.conf',      kind: 'config', collabs: [] },
      { name: 'crontab.bak',     kind: 'backup', collabs: [] },
    ],
  },
  'dev-vm': {
    label: 'dev-vm',
    ip: '100.64.1.22',
    folders: [
      { name: 'projects', fill: '#ADC7FC', stroke: '#5A82DE' },
      { name: 'dotfiles', fill: '#EFDDFD', stroke: '#995FC3' },
    ],
    files: [
      { name: 'dev-setup.sh', kind: 'script',   collabs: [] },
      { name: '.bashrc',      kind: 'config',   collabs: [] },
      { name: 'notes.md',     kind: 'document', collabs: [] },
      { name: 'packages.txt', kind: 'document', collabs: [] },
    ],
  },
  'backup-nas': {
    label: 'backup-nas',
    ip: '100.64.1.50',
    folders: [
      { name: '2026',     fill: '#CBF4C9', stroke: '#33C27F' },
      { name: '2025',     fill: '#DAD6D5', stroke: '#AFACAB' },
      { name: 'archived', fill: '#F8E5B9', stroke: '#BB5504' },
    ],
    files: [
      { name: 'latest-backup.tar.gz', kind: 'backup', collabs: [] },
      { name: 'backup-manifest.json', kind: 'config', collabs: [] },
    ],
  },
}

// ── Trash ─────────────────────────────────────────────────────────────────────

export const TRASH_FILES = [
  { name: 'old-acl-backup.json', kind: 'config',   deletedWhen: '2 days ago' },
  { name: 'test-script.sh',      kind: 'script',   deletedWhen: '5 days ago' },
  { name: 'draft-policy.md',     kind: 'document', deletedWhen: '1 week ago' },
]
