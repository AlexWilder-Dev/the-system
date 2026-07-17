import { motion } from 'framer-motion';
import { settle, useAnim } from '../motion/springs';

export type Tab = 'status' | 'morning' | 'fitness' | 'personal';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'status', label: 'STATUS' },
  { id: 'morning', label: 'MORNING' },
  { id: 'fitness', label: 'FITNESS' },
  { id: 'personal', label: 'PERSONAL' },
];

export function BottomNav({ tab, onChange }: { tab: Tab | 'manage'; onChange: (t: Tab) => void }) {
  const t = useAnim(settle);
  return (
    <nav className="nav" aria-label="Main">
      {TABS.map((item) => (
        <button
          key={item.id}
          className={`nav-item${tab === item.id ? ' on' : ''}`}
          style={{ fontSize: 10, letterSpacing: '0.14em' }}
          onClick={() => onChange(item.id)}
          aria-current={tab === item.id ? 'page' : undefined}
        >
          {tab === item.id && <motion.span className="nav-ind" layoutId="nav-ind" transition={t} />}
          {item.label}
        </button>
      ))}
    </nav>
  );
}
