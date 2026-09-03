import { supabase } from '../lib/supabase';
import type { Stage } from '../types/timeline';

function toStageCols(st: Partial<Stage>) {
  const cols: Record<string, unknown> = {};
  if (st.projectId !== undefined) cols.project_id = st.projectId;
  if (st.name !== undefined) cols.stage_name = st.name;
  if (st.description !== undefined) cols.description = st.description;
  if (st.durationDays !== undefined) cols.duration_days = st.durationDays;
  if (st.startDate !== undefined) cols.start_date = st.startDate;
  if (st.endDate !== undefined) cols.end_date = st.endDate;
  if (st.stageOrder !== undefined) cols.stage_order = st.stageOrder;
  if (st.dependencyType !== undefined) cols.dependency_type = st.dependencyType;
  if (st.offsetDays !== undefined) cols.offset_days = st.offsetDays;
  if (st.fixedStart !== undefined) cols.fixed_start = st.fixedStart;
  if (st.fixedRef !== undefined) cols.fixed_ref = st.fixedRef;
  return cols;
}

function stageToDom(r: Record<string, unknown>): Stage {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    name: r.stage_name as string,
    description: (r.description as string) || '',
    durationDays: (r.duration_days as number) ?? 5,
    dependencyType: (r.dependency_type as Stage['dependencyType']) || 'after',
    offsetDays: (r.offset_days as number) ?? 2,
    fixedStart: (r.fixed_start as string) || null,
    fixedRef: (r.fixed_ref as string) || null,
    startDate: (r.start_date as string) || null,
    endDate: (r.end_date as string) || null,
    stageOrder: r.stage_order as number,
  };
}

export async function createStage(st: Stage): Promise<Stage> {
  const cols: Record<string, unknown> = toStageCols(st);
  if (st.id) cols.id = st.id;
  const { data, error } = await supabase!.from('stages').insert(cols).select().single();
  if (error) throw error;
  return stageToDom(data);
}

export async function updateStage(id: string, st: Partial<Stage>): Promise<void> {
  const cols = toStageCols(st);
  if (Object.keys(cols).length === 0) return;
  const { error } = await supabase!.from('stages').update(cols).eq('id', id);
  if (error) throw error;
}

export async function deleteStage(id: string): Promise<void> {
  const { error } = await supabase!.from('stages').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchStagesForProject(projectId: string): Promise<Stage[]> {
  const { data, error } = await supabase!
    .from('stages')
    .select('*')
    .eq('project_id', projectId)
    .order('stage_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => stageToDom(r));
}

export async function insertStagesBulk(
  projectId: string,
  stages: { name: string; description: string; durationDays: number; stageOrder: number }[]
): Promise<void> {
  const { error } = await supabase!.from('stages').insert(
    stages.map((s) => ({
      project_id: projectId,
      stage_name: s.name,
      description: s.description,
      duration_days: s.durationDays,
      start_date: null,
      end_date: null,
      stage_order: s.stageOrder,
      dependency_type: 'after',
      offset_days: 2,
      fixed_start: null,
      fixed_ref: null,
    }))
  );
  if (error) throw error;
}

export async function updateStageOrders(stages: Stage[]): Promise<void> {
  for (let i = 0; i < stages.length; i++) {
    const st = stages[i];
    if (st.stageOrder !== i) {
      const { error } = await supabase!
        .from('stages')
        .update({ stage_order: i })
        .eq('id', st.id);
      if (error) throw error;
      st.stageOrder = i;
    }
  }
}
