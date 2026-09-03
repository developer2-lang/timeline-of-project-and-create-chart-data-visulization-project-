import { supabase } from '../lib/supabase';
import type { ProjectTimeline, Stage } from '../types/timeline';

export interface ProjectRow {
  id: string;
  project_name: string;
  client_name: string;
  project_code: string;
  start_date: string;
  prepared_by: string;
  version: string;
  created_at?: string;
}

function toTimeline(row: ProjectRow, stages: Stage[]): ProjectTimeline {
  return {
    id: row.id,
    projectName: row.project_name,
    clientName: row.client_name || '',
    projectCode: row.project_code || '',
    startDate: row.start_date,
    preparedBy: row.prepared_by || '',
    version: row.version || 'R0',
    createdAt: row.created_at,
    stages,
  };
}

function stageRowToStage(r: Record<string, unknown>): Stage {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    name: (r.stage_name as string) || (r.name as string) || 'Untitled stage',
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

export async function fetchProjects(): Promise<ProjectTimeline[]> {
  const { data: projRows, error } = await supabase!
    .from('projects')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;

  const { data: stageRows, error: stageError } = await supabase!
    .from('stages')
    .select('*')
    .order('stage_order', { ascending: true });
  if (stageError) throw stageError;

  const byProject = new Map<string, Stage[]>();
  (stageRows || []).forEach((r) => {
    const st = stageRowToStage(r);
    const list = byProject.get(st.projectId) || [];
    list.push(st);
    byProject.set(st.projectId, list);
  });

  return (projRows || []).map((r) => toTimeline(r as ProjectRow, byProject.get(r.id) || []));
}

export async function createProject(
  input: { projectName: string; clientName: string; projectCode: string; startDate: string; preparedBy: string }
): Promise<ProjectTimeline> {
  const { data, error } = await supabase!
    .from('projects')
    .insert({
      project_name: input.projectName,
      client_name: input.clientName,
      project_code: input.projectCode,
      start_date: input.startDate,
      prepared_by: input.preparedBy,
    })
    .select()
    .single();
  if (error) throw error;
  return toTimeline(data as ProjectRow, []);
}

export async function updateProject(
  id: string,
  fields: Partial<Pick<ProjectTimeline, 'projectName' | 'clientName' | 'projectCode' | 'startDate' | 'preparedBy'>>
): Promise<void> {
  const payload: Record<string, string | number> = {};
  if (fields.projectName !== undefined) payload.project_name = fields.projectName;
  if (fields.clientName !== undefined) payload.client_name = fields.clientName;
  if (fields.projectCode !== undefined) payload.project_code = fields.projectCode;
  if (fields.startDate !== undefined) payload.start_date = fields.startDate;
  if (fields.preparedBy !== undefined) payload.prepared_by = fields.preparedBy;
  const { error } = await supabase!.from('projects').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase!.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function countProjects(): Promise<number> {
  const { count, error } = await supabase!
    .from('projects')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}
