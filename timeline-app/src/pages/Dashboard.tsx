import type { Holiday, ProjectTimeline } from '../types/timeline';
import { DashboardGantt } from '../components/DashboardGantt';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  projects: ProjectTimeline[];
  holidays: Holiday[];
  satRule: boolean;
}

export function Dashboard({ projects, holidays, satRule }: DashboardProps) {
  const navigate = useNavigate();

  if (projects.length === 0) {
    return (
      <div className="empty" style={{ margin: '60px auto' }}>
        <h2>No projects to display</h2>
        <p>
          Create your first timeline in the Timelines tab or load demo data from the top menu to view the dashboard.
        </p>
        <div style={{ marginTop: 16 }}>
          <button className="btn primary" onClick={() => navigate('/')}>
            Go to Timelines
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ref-dashboard-page">
      <DashboardGantt
        projects={projects}
        holidays={holidays}
        satRule={satRule}
      />
    </div>
  );
}
