import "../App.css";
import "./performanceCard.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";

function PerformanceCard() {
    return(
        <div className="perf-card-home-container">
            <h2 className="perfcardTitle">Performance</h2>
           <p>Vedi le statistiche del tuo team</p>
            <button className="goToperfBtn">
                <b><i class="bi bi-bar-chart-fill"></i>
                Vedi performance</b>
            </button>
        </div>
    )
}

export default PerformanceCard