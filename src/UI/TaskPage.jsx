import "../App.css";
import "./TaskPage.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

function TaskPage({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nomeProgetto, setNomeProgetto] = useState("");

  const fetchTasks = async () => {
    setLoading(true);

    // Se c'è un projectId, recuperiamo il nome del progetto per il titolo
    if (projectId) {
      const { data: projData } = await supabase
        .from("progetti")
        .select("nome")
        .eq("id", projectId)
        .single();

      if (projData) setNomeProgetto(projData.nome);
    } else {
      setNomeProgetto("");
    }

    // Costruiamo la query principale
    let query = supabase
      .from("task")
      .select(`
        id,
        titolo,
        descrizione,
        stato,
        scadenza,
        progetti ( nome ),
        task_profili (
          profili ( id, nome, cognome )
        )
      `);

    // FILTRAGGIO DINAMICO: Se projectId è presente, applichiamo il filtro!
    if (projectId) {
      query = query.eq("progetto_id", projectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Errore nel recupero dei task:", error);
    } else if (data) {
      setTasks(data);
    }
    setLoading(false);
  };

  // Ricarica i dati ogni volta che la prop projectId cambia
  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  // Gestione dell'aggiornamento dello stato
  const handleStatusChange = async (taskId, newStatus) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === taskId ? { ...t, stato: newStatus } : t))
    );

    const { error } = await supabase
      .from("task")
      .update({ stato: newStatus })
      .eq("id", taskId);

    if (error) {
      console.error("Errore aggiornamento stato:", error);
      alert(`Impossibile aggiornare lo stato: ${error.message}`);
      fetchTasks();
    }
  };

  const getStatusBadgeStyle = (stato) => {
    switch (stato) {
      case "done":
      case "completato":
        return "bg-success text-white border-success";
      case "in_progress":
      case "in_corso":
        return "bg-warning text-dark border-warning";
      default:
        return "bg-secondary text-white border-secondary";
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          {projectId
            ? `Task Progetto: ${nomeProgetto || "Caricamento..."}`
            : "Tutti i Task"}
        </h2>
        <button className="btn btn-outline-primary btn-sm" onClick={fetchTasks}>
          <i className="bi bi-arrow-clockwise me-1"></i> Aggiorna
        </button>
      </div>

      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="alert alert-info">
          {projectId
            ? "Nessun task trovato per questo progetto."
            : "Nessun task trovato nel sistema."}
        </div>
      ) : (
        <div className="table-responsive shadow-sm rounded">
          <table className="table table-hover align-middle mb-0 bg-white">
            <thead className="table-light">
              <tr>
                <th>Titolo</th>
                {!projectId && <th>Progetto</th>}
                <th>Assegnato a</th>
                <th>Scadenza</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.titolo}</strong>
                    {t.descrizione && (
                      <div className="text-muted small">{t.descrizione}</div>
                    )}
                  </td>
                  {!projectId && (
                    <td>
                      {t.progetti ? (
                        <span className="badge bg-light text-dark border">
                          <i className="bi bi-folder me-1"></i>
                          {t.progetti.nome}
                        </span>
                      ) : (
                        <span className="text-muted small">-</span>
                      )}
                    </td>
                  )}
                  <td>
                    {t.task_profili && t.task_profili.length > 0 ? (
                      <div className="d-flex flex-wrap gap-1">
                        {t.task_profili.map((tp) => (
                          <span
                            key={tp.profili.id}
                            className="badge bg-secondary text-white"
                          >
                            <i className="bi bi-person me-1"></i>
                            {tp.profili.nome} {tp.profili.cognome}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted small">Nessuno</span>
                    )}
                  </td>
                  <td>
                    {t.scadenza ? (
                      new Date(t.scadenza).toLocaleDateString("it-IT")
                    ) : (
                      <span className="text-muted small">-</span>
                    )}
                  </td>
                  <td>
                    <select
                      className={`form-select form-select-sm fw-bold ${getStatusBadgeStyle(
                        t.stato
                      )}`}
                      value={t.stato || "todo"}
                      onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      style={{ cursor: "pointer", width: "130px" }}
                    >
                      <option value="todo" className="bg-white text-dark">
                        To Do
                      </option>
                      <option value="in_progress" className="bg-white text-dark">
                        In Progress
                      </option>
                      <option value="done" className="bg-white text-dark">
                        Done
                      </option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TaskPage;