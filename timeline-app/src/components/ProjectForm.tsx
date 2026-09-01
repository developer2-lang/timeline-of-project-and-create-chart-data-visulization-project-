import { useState } from 'react';
import { useModal } from './ModalContext';
import useToast from './useToast';
import { START_TEMPLATES } from '../data/demoData';

export interface NewProjectValues {
  projectName: string;
  clientName: string;
  projectCode: string;
  startDate: string;
  manager: string;
  version: string;
  templateId: string;
}

interface ProjectFormProps {
  onSubmit: (values: NewProjectValues) => void;
}

export function ProjectForm({ onSubmit }: ProjectFormProps) {
  const { closeModal } = useModal();
  const toast = useToast();
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [manager, setManager] = useState('');
  const [templateId, setTemplateId] = useState(START_TEMPLATES[2].id);

  const submit = () => {
    if (!projectName.trim()) {
      toast('Give the project a name.');
      return;
    }
    if (!startDate) {
      toast('Pick a start date.');
      return;
    }
    onSubmit({
      projectName: projectName.trim(),
      clientName: clientName.trim(),
      projectCode: projectCode.trim(),
      startDate,
      manager: manager.trim(),
      version: 'R0',
      templateId,
    });
    closeModal();
  };

  return (
    <>
      <div className="field">
        <label htmlFor="np-name">Project name</label>
        <input
          id="np-name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="e.g. AIS Window Handle Family"
        />
      </div>
      <div className="field">
        <label htmlFor="np-client">Client name</label>
        <input
          id="np-client"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Client name"
        />
      </div>
      <div className="field">
        <label htmlFor="np-code">Project code</label>
        <input
          id="np-code"
          value={projectCode}
          onChange={(e) => setProjectCode(e.target.value)}
          placeholder="IUV-0000"
        />
      </div>
      <div className="field">
        <label htmlFor="np-start">Start date</label>
        <input
          id="np-start"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="np-manager">Prepared by</label>
        <input
          id="np-manager"
          value={manager}
          onChange={(e) => setManager(e.target.value)}
          placeholder="Design manager"
        />
      </div>
      <div className="field">
        <label htmlFor="np-tpl">Begin from</label>
        <select id="np-tpl" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {START_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="muted" style={{ fontSize: '13.5px' }}>
          Stage names, durations and descriptions come across ready to edit.
        </div>
      </div>
      <button className="btn primary" onClick={submit}>
        Create & open
      </button>
    </>
  );
}
