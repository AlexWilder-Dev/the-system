import { useState } from 'react';
import type { Difficulty, StatKey } from '../types';
import { BASE_XP } from '../logic/xp';
import { STAT_KEYS } from '../logic/stats';

export interface QuestDraft {
  title: string;
  minimum: string;
  trigger: string;
  stat: StatKey;
  difficulty: Difficulty;
}

interface Props {
  initial?: QuestDraft;
  submitLabel: string;
  onSubmit: (draft: QuestDraft) => void;
  onCancel?: () => void;
}

const DIFFICULTIES: Difficulty[] = [1, 2, 3];
const NUMERALS: Record<Difficulty, string> = { 1: 'I', 2: 'II', 3: 'III' };

/** Prefill templates — one tap seeds the form; everything stays editable. */
const SUGGESTIONS: Array<{ label: string } & QuestDraft> = [
  { label: 'READ', title: 'Read', minimum: '2 pages counts', trigger: 'After getting into bed', stat: 'INT', difficulty: 1 },
  { label: 'LANGUAGE', title: 'Language practice', minimum: '1 app lesson counts', trigger: 'With morning coffee', stat: 'INT', difficulty: 1 },
  { label: 'MEDITATE', title: 'Meditate', minimum: '2 min counts', trigger: 'After lunch', stat: 'FOC', difficulty: 1 },
  { label: 'JOURNAL', title: 'Journal', minimum: '3 lines counts', trigger: 'After brushing teeth at night', stat: 'FOC', difficulty: 1 },
  { label: 'STRETCH', title: 'Stretch / mobility', minimum: '5 min counts', trigger: 'After training', stat: 'VIT', difficulty: 1 },
  { label: 'TIDY', title: 'Ten-minute reset', minimum: 'Clear one surface counts', trigger: 'After dinner', stat: 'WIL', difficulty: 1 },
  { label: 'CHESS', title: 'Chess study', minimum: '1 puzzle counts', trigger: 'On the evening commute', stat: 'INT', difficulty: 1 },
];

export function QuestForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [minimum, setMinimum] = useState(initial?.minimum ?? '');
  const [trigger, setTrigger] = useState(initial?.trigger ?? '');
  const [stat, setStat] = useState<StatKey>(initial?.stat ?? 'STR');
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 1);
  const [error, setError] = useState('');

  const applySuggestion = (sug: QuestDraft) => {
    setTitle(sug.title);
    setMinimum(sug.minimum);
    setTrigger(sug.trigger);
    setStat(sug.stat);
    setDifficulty(sug.difficulty);
    setError('');
  };

  const submit = () => {
    if (!title.trim()) return setError('TITLE REQUIRED. NAME THE QUEST.');
    if (!minimum.trim()) return setError('MINIMUM REQUIRED. DEFINE THE SMALLEST VERSION THAT COUNTS.');
    if (!trigger.trim()) return setError('TRIGGER REQUIRED. AFTER WHAT WILL YOU DO THIS?');
    setError('');
    onSubmit({
      title: title.trim(),
      minimum: minimum.trim(),
      trigger: trigger.trim(),
      stat,
      difficulty,
    });
  };

  return (
    <div>
      {error && <p className="form-error">{error}</p>}

      {!initial && (
        <div className="sys-field">
          <span className="dim-label">SUGGESTIONS — TAP TO PREFILL</span>
          <div className="suggestion-row">
            {SUGGESTIONS.map((sug) => (
              <button key={sug.label} type="button" className="suggestion-chip" onClick={() => applySuggestion(sug)}>
                {sug.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sys-field">
        <label className="dim-label" htmlFor="qf-title">
          QUEST
        </label>
        <input
          id="qf-title"
          className="sys-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Train — 20 min strength"
          maxLength={60}
        />
      </div>

      <div className="sys-field">
        <label className="dim-label" htmlFor="qf-min">
          MINIMUM
        </label>
        <input
          id="qf-min"
          className="sys-input"
          value={minimum}
          onChange={(e) => setMinimum(e.target.value)}
          placeholder="2 push-ups counts"
          maxLength={60}
        />
        <span className="hint">The smallest version that still counts. On bad days, this is the quest.</span>
      </div>

      <div className="sys-field">
        <label className="dim-label" htmlFor="qf-trigger">
          TRIGGER
        </label>
        <input
          id="qf-trigger"
          className="sys-input"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="After morning coffee"
          maxLength={60}
        />
        <span className="hint">After X, I do this.</span>
      </div>

      <div className="sys-field">
        <span className="dim-label">STAT</span>
        <div className="seg" role="radiogroup" aria-label="Stat">
          {STAT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={stat === key}
              className={`seg-btn${stat === key ? ' on' : ''}`}
              onClick={() => setStat(key)}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="sys-field">
        <span className="dim-label">DIFFICULTY</span>
        <div className="seg" role="radiogroup" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={difficulty === d}
              className={`seg-btn${difficulty === d ? ' on' : ''}`}
              onClick={() => setDifficulty(d)}
            >
              {NUMERALS[d]}
              <span className="sub">{BASE_XP[d]} XP</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button className="sys-btn sys-btn--primary" onClick={submit}>
          {submitLabel}
        </button>
        {onCancel && (
          <button className="sys-btn" onClick={onCancel}>
            CANCEL
          </button>
        )}
      </div>
    </div>
  );
}
