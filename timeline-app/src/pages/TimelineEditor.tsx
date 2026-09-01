import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Download, Mail, Trash2, ChevronLeft } from 'lucide-react';
import { StageList } from '../components/StageList';
import { GanttChart } from '../components/GanttChart';
import { useModal } from '../components/ModalContext';
import useToast from '../components/useToast';
import type { Holiday, ProjectTimeline } from '../types/timeline';
import { schedule, span } from '../utils/timelineCalculations';
import { fmt, iso } from '../utils/dateUtils';

interface TimelineEditorProps {
  project: ProjectTimeline;
  holidays: Holiday[];
  satRule: boolean;
  onSaveProjectField: (field: 'projectName' | 'clientName' | 'projectCode' | 'startDate' | 'manager' | 'version', value: string) => void;
  onStageField: (id: string, field: string, value: unknown) => void;
  onStageFixed: (id: string, val: string | null, currentStart: string) => void;
  onAddStage: () => void;
  onDeleteStage: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onDeleteProject: () => void;
  onSaveTemplate: () => void;
}

export function TimelineEditor({
  project,
  holidays,
  satRule,
  onSaveProjectField,
  onStageField,
  onStageFixed,
  onAddStage,
  onDeleteStage,
  onReorder,
  onDeleteProject,
  onSaveTemplate,
}: TimelineEditorProps) {
  const { confirmBox } = useModal();
  const toast = useToast();

  const engine = useMemo(() => ({ satRule, holidays }), [satRule, holidays]);
  const s = useMemo(() => span(project, engine), [project, engine]);

  const handleDeleteProject = () => {
    confirmBox(
      'Delete timeline',
      'This timeline and all its stages are removed from the database. Export from Settings first if you need a copy.',
      () => {
        onDeleteProject();
      }
    );
  };

  const handleExport = () => {
    // Build a readable text summary and download it.
    const S = schedule(project, engine);
    const lines = project.stages.map((st) => {
      const r = S.find((x) => x.stageId === st.id);
      return r ? `${st.name} — ${r.start} to ${r.end} (${st.durationDays} working days)` : st.name;
    });
    const body = [
      project.projectName,
      `Client: ${project.clientName || '—'}`,
      `Code: ${project.projectCode || '—'}`,
      `Starts: ${fmt(iso(s.start))}`,
      `Completes: ${fmt(iso(s.end))}`,
      `Duration: ${s.weeks} weeks`,
      '',
      ...lines,
    ].join('\n');
    const blob = new Blob([body], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (project.projectCode || project.projectName) + '-timeline.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Timeline summary downloaded.');
  };

  const handleEmail = () => {
    const S = schedule(project, engine);
    const lines = project.stages.map((st) => {
      const r = S.find((x) => x.stageId === st.id);
      return r
        ? `  ${st.name} — ${fmt(r.start)} to ${fmt(r.end)} (${st.durationDays} working days)`
        : `  ${st.name}`;
    });
    const body = `Dear ${project.clientName || 'team'},\n\nPlease find the project timeline for ${project.projectName}${
      project.projectCode ? ' (' + project.projectCode + ')' : ''
    }, version ${project.version}.\n\nThe programme runs ${s.weeks} weeks, from ${fmt(iso(s.start))} to ${fmt(iso(s.end))}.\n\nSTAGES\n\n${lines.join('\n\n')}`;
    window.location.href =
      'mailto:?subject=' + encodeURIComponent(`${project.projectName} — project timeline ${project.version}`) + '&body=' + encodeURIComponent(body);
    toast('Mail draft opened.');
  };

  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">
            <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
              <ChevronLeft size={14} style={{ verticalAlign: '-2px' }} /> All timelines
            </Link>
          </div>
          <h1>{project.projectName || 'Untitled project'}</h1>
          <div className="muted" style={{ marginTop: 8, fontSize: 14 }}>
            {s.weeks} weeks · {fmt(iso(s.start))} to {fmt(iso(s.end))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={handleExport}>
            <Download size={15} /> Export
          </button>
          <button className="btn" onClick={handleEmail}>
            <Mail size={15} /> Email draft
          </button>
          <button className="btn ghost" onClick={handleDeleteProject}>
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>

      <div className="card setup">
        <div className="field">
          <label>Project</label>
          <input
            value={project.projectName}
            onChange={(e) => onSaveProjectField('projectName', e.target.value)}
          />
        </div>
        <div className="field">
          <label>Client</label>
          <input
            value={project.clientName}
            onChange={(e) => onSaveProjectField('clientName', e.target.value)}
            placeholder="Client name"
          />
        </div>
        <div className="field">
          <label>Project code</label>
          <input
            value={project.projectCode}
            onChange={(e) => onSaveProjectField('projectCode', e.target.value)}
            placeholder="IUV-0000"
          />
        </div>
        <div className="field">
          <label>Prepared by</label>
          <input
            value={project.manager}
            onChange={(e) => onSaveProjectField('manager', e.target.value)}
            placeholder="Design manager"
          />
        </div>
        <div className="field">
          <label>Starts on</label>
          <input
            type="date"
            value={project.startDate}
            onChange={(e) => onSaveProjectField('startDate', e.target.value)}
          />
        </div>
        <div className="field">
          <label>Version</label>
          <input
            value={project.version}
            onChange={(e) => onSaveProjectField('version', e.target.value)}
          />
        </div>
      </div>

      <div className="sec">
        <div className="sec-head">
          <h2>Stages</h2>
          <div style={{ display: 'flex', gap: 9 }}>
            <button className="btn sm" onClick={onAddStage}>
              <Plus size={14} /> Add stage
            </button>
            <button className="btn sm" onClick={onSaveTemplate}>
              Save as template
            </button>
          </div>
        </div>
        <div className="card" id="stageList">
          <StageList
            project={project}
            satRule={satRule}
            holidays={holidays}
            onName={(id, name) => onStageField(id, 'name', name)}
            onDesc={(id, desc) => onStageField(id, 'description', desc)}
            onDays={(id, days) => onStageField(id, 'durationDays', days)}
            onRule={(id, rule) => onStageField(id, 'dependencyType', rule)}
            onOffset={(id, offset) => onStageField(id, 'offsetDays', offset)}
            onFixed={onStageFixed}
            onDelete={onDeleteStage}
            onReorder={onReorder}
          />
        </div>
        <div className="muted" style={{ fontSize: 13, marginTop: 9 }}>
          Drag to reorder. Weekends and public holidays are already excluded from every duration.
        </div>
      </div>

      <div className="sec">
        <div className="sec-head">
          <h2>Timeline</h2>
        </div>
        <GanttChart project={project} satRule={satRule} holidays={holidays} />
      </div>
    </>
  );
}
