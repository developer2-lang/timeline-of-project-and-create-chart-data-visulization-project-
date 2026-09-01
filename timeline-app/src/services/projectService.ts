import { supabase } from '../lib/supabase';
import type { ProjectTimeline, Stage } from '../types/timeline';

export interface ProjectRow {
  id: string;
  project_name: string;
  client_name: string;
  project_code: string;
  start_date: string;
  manager: string;
  version: string;
  created_at?: string;
  updated_at?: string;
}

function toTimeline(row: ProjectRow, stages: Stage[]): ProjectTimeline {
  return {
    id: row.id,
    projectName: row.project_name,
    clientName: row.client_name || '',
    projectCode: row.project_code || '',
    startDate: row.start_date,
    manager: row.manager || '',
    version: row.version || 'R0',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stages,
  };
}

function stageRowToStage(r: {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  duration_days: number;
  dependency_type: string;
  offset_days: number;
  fixed_start: string | null;
  fixed_ref: string | null;
  start_date: string | null;
  end_date: string | null;
  stage_order: number;
}): Stage {
  return {
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

  return (projRows || []).map((r) => toTimeline(r, byProject.get(r.id) || []));
}

export async function createProject(
  input: { projectName: string; clientName: string; projectCode: string; startDate: string; manager: string; version: string }
): Promise<ProjectTimeline> {
  const { data, error } = await supabase!
    .from('projects')
    .insert({
      project_name: input.projectName,
      client_name: input.clientName,
      project_code: input.projectCode,
      start_date: input.startDate,
      manager: input.manager,
      version: input.version,
    })
    .select()
    .single();
  if (error) throw error;
  return toTimeline(data as ProjectRow, []);
}

export async function updateProject(
  id: string,
  fields: Partial<Pick<ProjectTimeline, 'projectName' | 'clientName' | 'projectCode' | 'startDate' | 'manager' | 'version'>>
): Promise<void> {
  const payload: Record<string, string | number> = {};
  if (fields.projectName !== undefined) payload.project_name = fields.projectName;
  if (fields.clientName !== undefined) payload.client_name = fields.clientName;
  if (fields.projectCode !== undefined) payload.project_code = fields.projectCode;
  if (fields.startDate !== undefined) payload.start_date = fields.startDate;
  if (fields.manager !== undefined) payload.manager = fields.manager;
  if (fields.version !== undefined) payload.version = fields.version;
  payload.updated_at = new Date().toISOString();
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
