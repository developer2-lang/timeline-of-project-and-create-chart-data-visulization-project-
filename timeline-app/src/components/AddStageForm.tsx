import { useMemo, useState } from 'react';
import { useModal } from './ModalContext';
import type { Engine } from '../utils/timelineCalculations';
import { schedule, scheduleAppendedStage, calculateStageEndDate } from '../utils/timelineCalculations';
import { fmt } from '../utils/dateUtils';
import type { Holiday, ProjectTimeline, ScheduleMode, Stage, StageInput } from '../types/timeline';

export type AddStageFormValues = StageInput;

interface AddStageFormProps {
  project: ProjectTimeline;
  satRule: boolean;
  holidays: Holiday[];
  onSubmit: (values: AddStageFormValues) => Promise<void>;
  mode?: 'add' | 'edit';
  stage?: Stage;
  onUpdate?: (values: AddStageFormValues) => Promise<void>;
}

function stageToScheduleMode(stage: Stage): ScheduleMode {
  if (stage.fixedStart) return 'fixed';
  if (stage.dependencyType === 'with') return 'with';
  return 'after';
}

export function AddStageForm({ project, satRule, holidays, onSubmit, mode = 'add', stage, onUpdate }: AddStageFormProps) {
  const { closeModal } = useModal();
  const isEdit = mode === 'edit';
  const isFirst = isEdit
    ? project.stages.length <= 1 || (stage && project.stages[0]?.id === stage.id)
    : project.stages.length === 0;

  const [name, setName] = useState(stage?.name ?? '');
  const [description, setDescription] = useState(stage?.description ?? '');
  const [durationDays, setDurationDays] = useState(stage?.durationDays ?? 5);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(
    isEdit && stage ? stageToScheduleMode(stage) : 'after'
  );
  const [fixedStart, setFixedStart] = useState(
    stage?.fixedStart ?? project.startDate ?? ''
  );
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const engine: Engine = useMemo(() => ({ satRule, holidays }), [satRule, holidays]);

  const preview = useMemo(() => {
    const days = Math.max(1, Number(durationDays) || 1);

    if (isEdit && stage) {
      // In edit mode, replace the stage in the project at its current position
      const modified: Stage = {
        ...stage,
        name: name.trim(),
        description: description.trim(),
        durationDays: days,
        dependencyType: scheduleMode === 'with' ? 'with' : 'after',
        offsetDays: stage.offsetDays,
        fixedStart: scheduleMode === 'fixed' ? fixedStart : null,
      };
      const idx = project.stages.findIndex((s) => s.id === stage.id);
      const stagesBefore = project.stages.slice(0, idx);
      const stagesAfter = project.stages.slice(idx + 1);
      const projectForPreview: ProjectTimeline = {
        ...project,
        stages: [...stagesBefore, modified, ...stagesAfter],
      };
      const S = schedule(projectForPreview, engine);
      const r = S.find((x) => x.stageId === stage.id);
      if (!r) return null;
      return { start: r.start, end: r.end };
    }

    // Add mode
    const input = { name, description, durationDays: days, scheduleMode, fixedStart };
    if (scheduleMode === 'fixed') {
      if (!fixedStart) return null;
      const start = calculateStageEndDate(fixedStart, 0, engine);
      return { start, end: calculateStageEndDate(start, days, engine) };
    }
    return scheduleAppendedStage(project, input, engine);
  }, [name, description, durationDays, scheduleMode, fixedStart, project, engine, isEdit, stage]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Give the stage a name.';
    if (!Number.isFinite(durationDays) || durationDays < 1) {
      errs.durationDays = 'Duration must be at least 1 working day.';
    }
    if (scheduleMode === 'fixed' && !fixedStart) {
      errs.fixedStart = 'Pick a start date.';
    }
    setFieldError(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitError(null);
    setSaving(true);
    try {
      const values: AddStageFormValues = {
        name: name.trim(),
        description: description.trim(),
        durationDays: Math.max(1, Number(durationDays) || 1),
        scheduleMode,
        fixedStart,
      };
      if (isEdit && onUpdate) {
        await onUpdate(values);
      } else {
        await onSubmit(values);
      }
      closeModal();
    } catch (e) {
      console.error(isEdit ? 'Edit stage failed:' : 'Add stage failed:', e);
      setSubmitError(
        'Could not save the stage to the database. Check your connection and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="field">
        <label htmlFor="as-name">Stage name</label>
        <input
          id="as-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Design"
        />
        {fieldError.name && <div className="field-err">{fieldError.name}</div>}
      </div>

      <div className="field">
        <label htmlFor="as-desc">Description</label>
        <textarea
          id="as-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happens in this stage — one line the client will read"
          rows={2}
        />
      </div>

      <div className="field">
        <label htmlFor="as-days">Duration (working days)</label>
        <input
          id="as-days"
          type="number"
          min={1}
          value={durationDays}
          onChange={(e) => setDurationDays(Number(e.target.value))}
        />
        {fieldError.durationDays && <div className="field-err">{fieldError.durationDays}</div>}
      </div>

      <div className="field">
        <label>Start / scheduling</label>
        <div className="radio-row">
          {isFirst && (
            <label className="radio">
              <input
                type="radio"
                name="schedule"
                value="after"
                checked={scheduleMode === 'after'}
                onChange={() => setScheduleMode('after')}
              />
              Start on project start date
            </label>
          )}
          <label className="radio">
            <input
              type="radio"
              name="schedule"
              value="fixed"
              checked={scheduleMode === 'fixed'}
              onChange={() => setScheduleMode('fixed')}
            />
            Start on selected date
          </label>
          {!isFirst && (
            <>
              <label className="radio">
                <input
                  type="radio"
                  name="schedule"
                  value="after"
                  checked={scheduleMode === 'after'}
                  onChange={() => setScheduleMode('after')}
                />
                After the stage above
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="schedule"
                  value="with"
                  checked={scheduleMode === 'with'}
                  onChange={() => setScheduleMode('with')}
                />
                Alongside the stage above
              </label>
            </>
          )}
        </div>
        {!isFirst && scheduleMode === 'after' ? (
          <div className="muted" style={{ fontSize: '13px' }}>
            Starts the next working day after the stages above finish.
          </div>
        ) : null}
      </div>

      {scheduleMode === 'fixed' && (
        <div className="field">
          <label htmlFor="as-start">Start date</label>
          <input
            id="as-start"
            type="date"
            value={fixedStart}
            onChange={(e) => setFixedStart(e.target.value)}
          />
          {fieldError.fixedStart && <div className="field-err">{fieldError.fixedStart}</div>}
        </div>
      )}

      {preview ? (
        <div className="date-preview">
          <div className="item">
            <span>Starts</span>
            <b>{fmt(preview.start)}</b>
          </div>
          <div className="item">
            <span>Ends</span>
            <b>{fmt(preview.end)}</b>
          </div>
          <div className="item alt">
            <span>Duration</span>
            <b>{Math.max(1, Number(durationDays) || 1)} working days</b>
          </div>
        </div>
      ) : null}

      {submitError && <div className="field-err">{submitError}</div>}

      <button className="btn primary" onClick={submit} disabled={saving}>
        {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add stage'}
      </button>
    </>
  );
}
