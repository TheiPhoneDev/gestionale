import "../App.css";
import "./SettingsCard.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import "./dashboard.css"; // Importa il CSS specifico per la dashboard


function SettingsCard() {
    return(
         <div className="sett-card-home-container">
            <h2 className="settcardTitle">Impostazioni</h2>
           <p>Gestisci le tue impostazioni</p>
            <button className="goTosettBtn">
                <b>Vai a impostazioni<i className="bi bi-chevron-right"></i></b>
            </button>
        </div>
    )
}

export default SettingsCard