import React, { useEffect, useMemo, useState } from "react";

import "../App.css";
import "./gant.css";
import "./TaskPage.css";

import "bootstrap-icons/font/bootstrap-icons.min.css";

import { supabase } from "../supabaseClient";

function Gantt() {
  const [progettiConTask, setProgettiConTask] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // =========================================================
  // RECUPERO DATI
  // =========================================================

  const fetchGanttData = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data: tasksData, error: taskError } =
        await supabase
          .from("task")
          .select(`
            id,
            titolo,
            scadenza,
            created_at,
            stato,
            descrizione,
            progetti (
              id,
              nome
            )
          `)
          .order("created_at", {
            ascending: true,
          });

      if (taskError) {
        console.error(
          "Errore nel recupero dei task:",
          taskError
        );

        setErrorMessage(
          taskError.message ||
            "Errore durante il caricamento dei dati."
        );

        setProgettiConTask([]);
        return;
      }

      const progettiMap = {};

      (tasksData || []).forEach((task) => {
        const projId = task.progetti
          ? task.progetti.id
          : "senza-progetto";

        const projNome = task.progetti
          ? task.progetti.nome
          : "Senza Progetto";

        if (!progettiMap[projId]) {
          progettiMap[projId] = {
            id: projId,
            nome: projNome,
            tasks: [],
          };
        }

        progettiMap[projId].tasks.push(task);
      });

      setProgettiConTask(
        Object.values(progettiMap)
      );
    } catch (error) {
      console.error(
        "Errore fetchGanttData:",
        error
      );

      setErrorMessage(
        error.message ||
          "Errore durante il caricamento del Gantt."
      );

      setProgettiConTask([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGanttData();
  }, []);

  // =========================================================
  // TUTTI I TASK
  // =========================================================

  const allTasks = useMemo(() => {
    return progettiConTask.flatMap(
      (progetto) => progetto.tasks
    );
  }, [progettiConTask]);

  // =========================================================
  // RANGE TEMPORALE
  // =========================================================

  const getTimelineRange = () => {
    if (allTasks.length === 0) {
      return {
        minDate: new Date(),
        totalDays: 14,
      };
    }

    const startDates = allTasks.map((task) =>
      task.created_at
        ? new Date(task.created_at).getTime()
        : new Date().getTime()
    );

    const endDates = allTasks.map((task) =>
      task.scadenza
        ? new Date(task.scadenza).getTime()
        : new Date().getTime()
    );

    const minTimestamp = Math.min(
      ...startDates
    );

    const maxTimestamp = Math.max(
      ...endDates
    );

    const minDate = new Date(
      minTimestamp
    );

    const maxDate = new Date(
      maxTimestamp
    );

    const diffTime =
      maxDate.getTime() -
      minDate.getTime();

    const diffDays =
      Math.ceil(
        diffTime /
          (1000 * 60 * 60 * 24)
      ) + 1;

    return {
      minDate,
      totalDays: Math.max(
        diffDays,
        14
      ),
    };
  };

  const { minDate, totalDays } =
    getTimelineRange();

  // =========================================================
  // GIORNI
  // =========================================================

  const daysHeader = Array.from(
    {
      length: totalDays,
    },
    (_, index) => {
      const date = new Date(minDate);

      date.setDate(
        date.getDate() + index
      );

      return date;
    }
  );

  // =========================================================
  // POSIZIONE TASK
  // =========================================================

  const calculateBarStyle = (
    createdAt,
    scadenzaStr
  ) => {
    const startDate = createdAt
      ? new Date(createdAt)
      : new Date();

    const endDate = scadenzaStr
      ? new Date(scadenzaStr)
      : new Date(
          startDate.getTime() +
            86400000
        );

    const startOffset = Math.max(
      0,
      Math.floor(
        (startDate.getTime() -
          minDate.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    const duration = Math.max(
      1,
      Math.ceil(
        (endDate.getTime() -
          startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    const leftPercent =
      (startOffset / totalDays) *
      100;

    const widthPercent =
      (duration / totalDays) *
      100;

    return {
      left: `${leftPercent}%`,
      width: `${Math.max(
        widthPercent,
        4
      )}%`,
    };
  };

  // =========================================================
  // STATO TASK
  // =========================================================

  const getStatusClass = (stato) => {
    switch (
      stato?.trim().toLowerCase()
    ) {
      case "done":
      case "completato":
        return "gantt-status-done";

      case "in_progress":
      case "in corso":
      case "in_corso":
      case "in progress":
        return "gantt-status-progress";

      case "todo":
      case "to do":
      case "da fare":
        return "gantt-status-todo";

      default:
        return "gantt-status-default";
    }
  };

  // =========================================================
  // STATISTICHE
  // =========================================================

  const totaleProgetti =
    progettiConTask.length;

  const totaleTask = allTasks.length;

  const taskCompletati = allTasks.filter(
    (task) => {
      const stato =
        task.stato
          ?.trim()
          .toLowerCase();

      return (
        stato === "done" ||
        stato === "completato"
      );
    }
  ).length;

  const taskInCorso = allTasks.filter(
    (task) => {
      const stato =
        task.stato
          ?.trim()
          .toLowerCase();

      return (
        stato === "in_progress" ||
        stato === "in corso" ||
        stato === "in_corso" ||
        stato === "in progress"
      );
    }
  ).length;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="task-page gantt-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="task-page-header">

        <div className="task-page-heading">

          <div className="task-page-title-row">

            <h2>Diagramma di Gantt</h2>

            <span className="task-company-badge">
              <i className="bi bi-bar-chart-steps"></i>

              {totaleTask}{" "}
              {totaleTask === 1
                ? "task"
                : "task"}
            </span>

          </div>

          <p>
            Visualizza cronologia, scadenze e
            stato dei task dei progetti.
          </p>

        </div>

        <div className="task-page-actions">

          <button
            type="button"
            className="task-page-button secondary"
            onClick={fetchGanttData}
          >
            <i className="bi bi-arrow-clockwise"></i>
            Aggiorna
          </button>

        </div>

      </div>

      {/* =====================================================
          ERRORE
      ===================================================== */}

      {errorMessage && (
        <div
          className="alert alert-danger d-flex align-items-center"
          role="alert"
          style={{
            marginBottom: "20px",
          }}
        >
          <i
            className="bi bi-exclamation-triangle-fill"
            style={{
              marginRight: "10px",
            }}
          ></i>

          <div>
            <strong>Errore DB:</strong>{" "}
            {errorMessage}
          </div>
        </div>
      )}

     
      {/* =====================================================
          LEGENDA
      ===================================================== */}

      <div className="gantt-legend">

        <div className="gantt-legend-title">
          <i className="bi bi-info-circle"></i>
          Stato attività
        </div>

        <div className="gantt-legend-items">

          <span className="gantt-legend-item">
            <span className="gantt-legend-dot todo"></span>
            To Do
          </span>

          <span className="gantt-legend-item">
            <span className="gantt-legend-dot progress"></span>
            In Progress
          </span>

          <span className="gantt-legend-item">
            <span className="gantt-legend-dot done"></span>
            Done
          </span>

        </div>

      </div>

      {/* =====================================================
          CARICAMENTO
      ===================================================== */}

      {loading ? (

        <div className="task-loading">

          <div
            className="spinner-border text-primary"
            role="status"
          >
            <span className="visually-hidden">
              Caricamento Gantt...
            </span>
          </div>

        </div>

      ) : progettiConTask.length === 0 ? (

        /* ===================================================
           VUOTO
        =================================================== */

        <div className="task-empty">

          <i className="bi bi-bar-chart-steps"></i>

          <strong>
            Nessun progetto o task
          </strong>

          <span>
            Non ci sono dati disponibili
            per visualizzare il diagramma
            di Gantt.
          </span>

          <button
            type="button"
            className="task-page-button secondary"
            onClick={fetchGanttData}
            style={{
              marginTop: "15px",
            }}
          >
            <i className="bi bi-arrow-clockwise"></i>
            Aggiorna
          </button>

        </div>

      ) : (

        /* ===================================================
           GANTT
        =================================================== */

        <div className="gantt-wrapper">

          {/* HEADER */}

          <div className="gantt-header">

            <div className="gantt-task-label-header">
              <i className="bi bi-folder2-open"></i>
              Progetto
            </div>

            <div className="gantt-timeline-header">

              {daysHeader.map(
                (date, index) => {

                  const isToday =
                    date.toDateString() ===
                    new Date().toDateString();

                  return (
                    <div
                      key={index}
                      className={`gantt-day-column ${
                        isToday
                          ? "today"
                          : ""
                      }`}
                      style={{
                        width: `${100 / totalDays}%`,
                      }}
                    >

                      <span className="gantt-day-name">
                        {date
                          .toLocaleDateString(
                            "it-IT",
                            {
                              weekday:
                                "short",
                            }
                          )
                          .replace(
                            ".",
                            ""
                          )}
                      </span>

                      <span className="gantt-day-number">
                        {date.getDate()}/
                        {date.getMonth() +
                          1}
                      </span>

                    </div>
                  );
                }
              )}

            </div>

          </div>

          {/* BODY */}

          <div className="gantt-body">

            {progettiConTask.map(
              (progetto) => {

                const numTasks =
                  progetto.tasks.length;

                const rowHeight =
                  Math.max(
                    76,
                    numTasks * 42 + 24
                  );

                return (

                  <div
                    key={progetto.id}
                    className="gantt-row"
                    style={{
                      height: `${rowHeight}px`,
                    }}
                  >

                    {/* PROGETTO */}

                    <div className="gantt-task-label">

                      <div className="gantt-project-name">

                        <span className="gantt-project-icon">
                          <i className="bi bi-folder-fill"></i>
                        </span>

                        <strong>
                          {progetto.nome}
                        </strong>

                      </div>

                      <span className="gantt-project-count">
                        {numTasks}{" "}
                        {numTasks === 1
                          ? "task"
                          : "task"}{" "}
                        associati
                      </span>

                    </div>

                    {/* TIMELINE */}

                    <div
                      className="gantt-timeline-row"
                      style={{
                        backgroundSize: `calc(100% / ${totalDays}) 100%`,
                      }}
                    >

                      {progetto.tasks.map(
                        (task, index) => {

                          const barStyle =
                            calculateBarStyle(
                              task.created_at,
                              task.scadenza
                            );

                          const statusClass =
                            getStatusClass(
                              task.stato
                            );

                          const topOffset =
                            12 +
                            index * 42;

                          const startDate =
                            task.created_at
                              ? new Date(
                                  task.created_at
                                ).toLocaleDateString(
                                  "it-IT"
                                )
                              : "-";

                          const endDate =
                            task.scadenza
                              ? new Date(
                                  task.scadenza
                                ).toLocaleDateString(
                                  "it-IT"
                                )
                              : "-";

                          return (

                            <div
                              key={task.id}
                              className={`gantt-bar ${statusClass}`}
                              style={{
                                ...barStyle,
                                top: `${topOffset}px`,
                              }}
                              title={`Task: ${
                                task.titolo ||
                                "Senza titolo"
                              } | Inizio: ${startDate} | Fine: ${endDate} | Stato: ${
                                task.stato ||
                                "Non definito"
                              }`}
                            >

                              <span className="gantt-bar-icon">
                                <i className="bi bi-check2-square"></i>
                              </span>

                              <span className="gantt-bar-title">
                                {task.titolo ||
                                  "Task senza titolo"}
                              </span>

                            </div>

                          );
                        }
                      )}

                    </div>

                  </div>

                );
              }
            )}

          </div>

        </div>

      )}

    </div>
  );
}

export default Gantt;

