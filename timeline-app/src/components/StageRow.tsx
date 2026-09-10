import type { Notice, Stage } from '../types/timeline';
import { fmt } from '../utils/dateUtils';
import { GripVertical, Trash2, Pencil } from 'lucide-react';

export interface StageRowView {
  start: string;
  end: string;
  weekLabel: string;
  notices: Notice[];
}

interface StageRowProps {
  stage: Stage;
  view: StageRowView;
  onEdit: (stage: Stage) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: () => void;
  dragged: boolean;
  dropTarget: boolean;
}

export function StageRow({
  stage,
  view,
  onEdit,
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
        <div className="s-name ro">{stage.name || 'Untitled stage'}</div>
        {stage.description ? <div className="s-desc ro">{stage.description}</div> : null}
        <div className="s-when">
          <span className="wk">{stage.durationDays} working days</span>
          <span className="sep">·</span>
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
      <div className="stage-actions">
        <button
          className="btn ghost sm edit-btn"
          onClick={() => onEdit(stage)}
          title="Edit stage"
          aria-label={`Edit ${stage.name || 'stage'}`}
        >
          <Pencil size={14} /> Edit
        </button>
        <button
          className="btn ghost sm delete-btn"
          onClick={() => onDelete(stage.id)}
          title="Delete stage"
          aria-label={`Delete ${stage.name || 'stage'}`}
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  );
}
