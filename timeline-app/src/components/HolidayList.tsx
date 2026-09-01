import { useMemo } from 'react';
import type { Holiday } from '../types/timeline';
import { X } from 'lucide-react';

interface HolidayListProps {
  holidays: Holiday[];
  onUpdate: (id: string, field: 'holidayDate' | 'holidayName', value: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onRestore: () => void;
}

export function HolidayList({ holidays, onUpdate, onDelete, onAdd, onRestore }: HolidayListProps) {
  const byYear = useMemo(() => {
    const m: Record<string, Holiday[]> = {};
    holidays
      .slice()
      .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))
      .forEach((h) => {
        const y = h.holidayDate.slice(0, 4);
        (m[y] = m[y] || []).push(h);
      });
    return m;
  }, [holidays]);

  return (
    <div className="sec">
      <div className="sec-head">
        <h2>Holidays</h2>
        <div style={{ display: 'flex', gap: 9 }}>
          <button className="btn sm" onClick={onRestore}>
            Restore default list
          </button>
          <button className="btn sm" onClick={onAdd}>
            Add a date
          </button>
        </div>
      </div>
      <div className="note">
        <strong>Check these before you commit a client schedule.</strong> Festival dates move year
        to year and some depend on local declaration. Edit anything that is wrong, and add studio
        closures here too.
      </div>
      {Object.keys(byYear)
        .sort()
        .map((y) => (
          <div style={{ marginBottom: 16 }} key={y}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              {y}
            </div>
            <div className="card" style={{ overflow: 'auto' }}>
              <table className="d">
                <tbody>
                  {byYear[y].map((h) => (
                    <tr key={h.id}>
                      <td style={{ width: 170 }}>
                        <input
                          type="date"
                          value={h.holidayDate}
                          onChange={(e) => onUpdate(h.id, 'holidayDate', e.target.value)}
                          aria-label="Holiday date"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={h.holidayName}
                          onChange={(e) => onUpdate(h.id, 'holidayName', e.target.value)}
                          aria-label="Holiday name"
                        />
                      </td>
                      <td style={{ width: 60, textAlign: 'right' }}>
                        <button className="btn ghost sm" onClick={() => onDelete(h.id)} aria-label={`Delete ${h.holidayName}`}>
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}
