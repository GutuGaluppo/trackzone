import { Cloud, Folder, HardDrive, MonitorSmartphone, Package } from 'lucide-react';

const ICONS = [Cloud, HardDrive, Package, Folder, MonitorSmartphone];

export function ConnectRow() {
  return (
    <div className="mt-12">
      <p className="label-plate text-warm-gray">Connect from</p>
      <div className="mt-4 flex items-center gap-6" aria-hidden>
        {ICONS.map((Icon, index) => (
          <Icon key={index} className="text-ink/35 h-5 w-5" strokeWidth={1.5} />
        ))}
      </div>
    </div>
  );
}
