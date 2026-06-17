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
      className="material-symbols-outlined--sm"
    />
  );
}

export function FileTypeIcon({ name, size = 16 }: { name: string; size?: number }) {
  if (name.endsWith('.flow')) {
    return <MaterialIcon name="account_tree" size={size} className="material-symbols-outlined--sm" />;
  }
  if (name.endsWith('.bt')) {
    return <MaterialIcon name="schema" size={size} className="material-symbols-outlined--sm" />;
  }
  if (name.endsWith('.rule')) {
    return <MaterialIcon name="rule" size={size} className="material-symbols-outlined--sm" />;
  }
  if (name.endsWith('.mim')) {
    return <MaterialIcon name="chat_bubble" size={size} className="material-symbols-outlined--sm" />;
  }
  if (name.endsWith('.ts')) {
    return <span className="file-type-badge">TS</span>;
  }
  return <MaterialIcon name="description" size={size} className="material-symbols-outlined--sm" />;
}

export type ActivityIconId = 'folder' | 'jibo' | 'bug_report' | 'menu_book' | 'help';

export function ActivityIcon({ icon, title }: { icon: ActivityIconId; title: string }) {
  if (icon === 'jibo') {
    return <JiboIcon size={22} title={title} monochrome />;
  }
  return <MaterialIcon name={icon} size={22} title={title} />;
}
