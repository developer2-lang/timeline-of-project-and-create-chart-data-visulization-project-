import { useMemo } from 'react';
import type { Holiday, ProjectTimeline } from '../types/timeline';
import { add, diff, fmt, fmtS, iso, pd } from '../utils/dateUtils';
import { holidayMatch } from '../utils/workingDays';
import { schedule, span, weekLabel } from '../utils/timelineCalculations';

const W = 66;

interface GanttChartProps {
  project: ProjectTimeline;
  satRule: boolean;
  holidays: Holiday[];
}

export function GanttChart({ project, satRule, holidays }: GanttChartProps) {
  const engine = useMemo(() => ({ satRule, holidays }), [satRule, holidays]);
  const S = useMemo(() => schedule(project, engine), [project, engine]);
  const s = useMemo(() => span(project, engine), [project, engine]);

  const map = useMemo(() => {
    const m: Record<string, { start: string; end: string }> = {};
    S.forEach((r) => (m[r.stageId] = r));
    return m;
  }, [S]);

  const n = Math.max(s.weeks, 1);
  const total = n * W;
  const pos = (d: string) => (diff(s.w0, pd(d) as Date) / 7) * W;

  const head = Array.from({ length: n }, (_, i) => {
    const m0 = add(s.w0, i * 7);
    let hol = '';
    for (let k = 0; k < 7; k++) {
      const h = holidayMatch(add(m0, k), holidays);
      if (h) {
        hol = h.holidayName.split('—')[0].trim();
        break;
      }
    }
    return (
      <div className="wk-head" key={i}>
        <div className="w">W{i + 1}</div>
        <div className="d">{fmtS(iso(m0))}</div>
        {hol ? (
          <div className="h" title={hol}>
            {hol}
          </div>
        ) : (
          <div className="h">&nbsp;</div>
        )}
      </div>
    );
  });

  const cells = Array.from({ length: n }, (_, i) => <div className="tl-cell" key={i} />);

  const rows = project.stages.map((st) => {
    const r = map[st.id];
    if (!r) return null;
    const x = pos(r.start);
    const w = Math.max(pos(r.end) + W / 7 - x, 26);
    const label = weekLabel(project, engine, r);
    return (
      <div className="tl-row" key={st.id}>
        <div className="tl-lab">
          <div className="n">{st.name}</div>
          <div className="d">
            {fmtS(r.start)} → {fmtS(r.end)} · {st.durationDays} wd
          </div>
        </div>
        <div className="tl-track" style={{ width: total, minWidth: total, height: 44 }}>
          {cells}
          <div
            className="tl-bar"
            style={{ left: x, width: w }}
            title={`${fmt(r.start)} → ${fmt(r.end)}`}
          >
            {w > 92 ? label : ''}
          </div>
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
            {head}
          </div>
        </div>
        {rows.length ? (
          rows
        ) : (
          <div className="tl-row">
            <div style={{ padding: 26 }} className="muted">
              Add a stage to draw the timeline.
            </div>
          </div>
        )}
        <div className="tl-foot">
          Each column is one week, dated from its Monday. Durations count working days only —
          Sundays, the 2nd and 4th Saturday, and public holidays are already excluded.
        </div>
      </div>
    </div>
  );
}
