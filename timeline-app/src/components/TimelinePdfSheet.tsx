import { forwardRef, useMemo } from 'react';
import type { Holiday, ProjectTimeline, StudioSettings } from '../types/timeline';
import { add, diff, fmt, fmtS, iso, monday, pd } from '../utils/dateUtils';
import { holidayMatch, offDay } from '../utils/workingDays';
import { schedule, span, weekLabel } from '../utils/timelineCalculations';
import { STAGE_PALETTE } from './GanttChart';
import logoUrl from '../assets/iuova-logo.png';
import './TimelinePdfSheet.css';

const SHEET_W = 1040;
const LABEL_W = 230;
const PADDING_X = 32;
const CHART_SPACE = SHEET_W - PADDING_X - LABEL_W;
const WEEK_W_MIN = 22;
const WEEK_W_MAX = 104;

interface TimelinePdfSheetProps {
  project: ProjectTimeline;
  satRule: boolean;
  holidays: Holiday[];
  studio: StudioSettings;
}

export const TimelinePdfSheet = forwardRef<HTMLDivElement, TimelinePdfSheetProps>(
  function TimelinePdfSheet({ project, satRule, holidays, studio }, ref) {
    const engine = useMemo(() => ({ satRule, holidays }), [satRule, holidays]);

    const schMap = useMemo(() => {
      const m: Record<string, { start: string; end: string }> = {};
      schedule(project, engine).forEach((r) => (m[r.stageId] = r));
      return m;
    }, [project, engine]);

    const rows = useMemo(
      () =>
        project.stages
          .map((st, idx) => {
            const r = schMap[st.id];
            return {
              id: st.id,
              name: st.name,
              description: st.description,
              durationDays: st.durationDays,
              start: st.startDate || (r ? r.start : ''),
              end: st.endDate || (r ? r.end : ''),
              stageIndex: idx,
            };
          })
          .filter((d) => d.start && d.end),
      [project.stages, schMap]
    );

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
    const weekW = Math.max(WEEK_W_MIN, Math.min(WEEK_W_MAX, Math.floor(CHART_SPACE / n)));
    const dayW = weekW / 7;
    const totalW = n * weekW;
    const dayPos = (dateStr: string) => diff(s.w0, pd(dateStr) as Date) * dayW;

    const weekCells = useMemo(() => {
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

    const dayCells = useMemo(() => {
      return Array.from({ length: n * 7 }, (_, di) => {
        const cellDate = add(s.w0, di);
        const dow = cellDate.getDay();
        if (holidayMatch(cellDate, holidays)) return { kl: 'pdf-pch-holiday' };
        if (offDay(cellDate, satRule, holidays)) {
          return { kl: dow === 0 ? 'pdf-pch-sunday' : 'pdf-pch-sat' };
        }
        return null;
      });
    }, [s, n, satRule, holidays]);

    const barRows = rows.map((d) => {
      const x = dayPos(d.start);
      const barDays = Math.max(1, diff(pd(d.start) as Date, pd(d.end) as Date) + 1);
      const w = barDays * dayW;
      const showLabel = w >= 36;
      const palette = STAGE_PALETTE[d.stageIndex % STAGE_PALETTE.length];
      return (
        <div className="pdf-pch-row" key={d.id}>
          <div className="pdf-pch-lab">
            <div className="pdf-pn">{d.name}</div>
            <div className="pdf-pd">
              {fmtS(d.start)} → {fmtS(d.end)} · {d.durationDays}d
            </div>
          </div>
          <div className="pdf-pch-track" style={{ width: totalW, minWidth: totalW }}>
            <div className="pdf-pch-grid">
              {dayCells.map((c, di) =>
                c ? <div key={di} className={c.kl} style={{ left: di * dayW, width: dayW }} /> : null
              )}
              {Array.from({ length: n * 7 }, (_, di) => (
                <div key={`l${di}`} className="pdf-pch-line" style={{ left: di * dayW }} />
              ))}
            </div>
            <div
              className="pdf-pch-bar"
              style={{ left: x, width: Math.max(w, 4), background: palette.bar }}
            >
              {showLabel && d.durationDays}
            </div>
          </div>
        </div>
      );
    });

    const tableRows = project.stages.map((st) => {
      const r = schMap[st.id];
      if (!r) return null;
      return (
        <tr key={st.id}>
          <td className="pdf-pt-n">
            <strong>{st.name}</strong>
            {st.description ? <span className="pdf-sd">{st.description}</span> : null}
          </td>
          <td>{weekLabel(project, engine, r)}</td>
          <td>{fmt(r.start)}</td>
          <td>{fmt(r.end)}</td>
          <td>{st.durationDays} working days</td>
        </tr>
      );
    });

    const calendarNote = `Working calendar: Sundays${
      satRule ? ', the 2nd and 4th Saturday of each month,' : ''
    } and declared public holidays are non-working and already excluded from every duration. Dates assume feedback and approvals reach us within the agreed review windows.`;
    const issued = project.createdAt ? fmt(project.createdAt.slice(0, 10)) : fmt(iso(new Date()));

    return (
      <div ref={ref} className="pdf-sheet">
        <div className="pdf-ph">
          <div className="pdf-pw" role="img" aria-label="IUOVA Design Company">
            <img src={logoUrl} alt="IUOVA Design Company" />
          </div>
          <div className="pdf-pt">
            <h2>{project.projectName || 'Untitled project'}</h2>
            <div className="pdf-m">Project timeline · {project.version}</div>
          </div>
        </div>

        <div className="pdf-pm">
          <div className="pdf-pm-item">
            <span>Client</span>
            <b>{project.clientName || '—'}</b>
          </div>
          <div className="pdf-pm-item">
            <span>Project code</span>
            <b>{project.projectCode || '—'}</b>
          </div>
          <div className="pdf-pm-item">
            <span>Prepared by</span>
            <b>{project.preparedBy || '—'}</b>
          </div>
          <div className="pdf-pm-item">
            <span>Starts</span>
            <b>{fmt(iso(s.start))}</b>
          </div>
          <div className="pdf-pm-item">
            <span>Completes</span>
            <b>{fmt(iso(s.end))}</b>
          </div>
          <div className="pdf-pm-item">
            <span>Duration</span>
            <b>{s.weeks} weeks</b>
          </div>
        </div>

        <div className="pdf-pch-wrap">
          <div className="pdf-pch-head pdf-pch-row">
            <div className="pdf-pch-lab pdf-pch-head-lab">
              <span>Stage</span>
            </div>
            <div className="pdf-pch-track pdf-pch-head-track" style={{ width: totalW, minWidth: totalW }}>
              <div className="pdf-pch-week-row">
                {weekCells.map((wr, i) => (
                  <div className="pdf-pch-wk" key={i} style={{ width: weekW, minWidth: weekW }}>
                    <div className="pdf-w">W{i + 1}</div>
                    <div className="pdf-d">
                      {fmtS(iso(wr.m0))} – {fmtS(iso(wr.sun))}
                    </div>
                    {wr.hol ? <div className="pdf-h" title={wr.hol}>{wr.hol}</div> : <div className="pdf-h">&nbsp;</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {barRows.length ? (
            barRows
          ) : (
            <div className="pdf-pch-row">
              <div className="pdf-pch-lab">
                <div className="pdf-pn muted">No stages added yet.</div>
              </div>
              <div className="pdf-pch-track" style={{ width: totalW, minWidth: totalW }} />
            </div>
          )}
        </div>

        <table className="pdf-pt-b">
          <thead>
            <tr>
              <th style={{ width: '38%' }}>Stage</th>
              <th style={{ width: '13%' }}>Weeks</th>
              <th style={{ width: '15%' }}>Starts</th>
              <th style={{ width: '16%' }}>Completes</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>{tableRows}</tbody>
        </table>

        <div className="pdf-pf">
          <div>{calendarNote}</div>
          <div className="pdf-pf-right">
            {studio.line1}
            <br />
            {studio.line2}
            <br />
            {project.version} · {issued}
          </div>
        </div>
      </div>
    );
  }
);