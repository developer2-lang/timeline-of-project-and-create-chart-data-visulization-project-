import { useMemo, useState } from 'react';
import type { Holiday, ProjectTimeline } from '../types/timeline';
import { add, diff, fmt, fmtS, iso, monday, pd, today } from '../utils/dateUtils';
import { holidayMatch, offDay } from '../utils/workingDays';
import { schedule, span } from '../utils/timelineCalculations';

const DAY_W = 22;

interface GanttChartProps {
  project: ProjectTimeline;
  satRule: boolean;
  holidays: Holiday[];
}

interface RowDate {
  id: string;
  name: string;
  durationDays: number;
  start: string;
  end: string;
  dependencyType: string;
}

export function GanttChart({ project, satRule, holidays }: GanttChartProps) {
  const engine = useMemo(() => ({ satRule, holidays }), [satRule, holidays]);

  const S = useMemo(() => schedule(project, engine), [project, engine]);
  const schMap = useMemo(() => {
    const m: Record<string, { start: string; end: string }> = {};
    S.forEach((r) => (m[r.stageId] = r));
    return m;
  }, [S]);

  const rows = useMemo<RowDate[]>(() => {
    return project.stages
      .map((st) => {
        const r = schMap[st.id];
        return {
          id: st.id,
          name: st.name,
          durationDays: st.durationDays,
          start: st.startDate || (r ? r.start : ''),
          end: st.endDate || (r ? r.end : ''),
          dependencyType: st.dependencyType,
        };
      })
      .filter((d) => d.start && d.end);
  }, [project.stages, schMap]);

  const s = useMemo(() => {
    if (!rows.length) return span(project, engine);
    let first: Date | null = null;
    let last: Date | null = null;
    for (const d of rows) {
      const a = pd(d.start) as Date;
      const b = pd(d.end) as Date;
      if (!first || a < first) first = a;
      if (!last || b > last) last = b;
    }
    if (!first || !last) return span(project, engine);
    const w0 = monday(first);
    return {
      start: first,
      end: last,
      w0,
      weeks: Math.max(1, Math.ceil((diff(w0, last) + 1) / 7)),
    };
  }, [rows, project, engine]);

  const n = Math.max(s.weeks, 1);
  const total = n * 7 * DAY_W;
  const startDay = diff(s.w0, today());
  const dayPos = (dateStr: string) => diff(s.w0, pd(dateStr) as Date) * DAY_W;

  const weekRanges = useMemo(() => {
    return Array.from({ length: n }, (_, i) => {
      const m0 = add(s.w0, i * 7);
      const sun = add(m0, 6);
      let hol = '';
      for (let k = 0; k < 7; k++) {
        const h = holidayMatch(add(m0, k), holidays);
        if (h) {
          hol = h.holidayName.split('—')[0].trim();
          break;
        }
      }
      return { m0, sun, hol };
    });
  }, [s, n, holidays]);

  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  const rowsEl = rows.map((d) => {
    const x = dayPos(d.start);
    const barDays = Math.max(1, diff(pd(d.start) as Date, pd(d.end) as Date) + 1);
    const w = barDays * DAY_W;
    const showLabel = w >= 36;

    return (
      <div className="tl-row" key={d.id}>
        <div className="tl-lab">
          <div className="n">{d.name}</div>
          <div className="d">
            {fmtS(d.start)} → {fmtS(d.end)} · {d.durationDays}d
          </div>
        </div>
        <div className="tl-track" style={{ width: total, minWidth: total }}>
          <div className="tl-grid-bg">
            {Array.from({ length: n * 7 }, (_, di) => {
              const cellDate = add(s.w0, di);
              if (offDay(cellDate, satRule, holidays)) {
                return (
                  <div
                    key={di}
                    className="tl-nonwork-bg"
                    style={{ left: di * DAY_W, width: DAY_W }}
                  />
                );
              }
              return null;
            })}
          </div>
          {Array.from({ length: n }, (_, i) => (
            <div className="tl-cell" key={i} />
          ))}
          {startDay >= 0 && startDay <= n * 7 && (
            <div
              className="tl-today-line"
              style={{ left: startDay * DAY_W }}
            />
          )}
          <div
            className="tl-bar"
            style={{ left: x, width: w }}
            title={`${d.name}\n${fmt(d.start)} → ${fmt(d.end)}\n${d.durationDays} working days\nDependency: ${d.dependencyType === 'after' ? 'After the stages above it' : d.dependencyType === 'with' ? 'Alongside the stage above' : 'Overlapping the stage above'}`}
            onMouseEnter={() => setHoveredBar(d.id)}
            onMouseLeave={() => setHoveredBar(null)}
          >
            {showLabel && <span className="tl-bar-label">{d.durationDays}d</span>}
          </div>
          {hoveredBar === d.id && (
            <div
              className="tl-tooltip"
              style={{ left: Math.min(x + w / 2, total - 220), transform: 'translateX(-50%)' }}
            >
              <div className="tl-tooltip-title">{d.name}</div>
              <div className="tl-tooltip-row">
                <span>Start</span> {fmt(d.start)}
              </div>
              <div className="tl-tooltip-row">
                <span>End</span> {fmt(d.end)}
              </div>
              <div className="tl-tooltip-row">
                <span>Duration</span> {d.durationDays} working days
              </div>
              <div className="tl-tooltip-row">
                <span>Dependency</span>{' '}
                {d.dependencyType === 'after'
                  ? 'After the stages above it'
                  : d.dependencyType === 'with'
                    ? 'Alongside the stage above'
                    : 'Overlapping the stage above'}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  });

  return (
    <div className="tl-wrap">
      <div className="tl">
        <div className="tl-row tl-head">
          <div className="tl-lab">
            <span>Stage</span>
          </div>
          <div className="tl-track" style={{ width: total, minWidth: total }}>
            {weekRanges.map((wr, i) => (
              <div className="wk-head" key={i}>
                <div className="w">W{i + 1}</div>
                <div className="d">
                  {fmtS(iso(wr.m0))} – {fmtS(iso(wr.sun))}
                </div>
                {wr.hol ? (
                  <div className="h" title={wr.hol}>
                    {wr.hol}
                  </div>
                ) : (
                  <div className="h">&nbsp;</div>
                )}
              </div>
            ))}
          </div>
        </div>
        {rowsEl.length ? (
          rowsEl
        ) : (
          <div className="tl-row">
            <div style={{ padding: 32 }} className="muted">
              No stages added yet.
            </div>
          </div>
        )}
        <div className="tl-foot">
          Durations count working days only — Sundays, the 2nd and 4th Saturday, and
          public holidays are excluded.
        </div>
      </div>
    </div>
  );
}
