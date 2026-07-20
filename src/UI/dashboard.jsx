import "../App.css";
import "./dashboard.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import CardHome from './cardHome';
import TaskCard from './taskCard';
import PerformanceCard from "./performaceCard";
import SettingsCard from "./SettingsCard";

function Dashboard() {
    return(
        <div>
            <h1>Dashboard</h1>
            <br />
            <CardHome />
            <br />
            <div className="smaller-cards-home">
                <TaskCard />
                <PerformanceCard />
                <SettingsCard />
            </div>
        </div>
    )
}

export default Dashboard