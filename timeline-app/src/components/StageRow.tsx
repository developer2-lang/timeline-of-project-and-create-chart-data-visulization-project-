import type { DependencyType, Notice, Stage } from '../types/timeline';
import { fmt } from '../utils/dateUtils';
import { GripVertical, X } from 'lucide-react';

export const RULES: { value: DependencyType; label: string }[] = [
  { value: 'after', label: 'After the stages above it' },
  { value: 'with', label: 'Alongside the stage above' },
  { value: 'into', label: 'Overlapping the stage above' },
];

export interface StageRowView {
  start: string;
  end: string;
  weekLabel: string;
  notices: Notice[];
}

interface StageRowProps {
  stage: Stage;
  isFirst: boolean;
  view: StageRowView;
  onName: (id: string, name: string) => void;
  onDesc: (id: string, desc: string) => void;
  onDays: (id: string, days: number) => void;
  onRule: (id: string, rule: DependencyType) => void;
  onOffset: (id: string, offset: number) => void;
  onFixed: (id: string, val: string | null, currentStart: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: () => void;
  dragged: boolean;
  dropTarget: boolean;
}

export function StageRow({
  stage,
  isFirst,
  view,
  onName,
  onDesc,
  onDays,
  onRule,
  onOffset,
  onFixed,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  dragged,
  dropTarget,
}: StageRowProps) {
  const cls = ['stage', dragged ? 'dragging' : '', dropTarget ? 'drop' : ''].join(' ').trim();

  return (
    <div
      className={cls}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(stage.id);
      }}
      onDragEnd={onDrop}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(stage.id);
      }}
      onDragLeave={() => {}}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    >
      <span className="grip" aria-hidden="true">
        <GripVertical size={18} />
      </span>
      <div className="main">
        <input
          className="s-name"
          value={stage.name}
          onChange={(e) => onName(stage.id, e.target.value)}
          placeholder="Stage name"
          aria-label="Stage name"
        />
        <input
          className="s-desc"
          value={stage.description ?? ''}
          onChange={(e) => onDesc(stage.id, e.target.value)}
          placeholder="What happens in this stage — one line the client will read"
          aria-label="Stage description"
        />
        <div className="s-when">
          <span className="wk">{view.weekLabel}</span>
          <span className="sep">·</span>
          <span className="mono">
            {fmt(view.start)} → {fmt(view.end)}
          </span>
          {stage.fixedStart ? (
            <>
              <span className="sep">·</span>
              <span className="fx">date set by hand</span>
            </>
          ) : null}
        </div>
        {(view.notices || []).map((n, i) => (
          <div key={i} className={'s-note ' + n.type}>
            {n.message}
          </div>
        ))}
      </div>
      <div className="s-ctl">
        <div className="line">
          <input
            type="number"
            min={1}
            value={stage.durationDays}
            onChange={(e) => onDays(stage.id, Math.max(1, Number(e.target.value) || 1))}
            aria-label="Duration in working days"
          />{' '}
          working days
        </div>
        {stage.fixedStart ? (
          <>
            <div className="line">
              <input
                type="date"
                value={stage.fixedStart}
                onChange={(e) => onFixed(stage.id, e.target.value, view.start)}
                style={{ flex: 1 }}
                aria-label="Fixed start date"
              />
            </div>
            <div className="line" style={{ justifyContent: 'flex-end' }}>
              <button className="btn ghost sm lnk" onClick={() => onFixed(stage.id, null, view.start)}>
                Back to automatic
              </button>
            </div>
          </>
        ) : (
          <>
            {isFirst ? (
              <div className="line muted" style={{ fontSize: '12.5px' }}>
                Begins on the project start date
              </div>
            ) : (
              <>
                <div className="line">
                  <select
                    value={stage.dependencyType}
                    onChange={(e) => onRule(stage.id, e.target.value as DependencyType)}
                    aria-label="Dependency"
                  >
                    {RULES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                {stage.dependencyType === 'into' ? (
                  <div className="line">
                    <input
                      type="number"
                      min={0}
                      value={stage.offsetDays}
                      onChange={(e) => onOffset(stage.id, Math.max(0, Number(e.target.value) || 0))}
                      aria-label="Offset days in"
                    />{' '}
                    days in
                  </div>
                ) : null}
              </>
            )}
            <div className="line" style={{ justifyContent: 'flex-end' }}>
              <button className="btn ghost sm lnk" onClick={() => onFixed(stage.id, view.start, view.start)}>
                Pick a start date
              </button>
            </div>
          </>
        )}
      </div>
      <button
        className="btn ghost sm delete-btn"
        onClick={() => onDelete(stage.id)}
        title="Delete stage"
        aria-label={`Delete ${stage.name || 'stage'}`}
      >
        <X size={14} /> Delete
      </button>
    </div>
  );
}
