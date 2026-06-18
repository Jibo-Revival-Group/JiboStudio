import jiboSvg from '../assets/jibo.svg';
import './icons.css';

export interface MaterialIconProps {
  name: string;
  className?: string;
  size?: number;
  filled?: boolean;
  title?: string;
}

export function MaterialIcon({
  name,
  className,
  size = 20,
  filled = false,
  title,
}: MaterialIconProps) {
  return (
    <span
      className={`material-symbols-outlined${filled ? ' material-symbols-outlined--filled' : ''}${className ? ` ${className}` : ''}`}
      style={{ fontSize: size }}
      aria-hidden={title ? undefined : true}
      title={title}
    >
      {name}
    </span>
  );
}

export interface JiboIconProps {
  size?: number;
  className?: string;
  title?: string;
  /** Match monochrome Material icons (e.g. activity bar). */
  monochrome?: boolean;
}

export function JiboIcon({ size = 20, className, title, monochrome = false }: JiboIconProps) {
  if (monochrome) {
    return (
      <span
        className={`jibo-icon jibo-icon--monochrome${className ? ` ${className}` : ''}`}
        style={{
          width: size,
          height: size,
          WebkitMaskImage: `url(${jiboSvg})`,
          maskImage: `url(${jiboSvg})`,
        }}
        title={title}
        aria-hidden={title ? undefined : true}
        role={title ? 'img' : undefined}
        aria-label={title}
      />
    );
  }

  return (
    <img
      src={jiboSvg}
      alt=""
      className={`jibo-icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      title={title}
    />
  );
}

export function CloseIcon({ size = 18, className }: { size?: number; className?: string }) {
  return <MaterialIcon name="close" size={size} className={className} />;
}

export function ExpandIcon({ expanded, size = 16 }: { expanded: boolean; size?: number }) {
  return (
    <MaterialIcon
      name={expanded ? 'expand_more' : 'chevron_right'}
      size={size}
      className="explorer-icon explorer-icon--chevron"
    />
  );
}

export function FolderIcon({
  open,
  size = 16,
}: {
  open: boolean;
  size?: number;
}) {
  return (
    <MaterialIcon
      name={open ? 'folder_open' : 'folder'}
      size={size}
      filled={open}
      className="explorer-icon explorer-icon--folder"
    />
  );
}

export interface FileIconSpec {
  icon: string;
  className: string;
  filled?: boolean;
}

export function getFileIconSpec(name: string): FileIconSpec {
  const lower = name.toLowerCase();
  if (lower.endsWith('.flow')) {
    return { icon: 'account_tree', className: 'explorer-icon--flow' };
  }
  if (lower.endsWith('.bt')) {
    return { icon: 'schema', className: 'explorer-icon--behavior' };
  }
  if (lower.endsWith('.rule')) {
    return { icon: 'rule', className: 'explorer-icon--rule' };
  }
  if (lower.endsWith('.mim')) {
    return { icon: 'chat_bubble', className: 'explorer-icon--mim' };
  }
  if (lower === 'package.json') {
    return { icon: 'inventory_2', className: 'explorer-icon--package' };
  }
  if (lower.endsWith('.json')) {
    return { icon: 'data_object', className: 'explorer-icon--json' };
  }
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) {
    return { icon: 'code_blocks', className: 'explorer-icon--typescript' };
  }
  if (lower.endsWith('.js') || lower.endsWith('.jsx')) {
    return { icon: 'javascript', className: 'explorer-icon--javascript' };
  }
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    return { icon: 'html', className: 'explorer-icon--html' };
  }
  if (lower.endsWith('.css')) {
    return { icon: 'css', className: 'explorer-icon--css' };
  }
  if (lower.endsWith('.md')) {
    return { icon: 'markdown', className: 'explorer-icon--markdown' };
  }
  if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(lower)) {
    return { icon: 'image', className: 'explorer-icon--image' };
  }
  if (lower.endsWith('.xml')) {
    return { icon: 'code', className: 'explorer-icon--xml' };
  }
  return { icon: 'description', className: 'explorer-icon--generic' };
}

export function FileTypeIcon({ name, size = 16 }: { name: string; size?: number }) {
  const spec = getFileIconSpec(name);
  return (
    <MaterialIcon
      name={spec.icon}
      size={size}
      filled={spec.filled}
      className={`explorer-icon ${spec.className}`}
    />
  );
}

export type ActivityIconId = 'folder' | 'jibo' | 'bug_report' | 'menu_book' | 'help';

export function ActivityIcon({ icon, title }: { icon: ActivityIconId; title: string }) {
  if (icon === 'jibo') {
    return <JiboIcon size={22} title={title} monochrome />;
  }
  return <MaterialIcon name={icon} size={22} title={title} />;
}
