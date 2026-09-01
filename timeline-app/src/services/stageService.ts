import { supabase } from '../lib/supabase';
import type { Stage } from '../types/timeline';

function toStageCols(st: Stage) {
  return {
    project_id: st.projectId,
    name: st.name,
    description: st.description,
    duration_days: st.durationDays,
    dependency_type: st.dependencyType,
    offset_days: st.offsetDays,
    fixed_start: st.fixedStart,
    fixed_ref: st.fixedRef,
    start_date: st.startDate,
    end_date: st.endDate,
    stage_order: st.stageOrder,
  };
}

export async function createStage(st: Stage): Promise<void> {
  const { error } = await supabase!.from('stages').insert({
    id: st.id,
    ...toStageCols(st),
  });
  if (error) throw error;
}

export async function updateStage(id: string, st: Partial<Stage>): Promise<void> {
  const { error } = await supabase!.from('stages').update(toStageCols(st as Stage)).eq('id', id);
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
  return (data || []).map((r) => ({
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    description: r.description || '',
    durationDays: r.duration_days,
    dependencyType: (r.dependency_type as Stage['dependencyType']) || 'after',
    offsetDays: r.offset_days ?? 2,
    fixedStart: r.fixed_start,
    fixedRef: r.fixed_ref,
    startDate: r.start_date,
    endDate: r.end_date,
    stageOrder: r.stage_order,
  }));
}

export async function updateStageOrders(stages: Stage[]): Promise<void> {
  for (let i = 0; i < stages.length; i++) {
    const st = stages[i];
    if (st.stageOrder !== i) {
      const { error } = await supabase!
        .from('stages')
        .update({ stage_order: i, updated_at: new Date().toISOString() })
        .eq('id', st.id);
      if (error) throw error;
      st.stageOrder = i;
    }
  }
}
