import { useNavigate } from 'react-router-dom';
import { TimelineList } from '../components/TimelineList';
import { ProjectForm, type NewProjectValues } from '../components/ProjectForm';
import { useModal } from '../components/ModalContext';
import useToast from '../components/useToast';
import type { Holiday, ProjectTimeline } from '../types/timeline';

interface TimelinesProps {
  projects: ProjectTimeline[];
  holidays: Holiday[];
  satRule: boolean;
  onCreate: (values: NewProjectValues) => Promise<string | void>;
}

export function Timelines({ projects, holidays, satRule, onCreate }: TimelinesProps) {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const toast = useToast();

  const handleNew = () => {
    openModal(
      'Start a timeline',
      <ProjectForm
        onSubmit={(values) => {
          onCreate(values)
            .then((id) => {
              if (id) navigate(`/project/${id}`);
            })
            .catch(() => toast('Could not create the timeline.'));
        }}
      />,
      []
    );
  };

  const openProject = (id: string) => navigate(`/project/${id}`);

  return (
    <TimelineList
      projects={projects}
      holidays={holidays}
      satRule={satRule}
      empty={projects.length === 0}
      onNew={handleNew}
      onOpen={openProject}
    />
  );
}
