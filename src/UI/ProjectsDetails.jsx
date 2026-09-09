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

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailTask, setDetailTask] = useState(null);

  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceRole, setBalanceRole] = useState("Tutti");
  const [balanceScope, setBalanceScope] = useState("scaduti");

  const [noteList, setNoteList] = useState([]);
  const [nuovaNota, setNuovaNota] = useState("");
  const [allegatiList, setAllegatiList] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [pendingFiles, setPendingFiles] = useState([]);

  const [formData, setFormData] = useState({
    titolo: "",
    descrizione: "",
    scadenza: "",
    priorita: "Media",
    progetto_id: progettoId || "",
    stato: "todo",
  });

  const isAdmin = currentUserRole?.toLowerCase() === "admin";

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
    const { data: projData, error: projError } = await supabase
      .from("progetti")
      .select(`id, nome, stato, clienti ( nome, azienda ), task ( stato )`)
      .eq("id", progettoId)
      .single();

    if (!projError && projData) {
      setProgetto(projData);
    }

    const { data: taskData, error: taskError } = await supabase
      .from("task")
      .select(`
        *,
        progetti ( id, nome ),
        creatore:profili!creato_da ( id, nome, cognome ),
        task_profili (
          profili ( id, nome, cognome, ruolo )
        )
      `)
      .eq("progetto_id", progettoId);

    if (!taskError) {
      setTasks(taskData || []);
    }
  };

  const fetchTaskDetailsExtra = async (taskId) => {
    const { data: notesData } = await supabase
      .from("task_note")
      .select(`*, profili ( id, nome, cognome )`)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    setNoteList(notesData || []);

    const { data: filesData } = await supabase
      .from("task_allegati")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    setAllegatiList(filesData || []);
  };

  const handleRowClick = async (task) => {
    setDetailTask(task);
    await fetchTaskDetailsExtra(task.id);
    setIsDetailModalOpen(true);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo task?")) return;

    const { error } = await supabase.from("task").delete().eq("id", taskId);

    if (error) {
      alert("Errore durante l'eliminazione del task: " + error.message);
    } else {
      setIsDetailModalOpen(false);
      fetchDettaglioProgetto();
    }
  };

  const handleAddNota = async (e) => {
    e.preventDefault();
    if (!nuovaNota.trim() || !detailTask) return;

    const { error } = await supabase.from("task_note").insert([
      {
        task_id: detailTask.id,
        profilo_id: currentProfileId,
        testo: nuovaNota.trim(),
      },
    ]);

    if (!error) {
      setNuovaNota("");
      fetchTaskDetailsExtra(detailTask.id);
    } else {
      alert("Errore nell'invio della nota: " + error.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !detailTask) return;

    setUploadingFile(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${detailTask.id}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("task-attachments")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("task_allegati").insert([
        {
          task_id: detailTask.id,
          nome_file: file.name,
          url_file: publicUrlData.publicUrl,
          tipo_file: file.type,
        },
      ]);

      if (dbError) throw dbError;

      fetchTaskDetailsExtra(detailTask.id);
    } catch (err) {
      alert("Errore durante il caricamento del file: " + err.message);
    } finally {
      setUploadingFile(false);
      e.target.value = null;
    }
  };

  const handlePendingFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setPendingFiles((prev) => [...prev, ...files]);
    }
    e.target.value = null;
  };

  const removePendingFile = (indexToRemove) => {
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleOpenEditFromDetail = (task) => {
    setIsDetailModalOpen(false);
    const isAssigned = task.task_profili?.some((tp) => tp.profili?.id === currentProfileId);
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
      progetto_id: progettoId,
      stato: task.stato || "todo",
    });

    setSelectedProjectLabel(progetto?.nome || "Seleziona progetto");

    const attualiMembriIds = task.task_profili
      ? task.task_profili.map((tp) => tp.profili?.id).filter(Boolean)
      : [];
    setSelectedProfili(attualiMembriIds);
    setPendingFiles([]);
    setIsModalOpen(true);
  };

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
    setPendingFiles([]);
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
      progetto_id: progettoId || null,
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
      if (currentProfileId) payload.creato_da = currentProfileId;
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

    if (pendingFiles.length > 0) {
      for (const file of pendingFiles) {
        try {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
          const filePath = `${targetTaskId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("task-attachments")
            .upload(filePath, file);

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from("task-attachments")
              .getPublicUrl(filePath);

            await supabase.from("task_allegati").insert([
              {
                task_id: targetTaskId,
                nome_file: file.name,
                url_file: publicUrlData.publicUrl,
                tipo_file: file.type,
              },
            ]);
          }
        } catch (err) {
          console.error("Errore caricamento file in sospeso:", err);
        }
      }
    }

    setIsModalOpen(false);
    fetchDettaglioProgetto();
  };

  const handleStatusChange = async (task, newStatus) => {
    const isAssigned = task.task_profili?.some((tp) => tp.profili?.id === currentProfileId);
    if (!isAssigned && !isAdmin) {
      alert("Non puoi modificare questo task.");
      return;
    }

    const updatedTasks = tasks.map((t) => (t.id === task.id ? { ...t, stato: newStatus } : t));
    setTasks(updatedTasks);
    await supabase.from("task").update({ stato: newStatus }).eq("id", task.id);
  };

  const handleAssignSingleTask = async (taskId, taskTitolo, targetUserId) => {
    if (!targetUserId) {
      alert("Nessun utente valido selezionato per la riassegnazione.");
      return;
    }

    const { error } = await supabase.from("task_profili").insert([
      {
        task_id: taskId,
        profilo_id: targetUserId,
      },
    ]);

    if (error) {
      alert(`Errore durante l'assegnazione: ${error.message}`);
      return;
    }

    await supabase.from("notifiche").insert([
      {
        user_id: targetUserId,
        titolo: "Task assegnato (Bilanciamento mirato)",
        messaggio: `Ti è stato assegnato il task "${taskTitolo}".`,
        letta: false
      }
    ]);

    alert("Task assegnato con successo!");
    fetchDettaglioProgetto();
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const ruoliDisponibili = ["Tutti", ...new Set(utenti.map((u) => u.ruolo).filter(Boolean))];

  const getFilteredTasksForModal = () => {
    const filteredUsers = utenti.filter((u) => {
      if (balanceRole === "Tutti") return true;
      return (u.ruolo || "").trim().toLowerCase() === balanceRole.trim().toLowerCase();
    });

    const workloadMap = {};
    filteredUsers.forEach((u) => {
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

    const matchingTasks = tasks.filter((t) => {
      const isDone = t.stato?.toLowerCase() === "done" || t.stato?.toLowerCase() === "completato";
      if (isDone) return false;

      if (balanceScope === "scaduti") {
        if (!t.scadenza) return false;
        const d = new Date(t.scadenza);
        d.setHours(0, 0, 0, 0);
        return d < now;
      } else if (balanceScope === "in_scadenza") {
        if (!t.scadenza) return false;
        const d = new Date(t.scadenza);
        d.setHours(0, 0, 0, 0);
        return d >= now && d <= threeDaysFromNow;
      } else {
        return true;
      }
    });

    return matchingTasks.map((t) => {
      const sortedAvailable = [...filteredUsers].sort(
        (a, b) => (workloadMap[a.id] || 0) - (workloadMap[b.id] || 0)
      );
      const bestCandidate = sortedAvailable.length > 0 ? sortedAvailable[0] : null;
      return { task: t, candidate: bestCandidate };
    });
  };

  const modalTaskList = getFilteredTasksForModal();

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
  
  const expTasks = tasksFiltrati.filter((t) => {
    if (!t.scadenza || ["done", "completato"].includes(t.stato?.toLowerCase())) return false;
    const d = new Date(t.scadenza);
    d.setHours(0, 0, 0, 0);
    return d >= now && d <= threeDaysFromNow;
  }).length;

  const overdueTasks = tasksFiltrati.filter((t) => {
    if (!t.scadenza || ["done", "completato"].includes(t.stato?.toLowerCase())) return false;
    const d = new Date(t.scadenza);
    d.setHours(0, 0, 0, 0);
    return d < now;
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

  const statoRealeProgetto = getEffectiveStatus(progetto, tasks);

  return (
    <div className="container pt-4 mb-5">
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
            {isAdmin && (
              <button className="add-new-task" onClick={() => setIsBalanceModalOpen(true)} title="Gestisci task critici">
                <b><i className="bi bi-robot me-1"></i>Bilancia Task</b>
              </button>
            )}
            <button className="add-new-task" onClick={handleOpenCreateModal}>
              <b><i className="bi bi-plus me-1"></i>Crea Task</b>
            </button>
            <button className="add-new-task" onClick={fetchDettaglioProgetto}>
              <b><i className="bi bi-arrow-clockwise me-1"></i>Aggiorna</b>
            </button>
          </div>
        </div>
      </div>

      {/* METRICHE (Con Card Completati Ripristinata) */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-2">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0 d-flex align-items-center justify-content-between">
            <div className="me-2 overflow-hidden">
              <span className="text-muted small d-block text-truncate">Totale</span>
              <span className="h4 fw-bold mb-0">{totalTasks}</span>
            </div>
            <div className="bg-light rounded-circle text-primary d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "40px", height: "40px" }}>
              <i className="bi bi-list-task fs-5"></i>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0 d-flex align-items-center justify-content-between">
            <div className="me-2 overflow-hidden">
              <span className="text-muted small d-block text-truncate">In Corso</span>
              <span className="h4 fw-bold mb-0 text-warning">{inProgressTasks}</span>
            </div>
            <div className="bg-warning-subtle rounded-circle text-warning d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "40px", height: "40px" }}>
              <i className="bi bi-hourglass-split fs-5"></i>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0 d-flex align-items-center justify-content-between">
            <div className="me-2 overflow-hidden">
              <span className="text-muted small d-block text-truncate">In Scadenza</span>
              <span className="h4 fw-bold mb-0 text-warning">{expTasks}</span>
            </div>
            <div className="bg-warning-subtle rounded-circle text-warning d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "40px", height: "40px" }}>
              <i className="bi bi-clock-history fs-5"></i>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0 d-flex align-items-center justify-content-between">
            <div className="me-2 overflow-hidden">
              <span className="text-muted small d-block text-truncate">Scaduti</span>
              <span className="h4 fw-bold mb-0 text-danger">{overdueTasks}</span>
            </div>
            <div className="bg-danger-subtle rounded-circle text-danger d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "40px", height: "40px" }}>
              <i className="bi bi-exclamation-triangle fs-5"></i>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0 d-flex align-items-center justify-content-between">
            <div className="me-2 overflow-hidden">
              <span className="text-muted small d-block text-truncate">Completati</span>
              <span className="h4 fw-bold mb-0 text-success">{doneTasks} <span className="fs-6 text-muted fw-normal">({completionRate}%)</span></span>
            </div>
            <div className="bg-success-subtle rounded-circle text-success d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "40px", height: "40px" }}>
              <i className="bi bi-check-circle-fill fs-5"></i>
            </div>
          </div>
        </div>
      </div>

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

      {tasksOrdinati.length === 0 ? (
        <div className="alert alert-light rounded-4 text-muted text-center border-0 p-4 bg-white shadow-sm">
          Nessun task trovato per questo progetto.
        </div>
      ) : (
        <div className="table-responsive shadow-sm rounded-4 border-0">
          <table className="table table-hover align-middle mb-0 bg-white">
            <thead className="table-light">
              <tr>
                <th className="py-3 ps-3">Titolo</th>
                <th className="py-3">Priorità</th>
                <th className="py-3">Assegnato da</th>
                <th className="py-3">Assegnato a</th>
                <th className="py-3">Scadenza</th>
                <th className="py-3 pe-3">Stato</th>
              </tr>
            </thead>
            <tbody>
              {tasksOrdinati.map((t) => {
                const isAssigned = t.task_profili?.some((tp) => tp.profili?.id === currentProfileId);
                const canEdit = isAssigned || isAdmin;

                return (
                  <tr
                    key={t.id}
                    onClick={() => handleRowClick(t)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="ps-3 py-3">
                      <strong className="text-dark">{t.titolo}</strong>
                      {t.descrizione && (
                        <div className="text-muted small text-truncate mt-1" style={{ maxWidth: "250px" }}>
                          {t.descrizione}
                        </div>
                      )}
                    </td>
                    <td className="py-3">{getPriorityBadge(t)}</td>
                    <td className="py-3">
                      <span className="text-dark small fw-medium">
                        {t.creatore ? `${t.creatore.nome} ${t.creatore.cognome}` : "-"}
                      </span>
                    </td>
                    <td className="py-3">
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
                    <td className="py-3">
                      {t.scadenza ? new Date(t.scadenza).toLocaleDateString("it-IT") : <span className="text-muted small">-</span>}
                    </td>
                    <td className="pe-3 py-3" onClick={(e) => e.stopPropagation()}>
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

      {/* MODALE BILANCIAMENTO */}
      <Modal isOpen={isBalanceModalOpen} onClose={() => setIsBalanceModalOpen(false)}>
        <div className="p-3" style={{ maxHeight: "80vh", overflowY: "auto" }}>
          <h3 className="modal-title mb-3">
            <i className="bi bi-robot me-2"></i>Gestione e Candidati Task
          </h3>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label fw-semibold small">Filtra per Ruolo</label>
              <select
                className="form-select form-select-sm"
                value={balanceRole}
                onChange={(e) => setBalanceRole(e.target.value)}
              >
                {ruoliDisponibili.map((r, index) => (
                  <option key={index} value={r}>
                    {r === "Tutti" ? "Tutti i ruoli" : r}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold small">Criterio Task</label>
              <select
                className="form-select form-select-sm"
                value={balanceScope}
                onChange={(e) => setBalanceScope(e.target.value)}
              >
                <option value="scaduti">Solo task già scaduti</option>
                <option value="in_scadenza">Task in scadenza (3 giorni)</option>
                <option value="tutti">Tutti i task aperti</option>
              </select>
            </div>
          </div>

          <h5 className="fw-bold mb-3 fs-6 text-muted uppercase">
            Task filtrati e membri candidati ({modalTaskList.length})
          </h5>

          {modalTaskList.length === 0 ? (
            <div className="alert alert-light text-center text-muted border-0 py-4 small">
              Nessun task risponde ai filtri selezionati.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3 mb-4">
              {modalTaskList.map(({ task, candidate }) => (
                <div key={task.id} className="p-3 bg-light rounded-3 border-0 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                  <div className="overflow-hidden">
                    <div className="fw-bold text-dark text-truncate">{task.titolo}</div>
                    <div className="small text-muted d-flex align-items-center gap-2 mt-1">
                      <span><i className="bi bi-calendar-event me-1"></i>Scadenza: {task.scadenza ? new Date(task.scadenza).toLocaleDateString("it-IT") : "-"}</span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3 flex-shrink-0">
                    <div className="text-end">
                      <div className="small text-muted" style={{ fontSize: "0.75rem" }}>Candidato ottimale:</div>
                      {candidate ? (
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1 small">
                          <i className="bi bi-person-fill me-1"></i>
                          {candidate.nome} {candidate.cognome} 
                          {candidate.ruolo && ` (${candidate.ruolo})`}
                        </span>
                      ) : (
                        <span className="badge bg-secondary-subtle text-secondary rounded-pill px-2 py-1 small">Nessuno disponibile</span>
                      )}
                    </div>

                    {candidate && (
                      <button
                        type="button"
                        className="add-new-task"
                        onClick={() => handleAssignSingleTask(task.id, task.titolo, candidate.id)}
                        title="Assegna a questo membro"
                      >
                        <b>Assegna</b>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="d-flex justify-content-end">
            <button
              type="button"
              className="add-new-task"
              style={{ backgroundColor: "#dc3545", color: "#fff" }}
              onClick={() => setIsBalanceModalOpen(false)}
            >
              <b>Chiudi</b>
            </button>
          </div>
        </div>
      </Modal>

      {/* MODALE DETTAGLIO TASK */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)}>
        {detailTask && (
          <div className="p-3" style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <div className="d-flex justify-content-between align-items-start mb-3">
              <h3 className="modal-title mb-0 fw-bold">{detailTask.titolo}</h3>
              <div>{getPriorityBadge(detailTask)}</div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <span className="text-muted small d-block fw-semibold text-uppercase">Stato</span>
                <span className={`badge mt-1 ${getStatusBadgeStyle(detailTask.stato)}`}>
                  {detailTask.stato === "todo" ? "To Do" : detailTask.stato === "in_progress" ? "In Progress" : "Done"}
                </span>
              </div>
              <div className="col-md-4">
                <span className="text-muted small d-block fw-semibold text-uppercase">Scadenza</span>
                <span className="text-dark fw-medium">{detailTask.scadenza ? new Date(detailTask.scadenza).toLocaleDateString("it-IT") : "Nessuna"}</span>
              </div>
              <div className="col-md-4">
                <span className="text-muted small d-block fw-semibold text-uppercase">Progetto</span>
                <span className="text-dark fw-medium">{detailTask.progetti?.nome || progetto?.nome || "Nessuno"}</span>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <span className="text-muted small d-block fw-semibold text-uppercase">Assegnato da (Creatore)</span>
                <span className="text-dark fw-medium">
                  {detailTask.creatore ? `${detailTask.creatore.nome} ${detailTask.creatore.cognome}` : "Non specificato"}
                </span>
              </div>
              <div className="col-md-6">
                <span className="text-muted small d-block fw-semibold text-uppercase">Assegnato a</span>
                <div className="d-flex flex-wrap gap-1 mt-1">
                  {detailTask.task_profili?.length > 0 ? (
                    detailTask.task_profili.map((tp, idx) => (
                      <span key={idx} className="badge bg-light text-secondary border rounded-pill px-2 py-1">
                        {tp.profili?.nome} {tp.profili?.cognome}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted small">Nessun utente assegnato</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <span className="text-muted small d-block mb-1 fw-semibold text-uppercase">Descrizione</span>
              <div className="p-3 bg-light rounded-3 text-dark" style={{ whiteSpace: "pre-wrap" }}>
                {detailTask.descrizione || "Nessuna descrizione."}
              </div>
            </div>

            <div className="mb-4">
              <span className="text-muted small d-block mb-2 fw-semibold text-uppercase">Allegati (Doc / Immagini)</span>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {allegatiList.map((file) => (
                  <a
                    key={file.id}
                    href={file.url_file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="badge bg-light text-dark border p-2 text-decoration-none d-flex align-items-center gap-1"
                  >
                    <i className="bi bi-paperclip"></i>
                    <span className="text-truncate" style={{ maxWidth: "150px" }}>{file.nome_file}</span>
                  </a>
                ))}
                {allegatiList.length === 0 && <span className="text-muted small">Nessun file allegato.</span>}
              </div>
              
              <div>
                <label className={`btn btn-sm btn-outline-secondary ${uploadingFile ? "disabled" : ""}`}>
                  <i className="bi bi-upload me-1"></i> {uploadingFile ? "Caricamento..." : "Aggiungi file o immagine"}
                  <input type="file" onChange={handleFileUpload} style={{ display: "none" }} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
                </label>
              </div>
            </div>

            <div className="mb-4">
              <span className="text-muted small d-block mb-2 fw-semibold text-uppercase">Note e Commenti</span>
              <div className="d-flex flex-column gap-2 mb-3" style={{ maxHeight: "200px", overflowY: "auto" }}>
                {noteList.map((nota) => (
                  <div key={nota.id} className="p-2 bg-light rounded-3 small">
                    <div className="fw-bold text-primary mb-1">
                      {nota.profili ? `${nota.profili.nome} ${nota.profili.cognome}` : "Utente"} 
                      <span className="text-muted fw-normal ms-2" style={{ fontSize: "0.7rem" }}>
                        {new Date(nota.created_at).toLocaleString("it-IT")}
                      </span>
                    </div>
                    <div>{nota.testo}</div>
                  </div>
                ))}
                {noteList.length === 0 && <span className="text-muted small">Nessuna nota presente.</span>}
              </div>

              <form onSubmit={handleAddNota} className="input-group input-group-sm">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Scrivi una nota..."
                  value={nuovaNota}
                  onChange={(e) => setNuovaNota(e.target.value)}
                />
                <button className="btn btn-dark" type="submit">Invia</button>
              </form>
            </div>

            <div className="d-flex justify-content-between align-items-center">
              {(detailTask.task_profili?.some((tp) => tp.profili?.id === currentProfileId) || isAdmin) ? (
                <button 
                  type="button" 
                  className="add-new-task" 
                  style={{ backgroundColor: "#dc3545", color: "#fff" }} 
                  onClick={() => handleDeleteTask(detailTask.id)}
                >
                  <b><i className="bi bi-trash me-1"></i>Elimina Task</b>
                </button>
              ) : <div></div>}

              <div className="d-flex gap-2">
                <button type="button" className="add-new-task" style={{ backgroundColor: "#6c757d", color: "#fff" }} onClick={() => setIsDetailModalOpen(false)}>
                  <b>Chiudi</b>
                </button>
                {(detailTask.task_profili?.some((tp) => tp.profili?.id === currentProfileId) || isAdmin) && (
                  <button type="button" className="add-new-task" onClick={() => handleOpenEditFromDetail(detailTask)}>
                    <b>Modifica Task</b>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modale di Creazione/Modifica Task */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-3" style={{ maxHeight: "80vh", overflowY: "auto" }}>
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

            <div className="mb-3">
              <label className="form-label fw-semibold">Progetto di riferimento</label>
              <select
                name="progetto_id"
                value={progettoId}
                disabled
                className="form-select bg-light"
              >
                <option value={progettoId}>{progetto?.nome || "Progetto corrente"}</option>
              </select>
              <div className="form-text text-muted small">Il task verrà creato automaticamente all'interno di questo progetto.</div>
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
                        <i className={`bi bi-${isSelected ? "check-circle-fill text-success" : "plus-circle"} me-1`}></i>
                        {member.nome} {member.cognome}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Descrizione</label>
              <textarea
                name="descrizione"
                value={formData.descrizione}
                onChange={handleInputChange}
                className="form-control"
                rows="3"
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Allegati (Doc / Immagini)</label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {pendingFiles.map((file, idx) => (
                  <span key={idx} className="badge bg-light text-dark border p-2 d-flex align-items-center gap-2">
                    <i className="bi bi-paperclip"></i>
                    <span className="text-truncate" style={{ maxWidth: "150px" }}>{file.name}</span>
                    <button type="button" className="btn-close btn-close-sm" style={{ fontSize: "0.6rem" }} onClick={() => removePendingFile(idx)}></button>
                  </span>
                ))}
                {pendingFiles.length === 0 && <span className="text-muted small d-block">Nessun file selezionato per il caricamento.</span>}
              </div>
              <div>
                <label className="btn btn-sm btn-outline-secondary">
                  <i className="bi bi-upload me-1"></i> Seleziona file o immagini
                  <input type="file" onChange={handlePendingFileSelect} style={{ display: "none" }} multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
                </label>
              </div>
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