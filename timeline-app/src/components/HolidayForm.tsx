import { useState } from 'react';
import { useModal } from './ModalContext';
import useToast from './useToast';
import { iso, today } from '../utils/dateUtils';

interface HolidayFormProps {
  onSubmit: (date: string, name: string) => void;
}

export function HolidayForm({ onSubmit }: HolidayFormProps) {
  const { closeModal } = useModal();
  const toast = useToast();
  const [date, setDate] = useState(iso(today()));
  const [name, setName] = useState('');

  const submit = () => {
    if (!date || !name.trim()) {
      toast('Provide both a date and a name for the holiday.');
      return;
    }
    onSubmit(date, name.trim());
    closeModal();
  };

  return (
    <>
      <div className="field">
        <label htmlFor="hd">Date</label>
        <input id="hd" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="hn">Name</label>
        <input
          id="hn"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Studio closed — team offsite"
        />
      </div>
      <button className="btn primary" onClick={submit}>
        Add
      </button>
    </>
  );
}
