import "../App.css";
import "./dashboard.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import CardHome from './cardHome';
import TaskCard from './taskCard';
import PerformanceCard from "./performaceCard";
import SettingsCard from "./SettingsCard";
import ProjectCard from "./ProjectCard";
import ClientCard from "./ClientCard";

function Dashboard() {
  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Dashboard</h1>

      {/* Card principale Team (in alto a larghezza piena) */}
      <div className="dashboard-section">
        <CardHome />
      </div>

      {/* Griglia per le card più piccole */}
      <div className="dashboard-grid">
        <TaskCard />
        <PerformanceCard />
        <SettingsCard />
        <ClientCard />
        <ProjectCard />
      </div>
    </div>
  );
}

export default Dashboard;