import "../App.css";
import "./TaskPage.css";
import "./taskCard.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import React, { useState, useEffect } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { supabase } from "../supabaseClient";
import Modal from "./Modal";

function TaskPage({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nomeProgetto, setNomeProgetto] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [utenti, setUtenti] = useState([]);
  const [progetti, setProgetti] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedProfili, setSelectedProfili] = useState([]);
  const [selectedProjectLabel, setSelectedProjectLabel] = useState("Seleziona progetto");

  const [formData, setFormData] = useState({
    titolo: "",
    descrizione: "",
    scadenza: "",
    priorita: "Media",
    progetto_id: "",
    stato: "todo",
  });

  const fetchTasks = async () => {
    setLoading(true);

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

    let query = supabase
      .from("task")
      .select(`
        id,
        titolo,
        descrizione,
        stato,
        scadenza,
        progetti ( id, nome ),
        task_profili (
          profili ( id, nome, cognome )
        )
      `);

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

  const fetchDropdownData = async () => {
    const { data: utentiData } = await supabase
      .from("profili")
      .select("id, nome, cognome, ruolo");

    if (utentiData) setUtenti(utentiData);

    const { data: progettiData } = await supabase
      .from("progetti")
      .select("id, nome");

    if (progettiData) setProgetti(progettiData);
  };

  useEffect(() => {
    fetchTasks();
    fetchDropdownData();
  }, [projectId]);

  const toggleProfilo = (profiloId) => {
    setSelectedProfili((prev) =>
      prev.includes(profiloId)
        ? prev.filter((id) => id !== profiloId)
        : [...prev, profiloId]
    );
  };

  const handleOpenCreateModal = () => {
    setSelectedTask(null);
    setFormData({
      titolo: "",
      descrizione: "",
      scadenza: "",
      priorita: "Media",
      progetto_id: projectId || "",
      stato: "todo",
    });

    if (projectId) {
      const currentProj = progetti.find((p) => String(p.id) === String(projectId));
      setSelectedProjectLabel(currentProj ? currentProj.nome : "Seleziona progetto");
    } else {
      setSelectedProjectLabel("Seleziona progetto");
    }

    setSelectedProfili([]);
    setIsModalOpen(true);
  };

  const handleRowClick = (task) => {
    setSelectedTask(task);
    setFormData({
      titolo: task.titolo || "",
      descrizione: task.descrizione || "",
      scadenza: task.scadenza ? task.scadenza.split("T")[0] : "",
      priorita: "Media",
      progetto_id: task.progetti ? task.progetti.id : "",
      stato: task.stato || "todo",
    });

    if (task.progetti) {
      setSelectedProjectLabel(task.progetti.nome);
    } else {
      setSelectedProjectLabel("Seleziona progetto");
    }

    const attualiMembriIds = task.task_profili
      ? task.task_profili.map((tp) => tp.profili.id)
      : [];
    setSelectedProfili(attualiMembriIds);

    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();

    if (!formData.titolo) {
      alert("Inserisci almeno il titolo del task");
      return;
    }

    if (selectedTask) {
      const { error: taskError } = await supabase
        .from("task")
        .update({
          titolo: formData.titolo,
          descrizione: formData.descrizione,
          scadenza: formData.scadenza || null,
          progetto_id: formData.progetto_id || null,
          stato: formData.stato,
        })
        .eq("id", selectedTask.id);

      if (taskError) {
        alert(`Errore nella modifica: ${taskError.message}`);
        return;
      }

      await supabase.from("task_profili").delete().eq("task_id", selectedTask.id);

      if (selectedProfili.length > 0) {
        const assegnazioni = selectedProfili.map((profiloId) => ({
          task_id: selectedTask.id,
          profilo_id: profiloId,
        }));
        await supabase.from("task_profili").insert(assegnazioni);
      }
    } else {
      const { data: newTask, error: taskError } = await supabase
        .from("task")
        .insert([
          {
            titolo: formData.titolo,
            descrizione: formData.descrizione,
            scadenza: formData.scadenza || null,
            progetto_id: formData.progetto_id || null,
            stato: formData.stato || "todo",
          },
        ])
        .select()
        .single();

      if (taskError) {
        alert(`Errore nella creazione: ${taskError.message}`);
        return;
      }

      if (newTask && selectedProfili.length > 0) {
        const assegnazioni = selectedProfili.map((profiloId) => ({
          task_id: newTask.id,
          profilo_id: profiloId,
        }));
        await supabase.from("task_profili").insert(assegnazioni);
      }
    }

    setIsModalOpen(false);
    fetchTasks();
  };

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

  // Logica di filtraggio per i task
  const tasksFiltrati = tasks.filter((t) => {
    if (!searchTerm) return true;
    const ricerca = searchTerm.toLowerCase();

    const titolo = (t.titolo || "").toLowerCase();
    const descrizione = (t.descrizione || "").toLowerCase();
    const nomeProgetto = t.progetti ? (t.progetti.nome || "").toLowerCase() : "";
    const assegnati = t.task_profili
      ? t.task_profili
          .map((tp) => `${tp.profili.nome || ""} ${tp.profili.cognome || ""}`)
          .join(" ")
          .toLowerCase()
      : "";

    return (
      titolo.includes(ricerca) ||
      descrizione.includes(ricerca) ||
      nomeProgetto.includes(ricerca) ||
      assegnati.includes(ricerca)
    );
  });

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          {projectId
            ? `Task Progetto: ${nomeProgetto || "Caricamento..."}`
            : "Tutti i Task"}
        </h2>
        <div className="d-flex align-items-center gap-2">
          {/* Pulsanti con lo stile di TaskCard */}
          <button className="add-new-task" onClick={handleOpenCreateModal}>
            <b>
              <i className="bi bi-plus me-1"></i>
              Crea Task
            </b>
          </button>
          <button className="add-new-task" onClick={fetchTasks}>
            <b>
              <i className="bi bi-arrow-clockwise me-1"></i>
              Aggiorna
            </b>
          </button>
        </div>
      </div>

      {/* Barra di ricerca */}
      <div className="mb-4">
        <div className="input-group search-bar shadow-sm">
          <span className="input-group-text bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </span>
          <input
            type="text"
            className="form-control border-start-0 ps-0"
            placeholder="Cerca task per titolo, descrizione, progetto o persone assegnate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      ) : tasksFiltrati.length === 0 ? (
        <div className="alert alert-info">
          {searchTerm
            ? "Nessun task corrisponde ai criteri di ricerca."
            : projectId
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
              {tasksFiltrati.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => handleRowClick(t)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <strong>{t.titolo}</strong>
                    {t.descrizione && (
                      <div className="text-muted small text-truncate" style={{ maxWidth: "250px" }}>
                        {t.descrizione}
                      </div>
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
                  <td onClick={(e) => e.stopPropagation()}>
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

      {/* Modale Unificata */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="modal-internal-content">
          <h3 className="modal-title mb-3">
            {selectedTask ? "Modifica Task" : "Nuovo Task"}
          </h3>

          <form onSubmit={handleSaveTask}>
            <div className="MioContenitore">
              <div className="form-group mb-3">
                <span>Titolo *</span>
                <input
                  type="text"
                  name="titolo"
                  value={formData.titolo}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group mb-3">
                <span>Priorità</span>
                <select
                  name="priorita"
                  value={formData.priorita}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="Bassa">Bassa</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>

              <div className="form-group mb-3">
                <span>Scadenza</span>
                <input
                  type="date"
                  name="scadenza"
                  value={formData.scadenza}
                  onChange={handleInputChange}
                  className="form-control"
                />
              </div>

              {selectedTask && (
                <div className="form-group mb-3">
                  <span>Stato</span>
                  <select
                    name="stato"
                    value={formData.stato}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              )}

              <div className="form-group mb-3">
                <span>Progetto</span>
                <Dropdown className="w-100">
                  <Dropdown.Toggle id="dropdown-progetti" className="w-100 text-start">
                    {selectedProjectLabel}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {progetti.length === 0 ? (
                      <Dropdown.Item disabled>Nessun progetto trovato</Dropdown.Item>
                    ) : (
                      progetti.map((proj) => (
                        <Dropdown.Item
                          key={proj.id}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, progetto_id: proj.id }));
                            setSelectedProjectLabel(proj.nome);
                          }}
                        >
                          {proj.nome}
                        </Dropdown.Item>
                      ))
                    )}
                  </Dropdown.Menu>
                </Dropdown>
              </div>

              <div className="form-group full-width mb-3">
                <span className="mb-2 d-block">Assegna a (seleziona uno o più membri):</span>
                <div className="d-flex flex-wrap gap-2 p-2 border rounded bg-light">
                  {utenti.length === 0 ? (
                    <span className="text-muted small">Nessun membro del team trovato</span>
                  ) : (
                    utenti.map((member) => {
                      const isSelected = selectedProfili.includes(member.id);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          className={`btn btn-sm ${
                            isSelected ? "btn-primary" : "btn-outline-secondary"
                          }`}
                          onClick={() => toggleProfilo(member.id)}
                        >
                          <i
                            className={`bi bi-${
                              isSelected ? "check-circle-fill" : "plus-circle"
                            } me-1`}
                          ></i>
                          {member.nome} {member.cognome}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="form-group full-width mb-3">
                <span>Descrizione</span>
                <textarea
                  name="descrizione"
                  value={formData.descrizione}
                  onChange={handleInputChange}
                  className="form-control"
                  rows="3"
                />
              </div>
            </div>

            <div className="modal-actions mt-3 d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Annulla
              </button>
              <button type="submit" className="btn btn-primary">
                {selectedTask ? "Salva Modifiche" : "Crea Task"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

export default TaskPage;