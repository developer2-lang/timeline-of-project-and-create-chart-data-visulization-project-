import { HolidayList } from '../components/HolidayList';
import { HolidayForm } from '../components/HolidayForm';
import { Statistics } from '../components/Statistics';
import { useModal } from '../components/ModalContext';
import useToast from '../components/useToast';
import type { Holiday, ProjectTimeline } from '../types/timeline';

interface SettingsProps {
  projects: ProjectTimeline[];
  holidays: Holiday[];
  satRule: boolean;
  setSatRule: (value: boolean) => void;
  studio: { line1: string; line2: string };
  setStudio: (k: 'line1' | 'line2', v: string) => void;
  templates: { id: string; name: string; stagesCount: number }[];
  onRemoveTemplate: (id: string) => void;
  onAddHoliday: (date: string, name: string) => void;
  onUpdateHoliday: (id: string, field: 'holidayDate' | 'holidayName', value: string) => void;
  onDeleteHoliday: (id: string) => void;
  onRestoreHolidays: () => void;
  showStatistics?: boolean;
}

export function Settings({
  projects,
  holidays,
  satRule,
  setSatRule,
  studio,
  setStudio,
  templates,
  onRemoveTemplate,
  onAddHoliday,
  onUpdateHoliday,
  onDeleteHoliday,
  onRestoreHolidays,
  showStatistics = true,
}: SettingsProps) {
  const { openModal } = useModal();
  const toast = useToast();

  const handleAdd = () => {
    openModal('Add a date', <HolidayForm onSubmit={onAddHoliday} />, []);
  };

  const handleExport = () => {
    const data = {
      projects,
      holidays,
      studio,
      templates,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'iuova-client-timelines-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Backup downloaded.');
  };

  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">Studio setup</div>
          <h1>Settings</h1>
        </div>
      </div>

      {showStatistics && <Statistics projects={projects} satRule={satRule} holidays={holidays} />}

      <div className="sec">
        <div className="sec-head">
          <h2>Working week</h2>
        </div>
        <div className="card" style={{ padding: '20px 22px' }}>
          <label className="chk">
            <input
              type="checkbox"
              checked={satRule}
              onChange={(e) => setSatRule(e.target.checked)}
            />
            The 2nd and 4th Saturday of each month are non-working
          </label>
          <div className="muted" style={{ fontSize: '13.5px', marginTop: 9 }}>
            Sundays are always non-working. Untick above if the studio works every Saturday.
          </div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-head">
          <h2>Studio details</h2>
        </div>
        <div className="card setup" style={{ margin: 0 }}>
          <div className="field">
            <label>Name on the PDF</label>
            <input
              value={studio.line1}
              onChange={(e) => setStudio('line1', e.target.value)}
              placeholder="IUOVA Design Company"
            />
          </div>
          <div className="field">
            <label>Address line</label>
            <input
              value={studio.line2}
              onChange={(e) => setStudio('line2', e.target.value)}
              placeholder="Address"
            />
          </div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-head">
          <h2>Saved templates</h2>
        </div>
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="d">
            <thead>
              <tr>
                <th style={{ width: 280 }}>Template</th>
                <th>Stages</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {templates.length ? (
                templates.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td className="muted">{t.stagesCount} stages</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn ghost sm" onClick={() => onRemoveTemplate(t.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="muted">
                    No saved templates yet. Save one from inside a timeline.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <HolidayList
        holidays={holidays}
        onUpdate={onUpdateHoliday}
        onDelete={onDeleteHoliday}
        onAdd={handleAdd}
        onRestore={onRestoreHolidays}
      />

      <div className="sec">
        <div className="sec-head">
          <h2>Your data</h2>
        </div>
        <div className="card" style={{ padding: '20px 22px' }}>
          <div className="muted" style={{ fontSize: '13.5px', marginBottom: 14 }}>
            Timelines are stored in Supabase. Export a backup if you want a copy elsewhere.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" onClick={handleExport}>
              Export a backup
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
