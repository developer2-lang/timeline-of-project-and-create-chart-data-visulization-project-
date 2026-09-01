import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import type { Holiday, ProjectTimeline } from '../types/timeline';
import { iso } from '../utils/dateUtils';
import { schedule, span } from '../utils/timelineCalculations';
import { workDays } from '../utils/workingDays';

const COLORS = ['#4C4C4D', '#F9C02E', '#8A8A8B', '#D9A315', '#3B3B3C'];

interface StatisticsProps {
  projects: ProjectTimeline[];
  satRule: boolean;
  holidays: Holiday[];
}

export function Statistics({ projects, satRule, holidays }: StatisticsProps) {
  const stats = useMemo(() => {
    const engine = { satRule, holidays };

    const projectMetrics = projects.map((p) => {
      const S = schedule(p, engine);
      const s = span(p, engine);
      const totalWorkingDays = S.length
        ? workDays(iso(s.start), iso(s.end), satRule, holidays)
        : 0;
      const totalStages = p.stages.length;
      const totalStageDays = p.stages.reduce((sum, st) => sum + st.durationDays, 0);
      return {
        project: p,
        startDate: s.start,
        endDate: s.end,
        weeks: s.weeks,
        totalWorkingDays,
        totalStages,
        totalStageDays,
      };
    });

    const totalProjects = projects.length;
    const totalStages = projectMetrics.reduce((s, m) => s + m.totalStages, 0);

    const allDurations = projectMetrics.map((m) => m.totalWorkingDays);
    const avgProjectDuration =
      totalProjects && allDurations.length
        ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length)
        : 0;

    const longest = totalProjects
      ? projectMetrics.reduce((a, b) => (b.totalWorkingDays > a.totalWorkingDays ? b : a))
      : null;
    const shortest = totalProjects
      ? projectMetrics.reduce((a, b) =>
          b.totalWorkingDays < a.totalWorkingDays && b.totalWorkingDays > 0 ? b : a
        )
      : null;

    const stageDays = projects.flatMap((p) => p.stages.map((st) => st.durationDays));
    const avgStageDuration = stageDays.length
      ? Math.round(stageDays.reduce((a, b) => a + b, 0) / stageDays.length)
      : 0;

    return {
      projectMetrics,
      totalProjects,
      totalStages,
      avgProjectDuration,
      longest,
      shortest,
      avgStageDuration,
    };
  }, [projects, satRule, holidays]);

  if (stats.totalProjects === 0) {
    return (
      <div className="card" style={{ padding: '40px 26px', textAlign: 'center' }}>
        <p className="muted">No projects yet — statistics will appear here once you add timelines.</p>
      </div>
    );
  }

  const durationBars = stats.projectMetrics.map((m, i) => ({
    name: m.project.projectName,
    days: m.totalWorkingDays,
    color: COLORS[i % COLORS.length],
  }));

  const stageBars = stats.projectMetrics
    .flatMap((m) =>
      m.project.stages.map((st) => ({
        projectName: m.project.projectName,
        name: st.name,
        days: st.durationDays,
      }))
    )
    .slice(0, 12);

  const statCards = [
    { label: 'Total projects', value: stats.totalProjects },
    { label: 'Total stages', value: stats.totalStages },
    { label: 'Average project length', value: stats.avgProjectDuration + ' wd' },
    {
      label: 'Longest project',
      value: stats.longest ? stats.longest.project.projectName : '—',
      small: true,
    },
    {
      label: 'Shortest project',
      value: stats.shortest ? stats.shortest.project.projectName : '—',
      small: true,
    },
    { label: 'Average stage length', value: stats.avgStageDuration + ' wd' },
  ];

  return (
    <div className="sec">
      <div className="sec-head">
        <h2>Project statistics</h2>
      </div>
      <div className="stats-grid">
        {statCards.map((c, i) => (
          <div className="card stat-card" key={i}>
            <div className="stat-label">{c.label}</div>
            <div className={'stat-value' + (c.small ? ' small' : '')}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="chart-grid">
        <div className="card chart-card">
          <h3>Project duration comparison</h3>
          <p className="muted">Working days per project</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={durationBars}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E3DE" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5C5C5D' }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11, fill: '#909091' }} />
              <Tooltip cursor={{ fill: '#FDF9EE' }} />
              <Bar dataKey="days" name="Working days" radius={[4, 4, 0, 0]}>
                {durationBars.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3>Stage duration distribution</h3>
          <p className="muted">Working days per stage</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stageBars}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E3DE" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5C5C5D' }} interval={0} angle={-28} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 11, fill: '#909091' }} />
              <Tooltip cursor={{ fill: '#FDF9EE' }} />
              <Bar dataKey="days" name="Working days" fill="#F9C02E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
