import { add, diff, fmt, iso, monday, pd, today } from './dateUtils';
import { nextWork, plusWork } from './workingDays';
import type {
  Holiday,
  Notice,
  ProjectTimeline,
  ScheduleResult,
  SpanResult,
  Stage,
  StageInput,
} from '../types/timeline';

export interface Engine {
  satRule: boolean;
  holidays: Holiday[];
}

/**
 * Calculate the end date for a stage that starts on `startDate` and lasts
 * `durationDays` working days. Working days exclude Sundays, Saturdays that
 * fall on the 2nd/4th of a month (when satRule is on) and public holidays.
 *
 * This is the single, centralized place stages turn a start date + working
 * duration into an end date. It reuses the same working-day engine that the
 * interactive schedule uses, so the form preview and the Gantt chart can never
 * disagree.
 */
export function calculateStageEndDate(
  startDate: string | null | undefined,
  durationDays: number,
  engine: Engine
): string {
  const start = nextWork(pd(startDate), engine.satRule, engine.holidays);
  const end = plusWork(
    start,
    Math.max(1, Number(durationDays) || 1) - 1,
    engine.satRule,
    engine.holidays
  );
  return iso(end);
}

/**
 * Compute the resolved start and end dates for a brand-new stage appended to
 * `project`, using exactly the same scheduling rules as the interactive
 * schedule and the Gantt chart. This is the single place Add Stage (both the
 * live form preview and the actual save) derives dates, so they can never
 * drift apart.
 *
 *   fixed => the stage starts on the chosen working day (fixedStart)
 *   with  => starts on the same day as the stage above it
 *   after => starts the next working day after the latest of the stages above
 */
export function scheduleAppendedStage(
  project: ProjectTimeline,
  input: StageInput,
  engine: Engine
): { start: string; end: string } {
  const order = project.stages.length;
  const tempId = `__new__${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const temp: Stage = {
    id: tempId,
    projectId: project.id,
    name: input.name,
    description: input.description,
    durationDays: input.durationDays,
    dependencyType: input.scheduleMode === 'with' ? 'with' : 'after',
    offsetDays: 2,
    fixedStart: input.scheduleMode === 'fixed' ? input.fixedStart : null,
    fixedRef: null,
    startDate: null,
    endDate: null,
    stageOrder: order,
  };
  const S = schedule({ ...project, stages: [...project.stages, temp] }, engine);
  const fallbackStart = nextWork(pd(project.startDate), engine.satRule, engine.holidays);
  const r = S.find((x) => x.stageId === tempId) as ScheduleResult | undefined;
  const start = r ? r.start : iso(fallbackStart);
  const end = r ? r.end : calculateStageEndDate(start, input.durationDays, engine);
  return { start, end };
}

/**
 * The schedule engine from timeline.html.
 * Each stage says when it begins relative to the one before it:
 *   after — the next working day after the previous stage ends
 *   with  — the same day the previous stage begins
 *   into  — N working days after the previous stage begins
 * The first stage always begins on the project start date.
 */
export function schedule(p: ProjectTimeline, engine: Engine): ScheduleResult[] {
  const out: ScheduleResult[] = [];
  let prev: { start: string; end: string } | null = null;
  let latest: Date | null = null;

  p.stages.forEach((s, i) => {
    let start: Date;
    if (s.fixedStart) {
      start = nextWork(pd(s.fixedStart), engine.satRule, engine.holidays);
    } else if (i === 0 || !prev) {
      start = nextWork(pd(p.startDate), engine.satRule, engine.holidays);
    } else if (s.dependencyType === 'with') {
      start = pd(prev.start) as Date;
    } else if (s.dependencyType === 'into') {
      start = plusWork(
        pd(prev.start) as Date,
        Math.max(0, Number(s.offsetDays) || 0),
        engine.satRule,
        engine.holidays
      );
    } else {
      // 'after' — waits for every stage above it, not just the one directly above.
      start = nextWork(add(latest as Date, 1), engine.satRule, engine.holidays);
    }
    const end = plusWork(
      start,
      Math.max(1, Number(s.durationDays) || 1) - 1,
      engine.satRule,
      engine.holidays
    );
    out.push({ stageId: s.id, start: iso(start), end: iso(end) });
    prev = { start: iso(start), end: iso(end) };
    latest = !latest || end > latest ? end : latest;
  });
  return out;
}

export function span(p: ProjectTimeline, engine: Engine): SpanResult {
  const S = schedule(p, engine);
  if (!S.length) {
    const t = pd(p.startDate) || today();
    return { start: t, end: add(t, 27), w0: monday(t), weeks: 4 };
  }
  const first = S.reduce<Date>(
    (m, r) => (pd(r.start) as Date) < m ? (pd(r.start) as Date) : m,
    pd(S[0].start) as Date
  );
  const last = S.reduce<Date>(
    (m, r) => (pd(r.end) as Date) > m ? (pd(r.end) as Date) : m,
    pd(S[0].end) as Date
  );
  const w0 = monday(first);
  return {
    start: first,
    end: last,
    w0,
    weeks: Math.ceil((diff(w0, last) + 1) / 7),
  };
}

/** The latest end among stages above index i. */
function latestAbove(S: ScheduleResult[], i: number): Date | null {
  let e: Date | null = null;
  for (let j = 0; j < i; j++) {
    const x = pd(S[j].end) as Date;
    if (!e || x > e) e = x;
  }
  return e;
}

/** Overlap / drift notices for hand-dated stages. */
export function notices(p: ProjectTimeline, engine: Engine): Record<string, Notice[]> {
  const S = schedule(p, engine);
  const out: Record<string, Notice[]> = {};
  p.stages.forEach((st, i) => {
    if (!st.fixedStart) return;
    const msgs: Notice[] = [];
    if (iso(nextWork(pd(st.fixedStart), engine.satRule, engine.holidays)) !== st.fixedStart) {
      msgs.push({
        type: 'warn',
        message: `${fmt(st.fixedStart)} is not a working day — this stage begins ${fmt(S[i].start)}.`,
      });
    }
    const now = latestAbove(S, i);
    if (now && (pd(S[i].start) as Date) <= now) {
      let block: number | null = null;
      for (let j = 0; j < i; j++) {
        if ((pd(S[j].end) as Date) >= (pd(S[i].start) as Date)) {
          if (block === null || (pd(S[j].end) as Date) > (pd(S[block].end) as Date)) block = j;
        }
      }
      const drifted = !!st.fixedRef && (pd(st.fixedRef) as Date) < now;
      if (block !== null) {
        if ((pd(S[i].start) as Date) < (pd(S[block].start) as Date)) {
          msgs.push({
            type: 'warn',
            message: `This now runs before ${p.stages[block].name} even begins on ${fmt(S[block].start)}.`,
          });
        } else if (drifted) {
          msgs.push({
            type: 'warn',
            message: `${p.stages[block].name} has grown since this date was set — it now finishes ${fmt(S[block].end)}.`,
          });
        } else {
          msgs.push({
            type: 'info',
            message: `Runs alongside ${p.stages[block].name}, which finishes ${fmt(S[block].end)}.`,
          });
        }
      }
    }
    if (msgs.length) out[st.id] = msgs;
  });
  return out;
}

export function weekOf(p: ProjectTimeline, engine: Engine, dateStr: string): number {
  const s = span(p, engine);
  return Math.floor(diff(s.w0, pd(dateStr) as Date) / 7) + 1;
}

export function weekLabel(
  p: ProjectTimeline,
  engine: Engine,
  r: { start: string; end: string }
): string {
  const a = weekOf(p, engine, r.start);
  const b = weekOf(p, engine, r.end);
  return a === b ? 'Week ' + a : 'Week ' + a + ' – ' + b;
}

/**
 * Return a copy of `p` where every stage has its resolved `startDate` and
 * `endDate` filled from the schedule engine. The stages are the single source
 * of truth for the timeline, and their `startDate`/`endDate` are the actual
 * dates the Gantt chart renders. Keeping them in sync here means the chart
 * always reflects the current stage list (add / delete / edit / reorder)
 * without ever inventing its own rows.
 */
export function syncScheduleDates(p: ProjectTimeline, engine: Engine): ProjectTimeline {
  const S = schedule(p, engine);
  const map: Record<string, { start: string; end: string }> = {};
  S.forEach((r) => (map[r.stageId] = r));
  return {
    ...p,
    stages: p.stages.map((st) => {
      const r = map[st.id];
      return r ? { ...st, startDate: r.start, endDate: r.end } : st;
    }),
  };
}

export function newStageData(projectId: string, order: number, partial?: Partial<Stage>): Stage {
  return {
    id: partial?.id || `${projectId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    projectId,
    name: partial?.name || 'New stage',
    description: partial?.description || '',
    durationDays: Math.max(1, Number(partial?.durationDays) || 1),
    dependencyType: partial?.dependencyType || 'after',
    offsetDays: partial?.offsetDays ?? 2,
    fixedStart: partial?.fixedStart ?? null,
    fixedRef: partial?.fixedRef ?? null,
    startDate: partial?.startDate ?? null,
    endDate: partial?.endDate ?? null,
    stageOrder: order,
  };
}
