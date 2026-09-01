import type { ProjectTimeline } from '../types/timeline';
import { fmt, iso } from '../utils/dateUtils';

interface TimelineCardProps {
  project: ProjectTimeline;
  startDate: Date;
  endDate: Date;
  weeks: number;
  onClick: () => void;
}

export function TimelineCard({ project, startDate, endDate, weeks, onClick }: TimelineCardProps) {
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
    </div>
  );
}
