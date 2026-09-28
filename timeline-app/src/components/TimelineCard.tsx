import { useState, useMemo } from 'react';
import type { Holiday, ProjectTimeline } from '../types/timeline';
import { fmt, iso } from '../utils/dateUtils';
import { schedule, weekLabel, type Engine } from '../utils/timelineCalculations';
import { Trash2, ChevronDown, ExternalLink, Calendar, Clock } from 'lucide-react';

interface TimelineCardProps {
  project: ProjectTimeline;
  startDate: Date;
  endDate: Date;
  weeks: number;
  holidays: Holiday[];
  satRule: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TimelineCard({
  project,
  startDate,
  endDate,
  weeks,
  holidays,
  satRule,
  onOpen,
  onDelete,
}: TimelineCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const stageItems = useMemo(() => {
    const engine: Engine = { satRule, holidays };
    const S = schedule(project, engine);
    const sorted = [...(project.stages || [])].sort(
      (a, b) => (a.stageOrder ?? 0) - (b.stageOrder ?? 0)
    );

    return sorted.map((st) => {
      const r = S.find((x) => x.stageId === st.id);
      const startStr = r?.start || st.startDate || project.startDate;
      const endStr = r?.end || st.endDate || startStr;
      const wLabel = r
        ? weekLabel(project, engine, r)
        : st.stageOrder !== undefined
        ? `Week ${st.stageOrder + 1}`
        : '—';

      return {
        id: st.id,
        name: st.name || 'Untitled stage',
        description: st.description,
        durationDays: st.durationDays,
        weekLabel: wLabel,
        startDate: startStr,
        endDate: endStr,
        fixedStart: st.fixedStart,
      };
    });
  }, [project, satRule, holidays]);

  const toggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className={`card pcard ${isExpanded ? 'is-expanded' : ''}`}>
      <div
        className="prow"
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpand();
          }
        }}
        aria-label={`Toggle stages for ${project.projectName}`}
      >
        <div
          className="nm nm-clickable"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(project.id);
          }}
          title={`Open ${project.projectName} in editor`}
        >
          <span className="nm-text">{project.projectName}</span>
          <div className="cl">
            {project.clientName || 'Client not set'}
            {project.projectCode ? ' · ' + project.projectCode : ''}
          </div>
        </div>

        <div className="dt">
          <b>{fmt(iso(startDate))}</b>
          to {fmt(iso(endDate))}
        </div>

        <div className="wks">
          {weeks}
          <span>weeks</span>
        </div>

        <div className="prow-actions">
          <button
            className="btn ghost sm prow-open"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(project.id);
            }}
            title="Open timeline in editor"
            aria-label={`Open ${project.projectName || 'timeline'}`}
          >
            <ExternalLink size={14} /> Open
          </button>

          <button
            className="btn ghost sm prow-del"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project.id);
            }}
            title="Delete timeline"
            aria-label={`Delete ${project.projectName || 'timeline'}`}
          >
            <Trash2 size={14} /> Delete
          </button>

          <span
            className={`prow-chevron ${isExpanded ? 'open' : ''}`}
            aria-hidden="true"
            title={isExpanded ? 'Collapse stages' : 'Expand stages'}
          >
            <ChevronDown size={18} />
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="prow-dropdown">
          <div className="prow-dropdown-head">
            <span className="prow-dropdown-label">
              Stages breakdown ({stageItems.length})
            </span>
            <button
              className="btn ghost sm prow-view-full"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(project.id);
              }}
            >
              Edit stages <ExternalLink size={13} />
            </button>
          </div>

          {stageItems.length > 0 ? (
            <div className="prow-stages-list">
              {stageItems.map((st, idx) => (
                <div key={st.id} className="prow-stage-row">
                  <div className="prow-stage-left">
                    <span className="prow-stage-num">{idx + 1}</span>
                    <div className="prow-stage-info">
                      <div className="prow-stage-name">{st.name}</div>
                      {st.description ? (
                        <div className="prow-stage-desc">{st.description}</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="prow-stage-meta">
                    {st.durationDays !== undefined && (
                      <span className="prow-stage-pill days">
                        <Clock size={12} />
                        {st.durationDays} working days
                      </span>
                    )}
                    {st.weekLabel && (
                      <span className="prow-stage-pill week">{st.weekLabel}</span>
                    )}
                    <span className="prow-stage-pill dates mono">
                      <Calendar size={12} />
                      {fmt(st.startDate)} → {fmt(st.endDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="prow-stages-empty">
              No stages added yet for this project.{' '}
              <button
                className="btn ghost sm"
                style={{ display: 'inline-flex', marginLeft: 8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(project.id);
                }}
              >
                Add stages
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
