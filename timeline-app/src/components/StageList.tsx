import { useMemo, useState } from 'react';
import type { Holiday, ProjectTimeline, Stage } from '../types/timeline';
import { StageRow, type StageRowView } from './StageRow';
import { schedule, notices as calcNotices, weekLabel } from '../utils/timelineCalculations';

interface StageListProps {
  project: ProjectTimeline;
  satRule: boolean;
  holidays: Holiday[];
  onEdit: (stage: Stage) => void;
  onDelete: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
}

export function StageList({
  project,
  satRule,
  holidays,
  onEdit,
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
          view={views[st.id] || { start: '', end: '', weekLabel: '', notices: [] }}
          onEdit={onEdit}
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
