import React, { useState, useEffect } from "react";
import "../App.css";
import "./gant.css";
import "./taskCard.css"; // Importato per applicare la classe add-new-task
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import { supabase } from "../supabaseClient";

function Gantt() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("task")
      .select("id, titolo, scadenza, created_at, stato, descrizione")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Errore nel recupero dei task:", error);
    } else if (data) {
      setTasks(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const getTimelineRange = () => {
    if (tasks.length === 0) return { minDate: new Date(), totalDays: 14 };

    const startDates = tasks.map((t) =>
      t.created_at ? new Date(t.created_at).getTime() : new Date().getTime()
    );
    const endDates = tasks.map((t) =>
      t.scadenza ? new Date(t.scadenza).getTime() : new Date().getTime()
    );

    const minTimestamp = Math.min(...startDates);
    const maxTimestamp = Math.max(...endDates);

    const minDate = new Date(minTimestamp);
    const maxDate = new Date(maxTimestamp);

    const diffTime = Math.abs(maxDate - minDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return {
      minDate,
      totalDays: Math.max(diffDays, 14),
    };
  };

  const { minDate, totalDays } = getTimelineRange();

  const daysHeader = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(minDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const calculateBarStyle = (created_at, scadenzaStr) => {
    const startDate = created_at ? new Date(created_at) : new Date();
    const endDate = scadenzaStr ? new Date(scadenzaStr) : new Date(startDate.getTime() + 86400000);

    const startOffset = Math.max(
      0,
      Math.floor((startDate - minDate) / (1000 * 60 * 60 * 24))
    );
    const duration = Math.max(
      1,
      Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    );

    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;

    return {
      left: `${leftPercent}%`,
      width: `${Math.max(widthPercent, 4)}%`,
    };
  };

  const getStatusColor = (stato) => {
    switch (stato?.toLowerCase()) {
      case "done":
      case "completato":
        return "bg-success text-white";
      case "in_progress":
      case "in_corso":
        return "bg-warning text-dark";
      default:
        return "bg-secondary text-white";
    }
  };

  return (
    <div className="gantt-container p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          Diagramma di Gantt - Sviluppo Progetto
        </h2>
        {/* Pulsante in stile TaskCard */}
        <button className="add-new-task" onClick={fetchTasks}>
          <b>
            <i className="bi bi-arrow-clockwise me-1"></i> Aggiorna
          </b>
        </button>
      </div>

      <div className="d-flex gap-3 mb-3 small fw-bold">
        <span className="badge bg-secondary">Assegnato (To Do)</span>
        <span className="badge bg-warning text-dark">In Progress</span>
        <span className="badge bg-success">Terminato (Done)</span>
      </div>

      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="alert alert-info">Nessun task trovato nel sistema.</div>
      ) : (
        <div className="gantt-wrapper shadow-sm rounded">
          <div className="gantt-header d-flex border-bottom">
            <div className="gantt-task-label-header fw-bold p-2 border-end" style={{ width: "200px" }}>
              Task
            </div>
            <div className="gantt-timeline-header d-flex flex-grow-1">
              {daysHeader.map((date, index) => (
                <div
                  key={index}
                  className="gantt-day-column text-center border-end p-1"
                  style={{ width: `${100 / totalDays}%` }}
                >
                  <span className="d-block small fw-bold">
                    {date.toLocaleDateString("it-IT", { weekday: "narrow" })}
                  </span>
                  <span className="d-block extra-small text-muted">
                    {date.getDate()}/{date.getMonth() + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="gantt-body">
            {tasks.map((task) => {
              const barStyle = calculateBarStyle(task.created_at, task.scadenza);
              const statusClass = getStatusColor(task.stato);

              return (
                <div key={task.id} className="gantt-row d-flex border-bottom">
                  <div className="gantt-task-label p-2 border-end text-truncate" style={{ width: "200px" }}>
                    <strong className="d-block text-truncate">{task.titolo}</strong>
                    <small className="text-muted d-block">
                      Stato: {task.stato || "todo"}
                    </small>
                  </div>

                  <div className="gantt-timeline-row flex-grow-1 position-relative" style={{ height: "45px" }}>
                    <div
                      className={`gantt-bar position-absolute rounded shadow-sm p-1 extra-small text-truncate d-flex align-items-center justify-content-center ${statusClass}`}
                      style={{
                        ...barStyle,
                        top: "8px",
                        height: "28px",
                      }}
                      title={`${task.titolo} | Inizio: ${
                        task.created_at ? new Date(task.created_at).toLocaleDateString("it-IT") : "-"
                      } | Fine: ${
                        task.scadenza ? new Date(task.scadenza).toLocaleDateString("it-IT") : "-"
                      } | Stato: ${task.stato}`}
                    >
                      {task.titolo}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Gantt;