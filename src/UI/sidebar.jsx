import "../App.css";
import "./sidebar.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

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

// Funzione per generare sempre lo stesso colore dato un ID o una stringa
const getAvatarBgColor = (str = "") => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORI_AVATAR.length;
  return COLORI_AVATAR[index];
};

// Funzione per estrarre le iniziali
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
  const [progettiOpen, setProgettiOpen] = useState(false);
  const [progettiList, setProgettiList] = useState([]);
  const [allTasks, setAllTasks] = useState([]);

  useEffect(() => {
    async function fetchData() {
      // 1. Carica i progetti
      const { data: projData, error: projErr } = await supabase
        .from("progetti")
        .select("id, nome");

      if (projErr) console.error("Errore caricamento progetti:", projErr);
      else if (projData) setProgettiList(projData);

      // 2. Carica tutti i task per verificare lo stato
      const { data: taskData, error: taskErr } = await supabase
        .from("task")
        .select("id, progetto_id, stato");

      if (taskErr) console.error("Errore caricamento task:", taskErr);
      else if (taskData) setAllTasks(taskData);
    }

    fetchData();

    // Realtime per aggiornamento immediato
    const taskSubscription = supabase
      .channel("realtime-sidebar-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setAllTasks((prevTasks) =>
              prevTasks.map((t) =>
                t.id === payload.new.id ? { ...t, ...payload.new } : t
              )
            );
          } else if (payload.eventType === "INSERT") {
            setAllTasks((prevTasks) => [...prevTasks, payload.new]);
          } else if (payload.eventType === "DELETE") {
            setAllTasks((prevTasks) =>
              prevTasks.filter((t) => t.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    const projSubscription = supabase
      .channel("realtime-sidebar-progetti")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "progetti" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskSubscription);
      supabase.removeChannel(projSubscription);
    };
  }, []);

  // Controllo ruolo Admin per i menu riservati
  const ruoloLower = (currentUser?.ruolo || "").toLowerCase();
  const isAdmin = ruoloLower === "admin" || ruoloLower === "administrator";

  // Filtro delle voci di menu riservate agli admin
  const filteredSidebarElements = sidebarElements.filter((item) => {
    if (item.adminOnly) return isAdmin;
    return true;
  });

  // Dati utente per il footer
  const nomeUtente = currentUser
    ? `${currentUser.nome || ""} ${currentUser.cognome || ""}`.trim() || currentUser.email
    : "Accedi";

  const ruoloUtente = currentUser?.ruolo || "";

  // Calcolo dinamico di iniziali e colore avatar per l'utente corrente
  const iniziali = getIniziali(currentUser);
  const avatarBg = getAvatarBgColor(currentUser?.id || currentUser?.email || nomeUtente);

  const isProjectCompleted = (progettoId) => {
    const projectTasks = allTasks.filter(
      (t) => String(t.progetto_id) === String(progettoId)
    );

    if (projectTasks.length === 0) return false;

    return projectTasks.every((t) => {
      const s = (t.stato || "").toLowerCase();
      return s === "done" || s === "completato";
    });
  };

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
                const isDone = isProjectCompleted(progetto.id);

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
                        backgroundColor: isDone ? "#10b981" : "#ef4444",
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
        {/* Avatar Cerchietto Dinamico con Iniziali */}
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