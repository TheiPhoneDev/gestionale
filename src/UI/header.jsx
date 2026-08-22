import "../App.css"
import "./header.css"
import 'bootstrap/dist/css/bootstrap.css';
import "bootstrap-icons/font/bootstrap-icons.min.css";
import NotificheDropdown from "./Notifications"; // Assicurati che il percorso del file sia corretto

function Header() {
    return(
        <header className="header d-flex justify-content-between align-items-center px-4">
            <h2 style={{color: "#fff"}} className="mb-0">Gestionale</h2>
            <div className="d-flex align-items-center">
                <NotificheDropdown />
            </div>
        </header>
    )
}

export default Header
