import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { AppState, Quest } from '../types';
import { MAX_ACTIVE_QUESTS, useGame } from '../state/GameContext';
import { coerceState, newId } from '../state/storage';
import { BASE_XP } from '../logic/xp';
import { fade } from '../motion/springs';
import { QuestForm, type QuestDraft } from './QuestForm';
import { SysPanel } from './SysPanel';

type Editing = { mode: 'new' } | { mode: 'edit'; quest: Quest } | null;

const WAKE_TIMES = ['05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00'];

export function ManageScreen({ openFormSignal, onBack }: { openFormSignal: number; onBack: () => void }) {
  const {
    state,
    today,
    addQuest,
    updateQuest,
    setQuestActive,
    setWakeWindow,
    importState,
    requestReassess,
    resetAll,
    devLevelUp,
  } = useGame();
  const s = state!;
  const active = s.quests.filter((q) => q.active);
  const archived = s.quests.filter((q) => !q.active);
  const atCap = active.length >= MAX_ACTIVE_QUESTS;

  const [editing, setEditing] = useState<Editing>(null);
  const [importError, setImportError] = useState('');
  const [pendingImport, setPendingImport] = useState<AppState | null>(null);
  const [confirming, setConfirming] = useState<'reassess' | 'reset' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // The Personal empty state routes here with a request to open the form.
  useEffect(() => {
    if (openFormSignal > 0) setEditing({ mode: 'new' });
  }, [openFormSignal]);

  const submit = (draft: QuestDraft) => {
    if (editing?.mode === 'edit') {
      updateQuest({ ...editing.quest, ...draft });
    } else {
      addQuest({ ...draft, id: newId(), active: true });
    }
    setEditing(null);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `the-system-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFileChosen = async (file: File | undefined) => {
    setImportError('');
    if (!file) return;
    try {
      const parsed = coerceState(JSON.parse(await file.text())); // v1 blobs migrate on the spot
      if (!parsed) throw new Error('invalid');
      setPendingImport(parsed);
    } catch {
      setImportError('INVALID DATA FILE. EXPORT A BACKUP FROM THE SYSTEM AND RETRY.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="screen">
      <div className="quests-head">
        <h1 className="screen-title">MANAGE</h1>
        <button className="sys-btn sys-btn--quiet" onClick={onBack}>
          CLOSE
        </button>
      </div>

      <section className="manage-section">
        <span className="dim-label">WAKE WINDOW — 30 MIN FROM</span>
        <div className="seg" style={{ marginTop: 8 }}>
          {WAKE_TIMES.map((t) => (
            <button
              key={t}
              className={`seg-btn num${s.profile?.wakeWindowStart === t ? ' on' : ''}`}
              onClick={() => setWakeWindow(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="manage-note">GATE STANDARDS NEVER ADJUST. YOUR WINDOW MAY.</p>
      </section>

      <section className="manage-section">
        <span className="dim-label">
          PERSONAL QUESTS — {active.length} / {MAX_ACTIVE_QUESTS} ACTIVE
        </span>

        {editing?.mode === 'new' && (
          <SysPanel className="quest-form">
            <QuestForm submitLabel="REGISTER" onSubmit={submit} onCancel={() => setEditing(null)} />
          </SysPanel>
        )}

        {active.map((quest) =>
          editing?.mode === 'edit' && editing.quest.id === quest.id ? (
            <SysPanel className="quest-form" key={quest.id}>
              <QuestForm initial={quest} submitLabel="SAVE" onSubmit={submit} onCancel={() => setEditing(null)} />
            </SysPanel>
          ) : (
            <SysPanel className="manage-row" key={quest.id}>
              <div className="manage-row-info">
                <div className="manage-row-title">{quest.title}</div>
                <div className="manage-row-sub num">
                  {quest.stat} · {BASE_XP[quest.difficulty]} XP
                </div>
              </div>
              <div className="manage-row-actions">
                <button className="sys-btn sys-btn--quiet" onClick={() => setEditing({ mode: 'edit', quest })}>
                  EDIT
                </button>
                <button className="sys-btn sys-btn--quiet" onClick={() => setQuestActive(quest.id, false)}>
                  ARCHIVE
                </button>
              </div>
            </SysPanel>
          ),
        )}

        {!editing && (
          <button className="sys-btn sys-btn--primary" disabled={atCap} onClick={() => setEditing({ mode: 'new' })}>
            ADD QUEST
          </button>
        )}
        {atCap && <p className="manage-note">MAXIMUM REACHED. A HUNTER WHO TRAINS EVERYTHING TRAINS NOTHING.</p>}
      </section>

      {archived.length > 0 && (
        <section className="manage-section">
          <span className="dim-label">ARCHIVED</span>
          {archived.map((quest) => (
            <SysPanel className="manage-row" key={quest.id}>
              <div className="manage-row-info">
                <div className="manage-row-title" style={{ opacity: 0.55 }}>
                  {quest.title}
                </div>
              </div>
              <div className="manage-row-actions">
                <button className="sys-btn sys-btn--quiet" disabled={atCap} onClick={() => setQuestActive(quest.id, true)}>
                  RESTORE
                </button>
              </div>
            </SysPanel>
          ))}
        </section>
      )}

      <section className="manage-section">
        <span className="dim-label">MEASUREMENT</span>
        <div className="data-actions" style={{ marginTop: 8 }}>
          <button className="sys-btn" onClick={() => setConfirming('reassess')}>
            REQUEST RE-MEASUREMENT
          </button>
        </div>
        <p className="manage-note">
          OUTGROWN YOUR PLACEMENT? THE SYSTEM RE-MEASURES AND RE-SEATS YOUR TRACK. XP, RANK AND HISTORY REMAIN.
        </p>
      </section>

      <section className="manage-section">
        <span className="dim-label">DATA</span>
        <div className="data-actions" style={{ marginTop: 8 }}>
          <button className="sys-btn" onClick={exportData}>
            EXPORT
          </button>
          <button className="sys-btn" onClick={() => fileRef.current?.click()}>
            IMPORT
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => onFileChosen(e.target.files?.[0])}
          />
        </div>
        {importError && <p className="manage-note">{importError}</p>}
        <p className="manage-note">BACKUP IS MANUAL. EXPORT REGULARLY.</p>
      </section>

      {/* TEMPORARY — graphics testing hook, remove before "release". */}
      <section className="manage-section">
        <span className="dim-label">DEV TEST</span>
        <div className="data-actions" style={{ marginTop: 8 }}>
          <button className="sys-btn" onClick={devLevelUp}>
            DEV TEST — LEVEL UP
          </button>
        </div>
        <p className="manage-note">GRANTS EXACTLY THE XP TO REACH THE NEXT LEVEL. FIRES THE FULL CEREMONY.</p>
      </section>

      <section className="manage-section">
        <span className="dim-label">START AGAIN</span>
        <div className="data-actions" style={{ marginTop: 8 }}>
          <button className="sys-btn sys-btn--danger" onClick={() => setConfirming('reset')}>
            ERASE THE RECORD
          </button>
        </div>
        <p className="manage-note">A CLEAN AWAKENING. EVERYTHING GOES — XP, RANK, HISTORY, QUESTS. EXPORT FIRST.</p>
      </section>

      <AnimatePresence>
        {confirming && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
            <SysPanel className="overlay-panel">
              <div className="overlay-eyebrow">CONFIRM</div>
              <p className="overlay-copy">
                {confirming === 'reassess'
                  ? 'THE SYSTEM WILL RE-MEASURE YOU NOW. XP, RANK AND HISTORY ARE KEPT; YOUR TRACK RESTARTS AT THE NEW PLACEMENT.'
                  : 'THE ENTIRE RECORD WILL BE ERASED. THIS CANNOT BE UNDONE.'}
              </p>
              <div className="form-actions" style={{ justifyContent: 'center' }}>
                <button
                  className="sys-btn sys-btn--primary"
                  onClick={() => {
                    if (confirming === 'reassess') requestReassess();
                    else resetAll();
                    setConfirming(null);
                  }}
                >
                  {confirming === 'reassess' ? 'RE-MEASURE' : 'ERASE'}
                </button>
                <button className="sys-btn" onClick={() => setConfirming(null)}>
                  CANCEL
                </button>
              </div>
            </SysPanel>
          </motion.div>
        )}
        {pendingImport && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
            <SysPanel className="overlay-panel">
              <div className="overlay-eyebrow">CONFIRM</div>
              <p className="overlay-copy">IMPORTED DATA WILL REPLACE THE CURRENT RECORD. THIS CANNOT BE UNDONE.</p>
              <div className="form-actions" style={{ justifyContent: 'center' }}>
                <button
                  className="sys-btn sys-btn--primary"
                  onClick={() => {
                    importState(pendingImport);
                    setPendingImport(null);
                  }}
                >
                  REPLACE DATA
                </button>
                <button className="sys-btn" onClick={() => setPendingImport(null)}>
                  CANCEL
                </button>
              </div>
            </SysPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
