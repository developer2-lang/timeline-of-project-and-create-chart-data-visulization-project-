export type DependencyType = 'after' | 'with' | 'into';

export interface Stage {
  id: string;
  projectId: string;
  name: string;
  description: string;
  durationDays: number;
  dependencyType: DependencyType;
  offsetDays: number;
  fixedStart: string | null;
  fixedRef: string | null;
  startDate: string | null;
  endDate: string | null;
  stageOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectTimeline {
  id: string;
  projectName: string;
  clientName: string;
  projectCode: string;
  startDate: string;
  manager: string;
  version: string;
  createdAt?: string;
  updatedAt?: string;
  stages: Stage[];
}

export interface Holiday {
  id: string;
  holidayDate: string;
  holidayName: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduleResult {
  stageId: string;
  start: string;
  end: string;
}

export interface SpanResult {
  start: Date;
  end: Date;
  w0: Date;
  weeks: number;
}

export interface Notice {
  type: 'warn' | 'info';
  message: string;
}

export interface StudioSettings {
  line1: string;
  line2: string;
}
