import type { ProjectTimeline } from '../types/timeline';
import { fmt, iso } from '../utils/dateUtils';
import { Trash2 } from 'lucide-react';

interface TimelineCardProps {
  project: ProjectTimeline;
  startDate: Date;
  endDate: Date;
  weeks: number;
  onClick: () => void;
  onDelete: (id: string) => void;
}

export function TimelineCard({ project, startDate, endDate, weeks, onClick, onDelete }: TimelineCardProps) {
  return (
    <div
      className="card prow"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Open project ${project.projectName}`}
    >
      <div className="nm">
        {project.projectName}
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
    </div>
  );
}
