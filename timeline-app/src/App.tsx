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
import { demoHolidaysWithIds, buildDemoProjects, DEMO_HOLIDAYS, START_TEMPLATES } from './data/demoData';
import { schedule } from './utils/timelineCalculations';
import { uid } from './utils/dateUtils';
import type { Holiday, ProjectTimeline, Stage, StudioSettings, ScheduleResult } from './types/timeline';
import type { NewProjectValues } from './components/ProjectForm';

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
      setLoading(false);
      setError(
        'Supabase is not configured. Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to a .env file, then create the tables. You can still browse a local sample.'
      );
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
      if (!ps.length) {
        // Optionally seed demo holidays so calculations make sense.
      }
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

  const loadDemoData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      toast('Supabase is not configured yet — enable it to insert demo data into the database.');
      return;
    }
    setBusy(true);
    try {
      const existing = await projectService.fetchProjects();
      if (existing.length > 0) {
        toast('Demo data already exists — nothing duplicated.');
        return;
      }
      const currentHols = await holidayService.fetchHolidays();
      const existingDates = new Set(currentHols.map((h) => h.holidayDate));
      const toAdd = DEMO_HOLIDAYS.filter((h) => !existingDates.has(h.holidayDate)).map((h) => ({
        ...h,
        id: uid(),
      }));
      if (toAdd.length) {
        await holidayService.insertManyHolidays(toAdd);
        setHolidays((prev) => [...prev, ...toAdd]);
      }

      const engineHols = currentHols.length ? currentHols : demoHolidaysWithIds();
      const demoSpecs = buildDemoProjects(satRule, engineHols);
      for (const spec of demoSpecs) {
        const created = await projectService.createProject({
          projectName: spec.projectName,
          clientName: spec.clientName,
          projectCode: spec.projectCode,
          startDate: spec.startDate,
          manager: spec.manager,
          version: spec.version,
        });
        const stages: Stage[] = spec.stages.map((st, i) => ({
          id: uid(),
          projectId: created.id,
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
        for (const st of stages) {
          await stageService.createStage(st);
        }
        setProjects((prev) => [...prev, { ...created, stages }]);
      }
      toast('Demo data loaded into Supabase.');
    } catch (e) {
      console.error(e);
      toast('Could not load demo data.');
    } finally {
      setBusy(false);
    }
  }, [satRule, toast]);

  const clearAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      toast('Supabase is not configured yet.');
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
      if (!isSupabaseConfigured) {
        toast('Supabase is not configured yet — cannot save. Configure your .env to persist.');
        return;
      }
      setBusy(true);
      try {
        const created = await projectService.createProject({
          projectName: values.projectName,
          clientName: values.clientName,
          projectCode: values.projectCode,
          startDate: values.startDate,
          manager: values.manager,
          version: values.version,
        });
        const tpl = START_TEMPLATES.find((t) => t.id === values.templateId) || START_TEMPLATES[0];
        const stages: Stage[] = tpl.stages.map((st, i) => ({
          id: uid(),
          projectId: created.id,
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
        for (const st of stages) await stageService.createStage(st);
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
      field: 'projectName' | 'clientName' | 'projectCode' | 'startDate' | 'manager' | 'version',
      value: string
    ) => {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
      if (!isSupabaseConfigured) return;
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
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, stages: p.stages.map((st) => (st.id === id ? { ...st, [field]: value } : st)) }
            : p
        )
      );
      if (!isSupabaseConfigured) return;
      try {
        await stageService.updateStage(id, { [field]: value } as Partial<Stage>);
      } catch (e) {
        console.error(e);
        toast('Could not save the stage.');
      }
    },
    [toast]
  );

  const saveStageFixed = useCallback(
    async (projectId: string, id: string, val: string | null) => {
      const current = projects.find((x) => x.id === projectId);
      let fixedRef: string | null = null;
      if (val && current) {
        const idx = current.stages.findIndex((st) => st.id === id);
        if (idx >= 0) {
          const S = schedule(current, { satRule, holidays });
          fixedRef = latestAboveEnd(S, idx);
        }
      }
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, stages: p.stages.map((st) => (st.id === id ? { ...st, fixedStart: val, fixedRef } : st)) }
            : p
        )
      );
      if (!isSupabaseConfigured) return;
      try {
        await stageService.updateStage(id, { fixedStart: val, fixedRef } as Partial<Stage>);
      } catch (e) {
        console.error(e);
        toast('Could not save the stage.');
      }
    },
    [projects, satRule, holidays, toast]
  );

  const addStage = useCallback(
    async (projectId: string) => {
      const p = projects.find((x) => x.id === projectId);
      if (!p) return;
      const order = p.stages.length;
      const st: Stage = {
        id: uid(),
        projectId,
        name: 'New stage',
        description: '',
        durationDays: 5,
        dependencyType: 'after',
        offsetDays: 2,
        fixedStart: null,
        fixedRef: null,
        startDate: null,
        endDate: null,
        stageOrder: order,
      };
      setProjects((prev) =>
        prev.map((x) => (x.id === projectId ? { ...x, stages: [...x.stages, st] } : x))
      );
      if (!isSupabaseConfigured) return;
      setBusy(true);
      try {
        await stageService.createStage(st);
      } catch (e) {
        console.error(e);
        toast('Could not add the stage.');
      } finally {
        setBusy(false);
      }
    },
    [projects, toast]
  );

  const deleteStage = useCallback(
    async (projectId: string, id: string) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, stages: p.stages.filter((s) => s.id !== id) } : p
        )
      );
      if (!isSupabaseConfigured) return;
      setBusy(true);
      try {
        await stageService.deleteStage(id);
      } catch (e) {
        console.error(e);
        toast('Could not delete the stage.');
      } finally {
        setBusy(false);
      }
    },
    [toast]
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
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, stages: reordered } : p))
      );
      if (!isSupabaseConfigured) return;
      try {
        await stageService.updateStageOrders(reordered);
      } catch (e) {
        console.error(e);
        toast('Could not save the new stage order.');
      }
    },
    [projects, toast]
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
    field: 'projectName' | 'clientName' | 'projectCode' | 'startDate' | 'manager' | 'version',
    value: string
  ) => void;
  saveStageField: (projectId: string, id: string, field: string, value: unknown) => void;
  saveStageFixed: (projectId: string, id: string, val: string | null) => void;
  addStage: (projectId: string) => void;
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
      onStageFixed={(sid, val) => saveStageFixed(project.id, sid, val)}
      onAddStage={() => addStage(project.id)}
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
