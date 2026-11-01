import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Compass,
} from 'lucide-react';
import type { Holiday, ProjectTimeline } from '../types/timeline';
import { add, diff, fmt, fmtS, iso, monday, pd, today } from '../utils/dateUtils';
import { schedule, weekLabel, type Engine } from '../utils/timelineCalculations';
import { getStageColor, getProjectTheme, type StageColorScheme } from '../utils/stageColors';

const DAY_W = 28;
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface ProcessedStage {
  id: string;
  name: string;
  description: string;
  durationDays: number;
  start: string;
  end: string;
  weekLabel: string;
  dependencyType: string;
  stageIndex: number;
  colorScheme: StageColorScheme;
}

interface ProcessedProject {
  project: ProjectTimeline;
  stages: ProcessedStage[];
  startDate: string;
  endDate: string;
  weeks: number;
}

interface LaneStage {
  stage: ProcessedStage;
  lane: number;
}

/**
 * Assigns stages to horizontal lanes to guarantee parallel workstreams
 * (e.g. CAD Jar running alongside CAD Base) never collide.
 */
function assignLanes(stages: ProcessedStage[]): { laneStages: LaneStage[]; totalLanes: number } {
  if (!stages.length) return { laneStages: [], totalLanes: 1 };

  const sorted = [...stages].sort((a, b) => {
    const da = pd(a.start)?.getTime() || 0;
    const db = pd(b.start)?.getTime() || 0;
    if (da !== db) return da - db;
    const ea = pd(a.end)?.getTime() || 0;
    const eb = pd(b.end)?.getTime() || 0;
    return ea - eb;
  });

  const laneEndDates: number[] = [];
  const laneStages: LaneStage[] = [];

  for (const st of sorted) {
    const startTs = pd(st.start)?.getTime() || 0;
    const endTs = pd(st.end)?.getTime() || 0;

    let placedLane = -1;
    for (let i = 0; i < laneEndDates.length; i++) {
      if (startTs > laneEndDates[i]) {
        placedLane = i;
        laneEndDates[i] = endTs;
        break;
      }
    }

    if (placedLane === -1) {
      placedLane = laneEndDates.length;
      laneEndDates.push(endTs);
    }

    laneStages.push({ stage: st, lane: placedLane });
  }

  return { laneStages, totalLanes: Math.max(1, laneEndDates.length) };
}

interface DashboardGanttProps {
  projects: ProjectTimeline[];
  holidays: Holiday[];
  satRule: boolean;
}

export function DashboardGantt({ projects, holidays, satRule }: DashboardGanttProps) {
  const navigate = useNavigate();
  const engine = useMemo<Engine>(() => ({ satRule, holidays }), [satRule, holidays]);

  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredStage, setHoveredStage] = useState<{
    stage: ProcessedStage;
    projectName: string;
    clientX: number;
    clientY: number;
  } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef<'top' | 'wrap' | null>(null);

  // Process all real projects and their scheduled stages
  const processedProjects = useMemo<ProcessedProject[]>(() => {
    return projects.map((p) => {
      const S = schedule(p, engine);
      const schMap: Record<string, { start: string; end: string }> = {};
      S.forEach((r) => (schMap[r.stageId] = r));

      const sortedStages = [...(p.stages || [])].sort(
        (a, b) => (a.stageOrder ?? 0) - (b.stageOrder ?? 0)
      );

      const stages: ProcessedStage[] = sortedStages
        .map((st, idx) => {
          const r = schMap[st.id];
          const start = st.startDate || r?.start || p.startDate || iso(today());
          const end = st.endDate || r?.end || start;
          const wLabel = r
            ? weekLabel(p, engine, r)
            : st.stageOrder !== undefined
            ? `Week ${st.stageOrder + 1}`
            : '—';
          const colorScheme = getStageColor(st.name, idx);

          return {
            id: st.id,
            name: st.name || 'Untitled Stage',
            description: st.description || '',
            durationDays: Math.max(1, Number(st.durationDays) || 1),
            start,
            end,
            weekLabel: wLabel,
            dependencyType: st.dependencyType || 'after',
            stageIndex: idx,
            colorScheme,
          };
        })
        .filter((st) => st.start && st.end);

      let pStart = p.startDate;
      let pEnd = p.startDate;
      if (stages.length > 0) {
        let firstD = pd(stages[0].start) as Date;
        let lastD = pd(stages[0].end) as Date;
        for (const st of stages) {
          const a = pd(st.start);
          const b = pd(st.end);
          if (a && (!firstD || a < firstD)) firstD = a;
          if (b && (!lastD || b > lastD)) lastD = b;
        }
        if (firstD) pStart = iso(firstD);
        if (lastD) pEnd = iso(lastD);
      }

      const pWeeks =
        pStart && pEnd
          ? Math.max(1, Math.ceil((diff(pd(pStart) as Date, pd(pEnd) as Date) + 1) / 7))
          : 4;

      return {
        project: p,
        stages,
        startDate: pStart,
        endDate: pEnd,
        weeks: pWeeks,
      };
    });
  }, [projects, engine]);

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return processedProjects;
    const q = searchQuery.toLowerCase();
    return processedProjects.filter(
      (pp) =>
        pp.project.projectName.toLowerCase().includes(q) ||
        pp.project.clientName.toLowerCase().includes(q) ||
        pp.project.projectCode.toLowerCase().includes(q) ||
        pp.stages.some((st) => st.name.toLowerCase().includes(q))
    );
  }, [processedProjects, searchQuery]);

  // Global timeline date bounds across all projects
  const globalSpan = useMemo(() => {
    const t = today();
    let minD: Date | null = null;
    let maxD: Date | null = null;

    processedProjects.forEach((pp) => {
      if (pp.startDate) {
        const d = pd(pp.startDate);
        if (d && (!minD || d < minD)) minD = d;
      }
      if (pp.endDate) {
        const d = pd(pp.endDate);
        if (d && (!maxD || d > maxD)) maxD = d;
      }
      pp.stages.forEach((st) => {
        const sD = pd(st.start);
        const eD = pd(st.end);
        if (sD && (!minD || sD < minD)) minD = sD;
        if (eD && (!maxD || eD > maxD)) maxD = eD;
      });
    });

    if (!minD || !maxD) {
      minD = t;
      maxD = add(t, 28);
    }

    // Always include today's date in range so the Today indicator is visible
    let earliest = minD;
    let latest = maxD;
    if (t < earliest) earliest = t;
    if (t > latest) latest = t;

    const w0 = monday(earliest);
    const weeksCount = Math.max(12, Math.ceil((diff(w0, latest) + 1) / 7) + 1);

    return {
      w0,
      weeksCount,
      totalDays: weeksCount * 7,
    };
  }, [processedProjects]);

  const { w0, weeksCount, totalDays } = globalSpan;
  const weekWidth = DAY_W * 7;
  const totalTrackWidth = totalDays * DAY_W;
  const labelColWidth = 290;

  // Today indicator position calculation
  const todayDate = today();
  const todayOffset = diff(w0, todayDate);
  const isTodayInRange = todayOffset >= 0 && todayOffset <= totalDays;
  const todayPos = todayOffset * DAY_W;

  // Week header models
  const weekHeaders = useMemo(() => {
    return Array.from({ length: weeksCount }, (_, i) => {
      const m0 = add(w0, i * 7);
      const sun = add(m0, 6);
      return {
        index: i + 1,
        m0,
        sun,
        rangeStr: `${fmtS(iso(m0))} – ${fmtS(iso(sun))}`,
      };
    });
  }, [w0, weeksCount]);

  // Day position calculations
  const getDayPos = useCallback(
    (dateStr: string) => {
      const d = pd(dateStr);
      if (!d) return 0;
      return diff(w0, d) * DAY_W;
    },
    [w0]
  );

  const getBarWidth = useCallback(
    (startStr: string, endStr: string) => {
      const a = pd(startStr);
      const b = pd(endStr);
      if (!a || !b) return DAY_W;
      const days = Math.max(1, diff(a, b) + 1);
      return days * DAY_W;
    },
    []
  );

  // Synchronized horizontal scroll
  const handleTopScroll = () => {
    if (isSyncingRef.current === 'wrap') return;
    if (!topScrollRef.current || !wrapRef.current) return;
    isSyncingRef.current = 'top';
    wrapRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    requestAnimationFrame(() => {
      isSyncingRef.current = null;
    });
  };

  const handleWrapScroll = () => {
    if (isSyncingRef.current === 'top') return;
    if (!topScrollRef.current || !wrapRef.current) return;
    isSyncingRef.current = 'wrap';
    topScrollRef.current.scrollLeft = wrapRef.current.scrollLeft;
    requestAnimationFrame(() => {
      isSyncingRef.current = null;
    });
  };

  const scrollByAmount = (amount: number) => {
    if (!wrapRef.current) return;
    wrapRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const jumpToToday = () => {
    if (!wrapRef.current || !isTodayInRange) return;
    const targetScroll = Math.max(
      0,
      todayPos - (wrapRef.current.clientWidth - labelColWidth) / 2
    );
    wrapRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!wrapRef.current) return;
    wrapRef.current.scrollLeft = 0;
    if (topScrollRef.current) topScrollRef.current.scrollLeft = 0;
  }, []);

  // Normal mouse wheel over canvas automatically scrolls horizontally
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && e.deltaX === 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Standard legend items matching Reference Image 2
  const legendItems = [
    { label: 'Research', color: '#7cb9f8' },
    { label: 'Ideation', color: '#b58bf8' },
    { label: 'Design Development', color: '#65db95' },
    { label: 'Prototyping', color: '#fcae60' },
    { label: 'Validation', color: '#f578b8' },
    { label: 'Final Design', color: '#fee152' },
    { label: 'Presentation', color: '#6ae3f8' },
  ];

  return (
    <div className="ref-dashboard-container">
      {/* Top Controls Bar */}
      <div className="ref-top-controls">
        <div className="ref-controls-left">
          <div className="ref-search-wrap">
            <Search size={14} className="ref-search-icon" />
            <input
              type="text"
              placeholder="Search projects or stages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ref-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="ref-search-clear"
                onClick={() => setSearchQuery('')}
              >
                &times;
              </button>
            )}
          </div>
          <span className="ref-count-tag">
            {filteredProjects.length} Projects Active
          </span>
        </div>

        <div className="ref-controls-right">
          {isTodayInRange && (
            <button
              type="button"
              className="ref-today-btn"
              onClick={jumpToToday}
              title="Jump to Today's date"
            >
              <Compass size={13} /> Today
            </button>
          )}

          <div className="ref-scroll-btns">
            <button
              type="button"
              className="ref-arrow-btn"
              onClick={() => scrollByAmount(-280)}
              title="Scroll left"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="ref-arrow-btn"
              onClick={() => scrollByAmount(280)}
              title="Scroll right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Full-Page Gantt Chart Wrapper */}
      <div className="ref-chart-card">
        {/* Top Synchronized Scrollbar (Primary Scrollbar) */}
        <div
          className="ref-top-scrollbar"
          ref={topScrollRef}
          onScroll={handleTopScroll}
        >
          <div
            style={{
              width: totalTrackWidth + labelColWidth,
              minWidth: totalTrackWidth + labelColWidth,
              height: 1,
            }}
          />
        </div>

        {/* Scrollable Grid Canvas (Bottom Scrollbar Hidden) */}
        <div
          className="ref-chart-scroll-canvas"
          ref={wrapRef}
          onScroll={handleWrapScroll}
        >
          <div
            className="ref-grid-table"
            style={{ width: totalTrackWidth + labelColWidth }}
          >
            {/* Header: Project Label & Calendar Weeks/Days with Dates */}
            <div className="ref-table-row ref-header-row">
              {/* Sticky Left Header Block */}
              <div
                className="ref-col-lab ref-head-lab-block"
                style={{ width: labelColWidth, minWidth: labelColWidth }}
              >
                <div className="ref-head-top">
                  <div className="ref-head-title">Project</div>
                  <div className="ref-head-subtitle">Client / Product</div>
                </div>
                <div className="ref-head-bottom">
                  <span className="ref-head-week-text">WEEK</span>
                </div>
              </div>

              {/* Timeline Header Track */}
              <div
                className="ref-track-block"
                style={{ width: totalTrackWidth, minWidth: totalTrackWidth }}
              >
                {/* Week Row */}
                <div className="ref-week-row">
                  {weekHeaders.map((wh) => (
                    <div
                      key={wh.index}
                      className="ref-week-cell"
                      style={{ width: weekWidth, minWidth: weekWidth }}
                    >
                      <div className="ref-week-num">W{wh.index}</div>
                      <div className="ref-week-range">{wh.rangeStr}</div>
                    </div>
                  ))}
                </div>

                {/* Day Letters & Dates Row (M 17, T 18, etc.) */}
                <div className="ref-day-row">
                  {Array.from({ length: totalDays }, (_, di) => {
                    const cellDate = add(w0, di);
                    const isSun = cellDate.getDay() === 0;

                    return (
                      <div
                        key={di}
                        className={`ref-day-cell ${isSun ? 'sunday' : ''}`}
                        style={{ width: DAY_W, minWidth: DAY_W }}
                      >
                        <span className={`ref-day-dow ${isSun ? 'sun-red' : ''}`}>
                          {DOW[di % 7]}
                        </span>
                        <span className={`ref-day-num ${isSun ? 'sun-red' : ''}`}>
                          {cellDate.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Red TODAY Indicator on Header */}
                {isTodayInRange && (
                  <div
                    className="ref-today-line ref-today-header-line"
                    style={{ left: todayPos + DAY_W / 2 }}
                  >
                    <div className="ref-today-pill">TODAY</div>
                  </div>
                )}
              </div>
            </div>

            {/* All Real Projects Rows */}
            {filteredProjects.map((pp, pIdx) => {
              const { laneStages, totalLanes } = assignLanes(pp.stages);
              const theme = getProjectTheme(pIdx);

              // Row height: 52px for single lane, expanded if parallel workstreams exist
              const rowHeight = totalLanes === 1 ? 52 : 14 + totalLanes * 36;
              const barHeight = 32;

              return (
                <div
                  key={pp.project.id}
                  className="ref-table-row ref-project-row"
                  style={{ height: rowHeight, minHeight: rowHeight }}
                >
                  {/* Left Column: Project Info Block with Reference Pastel Tint */}
                  <div
                    className="ref-col-lab ref-project-lab-cell"
                    style={{
                      width: labelColWidth,
                      minWidth: labelColWidth,
                      backgroundColor: theme.bg,
                      borderLeft: `5px solid ${theme.border}`,
                    }}
                    onClick={() => navigate(`/project/${pp.project.id}`)}
                    title={`Click to open ${pp.project.projectName} in editor`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        navigate(`/project/${pp.project.id}`);
                      }
                    }}
                  >
                    <div className="ref-project-name-wrap">
                      <div className="ref-project-name">
                        {pp.project.projectName}
                      </div>
                      <span className="ref-open-hint" title="Open in editor">
                        ↗
                      </span>
                    </div>
                    <div className="ref-project-client">
                      {pp.project.clientName || 'Product Design'}
                    </div>
                  </div>

                  {/* Right Track: Horizontal Calendar Bars */}
                  <div
                    className="ref-track-block ref-project-track-cell"
                    style={{
                      width: totalTrackWidth,
                      minWidth: totalTrackWidth,
                      height: rowHeight,
                    }}
                  >
                    {/* Background Column Lines & Sunday Shading */}
                    <div className="ref-track-grid-bg">
                      {Array.from({ length: totalDays }, (_, di) => {
                        const cellDate = add(w0, di);
                        const isSun = cellDate.getDay() === 0;
                        if (isSun) {
                          return (
                            <div
                              key={di}
                              className="ref-sun-col-bg"
                              style={{ left: di * DAY_W, width: DAY_W }}
                            />
                          );
                        }
                        return null;
                      })}
                      {Array.from({ length: totalDays }, (_, di) => (
                        <div
                          key={di}
                          className="ref-day-line"
                          style={{ left: di * DAY_W }}
                        />
                      ))}
                      {Array.from({ length: weeksCount }, (_, wi) => (
                        <div
                          key={wi}
                          className="ref-week-line"
                          style={{ left: wi * weekWidth }}
                        />
                      ))}
                    </div>

                    {/* Red Vertical Today Line */}
                    {isTodayInRange && (
                      <div
                        className="ref-today-line"
                        style={{ left: todayPos + DAY_W / 2 }}
                      />
                    )}

                    {/* Horizontal Stage Bars */}
                    {laneStages.map(({ stage: st, lane }) => {
                      const sX = getDayPos(st.start);
                      const sW = getBarWidth(st.start, st.end);
                      const topOffset =
                        totalLanes === 1 ? 10 : 8 + lane * 36;

                      return (
                        <div
                          key={st.id}
                          className="ref-stage-bar"
                          style={{
                            left: sX,
                            width: sW,
                            top: topOffset,
                            height: barHeight,
                            backgroundColor: st.colorScheme.bar,
                            color: st.colorScheme.barText,
                            borderColor: st.colorScheme.border,
                          }}
                          onMouseEnter={(e) =>
                            setHoveredStage({
                              stage: st,
                              projectName: pp.project.projectName,
                              clientX: e.clientX,
                              clientY: e.clientY,
                            })
                          }
                          onMouseMove={(e) => {
                            setHoveredStage({
                              stage: st,
                              projectName: pp.project.projectName,
                              clientX: e.clientX,
                              clientY: e.clientY,
                            });
                          }}
                          onMouseLeave={() => setHoveredStage(null)}
                          onClick={() => navigate(`/project/${pp.project.id}`)}
                          title={`${st.name}: ${fmt(st.start)} → ${fmt(st.end)} (${st.durationDays}d)`}
                        >
                          <span className="ref-stage-bar-name">
                            {st.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Detailed Tooltip */}
      {hoveredStage && (
        <div
          className="dash-tooltip-overlay"
          style={{
            left: hoveredStage.clientX,
            top: hoveredStage.clientY - 12,
          }}
        >
          <div className="dash-tooltip">
            <div className="dash-tooltip-header">
              <span
                className="dash-tooltip-dot"
                style={{ background: hoveredStage.stage.colorScheme.solid }}
              />
              <span className="dash-tooltip-stage">
                {hoveredStage.stage.name}
              </span>
            </div>
            <div className="dash-tooltip-project">
              {hoveredStage.projectName}
            </div>

            <div className="dash-tooltip-grid">
              <span className="dash-tt-lbl">Start</span>
              <span className="dash-tt-val">
                {fmt(hoveredStage.stage.start)}
              </span>

              <span className="dash-tt-lbl">End</span>
              <span className="dash-tt-val">
                {fmt(hoveredStage.stage.end)}
              </span>

              <span className="dash-tt-lbl">Duration</span>
              <span className="dash-tt-val">
                {hoveredStage.stage.durationDays} working days
              </span>

              <span className="dash-tt-lbl">Timeline</span>
              <span className="dash-tt-val">
                {hoveredStage.stage.weekLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Horizontal Swatch Legend Matching Reference Image 2 */}
      <div className="ref-legend-bar">
        {legendItems.map((item) => (
          <div key={item.label} className="ref-legend-pill">
            <span
              className="ref-legend-square"
              style={{ backgroundColor: item.color }}
            />
            <span className="ref-legend-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
