import { useMemo } from 'react';
import type { ProjectTimeline, Holiday } from '../types/timeline';
import { TimelineCard } from './TimelineCard';
import { schedule, span } from '../utils/timelineCalculations';

interface TimelineListProps {
  projects: ProjectTimeline[];
  holidays: Holiday[];
  satRule: boolean;
  empty: boolean;
  onNew: () => void;
  onOpen: (id: string) => void;
}

export function TimelineList({ projects, holidays, satRule, empty, onNew, onOpen }: TimelineListProps) {
  const cards = useMemo(() => {
    return projects.map((p) => {
      const engine = { satRule, holidays };
      const S = schedule(p, engine);
      const s = span(p, engine);
      return {
        project: p,
        startDate: s.start,
        endDate: s.end,
        weeks: S.length ? s.weeks : 4,
      };
    });
  }, [projects, holidays, satRule]);

  if (empty) {
    return (
      <>
        <div className="head">
          <div>
            <div className="eyebrow">Client schedules</div>
            <h1>Project timelines</h1>
          </div>
        </div>
        <div className="empty">
          <h2>Nothing scheduled yet</h2>
          <p>
            Set a start date, list the stages and how long each one takes. The dates work
            themselves out.
          </p>
          <button className="btn primary" onClick={onNew}>
            Create a timeline
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">Client schedules</div>
          <h1>Project timelines</h1>
        </div>
        <button className="btn primary" onClick={onNew}>
          New timeline
        </button>
      </div>
      <div className="plist">
        {cards.map((c) => (
          <TimelineCard
            key={c.project.id}
            project={c.project}
            startDate={c.startDate}
            endDate={c.endDate}
            weeks={c.weeks}
            onClick={() => onOpen(c.project.id)}
          />
        ))}
      </div>
    </>
  );
}
