import type { Holiday, Stage } from '../types/timeline';
import { add, iso, today, uid } from '../utils/dateUtils';
import { nextWork, offDay } from '../utils/workingDays';

/**
 * Demo data migrated from timeline.html.
 * Preserved exactly — holidays for 2026-2027, four sample projects and
 * their stages, plus the two saved templates.
 */

export const DEMO_HOLIDAYS: Omit<Holiday, 'id'>[] = [
  { holidayDate: '2026-01-26', holidayName: 'Republic Day' },
  { holidayDate: '2026-02-15', holidayName: 'Mahashivratri' },
  { holidayDate: '2026-03-04', holidayName: 'Dhulivandan (Holi)' },
  { holidayDate: '2026-03-19', holidayName: 'Gudi Padwa' },
  { holidayDate: '2026-03-21', holidayName: 'Ramzan Id' },
  { holidayDate: '2026-03-26', holidayName: 'Ram Navami' },
  { holidayDate: '2026-03-31', holidayName: 'Mahavir Jayanti' },
  { holidayDate: '2026-04-03', holidayName: 'Good Friday' },
  { holidayDate: '2026-04-14', holidayName: 'Dr Ambedkar Jayanti' },
  { holidayDate: '2026-05-01', holidayName: 'Maharashtra Day' },
  { holidayDate: '2026-05-28', holidayName: 'Bakri Id' },
  { holidayDate: '2026-06-26', holidayName: 'Muharram' },
  { holidayDate: '2026-08-15', holidayName: 'Independence Day' },
  { holidayDate: '2026-09-14', holidayName: 'Ganesh Chaturthi' },
  { holidayDate: '2026-10-02', holidayName: 'Gandhi Jayanti' },
  { holidayDate: '2026-10-20', holidayName: 'Dussehra' },
  { holidayDate: '2026-11-08', holidayName: 'Diwali — Laxmi Pujan' },
  { holidayDate: '2026-11-09', holidayName: 'Diwali — Balipratipada' },
  { holidayDate: '2026-11-10', holidayName: 'Diwali — Bhaubeej' },
  { holidayDate: '2026-11-24', holidayName: 'Guru Nanak Jayanti' },
  { holidayDate: '2026-12-25', holidayName: 'Christmas' },
  { holidayDate: '2027-01-26', holidayName: 'Republic Day' },
  { holidayDate: '2027-03-06', holidayName: 'Mahashivratri' },
  { holidayDate: '2027-03-11', holidayName: 'Ramzan Id' },
  { holidayDate: '2027-03-23', holidayName: 'Dhulivandan (Holi)' },
  { holidayDate: '2027-03-26', holidayName: 'Good Friday' },
  { holidayDate: '2027-04-07', holidayName: 'Gudi Padwa' },
  { holidayDate: '2027-04-14', holidayName: 'Dr Ambedkar Jayanti' },
  { holidayDate: '2027-04-15', holidayName: 'Ram Navami' },
  { holidayDate: '2027-04-19', holidayName: 'Mahavir Jayanti' },
  { holidayDate: '2027-05-01', holidayName: 'Maharashtra Day' },
  { holidayDate: '2027-05-17', holidayName: 'Bakri Id' },
  { holidayDate: '2027-06-15', holidayName: 'Muharram' },
  { holidayDate: '2027-08-15', holidayName: 'Independence Day' },
  { holidayDate: '2027-09-04', holidayName: 'Ganesh Chaturthi' },
  { holidayDate: '2027-10-02', holidayName: 'Gandhi Jayanti' },
  { holidayDate: '2027-10-09', holidayName: 'Dussehra' },
  { holidayDate: '2027-10-29', holidayName: 'Diwali — Laxmi Pujan' },
  { holidayDate: '2027-10-30', holidayName: 'Diwali — Balipratipada' },
  { holidayDate: '2027-10-31', holidayName: 'Diwali — Bhaubeej' },
  { holidayDate: '2027-11-13', holidayName: 'Guru Nanak Jayanti' },
  { holidayDate: '2027-12-25', holidayName: 'Christmas' },
];

export function demoHolidaysWithIds(): Holiday[] {
  return DEMO_HOLIDAYS.map((h) => ({ ...h, id: uid() }));
}

interface DemoStageSpec {
  name: string;
  days: number;
  desc: string;
  rule?: 'after' | 'with' | 'into';
  offset?: number;
}

function wdBack(n: number, satRule: boolean, holidays: Holiday[]): Date {
  let x = today();
  let c = 0;
  let g = 0;
  while (c < n && g < 500) {
    x = add(x, -1);
    if (!offDay(x, satRule, holidays)) c++;
    g++;
  }
  return x;
}

export interface SupabaseDemoStage {
  name: string;
  description: string;
  durationDays: number;
  stageOrder: number;
}

export interface SupabaseDemoProject {
  projectName: string;
  clientName: string;
  projectCode: string;
  startDate: string;
  preparedBy: string;
  version: string;
  stages: SupabaseDemoStage[];
}

export const SUPERBASE_DEMO_PROJECTS: SupabaseDemoProject[] = [
  {
    projectName: 'Website Redesign',
    clientName: 'ABC Company',
    projectCode: 'WEB-001',
    startDate: '2026-09-01',
    preparedBy: 'Admin',
    version: 'R0',
    stages: [
      { name: 'Planning', description: 'Project planning and requirements', durationDays: 10, stageOrder: 0 },
      { name: 'UI Design', description: 'Design website screens', durationDays: 15, stageOrder: 1 },
      { name: 'Development', description: 'Develop the website', durationDays: 25, stageOrder: 2 },
      { name: 'Testing', description: 'Test the completed website', durationDays: 10, stageOrder: 3 },
    ],
  },
  {
    projectName: 'Mobile App Development',
    clientName: 'XYZ Company',
    projectCode: 'APP-001',
    startDate: '2026-09-15',
    preparedBy: 'Admin',
    version: 'R0',
    stages: [
      { name: 'Requirements', description: 'Gather and document requirements', durationDays: 10, stageOrder: 0 },
      { name: 'UI/UX Design', description: 'Design user interface and experience', durationDays: 15, stageOrder: 1 },
      { name: 'Development', description: 'Build the mobile application', durationDays: 30, stageOrder: 2 },
      { name: 'Testing', description: 'Test the application', durationDays: 10, stageOrder: 3 },
    ],
  },
];

export interface DemoProjectInput {
  projectName: string;
  clientName: string;
  projectCode: string;
  startDate: string;
  preparedBy: string;
  version: string;
  stages: DemoStageSpec[];
}

/**
 * Build the four demo projects. Uses supplyholidays for the "next working
 * day" logic when deriving their start dates, mirroring timeline.html which
 * seeds relative to today.
 */
export function buildDemoProjects(satRule: boolean, holidays: Holiday[]): DemoProjectInput[] {
  const P: DemoProjectInput[] = [];

  // 1 — straightforward, everything back to back
  P.push({
    projectName: 'AIS Window Handle Family',
    clientName: 'AIS Glass Solutions',
    projectCode: 'IUV-2026-038',
    preparedBy: 'Waseed Saad',
    version: 'R0',
    startDate: iso(nextWork(add(today(), 3), satRule, holidays)),
    stages: [
      { name: 'Research & Ergonomic Study', days: 6, desc: 'Grip study, benchmarking and material scan' },
      { name: 'Sketching & Ideation', days: 8, desc: 'Concept directions explored and narrowed to three' },
      { name: '3D CAD Modeling', days: 12, desc: 'Surfacing, detailing and assembly build-up' },
      { name: 'Rendering', days: 5, desc: 'Photoreal visuals in final finishes' },
      { name: 'Presentation', days: 3, desc: 'Design package compiled and walked through' },
    ],
  });

  // 2 — parallel workstreams
  P.push({
    projectName: 'Havells Mixer Grinder — Jar & Base',
    clientName: 'Havells India',
    projectCode: 'IUV-2026-047',
    preparedBy: 'Anirudha Masurkar',
    version: 'R1',
    startDate: iso(wdBack(8, satRule, holidays)),
    stages: [
      { name: 'Research', days: 5, desc: 'Category teardown and user study' },
      { name: 'Sketching & Ideation', days: 9, desc: 'Concept directions explored and narrowed' },
      { name: 'CAD — Base & Motor Housing', days: 12, desc: 'Surfacing, internals and mounting details' },
      { name: 'CAD — Jar Family', days: 12, desc: 'Three jar sizes, lids and coupling detail', rule: 'with' },
      { name: 'Rendering', days: 6, desc: 'Photoreal visuals across the full family' },
      { name: 'Presentation', days: 3, desc: 'Design package compiled and walked through' },
    ],
  });

  // 3 — an overlap that starts partway into the stage above it
  P.push({
    projectName: 'ABS Ceiling Fan — Canopy & Blade',
    clientName: 'Bajaj Electricals',
    projectCode: 'IUV-2026-041',
    preparedBy: 'Anirudha Masurkar',
    version: 'R2',
    startDate: iso(wdBack(4, satRule, holidays)),
    stages: [
      { name: 'Research & Benchmarking', days: 8, desc: 'Airflow benchmarking, category teardown and material scan' },
      { name: 'Sketching & Ideation', days: 10, desc: 'Concept directions explored and narrowed to three' },
      { name: 'Client review window', days: 3, desc: 'Time reserved for your feedback on the shortlist' },
      { name: '3D CAD Modeling', days: 15, desc: 'Surfacing, blade profile and assembly build-up' },
      { name: 'DFM with tooling vendor', days: 4, desc: 'Draft, wall sections and parting lines validated', rule: 'into', offset: 8 },
      { name: 'Rendering', days: 6, desc: 'Photoreal visuals in final colours and finishes' },
      { name: 'Client Presentation', days: 4, desc: 'Design package compiled and walked through' },
    ],
  });

  // 4 — long programme, lands on A3
  P.push({
    projectName: 'Steelbird Helmet — Shell & Visor',
    clientName: 'Steelbird Hi-Tech',
    projectCode: 'IUV-2026-044',
    preparedBy: 'Mandar Ambelkar',
    version: 'R1',
    startDate: iso(nextWork(add(today(), 10), satRule, holidays)),
    stages: [
      { name: 'Research & Homologation Study', days: 10, desc: 'DOT and ECE requirements, category teardown, head-form study' },
      { name: 'Sketching & Ideation', days: 12, desc: 'Form directions explored across three families' },
      { name: 'Client review window', days: 3, desc: 'Time reserved for your feedback on the shortlist' },
      { name: 'CAD — Shell', days: 18, desc: 'Outer shell surfacing, EPS liner and shell-break detailing' },
      { name: 'CAD — Visor & Vents', days: 12, desc: 'Visor mechanism, gasket line and vent geometry', rule: 'into', offset: 6 },
      { name: 'Rendering', days: 8, desc: 'Photoreal visuals in final graphics and finishes' },
      { name: 'Prototype & Fit Trial', days: 10, desc: '3D-printed shell, fit trial on head forms' },
      { name: 'Client review window', days: 4, desc: 'Time reserved for your feedback on the prototype' },
      { name: 'Final Presentation', days: 4, desc: 'Design package compiled and walked through' },
    ],
  });

  return P;
}

export interface TemplateSpec {
  name: string;
  stages: DemoStageSpec[];
}

export const DEMO_TEMPLATES: TemplateSpec[] = [
  {
    name: 'Helmet programme — 16 week',
    stages: [
      { name: 'Research & Homologation Study', days: 10, desc: 'DOT and ECE requirements, category teardown, head-form study' },
      { name: 'Sketching & Ideation', days: 12, desc: 'Form directions explored across three families' },
      { name: 'Client review window', days: 3, desc: 'Time reserved for your feedback on the shortlist' },
      { name: 'CAD — Shell', days: 18, desc: 'Outer shell surfacing, EPS liner and shell-break detailing' },
      { name: 'CAD — Visor & Vents', days: 12, desc: 'Visor mechanism, gasket line and vent geometry', rule: 'into', offset: 6 },
      { name: 'Rendering', days: 8, desc: 'Photoreal visuals in final graphics and finishes' },
      { name: 'Prototype & Fit Trial', days: 10, desc: '3D-printed shell, fit trial on head forms' },
      { name: 'Client review window', days: 4, desc: 'Time reserved for your feedback on the prototype' },
      { name: 'Final Presentation', days: 4, desc: 'Design package compiled and walked through' },
    ],
  },
  {
    name: 'Two-stream CAD — 9 week',
    stages: [
      { name: 'Research', days: 5, desc: 'Category teardown and user study' },
      { name: 'Sketching & Ideation', days: 9, desc: 'Concept directions explored and narrowed' },
      { name: 'CAD — Base & Motor Housing', days: 12, desc: 'Surfacing, internals and mounting details' },
      { name: 'CAD — Jar Family', days: 12, desc: 'Three jar sizes, lids and coupling detail', rule: 'with' },
      { name: 'Rendering', days: 6, desc: 'Photoreal visuals across the full family' },
      { name: 'Presentation', days: 3, desc: 'Design package compiled and walked through' },
    ],
  },
];

/** The five default stage templates shown in the "New timeline" picker. */
export const START_TEMPLATES: { id: string; name: string; stages: DemoStageSpec[] }[] = [
  {
    id: 'std',
    name: 'Standard — 5 stage',
    stages: [
      { name: 'Research', days: 6, desc: 'Benchmarking, user study and material scan' },
      { name: 'Sketching & Ideation', days: 8, desc: 'Concept directions explored and narrowed' },
      { name: '3D CAD Modeling', days: 12, desc: 'Surfacing, detailing and assembly build-up' },
      { name: 'Rendering', days: 5, desc: 'Photoreal visuals in final colours and finishes' },
      { name: 'Presentation', days: 3, desc: 'Design package compiled and walked through' },
    ],
  },
  {
    id: 'app',
    name: 'Appliance programme — 12 week',
    stages: [
      { name: 'Research & Benchmarking', days: 8, desc: 'Category teardown, user study and material scan' },
      { name: 'Sketching & Ideation', days: 10, desc: 'Concept directions explored and narrowed' },
      { name: 'Client review window', days: 3, desc: 'Time reserved for your feedback on the shortlist' },
      { name: '3D CAD Modeling', days: 15, desc: 'Surfacing, detailing and assembly build-up' },
      { name: 'DFM with tooling vendor', days: 4, desc: 'Draft, wall sections and parting lines validated', rule: 'with' },
      { name: 'Rendering', days: 6, desc: 'Photoreal visuals in final colours and finishes' },
      { name: 'Client Presentation', days: 4, desc: 'Design package compiled and walked through' },
    ],
  },
  {
    id: 'sprint',
    name: 'Concept sprint — 4 week',
    stages: [
      { name: 'Research', days: 3, desc: 'Rapid category and user scan' },
      { name: 'Sketching & Ideation', days: 6, desc: 'Concept directions explored and narrowed' },
      { name: '3D CAD Modeling', days: 7, desc: 'Form model built to presentation standard' },
      { name: 'Rendering', days: 3, desc: 'Photoreal visuals in final colours and finishes' },
      { name: 'Presentation', days: 2, desc: 'Design package compiled and walked through' },
    ],
  },
  {
    id: 'blank',
    name: 'Blank — start from scratch',
    stages: [{ name: 'Stage one', days: 5, desc: '' }],
  },
];

/** Build Stage objects (not yet saved) for a new project from a template. */
export function buildStagesFromSpec(projectId: string, specs: DemoStageSpec[]): Stage[] {
  return specs.map((s, i) => ({
    id: uid(),
    projectId,
    name: s.name,
    description: s.desc,
    durationDays: s.days,
    dependencyType: s.rule || 'after',
    offsetDays: s.offset ?? 2,
    fixedStart: null,
    fixedRef: null,
    startDate: null,
    endDate: null,
    stageOrder: i,
  }));
}
