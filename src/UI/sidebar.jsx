import "./sidebar.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";

import { useState } from "react";

// ============================================================
// COLORI AVATAR
// ============================================================

const COLORI_AVATAR = [
  "#0d6efd",
  "#6f42c1",
  "#d63384",
  "#dc3545",
  "#fd7e14",
  "#198754",
  "#20c997",
  "#0dcaf0",
];

// ============================================================
// UTILITY AVATAR
// ============================================================

const getAvatarBgColor = (str = "") => {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash =
      str.charCodeAt(i) +
      ((hash << 5) - hash);
  }

  const index =
    Math.abs(hash) % COLORI_AVATAR.length;

  return COLORI_AVATAR[index];
};

const getIniziali = (currentUser) => {
  if (!currentUser) {
    return "U";
  }

  if (
    currentUser.nome ||
    currentUser.cognome
  ) {
    const n = (
      currentUser.nome || ""
    ).charAt(0);

    const c = (
      currentUser.cognome || ""
    ).charAt(0);

    return `${n}${c}`.toUpperCase() || "U";
  }

  if (currentUser.email) {
    return currentUser.email
      .charAt(0)
      .toUpperCase();
  }

  return "U";
};

// ============================================================
// SIDEBAR
// ============================================================

function Sidebar({
  activePage,
  onPageChange,
  currentUser,
  onCreateTask,
}) {
  const [activeId, setActiveId] =
    useState("dashboard");

  // ==========================================================
  // CONTROLLO RUOLO ADMIN
  // ==========================================================

  const ruoloLower = (
    currentUser?.ruolo || ""
  ).toLowerCase();

  const isAdmin =
    ruoloLower === "admin" ||
    ruoloLower === "administrator";

  // ==========================================================
  // FILTRA ELEMENTI RISERVATI AGLI ADMIN
  // ==========================================================

  const filteredSidebarElements =
    sidebarElements.filter((item) => {
      if (item.adminOnly) {
        return isAdmin;
      }

      return true;
    });

  // ==========================================================
  // INFORMAZIONI UTENTE
  // ==========================================================

  const nomeUtente = currentUser
    ? `${currentUser.nome || ""} ${
        currentUser.cognome || ""
      }`.trim() || currentUser.email
    : "Accedi";

  const ruoloUtente =
    currentUser?.ruolo || "";

  const iniziali =
    getIniziali(currentUser);

  const avatarBg =
    getAvatarBgColor(
      currentUser?.id ||
        currentUser?.email ||
        nomeUtente
    );

  // ==========================================================
  // CAMBIO PAGINA
  // ==========================================================

  const handlePageChange = (id) => {
    setActiveId(id);

    if (onPageChange) {
      onPageChange(id);
    }
  };

  // ==========================================================
  // PAGINA ATTIVA
  // ==========================================================

  const isPageActive = (id) => {
    if (id === activePage) {
      return true;
    }

    if (
      id === "projects" &&
      typeof activePage === "string" &&
      activePage.startsWith("progetto-")
    ) {
      return true;
    }

    return false;
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <aside className="sidebar">

      {/* ======================================================
          BRAND
      ====================================================== */}

      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <i className="bi bi-grid-1x2-fill" />
        </div>

        <div className="sidebar-brand-text">
          Gestionale
        </div>
      </div>

      {/* ======================================================
          NUOVO TASK
      ====================================================== */}

      <div className="sidebar-create-task-wrapper">
        <button
          type="button"
          className="sidebar-create-task"
          onClick={() => {
            if (onCreateTask) {
              onCreateTask();
            }
          }}
        >
          <span className="sidebar-create-task-icon">
            <i className="bi bi-plus-lg" />
          </span>

          <span className="sidebar-create-task-label">
            Nuovo Task
          </span>
        </button>
      </div>

      {/* ======================================================
          MENU
      ====================================================== */}

      <div className="sidebar-scroll">
        <nav className="sidebar-menu">

          <div className="sidebar-section-title">
            MENU
          </div>

          {filteredSidebarElements
            .filter(
              (item) => !item.adminOnly
            )
            .map((item) => {
              const isActive =
                isPageActive(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-link ${
                    isActive
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handlePageChange(
                      item.id
                    )
                  }
                >
                  <span className="sidebar-icon">
                    {item.icon}
                  </span>

                  <span className="sidebar-label">
                    {item.label}
                  </span>
                </button>
              );
            })}

          {/* ==================================================
              AMMINISTRAZIONE
          ================================================== */}

          {isAdmin && (
            <>
              <div className="sidebar-section-title sidebar-section-admin">
                AMMINISTRAZIONE
              </div>

              {filteredSidebarElements
                .filter(
                  (item) =>
                    item.adminOnly
                )
                .map((item) => {
                  const isActive =
                    isPageActive(
                      item.id
                    );

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`sidebar-link ${
                        isActive
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        handlePageChange(
                          item.id
                        )
                      }
                    >
                      <span className="sidebar-icon">
                        {item.icon}
                      </span>

                      <span className="sidebar-label">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
            </>
          )}
        </nav>
      </div>

      {/* ======================================================
          USER PROFILE
      ====================================================== */}

      <button
        type="button"
        className={`sidebar-user ${
          activePage === "profile"
            ? "active"
            : ""
        }`}
        onClick={() =>
          handlePageChange("profile")
        }
      >
        <div
          className="sidebar-avatar"
          style={{
            backgroundColor: avatarBg,
          }}
        >
          {iniziali}
        </div>

        <div className="sidebar-user-info">
          <span className="sidebar-user-name">
            {nomeUtente}
          </span>

          {ruoloUtente && (
            <span className="sidebar-user-role">
              {ruoloUtente}
            </span>
          )}
        </div>

        <i className="bi bi-chevron-right sidebar-user-arrow" />
      </button>
    </aside>
  );
}

export default Sidebar;

// ============================================================
// MENU ITEMS
// ============================================================

const sidebarElements = [
  {
    id: "dashboard",
    icon: (
      <i className="bi bi-grid-1x2" />
    ),
    label: "Dashboard",
    adminOnly: false,
  },

  {
    id: "task",
    icon: (
      <i className="bi bi-check2-square" />
    ),
    label: "Task",
    adminOnly: false,
  },

  {
    id: "projects",
    icon: (
      <i className="bi bi-kanban" />
    ),
    label: "Progetti",
    adminOnly: false,
  },

  {
    id: "review",
    icon: (
      <i className="bi bi-clipboard-check" />
    ),
    label: "Review",
    adminOnly: false,
  },

  {
    id: "clienti",
    icon: (
      <i className="bi bi-people" />
    ),
    label: "Clienti",
    adminOnly: false,
  },

  {
    id: "ganttChart",
    icon: (
      <i className="bi bi-bar-chart-steps" />
    ),
    label: "Diagramma Gantt",
    adminOnly: false,
  },

  {
    id: "performance",
    icon: (
      <i className="bi bi-graph-up-arrow" />
    ),
    label: "Performance",
    adminOnly: true,
  },

  {
    id: "team",
    icon: (
      <i className="bi bi-person-badge" />
    ),
    label: "Gestione Team",
    adminOnly: true,
  },
];