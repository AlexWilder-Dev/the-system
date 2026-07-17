import type { Difficulty, Quest, StatKey } from '../types';
import {
  CARDIO_WHY,
  MORNING_PROTOCOLS,
  REST_RX,
  STEPS_RX,
  STRENGTH_RX,
  STRENGTH_WHY,
  type CardioKind,
  type EvidenceTier,
} from '../data/protocols';

// Quest ids are stable, parseable strings so past prescriptions stay
// interpretable from the log alone:
//   mp:<name>                    morning protocol
//   run:<kind>:<minutes>:s<slot> cardio session (kind: wr|z2|iv|long|test)
//   str:<letterIndex>            strength session
//   steps | rest | gate          movement floor, mandatory rest, gate trial

export type QuestKind = 'morning' | 'cardio' | 'strength' | 'steps' | 'rest' | 'gate' | 'personal';

export interface QuestMeta {
  id: string;
  kind: QuestKind;
  title: string;
  rx: string;
  /** One-glance version of rx for compact cards; rx sits behind LEARN MORE. */
  short?: string;
  why?: string;
  tier?: EvidenceTier;
  stat: StatKey;
  difficulty: Difficulty;
  minutes?: number;
  cardioKind?: CardioKind;
  slot?: number;
}

export interface ParsedCardio {
  kind: CardioKind;
  minutes: number;
  slot: number;
}

export function parseCardioId(id: string): ParsedCardio | null {
  const m = /^run:(wr|z2|iv|long|test):(\d+):s([0-2])$/.exec(id);
  if (!m) return null;
  return { kind: m[1] as CardioKind, minutes: Number(m[2]), slot: Number(m[3]) };
}

export function cardioQuestId(kind: CardioKind, minutes: number, slot: number): string {
  return `run:${kind}:${minutes}:s${slot}`;
}

const CARDIO_TITLES: Record<CardioKind, string> = {
  wr: 'WALK-RUN',
  z2: 'ZONE 2 RUN',
  iv: 'QUALITY SESSION',
  long: 'LONG RUN',
  test: 'TEST RUN',
};

/** Resolve any questId to its display/logic metadata. Personal quests come from state. */
export function questMeta(id: string, personalQuests: Quest[]): QuestMeta | null {
  const morning = MORNING_PROTOCOLS.find((p) => p.id === id);
  if (morning) {
    return {
      id,
      kind: 'morning',
      title: morning.title,
      rx: morning.rx,
      short: morning.short,
      why: morning.why,
      tier: morning.tier,
      stat: morning.stat,
      difficulty: morning.difficulty,
    };
  }

  const cardio = parseCardioId(id);
  if (cardio) {
    return {
      id,
      kind: 'cardio',
      title: CARDIO_TITLES[cardio.kind],
      rx: `${cardio.minutes} MIN`,
      why: CARDIO_WHY,
      tier: 'STRONG',
      stat: 'VIT',
      difficulty: cardio.kind === 'wr' || cardio.kind === 'z2' ? 2 : 3,
      minutes: cardio.minutes,
      cardioKind: cardio.kind,
      slot: cardio.slot,
    };
  }

  const str = /^str:([0-5])$/.exec(id);
  if (str) {
    const rx = STRENGTH_RX[Number(str[1])];
    return {
      id,
      kind: 'strength',
      title: 'STRENGTH — FULL BODY',
      rx: rx.desc,
      why: STRENGTH_WHY,
      tier: 'STRONG',
      stat: 'STR',
      difficulty: 2,
      minutes: rx.minutes,
    };
  }

  if (id === 'steps') {
    return {
      id,
      kind: 'steps',
      title: STEPS_RX.title,
      rx: STEPS_RX.rx,
      short: STEPS_RX.short,
      why: STEPS_RX.why,
      tier: STEPS_RX.tier,
      stat: 'VIT',
      difficulty: 1,
    };
  }

  if (id === 'rest') {
    return {
      id,
      kind: 'rest',
      title: REST_RX.title,
      rx: REST_RX.rx,
      short: REST_RX.short,
      why: REST_RX.why,
      tier: REST_RX.tier,
      stat: 'VIT',
      difficulty: 1,
    };
  }

  if (id === 'gate') {
    return { id, kind: 'gate', title: 'GATE TRIAL', rx: 'THE PHYSICAL TEST', stat: 'WIL', difficulty: 3 };
  }

  const personal = personalQuests.find((q) => q.id === id);
  if (personal) {
    return {
      id,
      kind: 'personal',
      title: personal.title,
      rx: personal.minimum,
      stat: personal.stat,
      difficulty: personal.difficulty,
    };
  }

  return null;
}
