import { useMemo, useState } from 'react';
import { Info, Mail, Eye, UserCheck, FileText, GitBranch, Circle } from 'lucide-react';
import type { Holiday, ProjectTimeline } from '../types/timeline';
import { add, diff, fmtS, iso, monday, pd, today, MON } from '../utils/dateUtils';
import { holidayMatch, offDay } from '../utils/workingDays';
import { schedule, span } from '../utils/timelineCalculations';

const DAY_W = 22;
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const STAGE_PALETTE = [
  { bg: '#f1e8ff', icon: '#7c3aed', bar: 'linear-gradient(135deg, #7c3aed, #6d28d9)' },
  { bg: '#e7f8ec', icon: '#16a34a', bar: 'linear-gradient(135deg, #22c55e, #16a34a)' },
  { bg: '#fff0dc', icon: '#f97316', bar: 'linear-gradient(135deg, #f59e0b, #f97316)' },
  { bg: '#e5f1ff', icon: '#1683e8', bar: 'linear-gradient(135deg, #2494ed, #147bd1)' },
  { bg: '#ffe7ef', icon: '#e91e63', bar: 'linear-gradient(135deg, #ec407a, #db2777)' },
  { bg: '#e8f5e9', icon: '#2e7d32', bar: 'linear-gradient(135deg, #43a047, #2e7d32)' },
  { bg: '#fce4ec', icon: '#c62828', bar: 'linear-gradient(135deg, #ef5350, #c62828)' },
  { bg: '#e3f2fd', icon: '#1565c0', bar: 'linear-gradient(135deg, #42a5f5, #1565c0)' },
];

const STAGE_ICONS = [Mail, Eye, UserCheck, FileText, GitBranch, Circle, Mail, Eye];

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
  stageIndex: number;
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
      .map((st, idx) => {
        const r = schMap[st.id];
        return {
          id: st.id,
          name: st.name,
          durationDays: st.durationDays,
          start: st.startDate || (r ? r.start : ''),
          end: st.endDate || (r ? r.end : ''),
          dependencyType: st.dependencyType,
          stageIndex: idx,
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

  const fmtFull = (dateStr: string) => {
    const d = pd(dateStr);
    return d
      ? `${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]} ${d.getFullYear()}`
      : '—';
  };

  const depLabel = (type: string) =>
    type === 'after'
      ? 'After the stages above it'
      : type === 'with'
        ? 'Alongside the stage above'
        : 'Overlapping the stage above';

  const rowsEl = rows.map((d) => {
    const x = dayPos(d.start);
    const barDays = Math.max(1, diff(pd(d.start) as Date, pd(d.end) as Date) + 1);
    const w = barDays * DAY_W;
    const showLabel = w >= 36;
    const palette = STAGE_PALETTE[d.stageIndex % STAGE_PALETTE.length];
    const StageIcon = STAGE_ICONS[d.stageIndex % STAGE_ICONS.length];

    return (
      <div className="tl-row" key={d.id}>
        <div className="tl-lab">
          <div className="tl-lab-inner">
            <div className="tl-icon-wrap" style={{ background: palette.bg }}>
              <StageIcon size={16} color={palette.icon} strokeWidth={2.2} />
            </div>
            <div className="tl-lab-text">
              <div className="n">{d.name}</div>
              <div className="d">
                {fmtS(d.start)} → {fmtS(d.end)} · {d.durationDays}d
              </div>
            </div>
          </div>
        </div>
        <div className="tl-track" style={{ width: total, minWidth: total }}>
          <div className="tl-grid-bg">
            {Array.from({ length: n * 7 }, (_, di) => {
              const cellDate = add(s.w0, di);
              if (holidayMatch(cellDate, holidays)) {
                return (
                  <div
                    key={di}
                    className="tl-holiday-bg"
                    style={{ left: di * DAY_W, width: DAY_W }}
                  />
                );
              }
              if (offDay(cellDate, satRule, holidays)) {
                const dow = cellDate.getDay();
                return (
                  <div
                    key={di}
                    className={dow === 0 ? 'tl-sunday-bg' : 'tl-nonwork-bg'}
                    style={{ left: di * DAY_W, width: DAY_W }}
                  />
                );
              }
              return null;
            })}
          </div>
          {Array.from({ length: n * 7 }, (_, di) => (
            <div
              className="tl-day-col-border"
              key={di}
              style={{ left: di * DAY_W, width: DAY_W }}
            />
          ))}
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
            style={{ left: x, width: w, background: palette.bar }}
            onMouseEnter={() => setHoveredBar(d.id)}
            onMouseLeave={() => setHoveredBar(null)}
          >
            {showLabel && <span className="tl-bar-label">{d.durationDays}d</span>}
          </div>
          {hoveredBar === d.id && (
            <div
              className="tl-tooltip"
              style={{ left: Math.min(x + w / 2, total - 240), transform: 'translateX(-50%)' }}
            >
              <div className="tl-tooltip-title">{d.name}</div>
              <div className="tl-tooltip-grid">
                <div className="tl-tooltip-label">Start</div>
                <div className="tl-tooltip-value">{fmtFull(d.start)}</div>
                <div className="tl-tooltip-label">End</div>
                <div className="tl-tooltip-value">{fmtFull(d.end)}</div>
                <div className="tl-tooltip-label">Duration</div>
                <div className="tl-tooltip-value">{d.durationDays} working days</div>
                <div className="tl-tooltip-label">Dependency</div>
                <div className="tl-tooltip-value">{depLabel(d.dependencyType)}</div>
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
          <div className="tl-lab tl-head-lab">
            <span>Stage</span>
          </div>
          <div className="tl-track" style={{ width: total, minWidth: total }}>
            <div className="tl-week-row">
              {weekRanges.map((wr, i) => (
                <div className="wk-head" key={i}>
                  <div className="w">W{i + 1}</div>
                  <div className="d">
                    {fmtS(iso(wr.m0))} – {fmtS(iso(wr.sun))}
                  </div>
                  {wr.hol ? (
                    <div className="h" title={wr.hol}>{wr.hol}</div>
                  ) : (
                    <div className="h">&nbsp;</div>
                  )}
                </div>
              ))}
            </div>
            <div className="tl-day-row">
              {Array.from({ length: n * 7 }, (_, di) => {
                const cellDate = add(s.w0, di);
                const dow = cellDate.getDay();
                const dayNum = cellDate.getDate();
                const isSun = dow === 0;
                const isSatOff = dow === 6 && offDay(cellDate, satRule, holidays) && !holidayMatch(cellDate, holidays);
                return (
                  <div
                    className={`tl-day-cell${isSun ? ' sunday' : ''}${isSatOff ? ' sat-off' : ''}`}
                    key={di}
                  >
                    <div className="tl-day-letter">{DOW[di % 7]}</div>
                    <div className="tl-day-num">{String(dayNum).padStart(2, '0')}</div>
                  </div>
                );
              })}
            </div>
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
          <div className="tl-legend">
            <div className="tl-legend-item">
              <span className="tl-legend-dot" style={{ background: '#fff3f4', border: '1.5px solid #fca5a5' }} />
              <span>Sundays</span>
            </div>
            <div className="tl-legend-item">
              <span className="tl-legend-dot" style={{ background: '#f3f6fa', border: '1.5px solid #b0bec5' }} />
              <span>2nd &amp; 4th Saturdays</span>
            </div>
            <div className="tl-legend-item">
              <span className="tl-legend-dot" style={{ background: '#fff9e6', border: '1.5px solid #fbbf24' }} />
              <span>Public Holidays</span>
            </div>
          </div>
          <div className="tl-info-box">
            <Info size={14} />
            <span>
              Durations count working days only — Sundays, the 2nd and 4th Saturday,
              and public holidays are excluded.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
