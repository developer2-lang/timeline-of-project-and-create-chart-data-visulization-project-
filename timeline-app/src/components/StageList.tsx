import { useMemo, useState } from 'react';
import type { DependencyType, Holiday, ProjectTimeline } from '../types/timeline';
import { StageRow, type StageRowView } from './StageRow';
import { schedule, notices as calcNotices, weekLabel } from '../utils/timelineCalculations';

interface StageListProps {
  project: ProjectTimeline;
  satRule: boolean;
  holidays: Holiday[];
  onName: (id: string, name: string) => void;
  onDesc: (id: string, desc: string) => void;
  onDays: (id: string, days: number) => void;
  onRule: (id: string, rule: DependencyType) => void;
  onOffset: (id: string, offset: number) => void;
  onFixed: (id: string, val: string | null, currentStart: string) => void;
  onDelete: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
}

export function StageList({
  project,
  satRule,
  holidays,
  onName,
  onDesc,
  onDays,
  onRule,
  onOffset,
  onFixed,
  onDelete,
  onReorder,
}: StageListProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const engine = useMemo(() => ({ satRule, holidays }), [satRule, holidays]);
  const S = useMemo(() => schedule(project, engine), [project, engine]);
  const notes = useMemo(() => calcNotices(project, engine), [project, engine]);

  const map = useMemo(() => {
    const m: Record<string, { start: string; end: string }> = {};
    S.forEach((r) => (m[r.stageId] = r));
    return m;
  }, [S]);

  const views = useMemo(() => {
    const v: Record<string, StageRowView> = {};
    project.stages.forEach((st) => {
      const r = map[st.id];
      if (!r) return;
      v[st.id] = {
        start: r.start,
        end: r.end,
        weekLabel: weekLabel(project, engine, r),
        notices: notes[st.id] || [],
      };
    });
    return v;
  }, [project, engine, map, notes]);

  const handleDrop = () => {
    if (dragId && overId && dragId !== overId) {
      onReorder(dragId, overId);
    }
    setDragId(null);
    setOverId(null);
  };

  if (!project.stages.length) {
    return <div className="stage muted">No stages yet.</div>;
  }

  return (
    <>
      {project.stages.map((st) => (
        <StageRow
          key={st.id}
          stage={st}
          isFirst={project.stages[0] && project.stages[0].id === st.id}
          view={views[st.id] || { start: '', end: '', weekLabel: '', notices: [] }}
          onName={onName}
          onDesc={onDesc}
          onDays={onDays}
          onRule={onRule}
          onOffset={onOffset}
          onFixed={onFixed}
          onDelete={onDelete}
          onDragStart={(id) => setDragId(id)}
          onDragOver={(id) => setOverId(id)}
          onDrop={handleDrop}
          dragged={dragId === st.id}
          dropTarget={overId === st.id}
        />
      ))}
    </>
  );
}
