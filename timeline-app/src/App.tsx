import { supabase } from "./supabaseClient";
import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ToastProvider } from './components/ToastContext';
import { ModalProvider, useModal } from './components/ModalContext';
import useToast from './components/useToast';
import { Timelines } from './pages/Timelines';
import { TimelineEditor } from './pages/TimelineEditor';
import { Settings } from './pages/Settings';
import { isSupabaseConfigured } from './lib/supabase';
import * as projectService from './services/projectService';
import * as stageService from './services/stageService';
import * as holidayService from './services/holidayService';
import { demoHolidaysWithIds, buildDemoProjects, DEMO_HOLIDAYS, START_TEMPLATES, SUPERBASE_DEMO_PROJECTS } from './data/demoData';
import { schedule, scheduleAppendedStage, syncScheduleDates } from './utils/timelineCalculations';
import { uid } from './utils/dateUtils';
import type { Holiday, ProjectTimeline, Stage, StageInput, StudioSettings, ScheduleResult } from './types/timeline';
import type { NewProjectValues } from './components/ProjectForm';

const STORAGE_KEY = 'iuova-timeline-data';

interface StorageData {
  projects: ProjectTimeline[];
  holidays: Holiday[];
  satRule: boolean;
}

function saveToStorage(projects: ProjectTimeline[], holidays: Holiday[], satRule: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, holidays, satRule }));
  } catch { /* quota exceeded — silently ignore */ }
}

function loadFromStorage(): StorageData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StorageData;
  } catch {
    return null;
  }
}

function latestAboveEnd(S: ScheduleResult[], i: number): string | null {
  let e: string | null = null;
  for (let j = 0; j < i; j++) {
    if (!e || S[j].end > e) e = S[j].end;
  }
  return e;
}

function AppShell() {
  const [projects, setProjects] = useState<ProjectTimeline[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [satRule, setSatRule] = useState(true);
  const [studio, setStudio] = useState<StudioSettings>({
    line1: 'IUOVA Design Company',
    line2: 'Filix Tower, Bhandup West, Mumbai',
  });
  const [templates, setTemplates] = useState<
    { id: string; name: string; stagesCount: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { closeModal } = useModal();

  // Seed default holidays into local state as a baseline while real ones load.
  useEffect(() => {
    if (holidays.length === 0) {
      setHolidays(demoHolidaysWithIds());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      const stored = loadFromStorage();
      if (stored) {
        setProjects(stored.projects);
        setHolidays(stored.holidays);
        setSatRule(stored.satRule);
      } else {
        const hols = demoHolidaysWithIds();
        setHolidays(hols);
        const demoSpecs = buildDemoProjects(true, hols);
        const demoProjects: ProjectTimeline[] = demoSpecs.map((spec) => ({
          id: uid(),
          projectName: spec.projectName,
          clientName: spec.clientName,
          projectCode: spec.projectCode,
          startDate: spec.startDate,
          preparedBy: spec.preparedBy,
          version: spec.version,
          stages: spec.stages.map((st, i) => ({
            id: uid(),
            projectId: '',
            name: st.name,
            description: st.desc,
            durationDays: st.days,
            dependencyType: (st.rule || 'after') as Stage['dependencyType'],
            offsetDays: st.offset ?? 2,
            fixedStart: null,
            fixedRef: null,
            startDate: null,
            endDate: null,
            stageOrder: i,
          })),
        }));
        demoProjects.forEach((p) => {
          p.stages.forEach((s) => { s.projectId = p.id; });
        });
        setProjects(demoProjects);
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [ps, hs] = await Promise.all([
        projectService.fetchProjects(),
        holidayService.fetchHolidays(),
      ]);
      setProjects(ps);
      if (hs.length) setHolidays(hs);
    } catch (e) {
      console.error(e);
      setError('Could not load data from Supabase. Check your connection and try Reload.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured && !loading) {
      saveToStorage(projects, holidays, satRule);
    }
  }, [projects, holidays, satRule, loading]);

  const loadDemoData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      const hols = demoHolidaysWithIds();
      setHolidays(hols);
      const demoSpecs = buildDemoProjects(satRule, hols);
      const demoProjects: ProjectTimeline[] = demoSpecs.map((spec) => ({
        id: uid(),
        projectName: spec.projectName,
        clientName: spec.clientName,
        projectCode: spec.projectCode,
        startDate: spec.startDate,
        preparedBy: spec.preparedBy,
        version: spec.version,
        stages: spec.stages.map((st, i) => ({
          id: uid(),
          projectId: '',
          name: st.name,
          description: st.desc,
          durationDays: st.days,
          dependencyType: (st.rule || 'after') as Stage['dependencyType'],
          offsetDays: st.offset ?? 2,
          fixedStart: null,
          fixedRef: null,
          startDate: null,
          endDate: null,
          stageOrder: i,
        })),
      }));
      demoProjects.forEach((p) => {
        p.stages.forEach((s) => { s.projectId = p.id; });
      });
      setProjects(demoProjects);
      toast('Demo data loaded locally.');
      return;
    }
    setBusy(true);
    try {
      const existing = await projectService.fetchProjects();
      const existingCodes = new Set(existing.map((p) => p.projectCode));
      if (SUPERBASE_DEMO_PROJECTS.some((d) => existingCodes.has(d.projectCode))) {
        toast('Demo data already exists — nothing duplicated.');
        return;
      }
      for (const demo of SUPERBASE_DEMO_PROJECTS) {
        const created = await projectService.createProject({
          projectName: demo.projectName,
          clientName: demo.clientName,
          projectCode: demo.projectCode,
          startDate: demo.startDate,
          preparedBy: demo.preparedBy,
        });
        await stageService.insertStagesBulk(created.id, demo.stages);
      }
      await loadAll();
      toast('Demo data loaded into Supabase.');
    } catch (e) {
      console.error(e);
      toast('Could not load demo data.');
    } finally {
      setBusy(false);
    }
  }, [loadAll, toast]);

  const clearAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setProjects([]);
      setHolidays(demoHolidaysWithIds());
      localStorage.removeItem(STORAGE_KEY);
      toast('All timelines cleared locally.');
      return;
    }
    setBusy(true);
    try {
      const ps = await projectService.fetchProjects();
      for (const p of ps) {
        await projectService.deleteProject(p.id);
      }
      setProjects([]);
      toast('All timelines cleared from the database.');
    } catch (e) {
      console.error(e);
      toast('Could not clear data.');
    } finally {
      setBusy(false);
    }
  }, [toast]);

  const createProject = useCallback(
    async (values: NewProjectValues): Promise<string | void> => {
      const newId = uid();
      const tpl = START_TEMPLATES.find((t) => t.id === values.templateId) || START_TEMPLATES[0];
      const stages: Stage[] = tpl.stages.map((st, i) => ({
        id: uid(),
        projectId: newId,
        name: st.name,
        description: st.desc,
        durationDays: st.days,
        dependencyType: st.rule || 'after',
        offsetDays: st.offset ?? 2,
        fixedStart: null,
        fixedRef: null,
        startDate: null,
        endDate: null,
        stageOrder: i,
      }));
      const project: ProjectTimeline = {
        id: newId,
        projectName: values.projectName,
        clientName: values.clientName,
        projectCode: values.projectCode,
        startDate: values.startDate,
        preparedBy: values.preparedBy,
        version: values.version,
        stages,
      };

      if (!isSupabaseConfigured) {
        setProjects((prev) => [...prev, project]);
        closeModal();
        toast('Timeline created.');
        return newId;
      }

      setBusy(true);
      try {
        const created = await projectService.createProject({
          projectName: values.projectName,
          clientName: values.clientName,
          projectCode: values.projectCode,
          startDate: values.startDate,
          preparedBy: values.preparedBy,
        });
        for (const st of stages) {
          await stageService.createStage({ ...st, projectId: created.id });
        }
        setProjects((prev) => [...prev, { ...created, stages }]);
        closeModal();
        toast('Timeline created.');
        return created.id;
      } catch (e) {
        console.error(e);
        toast('Could not create the timeline.');
      } finally {
        setBusy(false);
      }
    },
    [toast, closeModal]
  );

  const saveProjectField = useCallback(
    async (
      id: string,
      field: 'projectName' | 'clientName' | 'projectCode' | 'startDate' | 'preparedBy' | 'version',
      value: string
    ) => {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
      if (!isSupabaseConfigured) return;
      if (field === 'version') return;
      try {
        await projectService.updateProject(id, { [field]: value });
        await new Promise((r) => setTimeout(r, 0));
      } catch (e) {
        console.error(e);
        toast('Could not save the project.');
      }
    },
    [toast]
  );

  const saveStageField = useCallback(
    async (projectId: string, id: string, field: string, value: unknown) => {
      const current = projects.find((p) => p.id === projectId);
      if (!current) return;
      const updated = {
        ...current,
        stages: current.stages.map((st) => (st.id === id ? { ...st, [field]: value } : st)),
      };
      // Recompute the resolved dates so the stage's start/end stay in sync with
      // the edit (e.g. duration, dependency, offset). The timeline chart renders
      // from these actual dates, so they must reflect the current stage data.
      const synced = syncScheduleDates(updated, { satRule, holidays });
      setProjects((prev) => prev.map((p) => (p.id === projectId ? synced : p)));
      if (!isSupabaseConfigured) return;
      try {
        const st = synced.stages.find((s) => s.id === id);
        if (st) await stageService.updateStage(id, st);
      } catch (e) {
        console.error(e);
        toast('Could not save the stage.');
      }
    },
    [projects, satRule, holidays, toast]
  );

  const saveStageFixed = useCallback(
    async (projectId: string, id: string, val: string | null) => {
      const current = projects.find((x) => x.id === projectId);
      if (!current) return;
      let fixedRef: string | null = null;
      if (val) {
        const idx = current.stages.findIndex((st) => st.id === id);
        if (idx >= 0) {
          const S = schedule(current, { satRule, holidays });
          fixedRef = latestAboveEnd(S, idx);
        }
      }
      const updated = {
        ...current,
        stages: current.stages.map((st) => (st.id === id ? { ...st, fixedStart: val, fixedRef } : st)),
      };
      // Recompute the resolved dates so the chart reflects the fixed start date.
      const synced = syncScheduleDates(updated, { satRule, holidays });
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? synced : p))
      );
      if (!isSupabaseConfigured) return;
      try {
        const st = synced.stages.find((s) => s.id === id);
        if (st) await stageService.updateStage(id, st);
      } catch (e) {
        console.error(e);
        toast('Could not save the stage.');
      }
    },
    [projects, satRule, holidays, toast]
  );

  const addStage = useCallback(
    async (projectId: string, input: StageInput) => {
      const p = projects.find((x) => x.id === projectId);
      if (!p) return;
      const engine = { satRule, holidays };
      const order = p.stages.length;

      // Resolve the real start & end using the same scheduling rules as the
      // Gantt chart (fixed date / after / alongside). Dates are computed here,
      // in one place, and shared with the form's live preview.
      const { start, end } = scheduleAppendedStage(p, input, engine);

      const st: Stage = {
        // No id supplied => supabase generates the uuid on insert.
        id: '',
        projectId,
        name: input.name,
        description: input.description,
        durationDays: Math.max(1, Number(input.durationDays) || 1),
        dependencyType: input.scheduleMode === 'with' ? 'with' : 'after',
        offsetDays: 2,
        fixedStart: input.scheduleMode === 'fixed' ? input.fixedStart : null,
        fixedRef: null,
        startDate: start,
        endDate: end,
        stageOrder: order,
      };

      let created: Stage;
      if (!isSupabaseConfigured) {
        created = { ...st, id: uid() };
      } else {
        setBusy(true);
        try {
          created = await stageService.createStage(st);
        } catch (e) {
          console.error('Add stage failed:', e);
          throw e;
        } finally {
          setBusy(false);
        }
      }

      const saved: Stage = { ...created, ...st, id: created.id };
      setProjects((prev) =>
        prev.map((x) => {
          if (x.id !== projectId) return x;
          const withStage = { ...x, stages: [...x.stages, saved] };
          // Re-sync dates so the new stage (and any following stages) get their
          // resolved start/end which the timeline chart renders from.
          return syncScheduleDates(withStage, { satRule, holidays });
        })
      );
    },
    [projects, satRule, holidays]
  );

  const deleteStage = useCallback(
    async (projectId: string, id: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;

      const remaining = project.stages
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, stageOrder: i }));

      // Re-sync dates so the chart drops the deleted stage and recomputes the
      // span from the stages that remain.
      const updated = syncScheduleDates({ ...project, stages: remaining }, { satRule, holidays });

      // Optimistically update UI
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, stages: updated.stages } : p
        )
      );

      if (!isSupabaseConfigured) return;

      setBusy(true);
      try {
        await stageService.deleteStage(id);
        // Persist updated stage_order values for remaining stages
        try {
          await stageService.updateStageOrders(remaining);
        } catch (orderErr) {
          console.error('Stage deleted but failed to update stage order:', orderErr);
        }
      } catch (e) {
        console.error(e);
        // Rollback: restore original stages
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, stages: project.stages } : p
          )
        );
        toast('Could not delete the stage. Please try again.');
      } finally {
        setBusy(false);
      }
    },
    [projects, satRule, holidays, toast]
  );

  const reorderStages = useCallback(
    async (projectId: string, fromId: string, toId: string) => {
      const current = [...(projects.find((p) => p.id === projectId)?.stages || [])];
      const a = current.findIndex((s) => s.id === fromId);
      const b = current.findIndex((s) => s.id === toId);
      if (a < 0 || b < 0 || a === b) return;
      const [moved] = current.splice(a, 1);
      current.splice(b, 0, moved);
      const reordered = current.map((st, i) => ({ ...st, stageOrder: i }));
      const base = projects.find((p) => p.id === projectId);
      if (!base) return;
      // Reorder changes the dependency chain, so resync the resolved dates to
      // keep the timeline chart in step with the new stage order.
      const updated = syncScheduleDates({ ...base, stages: reordered }, { satRule, holidays });
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? updated : p))
      );
      if (!isSupabaseConfigured) return;
      try {
        await stageService.updateStageOrders(updated.stages);
      } catch (e) {
        console.error(e);
        toast('Could not save the new stage order.');
      }
    },
    [projects, satRule, holidays, toast]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (!isSupabaseConfigured) return;
      setBusy(true);
      try {
        await projectService.deleteProject(id);
      } catch (e) {
        console.error(e);
        toast('Could not delete the timeline.');
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  const addHoliday = useCallback(
    async (date: string, name: string) => {
      const h: Holiday = { id: uid(), holidayDate: date, holidayName: name };
      setHolidays((prev) => [...prev, h]);
      if (!isSupabaseConfigured) return;
      setBusy(true);
      try {
        await holidayService.createHoliday(h);
      } catch (e) {
        console.error(e);
        toast('Could not save the holiday.');
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  const updateHoliday = useCallback(
    async (id: string, field: 'holidayDate' | 'holidayName', value: string) => {
      const key = field;
      setHolidays((prev) => prev.map((h) => (h.id === id ? { ...h, [key]: value } : h)));
      if (!isSupabaseConfigured) return;
      try {
        await holidayService.updateHoliday(id, { [key]: value } as Partial<Holiday>);
      } catch (e) {
        console.error(e);
        toast('Could not save the holiday.');
      }
    },
    [toast]
  );

  const deleteHoliday = useCallback(
    async (id: string) => {
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      if (!isSupabaseConfigured) return;
      setBusy(true);
      try {
        await holidayService.deleteHoliday(id);
      } catch (e) {
        console.error(e);
        toast('Could not delete the holiday.');
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  const restoreHolidays = useCallback(async () => {
    const list = demoHolidaysWithIds();
    setHolidays(list);
    if (!isSupabaseConfigured) {
      toast('Default list restored (local). Configure Supabase to persist.');
      return;
    }
    setBusy(true);
    try {
      const existing = await holidayService.fetchHolidays();
      for (const h of existing) {
        await holidayService.deleteHoliday(h.id);
      }
      await holidayService.insertManyHolidays(DEMO_HOLIDAYS.map((h) => ({ ...h, id: uid() })));
      setHolidays(demoHolidaysWithIds());
      toast('Default list restored.');
    } catch (e) {
      console.error(e);
      toast('Could not restore the default list.');
    } finally {
      setBusy(false);
    }
  }, [toast]);

  const saveAsTemplate = useCallback(
    (projectId: string) => {
      const p = projects.find((x) => x.id === projectId);
      if (!p) return;
      const t = { id: uid(), name: p.projectName || 'Untitled template', stagesCount: p.stages.length };
      setTemplates((prev) => [...prev, t]);
      toast('Template saved.');
    },
    [projects, toast]
  );

  const removeTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const Shell = () => (
    <>
      <Navbar onDemoData={loadDemoData} onReload={loadAll} onClear={clearAll} busy={busy || loading} />
      <div className="wrap">
        {error && (
          <div className="note" role="alert">
            {error}
          </div>
        )}
        {loading ? (
          <div className="loading">Loading&hellip;</div>
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <Timelines projects={projects} holidays={holidays} satRule={satRule} onCreate={createProject} />
              }
            />
            <Route
              path="/project/:id"
              element={
                <ProjectDetail
                  projects={projects}
                  holidays={holidays}
                  satRule={satRule}
                  saveProjectField={saveProjectField}
                  saveStageField={saveStageField}
                  saveStageFixed={saveStageFixed}
                  addStage={addStage}
                  deleteStage={deleteStage}
                  reorderStages={reorderStages}
                  deleteProject={deleteProject}
                  saveAsTemplate={saveAsTemplate}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <Settings
                  projects={projects}
                  holidays={holidays}
                  satRule={satRule}
                  setSatRule={setSatRule}
                  studio={studio}
                  setStudio={(k, v) => setStudio((prev) => ({ ...prev, [k]: v }))}
                  templates={templates}
                  onRemoveTemplate={removeTemplate}
                  onAddHoliday={addHoliday}
                  onUpdateHoliday={updateHoliday}
                  onDeleteHoliday={deleteHoliday}
                  onRestoreHolidays={restoreHolidays}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
    </>
  );

  return <Shell />;
}

interface ProjectDetailProps {
  projects: ProjectTimeline[];
  holidays: Holiday[];
  satRule: boolean;
  saveProjectField: (
    id: string,
    field: 'projectName' | 'clientName' | 'projectCode' | 'startDate' | 'preparedBy' | 'version',
    value: string
  ) => void;
  saveStageField: (projectId: string, id: string, field: string, value: unknown) => void;
  saveStageFixed: (projectId: string, id: string, val: string | null) => void;
  addStage: (projectId: string, input: StageInput) => Promise<void>;
  deleteStage: (projectId: string, id: string) => void;
  reorderStages: (projectId: string, fromId: string, toId: string) => void;
  deleteProject: (id: string) => void | Promise<void>;
  saveAsTemplate: (projectId: string) => void;
}

function ProjectDetail({
  projects,
  holidays,
  satRule,
  saveProjectField,
  saveStageField,
  saveStageFixed,
  addStage,
  deleteStage,
  reorderStages,
  deleteProject,
  saveAsTemplate,
}: ProjectDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = projects.find((p) => p.id === id);
  const { confirmBox } = useModal();

  if (!project) {
    return (
      <div className="empty">
        <h2>Project not found</h2>
        <p>The timeline you are looking for does not exist or was deleted.</p>
        <button className="btn primary" onClick={() => navigate('/')}>
          Back to timelines
        </button>
      </div>
    );
  }

  return (
    <TimelineEditor
      project={project}
      holidays={holidays}
      satRule={satRule}
      onSaveProjectField={(field, value) => saveProjectField(project.id, field, value)}
      onStageField={(sid, field, value) => saveStageField(project.id, sid, field, value)}
      onStageFixed={(sid, val, _currentStart) => saveStageFixed(project.id, sid, val)}
      onAddStage={(values) => addStage(project.id, values)}
      onDeleteStage={(sid) => deleteStage(project.id, sid)}
      onReorder={(fromId, toId) => reorderStages(project.id, fromId, toId)}
      onDeleteProject={() => {
        confirmBox(
          'Delete timeline',
          'This timeline and all its stages are removed from the database. This cannot be undone.',
          () => {
            Promise.resolve(deleteProject(project.id)).then(() => navigate('/'));
          }
        );
      }}
      onSaveTemplate={() => saveAsTemplate(project.id)}
    />
  );
}

export default function App() {
  console.log("Supabase client:", supabase);
  return (
    <BrowserRouter>
      <ModalProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </ModalProvider>
    </BrowserRouter>
  );
}
