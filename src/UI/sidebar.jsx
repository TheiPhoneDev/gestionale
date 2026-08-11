import "../App.css";
import "./sidebar.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

function Sidebar({ activePage, onPageChange, currentUser }) {
  const [activeId, setActiveId] = useState("dashboard");
  const [progettiOpen, setProgettiOpen] = useState(false);
  const [progettiList, setProgettiList] = useState([]);

  useEffect(() => {
    async function fetchProgetti() {
      const { data, error } = await supabase
        .from("progetti")
        .select("id, nome, stato");

      if (error) {
        console.error("Errore nel caricamento dei progetti in Sidebar:", error);
      } else if (data) {
        setProgettiList(data);
      }
    }

    fetchProgetti();
  }, []);

  // Nome da visualizzare nel footer della sidebar
  const nomeUtente = currentUser
    ? `${currentUser.nome || ""} ${currentUser.cognome || ""}`.trim() || currentUser.email
    : "Accedi";

  return (
    <aside className="sidebar">
      <div className="sidebar-menu">
        {sidebarElements.map((item) => {
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
              }}
            >
              <span style={{ marginRight: "8px" }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}

        {/* Pulsante Progetti */}
        <button
          className="sidebar-link"
          onClick={() => setProgettiOpen(!progettiOpen)}
          style={{
            background: "none",
            border: "none",
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
            color: progettiOpen || activeId.startsWith("progetto-") ? "#fff" : "#515151",
          }}
        >
          <span className="sidebar-icon" style={{ marginRight: "8px" }}>
            <i className="bi bi-tools"></i>
          </span>
          Progetti
          <i
            className={`bi bi-chevron-${progettiOpen ? "down" : "right"} ms-auto`}
            style={{ marginLeft: "auto" }}
          ></i>
        </button>

        {/* Sottomenu Progetti */}
        {progettiOpen && (
          <div className="sidebar-submenu" style={{ paddingLeft: "15px" }}>
            {progettiList.length === 0 ? (
              <span style={{ color: "#888", fontSize: "0.85rem" }}>
                Nessun progetto
              </span>
            ) : (
              progettiList.map((progetto) => {
                const isSubActive = activeId === `progetto-${progetto.id}`;
                return (
                  <button
                    key={progetto.id}
                    onClick={() => {
                      setActiveId(`progetto-${progetto.id}`);
                      if (onPageChange) onPageChange(`progetto-${progetto.id}`);
                    }}
                    className="sidebar-sublink"
                    style={{
                      background: "none",
                      border: "none",
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                      textDecoration: "none",
                      color: isSubActive ? "#fff" : "#515151",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "4px 0",
                    }}
                  >
                    <span
                      className="status-dot"
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor:
                          progetto.stato === "in_corso" ? "#10b981" : "#ef4444",
                      }}
                    ></span>
                    {progetto.nome}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Footer Sidebar dinamico */}
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
          transition: "background 0.2s",
        }}
      >
        <span style={{ color: "#fff", marginRight: "8px" }}>
          <i className="bi bi-person-circle fs-5"></i>
        </span>
        <span style={{ color: "#fff", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {nomeUtente}
        </span>
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
  },
  {
    id: "task",
    icon: <i className="bi bi-list-task"></i>,
    label: "Task",
    color: "#fff",
    color2: "#515151",
  },
  {
    id: "clienti",
    icon: <i className="bi bi-people-fill"></i>, // Icona per i Clienti
    label: "Clienti",
    color: "#fff",
    color2: "#515151",
  },
  {
    id: "ganttChart",
    icon: <i className="bi bi-clipboard2-data-fill"></i>,
    label: "Diagramma Gantt",
    color: "#fff",
    color2: "#515151",
  },
];