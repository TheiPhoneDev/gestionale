import "../App.css";
import "./dashboard.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

import CardHome from './cardHome';
import TaskCard from './taskCard';
import ProjectCard from "./ProjectCard";
import ClientCard from "./ClientCard";

function Dashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Stati per le nuove metriche
  const [stats, setStats] = useState({
    totalProgetti: 0,
    progettiAperti: 0,
    progettiChiusi: 0,
    totalTask: 0,
    taskAperti: 0,
    taskChiusi: 0,
    taskUrgentiList: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profilo, error } = await supabase
            .from("profili")
            .select("ruolo")
            .eq("id", user.id)
            .single();

          if (!error && profilo) {
            const ruoloLower = (profilo.ruolo || "").toLowerCase();
            if (ruoloLower === "admin" || ruoloLower === "administrator") {
              setIsAdmin(true);
            }
          }
        }

        // 1. Recupero Progetti
        const { data: progettiData, error: projError } = await supabase
          .from("progetti")
          .select("id, stato, nome");

        if (!projError && progettiData) {
          const totalProgetti = progettiData.length;
          // Modifica la condizione in base a come salvi lo stato dei progetti (es. "chiuso", "completato", "archiviato", ecc.)
          const progettiChiusi = progettiData.filter(p => {
            const s = (p.stato || "").toLowerCase();
            return s === "chiuso" || s === "completato" || s === "archiviato";
          }).length;
          const progettiAperti = totalProgetti - progettiChiusi;

          // 2. Recupero Task
          const { data: taskData, error: taskError } = await supabase
            .from("task")
            .select("id, titolo, stato, scadenza");

          if (!taskError && taskData) {
            const totalTask = taskData.length;
            const taskChiusi = taskData.filter(t => {
              const s = (t.stato || "").toLowerCase();
              return s === "done" || s === "completato" || s === "chiuso";
            }).length;
            const taskAperti = totalTask - taskChiusi;

            // Task urgenti: non completati e con scadenza passata o nei prossimi 3 giorni
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

            const taskUrgentiList = taskData.filter(t => {
              const isDone = ["done", "completato", "chiuso"].includes((t.stato || "").toLowerCase());
              if (isDone || !t.scadenza) return false;
              const scadenzaDate = new Date(t.scadenza);
              return scadenzaDate <= threeDaysFromNow;
            });

            setStats({
              totalProgetti,
              progettiAperti,
              progettiChiusi,
              totalTask,
              taskAperti,
              taskChiusi,
              taskUrgentiList
            });
          }
        }

      } catch (err) {
        console.error("Errore nel recupero dei dati della dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Caricamento dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Dashboard</h1>

      {/* Sezione delle nuove card statistiche */}
      <div className="row g-3 mb-4">
        {/* Progetti Totali / Aperti / Chiusi */}
        <div className="col-md-4 col-sm-6">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0">
            <span className="text-muted small d-block">Progetti</span>
            <div className="d-flex justify-content-between align-items-center mt-2">
              <div>
                <h4 className="fw-bold mb-0">{stats.totalProgetti}</h4>
                <small className="text-success">Aperti: {stats.progettiAperti}</small> | <small className="text-secondary">Chiusi: {stats.progettiChiusi}</small>
              </div>
              <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: "45px", height: "45px" }}>
                <i className="bi bi-folder fs-5"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Task Generali / Aperti / Chiusi */}
        <div className="col-md-4 col-sm-6">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0">
            <span className="text-muted small d-block">Task</span>
            <div className="d-flex justify-content-between align-items-center mt-2">
              <div>
                <h4 className="fw-bold mb-0">{stats.totalTask}</h4>
                <small className="text-warning">Aperti: {stats.taskAperti}</small> | <small className="text-success">Chiusi: {stats.taskChiusi}</small>
              </div>
              <div className="bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center" style={{ width: "45px", height: "45px" }}>
                <i className="bi bi-list-task fs-5"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Task Urgenti */}
        <div className="col-md-4 col-sm-12">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0">
            <span className="text-muted small d-block">Task Urgenti da Chiudere</span>
            <div className="d-flex justify-content-between align-items-center mt-2">
              <div>
                <h4 className="fw-bold mb-0 text-danger">{stats.taskUrgentiList.length}</h4>
                <small className="text-muted">In scadenza o scaduti</small>
              </div>
              <div className="bg-danger-subtle text-danger rounded-circle d-flex align-items-center justify-content-center" style={{ width: "45px", height: "45px" }}>
                <i className="bi bi-exclamation-triangle fs-5"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista dettagliata dei task urgenti (se presenti) */}
      {stats.taskUrgentiList.length > 0 && (
        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
          <h5 className="fw-bold text-danger mb-3">
            <i className="bi bi-exclamation-circle-fill me-2"></i>Dettaglio Task Urgenti
          </h5>
          <div className="list-group list-group-flush">
            {stats.taskUrgentiList.map((task) => (
              <div key={task.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                <div>
                  <strong>{task.titolo}</strong>
                </div>
                <div>
                  <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-2">
                    Scadenza: {new Date(task.scadenza).toLocaleDateString("it-IT")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visibile solo agli Admin */}
      {isAdmin && (
        <div className="dashboard-section">
          <CardHome />
        </div>
      )}

      {/* Griglia per le card esistenti */}
      <div className="dashboard-grid">
        <TaskCard />
        <ClientCard />
        <ProjectCard />
      </div>
    </div>
  );
}

export default Dashboard;