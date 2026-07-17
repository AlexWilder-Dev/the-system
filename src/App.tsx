import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useGame } from './state/GameContext';
import { settle, useAnim } from './motion/springs';
import { Particles } from './components/Particles';
import { BottomNav, type Tab } from './components/BottomNav';
import { StatusScreen } from './components/StatusScreen';
import { MorningScreen } from './components/MorningScreen';
import { FitnessScreen } from './components/FitnessScreen';
import { PersonalScreen } from './components/PersonalScreen';
import { ManageScreen } from './components/ManageScreen';
import { Assessment } from './components/Assessment';
import { OverlayHost } from './components/Overlays';
import { DebugPanel } from './components/DebugPanel';

type Route = Tab | 'manage';

const ORDER: Route[] = ['status', 'morning', 'fitness', 'personal', 'manage'];

export default function App() {
  const { state } = useGame();
  const t = useAnim(settle);
  const [route, setRoute] = useState<Route>('status');
  const [manageSignal, setManageSignal] = useState(0);
  const prevRoute = useRef<Route>('status');

  const go = (next: Route) => {
    prevRoute.current = route;
    setRoute(next);
  };

  const openManageForm = () => {
    setManageSignal((n) => n + 1);
    go('manage');
  };

  // No state OR no profile → the System must measure the hunter first.
  if (!state || !state.profile) {
    return (
      <>
        <Particles />
        <div className="vignette" />
        <Assessment />
      </>
    );
  }

  const dir = ORDER.indexOf(route) >= ORDER.indexOf(prevRoute.current) ? 1 : -1;

  return (
    <>
      <Particles />
      <div className="vignette" />
      <div className="shell">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={route}
            initial={{ opacity: 0, x: 24 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 * dir }}
            transition={t}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {route === 'status' && <StatusScreen onManage={() => go('manage')} />}
            {route === 'morning' && <MorningScreen />}
            {route === 'fitness' && <FitnessScreen />}
            {route === 'personal' && <PersonalScreen onRegister={openManageForm} />}
            {route === 'manage' && <ManageScreen openFormSignal={manageSignal} onBack={() => go('status')} />}
          </motion.div>
        </AnimatePresence>
        <BottomNav tab={route} onChange={go} />
      </div>
      <OverlayHost />
      <DebugPanel />
    </>
  );
}
