import React, { useState, useEffect } from "react";
import "../App.css";
import "./gant.css";
import "./taskCard.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import { supabase } from "../supabaseClient";

function Gantt() {
  const [progettiConTask, setProgettiConTask] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGanttData = async () => {
    setLoading(true);
    
    const { data: tasksData, error: taskError } = await supabase
      .from("task")
      .select(`
        id, 
        titolo, 
        scadenza, 
        created_at, 
        stato, 
        descrizione,
        progetti ( id, nome )
      `)
      .order("created_at", { ascending: true });

    if (taskError) {
      console.error("Errore nel recupero dei task:", taskError);
      setLoading(false);
      return;
    }

    const progettiMap = {};

    tasksData.forEach((task) => {
      const projId = task.progetti ? task.progetti.id : "senza-progetto";
      const projNome = task.progetti ? task.progetti.nome : "Senza Progetto";

      if (!progettiMap[projId]) {
        progettiMap[projId] = {
          id: projId,
          nome: projNome,
          tasks: []
        };
      }
      progettiMap[projId].tasks.push(task);
    });

    setProgettiConTask(Object.values(progettiMap));
    setLoading(false);
  };

  useEffect(() => {
    fetchGanttData();
  }, []);

  const getTimelineRange = () => {
    const allTasks = progettiConTask.flatMap(p => p.tasks);
    if (allTasks.length === 0) return { minDate: new Date(), totalDays: 14 };

    const startDates = allTasks.map((t) =>
      t.created_at ? new Date(t.created_at).getTime() : new Date().getTime()
    );
    const endDates = allTasks.map((t) =>
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
    <div className="container-fluid px-4 px-md-5 mt-4 gantt-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Diagramma di Gantt</h2>
        <button className="add-new-task" onClick={fetchGanttData}>
          <b>
            <i className="bi bi-arrow-clockwise me-1"></i> Aggiorna
          </b>
        </button>
      </div>

      <div className="d-flex gap-2 mb-4">
        <span className="badge bg-secondary text-white rounded-pill border-0 px-3 py-2 fw-medium">
          To Do
        </span>
        <span className="badge bg-warning text-dark rounded-pill border-0 px-3 py-2 fw-medium">
          In Progress
        </span>
        <span className="badge bg-success text-white rounded-pill border-0 px-3 py-2 fw-medium">
          Done
        </span>
      </div>

      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      ) : progettiConTask.length === 0 ? (
        <div className="alert alert-light rounded-4 text-muted text-center border-0 p-4">
          Nessun progetto o task trovato nel sistema.
        </div>
      ) : (
        <div className="gantt-wrapper shadow-sm bg-white">
          <div className="gantt-header d-flex border-bottom">
            <div className="gantt-task-label-header">
              Progetto
            </div>
            <div className="gantt-timeline-header d-flex flex-grow-1">
              {daysHeader.map((date, index) => (
                <div
                  key={index}
                  className="gantt-day-column text-center border-start"
                  style={{ width: `${100 / totalDays}%` }}
                >
                  <span className="d-block text-uppercase fw-semibold" style={{ fontSize: "0.7rem" }}>
                    {date.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", "")}
                  </span>
                  <span className="d-block extra-small text-muted">
                    {date.getDate()}/{date.getMonth() + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="gantt-body">
            {progettiConTask.map((progetto) => {
              // Calcoliamo l'altezza dinamica della riga in base al numero di task presenti nel progetto
              const numTasks = progetto.tasks.length;
              const rowHeight = Math.max(70, numTasks * 38 + 20);

              return (
                <div 
                  key={progetto.id} 
                  className="gantt-row d-flex border-bottom align-items-center" 
                  style={{ height: `${rowHeight}px` }}
                >
                  {/* Label con il nome del progetto */}
                  <div className="gantt-task-label border-end h-100 d-flex flex-column justify-content-center">
                    <strong>
                      <i className="bi bi-folder-fill text-primary me-2"></i>
                      {progetto.nome}
                    </strong>
                    <small className="text-muted mt-1">{numTasks} task associati</small>
                  </div>

                  {/* Timeline con i task disposti in colonna (uno sotto l'altro) */}
                  <div
                    className="gantt-timeline-row flex-grow-1 position-relative h-100"
                    style={{
                      backgroundSize: `calc(100% / ${totalDays}) 100%`,
                    }}
                  >
                    {progetto.tasks.map((task, index) => {
                      const barStyle = calculateBarStyle(task.created_at, task.scadenza);
                      const statusClass = getStatusColor(task.stato);
                      
                      // Calcoliamo la posizione verticale (top) per ogni task in colonna
                      const topOffset = 12 + index * 36;

                      return (
                        <div
                          key={task.id}
                          className={`gantt-bar position-absolute shadow-sm text-truncate ${statusClass}`}
                          style={{
                            ...barStyle,
                            top: `${topOffset}px`,
                            height: "28px",
                          }}
                          title={`Task: ${task.titolo} | Inizio: ${
                            task.created_at ? new Date(task.created_at).toLocaleDateString("it-IT") : "-"
                          } | Fine: ${
                            task.scadenza ? new Date(task.scadenza).toLocaleDateString("it-IT") : "-"
                          } | Stato: ${task.stato}`}
                        >
                          {task.titolo}
                        </div>
                      );
                    })}
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