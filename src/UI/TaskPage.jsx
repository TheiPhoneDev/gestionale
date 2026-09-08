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
  const [nomeAzienda, setNomeAzienda] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Stato filtro priorità (per i non admin parte direttamente da "Miei")
  const [priorityFilter, setPriorityFilter] = useState("Miei");

  const [utenti, setUtenti] = useState([]);
  const [progetti, setProgetti] = useState([]);
  const [currentProfileId, setCurrentProfileId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedProfili, setSelectedProfili] = useState([]);
  const [selectedProjectLabel, setSelectedProjectLabel] = useState("Seleziona progetto");

  // Stati per il modale di visualizzazione dettagli task al clic sulla riga
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailTask, setDetailTask] = useState(null);

  // Stati per il modale di bilanciamento / gestione mirata
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceRole, setBalanceRole] = useState("Tutti");
  const [balanceScope, setBalanceScope] = useState("scaduti"); // "scaduti", "in_scadenza", "tutti"

  const [formData, setFormData] = useState({
    titolo: "",
    descrizione: "",
    scadenza: "",
    priorita: "Media",
    progetto_id: "",
    stato: "todo",
  });

  const isAdmin = currentUserRole?.toLowerCase() === "admin";

  const fetchCurrentUserProfile = async () => {
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
        if ((profiloData.ruolo || "").toLowerCase() !== "admin") {
          setPriorityFilter("Miei");
        }
      } else {
        setCurrentProfileId(user.id);
      }
    }
  };

  const controllaScadenzeTask = async (profileId) => {
    if (!profileId) return;

    const { data: taskMiei, error } = await supabase
      .from("task")
      .select(`
        id, 
        titolo, 
        scadenza, 
        stato,
        task_profili!inner ( profilo_id )
      `)
      .eq("task_profili.profilo_id", profileId);

    if (error || !taskMiei) return;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const task of taskMiei) {
      if (!task.scadenza) continue;
      
      const isDone = ["done", "completato"].includes((task.stato || "").toLowerCase());
      if (isDone) continue;

      const scadenzaDate = new Date(task.scadenza);
      scadenzaDate.setHours(0, 0, 0, 0);

      let titoloNotifica = "";
      let messaggioNotifica = "";

      if (scadenzaDate.getTime() === now.getTime()) {
        titoloNotifica = "Task in scadenza oggi!";
        messaggioNotifica = `Il task "${task.titolo}" scade oggi.`;
      } else if (scadenzaDate < now) {
        titoloNotifica = "Task scaduto!";
        messaggioNotifica = `Il task "${task.titolo}" è scaduto.`;
      }

      if (titoloNotifica) {
        const { data: esistente } = await supabase
          .from("notifiche")
          .select("id")
          .eq("user_id", profileId)
          .eq("titolo", titoloNotifica)
          .ilike("messaggio", `%${task.titolo}%`)
          .eq("letta", false);

        if (!esistente || esistente.length === 0) {
          await supabase.from("notifiche").insert([
            {
              user_id: profileId,
              titolo: titoloNotifica,
              messaggio: messaggioNotifica,
              letta: false
            }
          ]);
        }
      }
    }
  };

  const fetchTasks = async () => {
    setLoading(true);

    try {
      if (projectId) {
        const { data: projData, error: projError } = await supabase
          .from("progetti")
          .select(`
            nome,
            clienti ( nome, azienda )
          `)
          .eq("id", projectId)
          .single();

        if (!projError && projData) {
          setNomeProgetto(projData.nome);
          const infoCliente = projData.clienti;
          setNomeAzienda(infoCliente?.azienda || infoCliente?.nome || "");
        }
      } else {
        setNomeProgetto("");
        setNomeAzienda("");
      }

      let query = supabase
        .from("task")
        .select(`
          *,
          progetti ( id, nome ),
          creatore:profili!creato_da ( id, nome, cognome ),
          task_profili (
            profili ( id, nome, cognome, ruolo )
          )
        `);

      if (projectId) {
        query = query.eq("progetto_id", projectId);
      }

      const { data, error } = await query;

      if (!error) {
        setTasks(data || []);
      }
    } catch (err) {
      console.error("Errore imprevisto durante il fetch:", err);
    } finally {
      setLoading(false);
    }
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
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let pId = user?.id;

      if (user) {
        const { data: profiloData } = await supabase
          .from("profili")
          .select("id, ruolo")
          .eq("id", user.id)
          .single();

        if (profiloData) {
          pId = profiloData.id;
          setCurrentProfileId(profiloData.id);
          const role = profiloData.ruolo || "";
          setCurrentUserRole(role);
          if (role.toLowerCase() !== "admin") {
            setPriorityFilter("Miei");
          }
        } else {
          setCurrentProfileId(user.id);
          setPriorityFilter("Miei");
        }
      }

      await fetchTasks();
      await fetchDropdownData();

      if (pId) {
        await controllaScadenzeTask(pId);
      }
    };

    init();
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
    setDetailTask(task);
    setIsDetailModalOpen(true);
  };

  const handleOpenEditFromDetail = (task) => {
    setIsDetailModalOpen(false);
    const isAssigned = task.task_profili?.some(
      (tp) => tp.profili?.id === currentProfileId
    );
    const canEdit = isAssigned || isAdmin;

    if (!canEdit) {
      alert("Non hai i permessi per modificare questo task.");
      return;
    }

    setSelectedTask(task);
    setFormData({
      titolo: task.titolo || "",
      descrizione: task.descrizione || "",
      scadenza: task.scadenza ? task.scadenza.split("T")[0] : "",
      priorita: task.priorita || task.priority || "Media",
      progetto_id: task.progetti ? task.progetti.id : "",
      stato: task.stato || "todo",
    });

    if (task.progetti) {
      setSelectedProjectLabel(task.progetti.nome);
    } else {
      setSelectedProjectLabel("Seleziona progetto");
    }

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
      progetto_id: formData.progetto_id || null,
      stato: formData.stato,
    };

    let targetTaskId = null;

    if (selectedTask) {
      const { error: taskError } = await supabase
        .from("task")
        .update(payload)
        .eq("id", selectedTask.id);

      if (taskError) {
        alert(`Errore nella modifica: ${taskError.message}`);
        return;
      }

      targetTaskId = selectedTask.id;
      await supabase.from("task_profili").delete().eq("task_id", targetTaskId);
    } else {
      if (currentProfileId) {
        payload.creato_da = currentProfileId;
      }

      const { data: newTask, error: taskError } = await supabase
        .from("task")
        .insert([payload])
        .select()
        .single();

      if (taskError) {
        alert(`Errore nella creazione: ${taskError.message}`);
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
        letta: false
      }));

      await supabase.from("notifiche").insert(notificheDaCreare);
    }

    setIsModalOpen(false);
    fetchTasks();
  };

  const handleStatusChange = async (task, newStatus) => {
    const isAssigned = task.task_profili?.some(
      (tp) => tp.profili?.id === currentProfileId
    );
    const canEdit = isAssigned || isAdmin;

    if (!canEdit) {
      alert("Non puoi modificare questo task perché non sei né assegnato né un amministratore.");
      return;
    }

    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === task.id ? { ...t, stato: newStatus } : t))
    );

    const { error } = await supabase
      .from("task")
      .update({ stato: newStatus })
      .eq("id", task.id);

    if (error) {
      alert(`Impossibile aggiornare lo stato: ${error.message}`);
      fetchTasks();
    }
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
    fetchTasks();
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
    const val = (task.priorita || task.priority || "").toString().trim().toLowerCase();
    switch (val) {
      case "alta":
        return (
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-1">
            <i className="bi bi-arrow-up-circle-fill me-1"></i>Alta
          </span>
        );
      case "media":
        return (
          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-1">
            <i className="bi bi-dash-circle-fill me-1"></i>Media
          </span>
        );
      case "bassa":
        return (
          <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill px-2 py-1">
            <i className="bi bi-arrow-down-circle-fill me-1"></i>Bassa
          </span>
        );
      default:
        return <span className="badge bg-secondary-subtle text-secondary rounded-pill px-2 py-1">-</span>;
    }
  };

  const tasksFiltrati = tasks.filter((t) => {
    if (!isAdmin) {
      const isAssignedToMe = t.task_profili?.some((tp) => tp.profili?.id === currentProfileId);
      if (!isAssignedToMe) return false;
    }

    const ricerca = searchTerm ? searchTerm.toLowerCase().trim() : "";
    const titolo = (t.titolo || "").toLowerCase();
    const descrizione = (t.descrizione || "").toLowerCase();
    const nomeProgetto = t.progetti?.nome ? t.progetti.nome.toLowerCase() : "";
    const assegnati = t.task_profili
      ? t.task_profili
          .map((tp) => `${tp.profili?.nome || ""} ${tp.profili?.cognome || ""}`)
          .join(" ")
          .toLowerCase()
      : "";

    const matchesSearch =
      !ricerca ||
      titolo.includes(ricerca) ||
      descrizione.includes(ricerca) ||
      nomeProgetto.includes(ricerca) ||
      assegnati.includes(ricerca);

    if (!matchesSearch) return false;

    if (priorityFilter === "Miei") {
      return t.task_profili?.some((tp) => tp.profili?.id === currentProfileId);
    }

    if (priorityFilter === "Tutti") return true;

    const valPriorita = (t.priorita || t.priority || "").toString().trim().toLowerCase();
    return valPriorita === priorityFilter.toLowerCase().trim();
  });

  const tasksOrdinati = [...tasksFiltrati].sort((a, b) => {
    const isDoneA = a.stato?.toLowerCase() === "done" || a.stato?.toLowerCase() === "completato";
    const isDoneB = b.stato?.toLowerCase() === "done" || b.stato?.toLowerCase() === "completato";

    if (isDoneA !== isDoneB) return isDoneA ? 1 : -1;
    if (!a.scadenza && !b.scadenza) return 0;
    if (!a.scadenza) return 1;
    if (!b.scadenza) return -1;

    return new Date(a.scadenza) - new Date(b.scadenza);
  });

  const totalTasks = tasksFiltrati.length;
  const doneTasks = tasksFiltrati.filter(
    (t) => t.stato?.toLowerCase() === "done" || t.stato?.toLowerCase() === "completato"
  ).length;
  const inProgressTasks = tasksFiltrati.filter(
    (t) => t.stato?.toLowerCase() === "in_progress" || t.stato?.toLowerCase() === "in_corso"
  ).length;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Task scaduti (data precedente a oggi)
  const expiredTasksCount = tasksFiltrati.filter((t) => {
    if (!t.scadenza || t.stato?.toLowerCase() === "done" || t.stato?.toLowerCase() === "completato") {
      return false;
    }
    const d = new Date(t.scadenza);
    d.setHours(0, 0, 0, 0);
    return d < now;
  }).length;

  // Task in scadenza (da oggi fino a 3 giorni nel futuro)
  const expTasks = tasksFiltrati.filter((t) => {
    if (!t.scadenza || t.stato?.toLowerCase() === "done" || t.stato?.toLowerCase() === "completato") {
      return false;
    }
    const d = new Date(t.scadenza);
    d.setHours(0, 0, 0, 0);
    return d >= now && d <= threeDaysFromNow;
  }).length;

  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const renderScadenzaBadge = (scadenza, stato) => {
    if (!scadenza) return <span className="text-muted small">-</span>;

    const dataScadenza = new Date(scadenza);
    dataScadenza.setHours(0, 0, 0, 0);

    const isCompletato = stato?.toLowerCase() === "done" || stato?.toLowerCase() === "completato";
    const dataFormattata = new Date(scadenza).toLocaleDateString("it-IT");

    if (isCompletato) return <span>{dataFormattata}</span>;

    if (dataScadenza < now) {
      return (
        <span className="badge bg-danger-subtle text-danger fw-semibold px-2 py-1 rounded-pill">
          <i className="bi bi-exclamation-circle me-1"></i>{dataFormattata} (Scaduto)
        </span>
      );
    }

    if (dataScadenza <= threeDaysFromNow) {
      return (
        <span className="badge bg-warning-subtle text-warning-emphasis fw-semibold px-2 py-1 rounded-pill">
          <i className="bi bi-clock me-1"></i>{dataFormattata} (In Scadenza)
        </span>
      );
    }

    return <span>{dataFormattata}</span>;
  };

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

  const filterOptions = isAdmin 
    ? ["Tutti", "Miei", "Alta", "Media", "Bassa"] 
    : ["Miei", "Alta", "Media", "Bassa"];

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <h2 className="mb-0">
            {projectId ? `${nomeProgetto || "Caricamento..."}` : (isAdmin ? "Tutti i Task" : "I Miei Task")}
          </h2>
          {projectId && nomeAzienda && (
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-2 fs-6 ms-2">
              <i className="bi bi-building me-1"></i>{nomeAzienda}
            </span>
          )}
        </div>

        <div className="d-flex align-items-center gap-2">
          {isAdmin && (
            <button className="add-new-task" onClick={() => setIsBalanceModalOpen(true)} title="Gestisci task critici">
              <b><i className="bi bi-robot me-1"></i>Bilancia Task</b>
            </button>
          )}
          {isAdmin && (
            <button className="add-new-task" onClick={handleOpenCreateModal}>
              <b><i className="bi bi-plus me-1"></i>Crea Task</b>
            </button>
          )}
          <button className="add-new-task" onClick={fetchTasks}>
            <b><i className="bi bi-arrow-clockwise me-1"></i>Aggiorna</b>
          </button>
        </div>
      </div>

      {/* Sezione Metriche Aggiornata con 5 Card */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0 d-flex align-items-center justify-content-between">
            <div className="me-2 overflow-hidden">
              <span className="text-muted small d-block text-truncate">Totale</span>
              <span className="h4 fw-bold mb-0">{totalTasks}</span>
            </div>
            <div className="bg-light rounded-circle text-primary d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "48px", height: "48px" }}>
              <i className="bi bi-list-task fs-4"></i>
            </div>
          </div>
        </div>
        <div className="col-6 col-md">
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
        <div className="col-6 col-md">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0 d-flex align-items-center justify-content-between">
            <div className="me-2 overflow-hidden">
              <span className="text-muted small d-block text-truncate">Completati</span>
              <span className="h4 fw-bold mb-0 text-success">{doneTasks}</span>
            </div>
            <div className="bg-success-subtle rounded-circle text-success d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "48px", height: "48px" }}>
              <i className="bi bi-check-circle fs-4"></i>
            </div>
          </div>
        </div>
        <div className="col-6 col-md">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0 d-flex align-items-center justify-content-between">
            <div className="me-2 overflow-hidden">
              <span className="text-muted small d-block text-truncate">In Scadenza</span>
              <span className="h4 fw-bold mb-0 text-warning">{expTasks}</span>
            </div>
            <div className="bg-warning-subtle rounded-circle text-warning d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "48px", height: "48px" }}>
              <i className="bi bi-clock fs-4"></i>
            </div>
          </div>
        </div>
        <div className="col-6 col-md">
          <div className="p-3 bg-white rounded-4 shadow-sm border-0 d-flex align-items-center justify-content-between">
            <div className="me-2 overflow-hidden">
              <span className="text-muted small d-block text-truncate">Scaduti</span>
              <span className="h4 fw-bold mb-0 text-danger">{expiredTasksCount}</span>
            </div>
            <div className="bg-danger-subtle rounded-circle text-danger d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "48px", height: "48px" }}>
              <i className="bi bi-exclamation-triangle fs-4"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="input-group search-bar-clean align-items-center">
          <span className="bg-transparent border-0 pe-2"><i className="bi bi-search text-muted"></i></span>
          <input
            type="text"
            className="form-control bg-transparent border-0 ps-0 shadow-none"
            placeholder="Cerca task..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="d-flex gap-2 mb-4 overflow-x-auto pb-1">
        {filterOptions.map((p) => {
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

      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      ) : tasksOrdinati.length === 0 ? (
        <div className="alert alert-light rounded-4 text-muted text-center border-0 p-4">
          Nessun task trovato.
        </div>
      ) : (
        <div className="table-responsive shadow-sm rounded-4 border-0">
          <table className="table table-hover align-middle mb-0 bg-white">
            <thead className="table-light">
              <tr>
                <th className="py-3 ps-3">Titolo</th>
                {!projectId && <th className="py-3">Progetto</th>}
                <th className="py-3">Priorità</th>
                <th className="py-3">Assegnato da</th>
                <th className="py-3">Assegnato a</th>
                <th className="py-3">Scadenza</th>
                <th className="py-3 pe-3">Stato</th>
              </tr>
            </thead>
            <tbody>
              {tasksOrdinati.map((t) => {
                const isAssigned = t.task_profili?.some(
                  (tp) => tp.profili?.id === currentProfileId
                );
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
                    {!projectId && (
                      <td className="py-3">
                        {t.progetti ? (
                          <span className="badge bg-light text-dark border-0 rounded-pill px-3 py-2 fw-normal">
                            <i className="bi bi-folder me-1 text-secondary"></i>{t.progetti.nome}
                          </span>
                        ) : (
                          <span className="text-muted small">-</span>
                        )}
                      </td>
                    )}
                    <td className="py-3">{getPriorityBadge(t)}</td>
                    <td className="py-3">
                      {t.creatore ? (
                        <span className="text-dark small fw-medium">
                          <i className="bi bi-person-badge me-1 text-muted"></i>
                          {t.creatore.nome} {t.creatore.cognome}
                        </span>
                      ) : (
                        <span className="text-muted small">-</span>
                      )}
                    </td>
                    <td className="py-3">
                      {t.task_profili && t.task_profili.length > 0 ? (
                        <div className="d-flex flex-wrap gap-1">
                          {t.task_profili.map((tp, idx) => {
                            const isMe = tp.profili?.id === currentProfileId;
                            return (
                              <span
                                key={tp.profili?.id || idx}
                                className={`badge ${isMe ? 'bg-primary text-white' : 'bg-light text-secondary'} border-0 rounded-pill px-3 py-2 fw-normal`}
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
                    <td className="py-3">{renderScadenzaBadge(t.scadenza, t.stato)}</td>
                    <td className="pe-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="d-flex align-items-center gap-1">
                        <select
                          className={`form-select form-select-sm task-status-select ${getStatusBadgeStyle(t.stato)} ${!canEdit ? 'opacity-75' : ''}`}
                          value={t.stato || "todo"}
                          onChange={(e) => handleStatusChange(t, e.target.value)}
                          disabled={!canEdit}
                          style={{ cursor: canEdit ? "pointer" : "not-allowed", width: "130px" }}
                        >
                          <option value="todo" className="bg-white text-dark">To Do</option>
                          <option value="in_progress" className="bg-white text-dark">In Progress</option>
                          <option value="done" className="bg-white text-dark">Done</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale Visualizzazione Dettagli Task */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)}>
        {detailTask && (
          <div className="p-3">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <h3 className="modal-title mb-0 fw-bold">{detailTask.titolo}</h3>
              <div>{getPriorityBadge(detailTask)}</div>
            </div>

            <div className="mb-4">
              <span className="text-muted small d-block mb-1 fw-semibold text-uppercase" style={{ fontSize: "0.75rem" }}>Stato Attuale</span>
              <span className={`badge ${getStatusBadgeStyle(detailTask.stato)} px-3 py-2 rounded-pill`}>
                {detailTask.stato || "todo"}
              </span>
            </div>

            <div className="mb-4">
              <span className="text-muted small d-block mb-1 fw-semibold text-uppercase" style={{ fontSize: "0.75rem" }}>Descrizione</span>
              <div className="p-3 bg-light rounded-3 text-dark border-0">
                {detailTask.descrizione ? detailTask.descrizione : <span className="text-muted italic">Nessuna descrizione inserita.</span>}
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <span className="text-muted small d-block mb-1 fw-semibold text-uppercase" style={{ fontSize: "0.75rem" }}>Progetto</span>
                <div className="fw-medium text-dark">
                  {detailTask.progetti ? detailTask.progetti.nome : "Nessun progetto associato"}
                </div>
              </div>
              <div className="col-md-6">
                <span className="text-muted small d-block mb-1 fw-semibold text-uppercase" style={{ fontSize: "0.75rem" }}>Scadenza</span>
                <div className="fw-medium text-dark">
                  {renderScadenzaBadge(detailTask.scadenza, detailTask.stato)}
                </div>
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <span className="text-muted small d-block mb-1 fw-semibold text-uppercase" style={{ fontSize: "0.75rem" }}>Creato da</span>
                <div className="fw-medium text-dark">
                  {detailTask.creatore ? `${detailTask.creatore.nome} ${detailTask.creatore.cognome}` : "-"}
                </div>
              </div>
              <div className="col-md-6">
                <span className="text-muted small d-block mb-1 fw-semibold text-uppercase" style={{ fontSize: "0.75rem" }}>Assegnato a</span>
                <div className="d-flex flex-wrap gap-1 mt-1">
                  {detailTask.task_profili && detailTask.task_profili.length > 0 ? (
                    detailTask.task_profili.map((tp, idx) => (
                      <span key={idx} className="badge bg-light text-secondary border-0 rounded-pill px-2 py-1">
                        {tp.profili?.nome} {tp.profili?.cognome}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted small">Nessuno</span>
                  )}
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="add-new-task"
                style={{ backgroundColor: "#dc3545", color: "#fff" }}
                onClick={() => setIsDetailModalOpen(false)}
              >
                <b>Chiudi</b>
              </button>
              {(detailTask.task_profili?.some((tp) => tp.profili?.id === currentProfileId) || isAdmin) && (
                <button
                  type="button"
                  className="add-new-task"
                  onClick={() => handleOpenEditFromDetail(detailTask)}
                >
                  <b>Modifica Task</b>
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modale Bilanciamento e Lista Candidati */}
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

      {/* Modale Creazione / Modifica Task */}
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
              <label className="form-label fw-semibold">Progetto</label>
              <Dropdown className="w-100">
                <Dropdown.Toggle
                  id="dropdown-progetti"
                  variant="light"
                  className="w-100 text-start border rounded-3 bg-white"
                >
                  {selectedProjectLabel}
                </Dropdown.Toggle>
                <Dropdown.Menu className="w-100 shadow-sm border-0 rounded-3">
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
                          isSelected
                            ? "btn-dark text-white"
                            : "btn-outline-secondary border-0 bg-white"
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

export default TaskPage;