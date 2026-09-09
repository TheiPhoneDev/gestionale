import "../App.css";
import "./sidebar.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import { useState } from "react";

// Palette di colori per l'avatar
const COLORI_AVATAR = [
  "#0d6efd", // Blu
  "#6f42c1", // Viola
  "#d63384", // Rosa
  "#dc3545", // Rosso
  "#fd7e14", // Arancione
  "#198754", // Verde
  "#20c997", // Smeraldo
  "#0dcaf0", // Azzurro
];

const getAvatarBgColor = (str = "") => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORI_AVATAR.length;
  return COLORI_AVATAR[index];
};

const getIniziali = (currentUser) => {
  if (!currentUser) return "U";
  if (currentUser.nome || currentUser.cognome) {
    const n = (currentUser.nome || "").charAt(0);
    const c = (currentUser.cognome || "").charAt(0);
    return `${n}${c}`.toUpperCase() || "U";
  }
  if (currentUser.email) {
    return currentUser.email.charAt(0).toUpperCase();
  }
  return "U";
};

function Sidebar({ activePage, onPageChange, currentUser }) {
  const [activeId, setActiveId] = useState("dashboard");

  // Controllo ruolo Admin per i menu riservati
  const ruoloLower = (currentUser?.ruolo || "").toLowerCase();
  const isAdmin = ruoloLower === "admin" || ruoloLower === "administrator";

  const filteredSidebarElements = sidebarElements.filter((item) => {
    if (item.adminOnly) return isAdmin;
    return true;
  });

  const nomeUtente = currentUser
    ? `${currentUser.nome || ""} ${currentUser.cognome || ""}`.trim() || currentUser.email
    : "Accedi";

  const ruoloUtente = currentUser?.ruolo || "";
  const iniziali = getIniziali(currentUser);
  const avatarBg = getAvatarBgColor(currentUser?.id || currentUser?.email || nomeUtente);

  return (
    <aside className="sidebar">
      <div className="sidebar-menu">
        {filteredSidebarElements.map((item) => {
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveId(item.id);
                if (onPageChange) onPageChange(item.id);
              }}
              style={{
                background: "none",
                border: "none",
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: isActive ? item.color : item.color2,
                textDecoration: "none",
                padding: "8px 0",
              }}
            >
              <span style={{ marginRight: "8px" }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Footer Sidebar con Avatar Dinamico */}
      <div
        className="sidebar-footer"
        onClick={() => {
          if (onPageChange) onPageChange("profile");
        }}
        style={{
          cursor: "pointer",
          backgroundColor: activePage === "profile" ? "rgba(255, 255, 255, 0.15)" : "transparent",
          padding: "10px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          transition: "background 0.2s",
        }}
      >
        <div
          className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
          style={{
            width: "36px",
            height: "36px",
            backgroundColor: avatarBg,
            fontSize: "0.85rem",
            letterSpacing: "0.5px",
          }}
        >
          {iniziali}
        </div>

        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <span
            style={{
              color: "#fff",
              fontWeight: "bold",
              fontSize: "0.9rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {nomeUtente}
          </span>
          {ruoloUtente && (
            <span
              style={{
                color: "#b3b3b3",
                fontSize: "0.75rem",
                textTransform: "capitalize",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {ruoloUtente}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

const sidebarElements = [
  {
    id: "dashboard",
    icon: <i className="bi bi-file-post"></i>,
    label: "Dashboard",
    color: "#fff",
    color2: "#515151",
    adminOnly: false,
  },
  {
    id: "task",
    icon: <i className="bi bi-list-task"></i>,
    label: "Task",
    color: "#fff",
    color2: "#515151",
    adminOnly: false,
  },
  {
    id: "projects",
    icon: <i className="bi bi-tools"></i>,
    label: "Progetti",
    color: "#fff",
    color2: "#515151",
    adminOnly: false,
  },
   {
    id: "review",
    icon: <i className="bi-clipboard-check"></i>,
    label: "Review",
    color: "#fff",
    color2: "#515151",
    adminOnly: false,
  },
  {
    id: "clienti",
    icon: <i className="bi bi-people-fill"></i>,
    label: "Clienti",
    color: "#fff",
    color2: "#515151",
    adminOnly: false,
  },
  {
    id: "ganttChart",
    icon: <i className="bi bi-clipboard2-data-fill"></i>,
    label: "Diagramma Gantt",
    color: "#fff",
    color2: "#515151",
    adminOnly: false,
  },
  {
    id: "performance",
    icon: <i className="bi bi-graph-up-arrow"></i>,
    label: "Performance",
    color: "#fff",
    color2: "#515151",
    adminOnly: true,
  },
  {
    id: "team",
    icon: <i className="bi bi-person-badge-fill"></i>,
    label: "Gestione Team",
    color: "#fff",
    color2: "#515151",
    adminOnly: true,
  },
];