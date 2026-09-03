export type DependencyType = 'after' | 'with' | 'into';

/** How a new stage is scheduled when created through the Add Stage form. */
export type ScheduleMode = 'fixed' | 'after' | 'with';

/** Raw values collected by the Add Stage form, before any dates are computed. */
export interface StageInput {
  name: string;
  description: string;
  durationDays: number;
  scheduleMode: ScheduleMode;
  fixedStart: string;
}

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
  preparedBy: string;
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
