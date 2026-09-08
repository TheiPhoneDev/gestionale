import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import Dropdown from "react-bootstrap/Dropdown";
import Modal from "./Modal";

function ProgettoDettaglio({ progettoId, onBack }) {
  const [progetto, setProgetto] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stati originali ereditati da TaskPage
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("Tutti");
  const [utenti, setUtenti] = useState([]);
  const [progettiList, setProgettiList] = useState([]);
  const [currentProfileId, setCurrentProfileId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedProfili, setSelectedProfili] = useState([]);
  const [selectedProjectLabel, setSelectedProjectLabel] = useState("Seleziona progetto");

  const [formData, setFormData] = useState({
    titolo: "",
    descrizione: "",
    scadenza: "",
    priorita: "Media",
    progetto_id: progettoId || "",
    stato: "todo",
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profiloData } = await supabase
          .from("profili")
          .select("id, ruolo")
          .eq("id", user.id)
          .single();

        if (profiloData) {
          setCurrentProfileId(profiloData.id);
          setCurrentUserRole(profiloData.ruolo || "");
        } else {
          setCurrentProfileId(user.id);
        }
      }

      await fetchDettaglioProgetto();
      await fetchDropdownData();
      setLoading(false);
    };

    if (progettoId) {
      init();
    }
  }, [progettoId]);

  const fetchDettaglioProgetto = async () => {
    // 1. Info progetto e cliente con join anche sulle task per calcolare lo stato reale
    const { data: projData, error: projError } = await supabase
      .from("progetti")
      .select(`id, nome, stato, clienti ( nome, azienda ), task ( stato )`)
      .eq("id", progettoId)
      .single();

    if (!projError && projData) {
      setProgetto(projData);
    }

    // 2. Task del progetto con profili assegnati
    const { data: taskData, error: taskError } = await supabase
      .from("task")
      .select(`
        *,
        progetti ( id, nome ),
        task_profili (
          profili ( id, nome, cognome )
        )
      `)
      .eq("progetto_id", progettoId);

    if (!taskError) {
      setTasks(taskData || []);
    }
  };

  // Funzione per calcolare lo stato effettivo (uguale a ProgettiList)
  const getEffectiveStatus = (proj, currentTasks) => {
    const taskList = currentTasks || proj?.task || [];
    if (taskList.length > 0) {
      const allDone = taskList.every((t) => {
        const s = (t.stato || "").toLowerCase();
        return s === "done" || s === "completato";
      });
      if (allDone) return "Completato";
    }
    return proj?.stato || "In corso";
  };

  const fetchDropdownData = async () => {
    const { data: utentiData } = await supabase
      .from("profili")
      .select("id, nome, cognome, ruolo");
    if (utentiData) setUtenti(utentiData);

    const { data: progettiData } = await supabase
      .from("progetti")
      .select("id, nome");
    if (progettiData) setProgettiList(progettiData);
  };

  const toggleProfilo = (profiloId) => {
    setSelectedProfili((prev) =>
      prev.includes(profiloId) ? prev.filter((id) => id !== profiloId) : [...prev, profiloId]
    );
  };

  const handleOpenCreateModal = () => {
    setSelectedTask(null);
    setFormData({
      titolo: "",
      descrizione: "",
      scadenza: "",
      priorita: "Media",
      progetto_id: progettoId || "",
      stato: "todo",
    });

    if (progetto) {
      setSelectedProjectLabel(progetto.nome);
    }
    setSelectedProfili([]);
    setIsModalOpen(true);
  };

  const handleRowClick = (task) => {
    const isAssigned = task.task_profili?.some((tp) => tp.profili?.id === currentProfileId);
    const isAdmin = currentUserRole?.toLowerCase() === "admin";
    if (!isAssigned && !isAdmin) {
      alert("Non hai i permessi per modificare questo task.");
      return;
    }

    setSelectedTask(task);
    setFormData({
      titolo: task.titolo || "",
      descrizione: task.descrizione || "",
      scadenza: task.scadenza ? task.scadenza.split("T")[0] : "",
      priorita: task.priorita || "Media",
      progetto_id: task.progetti ? task.progetti.id : progettoId,
      stato: task.stato || "todo",
    });

    setSelectedProjectLabel(progetto?.nome || "Seleziona progetto");

    const attualiMembriIds = task.task_profili
      ? task.task_profili.map((tp) => tp.profili?.id).filter(Boolean)
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

    const payload = {
      titolo: formData.titolo,
      descrizione: formData.descrizione,
      scadenza: formData.scadenza || null,
      priorita: formData.priorita,
      progetto_id: progettoId,
      stato: formData.stato,
    };

    let targetTaskId = null;

    if (selectedTask) {
      const { error } = await supabase.from("task").update(payload).eq("id", selectedTask.id);
      if (error) {
        alert(`Errore nella modifica: ${error.message}`);
        return;
      }
      targetTaskId = selectedTask.id;
      await supabase.from("task_profili").delete().eq("task_id", targetTaskId);
    } else {
      const { data: newTask, error } = await supabase.from("task").insert([payload]).select().single();
      if (error) {
        alert(`Errore nella creazione: ${error.message}`);
        return;
      }
      targetTaskId = newTask.id;
    }

    if (selectedProfili.length > 0) {
      const assegnazioni = selectedProfili.map((profiloId) => ({
        task_id: targetTaskId,
        profilo_id: profiloId,
      }));
      await supabase.from("task_profili").insert(assegnazioni);

      const notificheDaCreare = selectedProfili.map((profiloId) => ({
        user_id: profiloId,
        titolo: selectedTask ? "Task aggiornato" : "Nuovo task assegnato",
        messaggio: `Ti è stato assegnato il task "${formData.titolo}".`,
        letta: false,
      }));
      await supabase.from("notifiche").insert(notificheDaCreare);
    }

    setIsModalOpen(false);
    fetchDettaglioProgetto();
  };

  const handleStatusChange = async (task, newStatus) => {
    const isAssigned = task.task_profili?.some((tp) => tp.profili?.id === currentProfileId);
    const isAdmin = currentUserRole?.toLowerCase() === "admin";
    if (!isAssigned && !isAdmin) {
      alert("Non puoi modificare questo task.");
      return;
    }

    const updatedTasks = tasks.map((t) => (t.id === task.id ? { ...t, stato: newStatus } : t));
    setTasks(updatedTasks);
    await supabase.from("task").update({ stato: newStatus }).eq("id", task.id);
  };

  const handleAutoBalanceTasks = async () => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const workloadMap = {};
      utenti.forEach((u) => {
        workloadMap[u.id] = 0;
      });

      tasks.forEach((t) => {
        const isDone = t.stato?.toLowerCase() === "done" || t.stato?.toLowerCase() === "completato";
        if (!isDone && t.task_profili) {
          t.task_profili.forEach((tp) => {
            if (tp.profili?.id && workloadMap[tp.profili.id] !== undefined) {
              workloadMap[tp.profili.id] += 1;
            }
          });
        }
      });

      const availableUsers = utenti.filter((u) => (workloadMap[u.id] || 0) < 4);

      if (availableUsers.length === 0) {
        alert("Nessun membro disponibile con meno di 4 task aperti al momento!");
        return;
      }

      const criticalTasks = tasks.filter((t) => {
        const isDone = t.stato?.toLowerCase() === "done" || t.stato?.toLowerCase() === "completato";
        if (!t.scadenza || isDone) return false;
        const d = new Date(t.scadenza);
        return d <= threeDaysFromNow;
      });

      if (criticalTasks.length === 0) {
        alert("Non ci sono task in scadenza e a rilento da riassegnare");
        return;
      }

      let reassignedCount = 0;

      for (const task of criticalTasks) {
        availableUsers.sort((a, b) => (workloadMap[a.id] || 0) - (workloadMap[b.id] || 0));
        const chosenUser = availableUsers[0];

        const alreadyAssigned = task.task_profili?.some((tp) => tp.profili?.id === chosenUser.id);

        if (!alreadyAssigned) {
          const { error } = await supabase.from("task_profili").insert([
            {
              task_id: task.id,
              profilo_id: chosenUser.id,
            },
          ]);

          if (!error) {
            workloadMap[chosenUser.id] += 1;
            reassignedCount++;
            
            await supabase.from("notifiche").insert([
              {
                user_id: chosenUser.id,
                titolo: "Task riassegnato (Bilanciamento)",
                messaggio: `Ti è stato riassegnato il task critico "${task.titolo}".`,
                letta: false
              }
            ]);
          }
        }
      }

      alert(`Bilanciamento completato! Assegnati ${reassignedCount} task critici.`);
      fetchDettaglioProgetto();
    } catch (err) {
      console.error("Errore durante il bilanciamento automatico:", err);
    }
  };

  const getStatusBadgeStyle = (stato) => {
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

  const getPriorityBadge = (task) => {
    const val = (task.priorita || "").toString().trim().toLowerCase();
    switch (val) {
      case "alta":
        return <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-1"><i className="bi bi-arrow-up-circle-fill me-1"></i>Alta</span>;
      case "media":
        return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-1"><i className="bi bi-dash-circle-fill me-1"></i>Media</span>;
      case "bassa":
        return <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill px-2 py-1"><i className="bi bi-arrow-down-circle-fill me-1"></i>Bassa</span>;
      default:
        return <span className="badge bg-secondary-subtle text-secondary rounded-pill px-2 py-1">-</span>;
    }
  };

  const tasksFiltrati = tasks.filter((t) => {
    const ricerca = searchTerm ? searchTerm.toLowerCase().trim() : "";
    const titolo = (t.titolo || "").toLowerCase();
    const descrizione = (t.descrizione || "").toLowerCase();
    const assegnati = t.task_profili
      ? t.task_profili.map((tp) => `${tp.profili?.nome || ""} ${tp.profili?.cognome || ""}`).join(" ").toLowerCase()
      : "";

    const matchesSearch = !ricerca || titolo.includes(ricerca) || descrizione.includes(ricerca) || assegnati.includes(ricerca);
    if (!matchesSearch) return false;

    if (priorityFilter === "Miei") {
      return t.task_profili?.some((tp) => tp.profili?.id === currentProfileId);
    }
    if (priorityFilter === "Tutti") return true;

    return (t.priorita || "").toString().trim().toLowerCase() === priorityFilter.toLowerCase().trim();
  });

  const tasksOrdinati = [...tasksFiltrati].sort((a, b) => {
    const isDoneA = ["done", "completato"].includes(a.stato?.toLowerCase());
    const isDoneB = ["done", "completato"].includes(b.stato?.toLowerCase());
    if (isDoneA !== isDoneB) return isDoneA ? 1 : -1;
    if (!a.scadenza && !b.scadenza) return 0;
    if (!a.scadenza) return 1;
    if (!b.scadenza) return -1;
    return new Date(a.scadenza) - new Date(b.scadenza);
  });

  const totalTasks = tasksFiltrati.length;
  const doneTasks = tasksFiltrati.filter((t) => ["done", "completato"].includes(t.stato?.toLowerCase())).length;
  const inProgressTasks = tasksFiltrati.filter((t) => ["in_progress", "in_corso"].includes(t.stato?.toLowerCase())).length;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  
  const expTasks = tasksFiltrati.filter((t) => {
    if (!t.scadenza || ["done", "completato"].includes(t.stato?.toLowerCase())) return false;
    return new Date(t.scadenza) <= threeDaysFromNow;
  }).length;

  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Caricamento...</span>
        </div>
      </div>
    );
  }

  // Stato sincronizzato con le task
  const statoRealeProgetto = getEffectiveStatus(progetto, tasks);

  return (
    <div className="container pt-4 mb-5">
      {/* Intestazione con Back Button uniformato e comandi bilancia/crea/aggiorna */}
      <div className="card shadow-sm border-0 rounded-4 p-4 bg-white mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <button
              className="add-new-task d-flex align-items-center justify-content-center p-0 flex-shrink-0"
              style={{ width: "42px", height: "42px", borderRadius: "50%" }}
              onClick={() => { if (onBack) onBack("projects"); }}
              title="Torna alla Lista Progetti"
            >
              <i className="bi bi-arrow-left fs-5"></i>
            </button>
            <div>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill mb-1 text-uppercase">
                {statoRealeProgetto}
              </span>
              <h2 className="fw-bold text-dark mb-1">{progetto?.nome}</h2>
              <p className="text-muted mb-0">
                <i className="bi bi-building me-1"></i>
                Cliente: {progetto?.clienti?.azienda || progetto?.clienti?.nome || "Nessun cliente associato"}
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button className="add-new-task" onClick={handleAutoBalanceTasks} title="Bilancia task critici">
              <b><i className="bi bi-robot me-1"></i>Bilancia Task</b>
            </button>
            <button className="add-new-task" onClick={handleOpenCreateModal}>
              <b><i className="bi bi-plus me-1"></i>Crea Task</b>
            </button>
            <button className="add-new-task" onClick={fetchDettaglioProgetto}>
              <b><i className="bi bi-arrow-clockwise me-1"></i>Aggiorna</b>
            </button>
          </div>
        </div>
      </div>

      {/* Card metriche */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0 d-flex align-items-center justify-content-between">
            <div className="me-2 overflow-hidden">
              <span className="text-muted small d-block text-truncate">Totale Task</span>
              <span className="h4 fw-bold mb-0">{totalTasks}</span>
            </div>
            <div className="bg-light rounded-circle text-primary d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "48px", height: "48px" }}>
              <i className="bi bi-list-task fs-4"></i>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0 d-flex align-items-center justify-content-between">
            <div className="me-2 overflow-hidden">
              <span className="text-muted small d-block text-truncate">In Corso</span>
              <span className="h4 fw-bold mb-0 text-warning">{inProgressTasks}</span>
            </div>
            <div className="bg-warning-subtle rounded-circle text-warning d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "48px", height: "48px" }}>
              <i className="bi bi-hourglass-split fs-4"></i>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0 d-flex align-items-center justify-content-between">
            <div className="me-2 overflow-hidden">
              <span className="text-muted small d-block text-truncate">Completati ({completionRate}%)</span>
              <span className="h4 fw-bold mb-0 text-success">{doneTasks}</span>
            </div>
            <div className="bg-success-subtle rounded-circle text-success d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "48px", height: "48px" }}>
              <i className="bi bi-check-circle fs-4"></i>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0 d-flex align-items-center justify-content-between">
            <div className="me-2 overflow-hidden">
              <span className="text-muted small d-block text-truncate">In Scadenza</span>
              <span className="h4 fw-bold mb-0 text-danger">{expTasks}</span>
            </div>
            <div className="bg-danger-subtle rounded-circle text-danger d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "48px", height: "48px" }}>
              <i className="bi bi-exclamation-triangle fs-4"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Barra di ricerca */}
      <div className="mb-3">
        <div className="input-group search-bar-clean align-items-center bg-white rounded-3 px-3 py-1 shadow-sm">
          <span className="bg-transparent border-0 pe-2"><i className="bi bi-search text-muted"></i></span>
          <input
            type="text"
            className="form-control bg-transparent border-0 ps-0 shadow-none"
            placeholder="Cerca task in questo progetto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filtri */}
      <div className="d-flex gap-2 mb-4 overflow-x-auto pb-1">
        {["Tutti", "Miei", "Alta", "Media", "Bassa"].map((p) => {
          let label = p;
          if (p === "Tutti") label = "Tutti i Task";
          if (p === "Miei") label = "I Miei Task";
          if (p !== "Tutti" && p !== "Miei") label = `Priorità ${p}`;

          return (
            <button
              key={p}
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold transition-all ${
                priorityFilter === p ? "btn-dark shadow-sm" : "btn-light text-muted border-0 bg-white"
              }`}
              onClick={() => setPriorityFilter(p)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Tabella dei Task */}
      {tasksOrdinati.length === 0 ? (
        <div className="alert alert-light rounded-4 text-muted text-center border-0 p-4 bg-white shadow-sm">
          Nessun task trovato per questo progetto.
        </div>
      ) : (
        <div className="table-responsive shadow-sm rounded-4 border-0">
          <table className="table table-hover align-middle mb-0 bg-white">
            <thead className="table-light">
              <tr>
                <th>Titolo</th>
                <th>Priorità</th>
                <th>Assegnato a</th>
                <th>Scadenza</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {tasksOrdinati.map((t) => {
                const isAssigned = t.task_profili?.some((tp) => tp.profili?.id === currentProfileId);
                const isAdmin = currentUserRole?.toLowerCase() === "admin";
                const canEdit = isAssigned || isAdmin;

                return (
                  <tr
                    key={t.id}
                    onClick={() => handleRowClick(t)}
                    style={{ cursor: canEdit ? "pointer" : "not-allowed" }}
                  >
                    <td>
                      <strong>{t.titolo}</strong>
                      {t.descrizione && (
                        <div className="text-muted small text-truncate" style={{ maxWidth: "250px" }}>
                          {t.descrizione}
                        </div>
                      )}
                    </td>
                    <td>{getPriorityBadge(t)}</td>
                    <td>
                      {t.task_profili && t.task_profili.length > 0 ? (
                        <div className="d-flex flex-wrap gap-1">
                          {t.task_profili.map((tp, idx) => {
                            const isMe = tp.profili?.id === currentProfileId;
                            return (
                              <span
                                key={tp.profili?.id || idx}
                                className={`badge ${isMe ? 'bg-primary text-white' : 'bg-light text-secondary'} border-0 rounded-pill px-3 py-2`}
                              >
                                <i className="bi bi-person me-1"></i>
                                {tp.profili?.nome || ""} {tp.profili?.cognome || ""} {isMe && "(Tu)"}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-muted small">Nessuno</span>
                      )}
                    </td>
                    <td>
                      {t.scadenza ? new Date(t.scadenza).toLocaleDateString("it-IT") : <span className="text-muted small">-</span>}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        className={`form-select form-select-sm task-status-select ${getStatusBadgeStyle(t.stato)}`}
                        value={t.stato || "todo"}
                        onChange={(e) => handleStatusChange(t, e.target.value)}
                        disabled={!canEdit}
                        style={{ cursor: canEdit ? "pointer" : "not-allowed", width: "130px" }}
                      >
                        <option value="todo" className="bg-white text-dark">To Do</option>
                        <option value="in_progress" className="bg-white text-dark">In Progress</option>
                        <option value="done" className="bg-white text-dark">Done</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale di Creazione/Modifica Task */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-3">
          <h3 className="modal-title mb-4">
            {selectedTask ? "Modifica Task" : "Nuovo Task"}
          </h3>

          <form onSubmit={handleSaveTask}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Titolo *</label>
              <input
                type="text"
                name="titolo"
                value={formData.titolo}
                onChange={handleInputChange}
                className="form-control"
                required
              />
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Priorità</label>
                <select
                  name="priorita"
                  value={formData.priorita}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="Bassa">Bassa</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Scadenza</label>
                <input
                  type="date"
                  name="scadenza"
                  value={formData.scadenza}
                  onChange={handleInputChange}
                  className="form-control"
                />
              </div>
            </div>

            {selectedTask && (
              <div className="mb-3">
                <label className="form-label fw-semibold">Stato</label>
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

            <div className="mb-3">
              <label className="form-label fw-semibold d-block">
                Assegna a membri del team:
              </label>
              <div className="d-flex flex-wrap gap-2 p-3 rounded-3 bg-light border-0">
                {utenti.length === 0 ? (
                  <span className="text-muted small">Nessun membro trovato</span>
                ) : (
                  utenti.map((member) => {
                    const isSelected = selectedProfili.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        className={`badge-pill-clean btn btn-sm ${
                          isSelected ? "btn-dark text-white" : "btn-outline-secondary border-0 bg-white"
                        }`}
                        onClick={() => toggleProfilo(member.id)}
                      >
                        <i className={`bi bi-${isSelected ? "check-circle-fill" : "plus-circle"} me-1`}></i>
                        {member.nome} {member.cognome}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Descrizione</label>
              <textarea
                name="descrizione"
                value={formData.descrizione}
                onChange={handleInputChange}
                className="form-control"
                rows="3"
              />
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="add-new-task"
                style={{ backgroundColor: "#dc3545", color: "#fff" }}
                onClick={() => setIsModalOpen(false)}
              >
                <b>Annulla</b>
              </button>
              <button type="submit" className="add-new-task">
                <b>{selectedTask ? "Salva Modifiche" : "Crea Task"}</b>
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

export default ProgettoDettaglio;