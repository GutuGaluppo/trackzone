import { Box, Cloud, FolderOpen, HardDrive, Monitor } from 'lucide-react';

const ICONS = [Cloud, HardDrive, Box, FolderOpen, Monitor];

export function ConnectRow() {
  return (
    <div className="mt-10">
      <p className="label-plate text-warm-gray">Connect from</p>
      <div className="mt-3 flex items-center gap-5" aria-hidden>
        {ICONS.map((Icon, index) => (
          <Icon key={index} className="text-ink/30 h-5 w-5" strokeWidth={1.5} />
        ))}
      </div>
    </div>
  );
}
