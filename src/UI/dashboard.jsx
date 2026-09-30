import "./dashboard.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";

import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

import CardHome from "./cardHome";
import TaskCard from "./taskCard";
import ProjectCard from "./ProjectCard";
import ClientCard from "./ClientCard";

function Dashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalProgetti: 0,
    progettiAperti: 0,
    progettiChiusi: 0,
    totalTask: 0,
    taskAperti: 0,
    taskChiusi: 0,
    taskUrgentiList: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // =====================================================
        // UTENTE / RUOLO
        // =====================================================

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profilo, error } = await supabase
            .from("profili")
            .select("ruolo")
            .eq("id", user.id)
            .single();

          if (!error && profilo) {
            const ruoloLower = (profilo.ruolo || "").toLowerCase();

            if (
              ruoloLower === "admin" ||
              ruoloLower === "administrator"
            ) {
              setIsAdmin(true);
            }
          }
        }

        // =====================================================
        // PROGETTI
        // =====================================================

        const { data: progettiData, error: projError } =
          await supabase
            .from("progetti")
            .select("id, stato, nome");

        let totalProgetti = 0;
        let progettiAperti = 0;
        let progettiChiusi = 0;

        if (!projError && progettiData) {
          totalProgetti = progettiData.length;

          progettiChiusi = progettiData.filter((p) => {
            const stato = (p.stato || "").toLowerCase();

            return (
              stato === "chiuso" ||
              stato === "completato" ||
              stato === "archiviato"
            );
          }).length;

          progettiAperti = totalProgetti - progettiChiusi;
        }

        // =====================================================
        // TASK
        // =====================================================

        const { data: taskData, error: taskError } = await supabase
          .from("task")
          .select("id, titolo, stato, scadenza");

        let totalTask = 0;
        let taskAperti = 0;
        let taskChiusi = 0;
        let taskUrgentiList = [];

        if (!taskError && taskData) {
          totalTask = taskData.length;

          taskChiusi = taskData.filter((t) => {
            const stato = (t.stato || "").toLowerCase();

            return (
              stato === "done" ||
              stato === "completato" ||
              stato === "chiuso"
            );
          }).length;

          taskAperti = totalTask - taskChiusi;

          // ===================================================
          // TASK URGENTI
          // ===================================================

          const now = new Date();

          now.setHours(0, 0, 0, 0);

          const threeDaysFromNow = new Date(
            now.getTime() +
              3 * 24 * 60 * 60 * 1000
          );

          taskUrgentiList = taskData.filter((task) => {
            const stato = (task.stato || "").toLowerCase();

            const isDone = [
              "done",
              "completato",
              "chiuso",
            ].includes(stato);

            if (isDone || !task.scadenza) {
              return false;
            }

            const scadenzaDate = new Date(task.scadenza);

            return scadenzaDate <= threeDaysFromNow;
          });
        }

        setStats({
          totalProgetti,
          progettiAperti,
          progettiChiusi,
          totalTask,
          taskAperti,
          taskChiusi,
          taskUrgentiList,
        });
      } catch (err) {
        console.error(
          "Errore nel recupero dei dati della dashboard:",
          err
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ===========================================================
  // LOADING
  // ===========================================================

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading-card">
          <div className="dashboard-loading-icon">
            <i className="bi bi-grid-1x2-fill" />
          </div>

          <div>
            <strong>Caricamento dashboard</strong>
            <span>Recupero delle informazioni...</span>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================
  // DATA
  // ===========================================================

  const completionPercentage =
    stats.totalTask > 0
      ? Math.round(
          (stats.taskChiusi / stats.totalTask) * 100
        )
      : 0;

  const projectPercentage =
    stats.totalProgetti > 0
      ? Math.round(
          (stats.progettiChiusi / stats.totalProgetti) * 100
        )
      : 0;

  const today = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // ===========================================================
  // DASHBOARD
  // ===========================================================

  return (
    <div className="dashboard-container">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="dashboard-page-header">

        <div className="dashboard-header-main">

          <div className="dashboard-breadcrumb">
            <span>Gestionale</span>
            <i className="bi bi-chevron-right" />
            <span className="active">Dashboard</span>
          </div>

          <h1 className="dashboard-title">
            Buongiorno
          </h1>

          <p className="dashboard-subtitle">
            Ecco una panoramica di quello che sta
            succedendo nel tuo gestionale.
          </p>

        </div>

        <div className="dashboard-date">

          <div className="dashboard-date-icon">
            <i className="bi bi-calendar3" />
          </div>

          <div>
            <span>Oggi</span>
            <strong>{today}</strong>
          </div>

        </div>

      </header>

      {/* =====================================================
          KPI
      ===================================================== */}

      <section className="dashboard-stats-grid">

        {/* PROGETTI */}

        <article className="dashboard-stat-card projects">

          <div className="dashboard-stat-top">

            <div className="dashboard-stat-icon">
              <i className="bi bi-kanban" />
            </div>

            <span className="dashboard-stat-badge positive">
              <i className="bi bi-arrow-up-right" />
              {projectPercentage}%
            </span>

          </div>

          <div className="dashboard-stat-content">

            <span className="dashboard-stat-label">
              Progetti totali
            </span>

            <strong className="dashboard-stat-value">
              {stats.totalProgetti}
            </strong>

          </div>

          <div className="dashboard-stat-footer">

            <span>
              {stats.progettiAperti} aperti
            </span>

            <span className="separator">
              /
            </span>

            <span className="muted">
              {stats.progettiChiusi} completati
            </span>

          </div>

        </article>

        {/* TASK */}

        <article className="dashboard-stat-card tasks">

          <div className="dashboard-stat-top">

            <div className="dashboard-stat-icon">
              <i className="bi bi-check2-square" />
            </div>

            <span className="dashboard-stat-badge success">
              <i className="bi bi-check2" />
              {completionPercentage}%
            </span>

          </div>

          <div className="dashboard-stat-content">

            <span className="dashboard-stat-label">
              Task totali
            </span>

            <strong className="dashboard-stat-value">
              {stats.totalTask}
            </strong>

          </div>

          <div className="dashboard-stat-footer">

            <span>
              {stats.taskAperti} da completare
            </span>

            <span className="separator">
              /
            </span>

            <span className="muted">
              {stats.taskChiusi} completati
            </span>

          </div>

        </article>

        {/* URGENTI */}

        <article className="dashboard-stat-card urgent">

          <div className="dashboard-stat-top">

            <div className="dashboard-stat-icon">
              <i className="bi bi-lightning-charge-fill" />
            </div>

            {stats.taskUrgentiList.length > 0 && (
              <span className="dashboard-stat-badge danger">
                Richiede attenzione
              </span>
            )}

          </div>

          <div className="dashboard-stat-content">

            <span className="dashboard-stat-label">
              Task urgenti
            </span>

            <strong className="dashboard-stat-value">
              {stats.taskUrgentiList.length}
            </strong>

          </div>

          <div className="dashboard-stat-footer">

            {stats.taskUrgentiList.length > 0 ? (
              <>
                <span className="danger-text">
                  <i className="bi bi-clock" />
                  In scadenza
                </span>

                <span className="muted">
                  entro 3 giorni
                </span>
              </>
            ) : (
              <span className="success-text">
                <i className="bi bi-check-circle" />
                Nessuna urgenza
              </span>
            )}

          </div>

        </article>

      </section>

      {/* =====================================================
          MAIN GRID
      ===================================================== */}

      <section className="dashboard-main-grid">

        {/* ===================================================
            URGENT TASKS
        =================================================== */}

        <div className="dashboard-panel urgent-panel">

          <div className="dashboard-panel-header">

            <div className="dashboard-panel-heading">

              <div className="dashboard-panel-icon danger">
                <i className="bi bi-lightning-charge-fill" />
              </div>

              <div>
                <h2>Task urgenti</h2>

                <p>
                  Attività che richiedono attenzione
                </p>
              </div>

            </div>

            <span className="dashboard-panel-count">
              {stats.taskUrgentiList.length}
            </span>

          </div>

          {stats.taskUrgentiList.length > 0 ? (

            <div className="urgent-task-list">

              {stats.taskUrgentiList.map((task) => {

                const deadline = new Date(task.scadenza);

                const isExpired =
                  deadline < new Date();

                return (
                  <div
                    key={task.id}
                    className="urgent-task-item"
                  >

                    <div className="urgent-task-check">
                      <i className="bi bi-check2" />
                    </div>

                    <div className="urgent-task-content">

                      <strong>
                        {task.titolo || "Task senza titolo"}
                      </strong>

                      <span>
                        Attività da completare
                      </span>

                    </div>

                    <div
                      className={`urgent-task-deadline ${
                        isExpired ? "expired" : ""
                      }`}
                    >

                      <span>
                        {isExpired
                          ? "Scaduto"
                          : "Scadenza"}
                      </span>

                      <strong>
                        {deadline.toLocaleDateString(
                          "it-IT",
                          {
                            day: "2-digit",
                            month: "short",
                          }
                        )}
                      </strong>

                    </div>

                  </div>
                );
              })}

            </div>

          ) : (

            <div className="dashboard-empty-state">

              <div className="dashboard-empty-icon">
                <i className="bi bi-check2" />
              </div>

              <strong>
                Tutto sotto controllo
              </strong>

              <span>
                Non ci sono task urgenti al momento.
              </span>

            </div>

          )}

        </div>

        {/* ===================================================
            OVERVIEW
        =================================================== */}

        <div className="dashboard-panel overview-panel">

          <div className="dashboard-panel-header">

            <div className="dashboard-panel-heading">

              <div className="dashboard-panel-icon primary">
                <i className="bi bi-bar-chart-line-fill" />
              </div>

              <div>
                <h2>Panoramica</h2>

                <p>
                  Stato generale
                </p>
              </div>

            </div>

          </div>

          <div className="overview-content">

            {/* TASK */}

            <div className="overview-row">

              <div className="overview-row-top">

                <div className="overview-label">
                  <span className="overview-dot blue" />
                  <span>Task completati</span>
                </div>

                <strong>
                  {completionPercentage}%
                </strong>

              </div>

              <div className="progress-track">

                <div
                  className="progress-value blue"
                  style={{
                    width: `${completionPercentage}%`,
                  }}
                />

              </div>

            </div>

            {/* PROGETTI */}

            <div className="overview-row">

              <div className="overview-row-top">

                <div className="overview-label">
                  <span className="overview-dot purple" />
                  <span>Progetti completati</span>
                </div>

                <strong>
                  {projectPercentage}%
                </strong>

              </div>

              <div className="progress-track">

                <div
                  className="progress-value purple"
                  style={{
                    width: `${projectPercentage}%`,
                  }}
                />

              </div>

            </div>

            {/* TASK APERTI */}

            <div className="overview-mini-grid">

              <div className="overview-mini-card">

                <span className="overview-mini-icon orange">
                  <i className="bi bi-hourglass-split" />
                </span>

                <div>
                  <strong>
                    {stats.taskAperti}
                  </strong>

                  <span>
                    Task aperti
                  </span>
                </div>

              </div>

              <div className="overview-mini-card">

                <span className="overview-mini-icon green">
                  <i className="bi bi-check-circle" />
                </span>

                <div>
                  <strong>
                    {stats.taskChiusi}
                  </strong>

                  <span>
                    Task completati
                  </span>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          ADMIN
      ===================================================== */}

      {isAdmin && (
        <section className="dashboard-admin-section">

          <div className="dashboard-section-heading">

            <div>
              <span className="dashboard-section-eyebrow">
                ADMIN
              </span>

              <h2>
                Amministrazione
              </h2>

              <p>
                Strumenti per la gestione della piattaforma.
              </p>
            </div>

          </div>

          <div className="dashboard-admin-wrapper">
            <CardHome />
          </div>

        </section>
      )}

      {/* =====================================================
          WIDGETS
      ===================================================== */}

      <section className="dashboard-widgets-section">

        <div className="dashboard-section-heading">

          <div>
            <span className="dashboard-section-eyebrow">
              WORKSPACE
            </span>

            <h2>
              Accesso rapido
            </h2>

            <p>
              Gestisci rapidamente le principali
              aree del gestionale.
            </p>
          </div>

        </div>

        <div className="dashboard-widget-grid">

          <div className="dashboard-widget task-widget">
            <TaskCard />
          </div>

          <div className="dashboard-widget client-widget">
            <ClientCard />
          </div>

          <div className="dashboard-widget project-widget">
            <ProjectCard />
          </div>

        </div>

      </section>

    </div>
  );
}

export default Dashboard;