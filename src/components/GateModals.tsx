import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Sex } from '../types';
import type { GateDef, GateTest } from '../data/gates';
import { useGame } from '../state/GameContext';
import { fade, useAnim, useMaterialize } from '../motion/springs';
import type { GateReport } from '../logic/gatecheck';

/**
 * Declaration: the hunter commits to the attempt; the test becomes today's
 * featured quest. A forced declaration (challenge) skips the tracked
 * requirements — the physical standards alone decide the letter.
 */
export function GateDeclaration({
  gate,
  forced = false,
  onEnter,
  onCancel,
}: {
  gate: GateDef;
  forced?: boolean;
  onEnter: () => void;
  onCancel: () => void;
}) {
  const tFade = useAnim(fade);
  const mPanel = useMaterialize();
  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={tFade}>
      <motion.div className="sys-panel overlay-panel" {...mPanel}>
        <div className="overlay-eyebrow">{gate.name}{forced ? ' — CHALLENGE' : ''}</div>
        <p className="overlay-copy">
          {forced
            ? 'YOU CLAIM THE PLACEMENT IS WRONG. THE STANDARDS DO NOT BEND — MEET THEM AND THE RANK IS YOURS.'
            : 'REQUIREMENTS MET. DECLARE YOUR ATTEMPT?'}
        </p>
        <div className="delta-list">
          {gate.tests.map((t) => (
            <div className="req-row" key={t.id}>
              <span className="req-label">{t.label}</span>
            </div>
          ))}
        </div>
        {forced && <p className="log-note">ONE CHALLENGE PER WEEK. PASS OR FAIL, THE RESULT IS RECORDED.</p>}
        <div className="form-actions" style={{ justifyContent: 'center' }}>
          <button className="sys-btn sys-btn--primary" onClick={onEnter}>
            {forced ? 'DECLARE CHALLENGE' : 'ENTER THE GATE'}
          </button>
          <button className="sys-btn" onClick={onCancel}>
            NOT YET
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface Field {
  key: string;
  label: string;
  placeholder: string;
}

function fieldsForTest(test: GateTest, sex: Sex): Field[] {
  switch (test.kind) {
    case 'run_distance':
      return [{ key: test.id, label: `${test.label} — DISTANCE (KM)`, placeholder: `STANDARD: ${test.km}` }];
    case 'run_time':
      return [
        {
          key: test.id,
          label: `${test.label} — TIME (MINUTES, E.G. 29.5)`,
          placeholder: `STANDARD: ≤ ${(test.maxSec[sex] / 60).toFixed(0)}`,
        },
      ];
    case 'reps':
      return [{ key: test.id, label: `${test.label} (REPS)`, placeholder: `STANDARD: ${test.std[sex]}` }];
    case 'hold':
      return [{ key: test.id, label: `${test.label} (SECONDS)`, placeholder: `STANDARD: ${test.sec}` }];
    case 'either':
      return test.options.flatMap((o) => fieldsForTest(o, sex));
  }
}

/** The debrief: self-reported numbers, styled as a System interrogation. The System trusts its hunters. */
export function GateDebrief({ gate, sex, onClose }: { gate: GateDef; sex: Sex; onClose: () => void }) {
  const { submitGateReport } = useGame();
  const tFade = useAnim(fade);
  const mPanel = useMaterialize();
  const fields = gate.tests.flatMap((t) => fieldsForTest(t, sex));
  const [values, setValues] = useState<Record<string, string>>({});

  const submit = () => {
    const report: GateReport = {};
    for (const f of fields) {
      const n = Number(values[f.key]);
      if (Number.isFinite(n) && n > 0) report[f.key] = n;
    }
    submitGateReport(report);
    onClose();
  };

  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={tFade}>
      <motion.div
        className="sys-panel overlay-panel"
        {...mPanel}
        style={{ maxHeight: '86vh', overflowY: 'auto' }}
      >
        <div className="overlay-eyebrow">{gate.name} — DEBRIEF</div>
        <p className="overlay-copy">REPORT YOUR RESULTS. EMPTY FIELDS COUNT AS NOT ATTEMPTED.</p>
        {fields.map((f) => (
          <div className="gate-form-row" key={f.key}>
            <label className="dim-label" htmlFor={`gf-${f.key}`}>
              {f.label}
            </label>
            <input
              id={`gf-${f.key}`}
              className="sys-input"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder={f.placeholder}
              value={values[f.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          </div>
        ))}
        <div className="form-actions" style={{ justifyContent: 'center' }}>
          <button className="sys-btn sys-btn--primary" onClick={submit}>
            SUBMIT REPORT
          </button>
          <button className="sys-btn" onClick={onClose}>
            CANCEL
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
