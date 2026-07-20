import "../App.css";
import "./sidebar.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import { useState } from "react";

function Sidebar({activePage, onPageChange}) {
  const [activeId, setActiveId] = useState("dashboard");
  const [progettiOpen, setProgettiOpen] = useState(false);
  const progettoMenu = projects[0];

  return (
    <aside className="sidebar">
      <div className="sidebar-menu">
        {sidebarElements.map((item) => {
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              href={item.pageLink}
              onClick={() => {
                setActiveId(item.id)
                onPageChange(item.id)
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

        {/*Codice gestione pulsante progetti*/}
         <button
            className="sidebar-link"
            onClick={() => {
              setProgettiOpen(!progettiOpen);
              setActiveId(progettoMenu.id);
            }}
            style={{
              background: "none",
              border: "none",
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              color:
                progettiOpen || activeId === progettoMenu.id
                  ? progettoMenu.color
                  : progettoMenu.color2,
            }}
          >
            <span className="sidebar-icon">{progettoMenu.icon}</span>
            {progettoMenu.label}
            <i
              className={`bi bi-chevron-${progettiOpen ? "down" : "right"} ms-auto`}
              style={{ marginLeft: "auto" }}
            ></i>
          </button>

          {progettiOpen && (
            <div className="sidebar-submenu">
              {progettoMenu.subItems.map((subItem) => {
                const isSubActive = activeId === subItem.id;
                return (
                  <a
                    key={subItem.id}
                    href={subItem.pageLink}
                    className="sidebar-sublink"
                    onClick={() => setActiveId(subItem.id)}
                    style={{
                      textDecoration: "none",
                      color: isSubActive ? subItem.color : subItem.color2,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      className="status-dot"
                      style={{
                        backgroundColor:
                          subItem.status === "Open" ? "#10b981" : "#ef4444",
                      }}
                    ></span>
                    {subItem.label}
                  </a>
                );
              })}
            </div>
          )}

      
      </div>

      <div className="sidebar-footer">
        <span style={{ color: "#fff" }}>
          <i className="bi bi-person-fill"></i>
        </span>
        <span style={{ color: "#fff" }}>Mario Rossi</span>
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
    pageLink: "#dashboard",
    color: "#fff",
    color2: "#515151",
  },
  {
    id: "task",
    icon: <i class="bi bi-list-task"></i>,
    label: "Task",
    pageLink: "#task",
    color: "#fff",
    color2: "#515151",
  },
  {
    id: "ganttChart",
    icon: <i className="bi bi-clipboard2-data-fill"></i>,
    label: "Diagramma Gantt",
    pageLink: "#gantt",
    color: "#fff",
    color2: "#515151",
  },
];

const projects = [
  {
    id: "progetti",
    icon: <i className="bi bi-tools"></i>,
    label: "Progetti",
    pageLink: "#gantt",
    color: "#fff",
    color2: "#515151",
    subItems: [
      {
        id: "idProgetto1",
        label: "Sito web 1",
        pageLink: "#idProgetto1",
        color: "#fff",
        color2: "#515151",
        status: "Open",
      },
      {
        id: "idProgetto2",
        label: "App Mobile",
        pageLink: "#idProgetto2",
        color: "#fff",
        color2: "#515151",
        status: "Closed",
      },
      {
        id: "idProgetto3",
        label: "React Website",
        pageLink: "#idProgetto3",
        color: "#fff",
        color2: "#515151",
        status: "Closed",
      },
      {
        id: "idProgetto4",
        label: "Branding",
        pageLink: "#idProgetto4",
        color: "#fff",
        color2: "#515151",
        status: "Open",
      },
    ],
  },
];
