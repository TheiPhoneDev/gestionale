import "../App.css";
import "./TaskPage.css";

import "bootstrap-icons/font/bootstrap-icons.min.css";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import Modal from "./Modal";

function TaskPage({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [nomeProgetto, setNomeProgetto] = useState("");
  const [nomeAzienda, setNomeAzienda] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [priorityFilter, setPriorityFilter] =
    useState("Miei");

  const [utenti, setUtenti] = useState([]);
  const [progetti, setProgetti] = useState([]);

  const [currentProfileId, setCurrentProfileId] =
    useState(null);

  const [currentUserRole, setCurrentUserRole] =
    useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const [selectedProfili, setSelectedProfili] =
    useState([]);

  const [selectedProjectLabel, setSelectedProjectLabel] =
    useState("Seleziona progetto");

  const [isBalanceModalOpen, setIsBalanceModalOpen] =
    useState(false);

  const [balanceRole, setBalanceRole] =
    useState("Tutti");

  const [balanceScope, setBalanceScope] =
    useState("scaduti");

  const [noteList, setNoteList] = useState([]);
  const [nuovaNota, setNuovaNota] = useState("");

  const [allegatiList, setAllegatiList] = useState([]);
  const [uploadingFile, setUploadingFile] =
    useState(false);

  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingPreviewUrls, setPendingPreviewUrls] =
    useState({});

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [taskFilters, setTaskFilters] = useState({
    assegnatoA: "",
    assegnatoDa: "",
    progetto: "",
    cliente: "",
    priorita: "",
    stato: "",
    scadenza: "",
  });

  const [formData, setFormData] = useState({
    titolo: "",
    descrizione: "",
    scadenza: "",
    priorita: "Media",
    progetto_id: "",
    stato: "todo",
  });

  const isAdmin =
    currentUserRole?.toLowerCase() === "admin";

  /* =========================================================
     HELPERS ALLEGATI
     ========================================================= */

  const isImageFile = (file) => {
    if (!file) return false;

    return (
      file.type?.startsWith("image/") ||
      /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
        file.name || ""
      )
    );
  };

  const getPendingFileKey = (file) => {
    if (!file) return "";

    return `${file.name}-${file.lastModified}-${file.size}`;
  };

  const getFileIcon = (
    fileName = "",
    fileType = ""
  ) => {
    const normalizedType = fileType.toLowerCase();
    const normalizedName = fileName.toLowerCase();

    if (
      normalizedType.startsWith("image/") ||
      /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
        normalizedName
      )
    ) {
      return "bi-file-earmark-image";
    }

    if (
      normalizedType === "application/pdf" ||
      /\.pdf$/i.test(normalizedName)
    ) {
      return "bi-file-earmark-pdf";
    }

    if (
      normalizedType.includes("word") ||
      /\.(doc|docx)$/i.test(normalizedName)
    ) {
      return "bi-file-earmark-word";
    }

    if (
      normalizedType.includes("excel") ||
      normalizedType.includes("spreadsheet") ||
      /\.(xls|xlsx)$/i.test(normalizedName)
    ) {
      return "bi-file-earmark-excel";
    }

    return "bi-file-earmark";
  };

  const getUploadedFileIsImage = (file) => {
    if (!file) return false;

    return (
      file.tipo_file?.startsWith("image/") ||
      /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
        file.nome_file || ""
      )
    );
  };

  const clearPendingFiles = () => {
    Object.values(pendingPreviewUrls).forEach(
      (url) => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      }
    );

    setPendingFiles([]);
    setPendingPreviewUrls({});
  };

  /* =========================================================
     CURRENT USER
     ========================================================= */

  const fetchCurrentUserProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profiloData } = await supabase
      .from("profili")
      .select("id, ruolo")
      .eq("id", user.id)
      .single();

    if (profiloData) {
      setCurrentProfileId(profiloData.id);
      setCurrentUserRole(profiloData.ruolo || "");

      if (
        (profiloData.ruolo || "").toLowerCase() !==
        "admin"
      ) {
        setPriorityFilter("Miei");
      }
    } else {
      setCurrentProfileId(user.id);
    }
  };

  /* =========================================================
     FETCH TASKS
     ========================================================= */

  const fetchTasks = async () => {
    setLoading(true);

    try {
      if (projectId) {
        const {
          data: projData,
          error: projError,
        } = await supabase
          .from("progetti")
          .select(`
            nome,
            clienti (
              id,
              nome,
              azienda
            )
          `)
          .eq("id", projectId)
          .single();

        if (!projError && projData) {
          setNomeProgetto(projData.nome);

          setNomeAzienda(
            projData.clienti?.azienda ||
              projData.clienti?.nome ||
              ""
          );
        }
      } else {
        setNomeProgetto("");
        setNomeAzienda("");
      }

      let query = supabase
        .from("task")
        .select(`
          *,
          progetti (
            id,
            nome,
            clienti (
              id,
              nome,
              azienda
            )
          ),
          creatore:profili!creato_da (
            id,
            nome,
            cognome
          ),
          task_profili (
            profili (
              id,
              nome,
              cognome,
              ruolo
            )
          )
        `);

      if (projectId) {
        query = query.eq(
          "progetto_id",
          projectId
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error(
          "Errore caricamento task:",
          error
        );
      } else {
        setTasks(data || []);
      }
    } catch (err) {
      console.error(
        "Errore fetch tasks:",
        err
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     FETCH DROPDOWN DATA
     ========================================================= */

  const fetchDropdownData = async () => {
    const {
      data: utentiData,
      error: utentiError,
    } = await supabase
      .from("profili")
      .select("id, nome, cognome, ruolo")
      .order("nome", {
        ascending: true,
      });

    if (utentiError) {
      console.error(
        "Errore caricamento utenti:",
        utentiError
      );
    } else {
      setUtenti(utentiData || []);
    }

    const {
      data: progettiData,
      error: progettiError,
    } = await supabase
      .from("progetti")
      .select(`
        id,
        nome,
        clienti (
          id,
          nome,
          azienda
        )
      `)
      .order("nome", {
        ascending: true,
      });

    if (progettiError) {
      console.error(
        "Errore caricamento progetti:",
        progettiError
      );
    } else {
      setProgetti(progettiData || []);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchCurrentUserProfile();
      await fetchTasks();
      await fetchDropdownData();
    };

    init();
  }, [projectId]);

  /* =========================================================
     CLEANUP PREVIEW URLS
     ========================================================= */

  useEffect(() => {
    return () => {
      Object.values(pendingPreviewUrls).forEach(
        (url) => {
          if (url) {
            URL.revokeObjectURL(url);
          }
        }
      );
    };
  }, [pendingPreviewUrls]);

  /* =========================================================
     NOTE + ALLEGATI
     ========================================================= */

  const fetchTaskDetailsExtra = async (taskId) => {
    const {
      data: notesData,
      error: notesError,
    } = await supabase
      .from("task_note")
      .select(`
        *,
        profili (
          id,
          nome,
          cognome
        )
      `)
      .eq("task_id", taskId)
      .order("created_at", {
        ascending: true,
      });

    if (notesError) {
      console.error(
        "Errore caricamento note:",
        notesError
      );
    }

    setNoteList(notesData || []);

    const {
      data: filesData,
      error: filesError,
    } = await supabase
      .from("task_allegati")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", {
        ascending: false,
      });

    if (filesError) {
      console.error(
        "Errore caricamento allegati:",
        filesError
      );
    }

    setAllegatiList(filesData || []);
  };

  /* =========================================================
     CLICK TASK
     ========================================================= */

  const handleRowClick = async (task) => {
    const isAssigned =
      task.task_profili?.some(
        (tp) =>
          tp.profili?.id === currentProfileId
      );

    if (!isAssigned && !isAdmin) {
      alert(
        "Non hai i permessi per modificare questo task."
      );
      return;
    }

    clearPendingFiles();

    setSelectedTask(task);

    setFormData({
      titolo: task.titolo || "",
      descrizione: task.descrizione || "",
      scadenza: task.scadenza
        ? task.scadenza.split("T")[0]
        : "",
      priorita: task.priorita || "Media",
      progetto_id:
        task.progetti?.id || "",
      stato: task.stato || "todo",
    });

    setSelectedProjectLabel(
      task.progetti?.nome ||
        "Seleziona progetto"
    );

    setSelectedProfili(
      task.task_profili
        ? task.task_profili
            .map(
              (tp) => tp.profili?.id
            )
            .filter(Boolean)
        : []
    );

    setNoteList([]);
    setAllegatiList([]);
    setNuovaNota("");

    setIsModalOpen(true);

    await fetchTaskDetailsExtra(task.id);
  };

  /* =========================================================
     DELETE TASK
     ========================================================= */

  const handleDeleteTask = async (taskId) => {
    if (
      !window.confirm(
        "Sei sicuro di voler eliminare questo task?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("task")
      .delete()
      .eq("id", taskId);

    if (error) {
      alert(
        "Errore durante l'eliminazione del task: " +
          error.message
      );
      return;
    }

    setIsModalOpen(false);
    setSelectedTask(null);

    clearPendingFiles();

    await fetchTasks();
  };

  /* =========================================================
     NOTE
     ========================================================= */

  const handleAddNota = async (e) => {
    e.preventDefault();

    if (
      !nuovaNota.trim() ||
      !selectedTask
    ) {
      return;
    }

    const { error } = await supabase
      .from("task_note")
      .insert([
        {
          task_id: selectedTask.id,
          profilo_id: currentProfileId,
          testo: nuovaNota.trim(),
        },
      ]);

    if (error) {
      alert(
        "Errore nell'invio della nota: " +
          error.message
      );
      return;
    }

    setNuovaNota("");

    await fetchTaskDetailsExtra(
      selectedTask.id
    );
  };

  /* =========================================================
     UPLOAD FILE
     ========================================================= */

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file || !selectedTask) {
      return;
    }

    setUploadingFile(true);

    const fileExt =
      file.name.split(".").pop();

    const fileName =
      `${Math.random()
        .toString(36)
        .substring(2)}_` +
      `${Date.now()}.${fileExt}`;

    const filePath =
      `${selectedTask.id}/${fileName}`;

    try {
      const {
        error: uploadError,
      } = await supabase.storage
        .from("task-attachments")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("task-attachments")
        .getPublicUrl(filePath);

      const { error: dbError } =
        await supabase
          .from("task_allegati")
          .insert([
            {
              task_id: selectedTask.id,
              nome_file: file.name,
              url_file:
                publicUrlData.publicUrl,
              tipo_file: file.type,
            },
          ]);

      if (dbError) {
        throw dbError;
      }

      await fetchTaskDetailsExtra(
        selectedTask.id
      );
    } catch (err) {
      alert(
        "Errore durante il caricamento del file: " +
          err.message
      );
    } finally {
      setUploadingFile(false);
      e.target.value = null;
    }
  };

  /* =========================================================
     FILE PENDING
     ========================================================= */

  const handlePendingFileSelect = (e) => {
    const files = Array.from(
      e.target.files || []
    );

    if (files.length > 0) {
      setPendingFiles((prev) => [
        ...prev,
        ...files,
      ]);

      const newPreviewUrls = {};

      files.forEach((file) => {
        if (isImageFile(file)) {
          const previewUrl =
            URL.createObjectURL(file);

          const key =
            getPendingFileKey(file);

          newPreviewUrls[key] =
            previewUrl;
        }
      });

      if (
        Object.keys(newPreviewUrls).length >
        0
      ) {
        setPendingPreviewUrls(
          (prev) => ({
            ...prev,
            ...newPreviewUrls,
          })
        );
      }
    }

    e.target.value = null;
  };

  const removePendingFile = (
    indexToRemove
  ) => {
    setPendingFiles((prev) => {
      const fileToRemove =
        prev[indexToRemove];

      if (fileToRemove) {
        const previewKey =
          getPendingFileKey(
            fileToRemove
          );

        setPendingPreviewUrls(
          (previewPrev) => {
            const previewUrl =
              previewPrev[previewKey];

            if (previewUrl) {
              URL.revokeObjectURL(
                previewUrl
              );
            }

            const next = {
              ...previewPrev,
            };

            delete next[previewKey];

            return next;
          }
        );
      }

      return prev.filter(
        (_, idx) =>
          idx !== indexToRemove
      );
    });
  };

  /* =========================================================
     TOGGLE PROFILO
     ========================================================= */

  const toggleProfilo = (profiloId) => {
    setSelectedProfili((prev) =>
      prev.includes(profiloId)
        ? prev.filter(
            (id) => id !== profiloId
          )
        : [...prev, profiloId]
    );
  };

  /* =========================================================
     OPEN CREATE MODAL
     ========================================================= */

  const handleOpenCreateModal = () => {
    clearPendingFiles();

    setSelectedTask(null);

    setFormData({
      titolo: "",
      descrizione: "",
      scadenza: "",
      priorita: "Media",
      progetto_id: projectId || "",
      stato: "todo",
    });

    const projectName = projectId
      ? progetti.find(
          (p) =>
            String(p.id) ===
            String(projectId)
        )?.nome
      : null;

    setSelectedProjectLabel(
      projectName ||
        "Seleziona progetto"
    );

    setSelectedProfili([]);
    setNoteList([]);
    setAllegatiList([]);
    setNuovaNota("");

    setIsModalOpen(true);
  };

  /* =========================================================
     INPUT
     ========================================================= */

  const handleInputChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "progetto_id") {
      const project =
        progetti.find(
          (p) =>
            String(p.id) ===
            String(value)
        );

      setSelectedProjectLabel(
        project?.nome ||
          "Seleziona progetto"
      );
    }
  };

  /* =========================================================
     SAVE TASK
     ========================================================= */

  const handleSaveTask = async (e) => {
    e.preventDefault();

    if (!formData.titolo.trim()) {
      alert(
        "Inserisci almeno il titolo del task"
      );
      return;
    }

    const payload = {
      titolo:
        formData.titolo.trim(),

      descrizione:
        formData.descrizione.trim() ||
        null,

      scadenza:
        formData.scadenza || null,

      priorita:
        formData.priorita,

      progetto_id:
        formData.progetto_id || null,

      stato:
        formData.stato,
    };

    let targetTaskId = null;

    if (selectedTask) {
      const { error } =
        await supabase
          .from("task")
          .update(payload)
          .eq(
            "id",
            selectedTask.id
          );

      if (error) {
        alert(
          `Errore: ${error.message}`
        );
        return;
      }

      targetTaskId =
        selectedTask.id;

      await supabase
        .from("task_profili")
        .delete()
        .eq(
          "task_id",
          targetTaskId
        );
    } else {
      if (currentProfileId) {
        payload.creato_da =
          currentProfileId;
      }

      const {
        data: newTask,
        error,
      } = await supabase
        .from("task")
        .insert([payload])
        .select()
        .single();

      if (error) {
        alert(
          `Errore: ${error.message}`
        );
        return;
      }

      targetTaskId = newTask.id;
    }

    /* ASSEGNAZIONI */

    if (selectedProfili.length > 0) {
      const assegnazioni =
        selectedProfili.map(
          (profiloId) => ({
            task_id:
              targetTaskId,
            profilo_id:
              profiloId,
          })
        );

      const {
        error: assignmentError,
      } = await supabase
        .from("task_profili")
        .insert(assegnazioni);

      if (assignmentError) {
        console.error(
          "Errore assegnazione task:",
          assignmentError
        );
      }

      const notificheDaCreare =
        selectedProfili.map(
          (profiloId) => ({
            user_id:
              profiloId,

            titolo: selectedTask
              ? "Task aggiornato"
              : "Nuovo task assegnato",

            messaggio:
              `Ti è stato assegnato il task ` +
              `"${formData.titolo}".`,

            letta: false,
          })
        );

      await supabase
        .from("notifiche")
        .insert(
          notificheDaCreare
        );
    }

    /* UPLOAD FILE */

    if (pendingFiles.length > 0) {
      for (const file of pendingFiles) {
        try {
          const fileExt =
            file.name
              .split(".")
              .pop();

          const fileName =
            `${Math.random()
              .toString(36)
              .substring(2)}_` +
            `${Date.now()}.${fileExt}`;

          const filePath =
            `${targetTaskId}/${fileName}`;

          const {
            error: uploadError,
          } = await supabase.storage
            .from("task-attachments")
            .upload(
              filePath,
              file
            );

          if (uploadError) {
            console.error(
              "Errore upload:",
              uploadError
            );
            continue;
          }

          const {
            data: publicUrlData,
          } = supabase.storage
            .from("task-attachments")
            .getPublicUrl(
              filePath
            );

          const {
            error: attachmentError,
          } = await supabase
            .from("task_allegati")
            .insert([
              {
                task_id:
                  targetTaskId,

                nome_file:
                  file.name,

                url_file:
                  publicUrlData.publicUrl,

                tipo_file:
                  file.type,
              },
            ]);

          if (attachmentError) {
            console.error(
              "Errore salvataggio allegato:",
              attachmentError
            );
          }
        } catch (err) {
          console.error(
            "Errore caricamento file:",
            err
          );
        }
      }
    }

    setIsModalOpen(false);
    setSelectedTask(null);

    clearPendingFiles();

    setNoteList([]);
    setAllegatiList([]);
    setNuovaNota("");

    await fetchTasks();
  };

  /* =========================================================
     CHANGE STATUS
     ========================================================= */

  const handleStatusChange = async (
    task,
    newStatus
  ) => {
    const isAssigned =
      task.task_profili?.some(
        (tp) =>
          tp.profili?.id ===
          currentProfileId
      );

    if (!isAssigned && !isAdmin) {
      alert(
        "Non puoi modificare questo task."
      );
      return;
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              stato: newStatus,
            }
          : t
      )
    );

    const { error } =
      await supabase
        .from("task")
        .update({
          stato: newStatus,
        })
        .eq("id", task.id);

    if (error) {
      console.error(
        "Errore aggiornamento stato:",
        error
      );

      await fetchTasks();
    }
  };

  /* =========================================================
     BALANCE / ASSIGN SINGLE TASK
     ========================================================= */

  const handleAssignSingleTask = async (
    taskId,
    taskTitolo,
    targetUserId
  ) => {
    if (!targetUserId) {
      alert(
        "Nessun utente valido selezionato per la riassegnazione."
      );
      return;
    }

    const { error } =
      await supabase
        .from("task_profili")
        .insert([
          {
            task_id: taskId,
            profilo_id:
              targetUserId,
          },
        ]);

    if (error) {
      alert(
        `Errore durante l'assegnazione: ${error.message}`
      );
      return;
    }

    await supabase
      .from("notifiche")
      .insert([
        {
          user_id:
            targetUserId,

          titolo:
            "Task assegnato (Bilanciamento mirato)",

          messaggio:
            `Ti è stato assegnato il task "${taskTitolo}".`,

          letta: false,
        },
      ]);

    alert(
      "Task assegnato con successo!"
    );

    await fetchTasks();
  };

  /* =========================================================
     DATE
     ========================================================= */

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const threeDaysFromNow =
    new Date(
      now.getTime() +
        3 *
          24 *
          60 *
          60 *
          1000
    );

  /* =========================================================
     BALANCE DATA
     ========================================================= */

  const ruoliDisponibili = [
    "Tutti",
    ...new Set(
      utenti
        .map((u) => u.ruolo)
        .filter(Boolean)
    ),
  ];

  const getFilteredTasksForModal =
    () => {
      const filteredUsers =
        utenti.filter((u) => {
          if (
            balanceRole ===
            "Tutti"
          ) {
            return true;
          }

          return (
            (u.ruolo || "")
              .trim()
              .toLowerCase() ===
            balanceRole
              .trim()
              .toLowerCase()
          );
        });

      const workloadMap = {};

      filteredUsers.forEach(
        (u) => {
          workloadMap[u.id] = 0;
        }
      );

      tasks.forEach((t) => {
        const isDone =
          t.stato?.toLowerCase() ===
            "done" ||
          t.stato?.toLowerCase() ===
            "completato";

        if (
          !isDone &&
          t.task_profili
        ) {
          t.task_profili.forEach(
            (tp) => {
              if (
                tp.profili?.id &&
                workloadMap[
                  tp.profili.id
                ] !== undefined
              ) {
                workloadMap[
                  tp.profili.id
                ] += 1;
              }
            }
          );
        }
      });

      const matchingTasks =
        tasks.filter((t) => {
          const isDone =
            t.stato?.toLowerCase() ===
              "done" ||
            t.stato?.toLowerCase() ===
              "completato";

          if (isDone) {
            return false;
          }

          if (
            balanceScope ===
            "scaduti"
          ) {
            if (!t.scadenza) {
              return false;
            }

            const d = new Date(
              t.scadenza
            );

            d.setHours(
              0,
              0,
              0,
              0
            );

            return d < now;
          }

          if (
            balanceScope ===
            "in_scadenza"
          ) {
            if (!t.scadenza) {
              return false;
            }

            const d = new Date(
              t.scadenza
            );

            d.setHours(
              0,
              0,
              0,
              0
            );

            return (
              d >= now &&
              d <=
                threeDaysFromNow
            );
          }

          return true;
        });

      return matchingTasks.map(
        (t) => {
          const sortedAvailable =
            [
              ...filteredUsers,
            ].sort(
              (a, b) =>
                (workloadMap[
                  a.id
                ] || 0) -
                (workloadMap[
                  b.id
                ] || 0)
            );

          const bestCandidate =
            sortedAvailable.length >
            0
              ? sortedAvailable[0]
              : null;

          return {
            task: t,
            candidate:
              bestCandidate,
          };
        }
      );
    };

  const modalTaskList =
    getFilteredTasksForModal();

  /* =========================================================
     STATUS / PRIORITY
     ========================================================= */

  const getStatusBadgeStyle = (
    stato
  ) => {
    switch (
      stato?.toLowerCase()
    ) {
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

  const getStatusLabel = (stato) => {
    switch (
      stato?.toLowerCase()
    ) {
      case "done":
      case "completato":
        return "Completato";

      case "in_progress":
      case "in_corso":
        return "In corso";

      case "todo":
      default:
        return "To Do";
    }
  };

  const getPriorityBadge = (task) => {
    const val = (
      task.priorita || ""
    )
      .toString()
      .trim()
      .toLowerCase();

    switch (val) {
      case "alta":
        return (
          <span className="task-priority-badge high">
            <i className="bi bi-arrow-up-circle-fill" />
            Alta
          </span>
        );

      case "media":
        return (
          <span className="task-priority-badge medium">
            <i className="bi bi-dash-circle-fill" />
            Media
          </span>
        );

      case "bassa":
        return (
          <span className="task-priority-badge low">
            <i className="bi bi-arrow-down-circle-fill" />
            Bassa
          </span>
        );

      default:
        return (
          <span className="task-priority-badge empty">
            -
          </span>
        );
    }
  };

  /* =========================================================
     FILTRI
     ========================================================= */

  const updateTaskFilter = (
    name,
    value
  ) => {
    setTaskFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetTaskFilters = () => {
    setTaskFilters({
      assegnatoA: "",
      assegnatoDa: "",
      progetto: "",
      cliente: "",
      priorita: "",
      stato: "",
      scadenza: "",
    });

    setSearchTerm("");

    setPriorityFilter(
      isAdmin ? "Tutti" : "Miei"
    );
  };

  const hasAdvancedFilters =
    Object.values(taskFilters).some(
      Boolean
    );

  const getClientName = (task) => {
    const cliente =
      task.progetti?.clienti;

    if (!cliente) {
      return "";
    }

    return (
      cliente.azienda ||
      cliente.nome ||
      ""
    );
  };

  const getAssigneeIds = (task) =>
    task.task_profili
      ?.map(
        (tp) =>
          tp.profili?.id
      )
      .filter(Boolean) || [];

  const tasksFiltrati = useMemo(() => {
    return tasks.filter((t) => {
      /* -----------------------------------------------------
         PERMESSI UTENTE
         ----------------------------------------------------- */

      if (!isAdmin) {
        const isAssignedToMe =
          getAssigneeIds(t).includes(
            currentProfileId
          );

        if (!isAssignedToMe) {
          return false;
        }
      }

      /* -----------------------------------------------------
         RICERCA
         ----------------------------------------------------- */

      const ricerca =
        searchTerm
          .toLowerCase()
          .trim();

      if (ricerca) {
        const titolo = (
          t.titolo || ""
        ).toLowerCase();

        const descrizione = (
          t.descrizione || ""
        ).toLowerCase();

        const progetto = (
          t.progetti?.nome || ""
        ).toLowerCase();

        const cliente =
          getClientName(t).toLowerCase();

        const creatore = t.creatore
          ? `${t.creatore.nome || ""} ${
              t.creatore.cognome || ""
            }`.toLowerCase()
          : "";

        const assegnatari =
          t.task_profili
            ?.map(
              (tp) =>
                `${tp.profili?.nome || ""} ${
                  tp.profili?.cognome || ""
                }`.toLowerCase()
            )
            .join(" ") || "";

        const matchesSearch =
          titolo.includes(
            ricerca
          ) ||
          descrizione.includes(
            ricerca
          ) ||
          progetto.includes(
            ricerca
          ) ||
          cliente.includes(
            ricerca
          ) ||
          creatore.includes(
            ricerca
          ) ||
          assegnatari.includes(
            ricerca
          );

        if (!matchesSearch) {
          return false;
        }
      }

      /* -----------------------------------------------------
         FILTRO RAPIDO
         ----------------------------------------------------- */

      if (
        priorityFilter ===
        "Miei"
      ) {
        const isAssignedToMe =
          getAssigneeIds(t).includes(
            currentProfileId
          );

        if (!isAssignedToMe) {
          return false;
        }
      }

      if (
        ["Alta", "Media", "Bassa"].includes(
          priorityFilter
        )
      ) {
        if (
          (
            t.priorita || ""
          ).toLowerCase() !==
          priorityFilter.toLowerCase()
        ) {
          return false;
        }
      }

      /* -----------------------------------------------------
         ASSEGNATO A
         ----------------------------------------------------- */

      if (
        taskFilters.assegnatoA
      ) {
        const assigneeIds =
          getAssigneeIds(t);

        if (
          !assigneeIds.includes(
            taskFilters.assegnatoA
          )
        ) {
          return false;
        }
      }

      /* -----------------------------------------------------
         ASSEGNATO DA
         ----------------------------------------------------- */

      if (
        taskFilters.assegnatoDa
      ) {
        if (
          String(
            t.creatore?.id || ""
          ) !==
          String(
            taskFilters.assegnatoDa
          )
        ) {
          return false;
        }
      }

      /* -----------------------------------------------------
         PROGETTO
         ----------------------------------------------------- */

      if (
        taskFilters.progetto
      ) {
        if (
          String(
            t.progetti?.id || ""
          ) !==
          String(
            taskFilters.progetto
          )
        ) {
          return false;
        }
      }

      /* -----------------------------------------------------
         CLIENTE
         ----------------------------------------------------- */

      if (
        taskFilters.cliente
      ) {
        const clientId =
          t.progetti?.clienti?.id;

        if (
          String(clientId || "") !==
          String(
            taskFilters.cliente
          )
        ) {
          return false;
        }
      }

      /* -----------------------------------------------------
         PRIORITÀ
         ----------------------------------------------------- */

      if (
        taskFilters.priorita
      ) {
        if (
          (
            t.priorita || ""
          ).toLowerCase() !==
          taskFilters.priorita.toLowerCase()
        ) {
          return false;
        }
      }

      /* -----------------------------------------------------
         STATO
         ----------------------------------------------------- */

      if (taskFilters.stato) {
        const currentStatus =
          (
            t.stato || "todo"
          ).toLowerCase();

        if (
          currentStatus !==
          taskFilters.stato
        ) {
          return false;
        }
      }

      /* -----------------------------------------------------
         SCADENZA
         ----------------------------------------------------- */

      if (
        taskFilters.scadenza
      ) {
        const filter =
          taskFilters.scadenza;

        if (
          filter ===
          "senza_scadenza"
        ) {
          if (t.scadenza) {
            return false;
          }
        } else {
          if (!t.scadenza) {
            return false;
          }

          const deadline =
            new Date(
              t.scadenza
            );

          deadline.setHours(
            0,
            0,
            0,
            0
          );

          if (
            filter === "scaduti"
          ) {
            if (
              deadline >= now
            ) {
              return false;
            }
          }

          if (
            filter === "oggi"
          ) {
            if (
              deadline.getTime() !==
              now.getTime()
            ) {
              return false;
            }
          }

          if (
            filter ===
            "prossimi_3"
          ) {
            if (
              deadline < now ||
              deadline >
                threeDaysFromNow
            ) {
              return false;
            }
          }

          if (
            filter ===
            "prossimi_7"
          ) {
            const sevenDays =
              new Date(
                now.getTime() +
                  7 *
                    24 *
                    60 *
                    60 *
                    1000
              );

            if (
              deadline < now ||
              deadline > sevenDays
            ) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }, [
    tasks,
    isAdmin,
    currentProfileId,
    searchTerm,
    priorityFilter,
    taskFilters,
  ]);

  /* =========================================================
     ORDINAMENTO
     ========================================================= */

  const tasksOrdinati = [
    ...tasksFiltrati,
  ].sort((a, b) => {
    if (!a.scadenza) return 1;
    if (!b.scadenza) return -1;

    return (
      new Date(a.scadenza) -
      new Date(b.scadenza)
    );
  });

  /* =========================================================
     METRICHE
     ========================================================= */

  const totalTasks =
    tasksFiltrati.length;

  const inProgressTasks =
    tasksFiltrati.filter(
      (t) =>
        t.stato ===
          "in_progress" ||
        t.stato === "in_corso"
    ).length;

  const doneTasks =
    tasksFiltrati.filter(
      (t) =>
        t.stato === "done" ||
        t.stato === "completato"
    ).length;

  const overdueTasks =
    tasksFiltrati.filter((t) => {
      if (!t.scadenza) {
        return false;
      }

      const d = new Date(
        t.scadenza
      );

      d.setHours(0, 0, 0, 0);

      return (
        d < now &&
        t.stato !== "done" &&
        t.stato !== "completato"
      );
    }).length;

  const expTasks =
    tasksFiltrati.filter((t) => {
      if (!t.scadenza) {
        return false;
      }

      const d = new Date(
        t.scadenza
      );

      d.setHours(0, 0, 0, 0);

      return (
        d >= now &&
        d <= threeDaysFromNow &&
        t.stato !== "done" &&
        t.stato !== "completato"
      );
    }).length;

  const completionRate =
    totalTasks > 0
      ? Math.round(
          (doneTasks /
            totalTasks) *
            100
        )
      : 0;

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="task-page">

      {/* HEADER */}

      <div className="task-page-header">
        <div className="task-page-heading">
          <div className="task-page-title-row">
            <h2>
              {projectId
                ? nomeProgetto ||
                  "Caricamento..."
                : isAdmin
                ? "Tutti i Task"
                : "I Miei Task"}
            </h2>

            {projectId &&
              nomeAzienda && (
                <span className="task-company-badge">
                  <i className="bi bi-building" />
                  {nomeAzienda}
                </span>
              )}
          </div>

          <p>
            Gestisci attività, scadenze e
            assegnazioni del team.
          </p>
        </div>

        <div className="task-page-actions">
          {isAdmin && (
            <button
              type="button"
              className="task-page-button secondary"
              onClick={() =>
                setIsBalanceModalOpen(true)
              }
              title="Gestisci task critici"
            >
              <i className="bi bi-robot" />
              Bilancia Task
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              className="task-page-button primary"
              onClick={handleOpenCreateModal}
            >
              <i className="bi bi-plus" />
              Crea Task
            </button>
          )}

          <button
            type="button"
            className="task-page-button secondary"
            onClick={fetchTasks}
          >
            <i className="bi bi-arrow-clockwise" />
            Aggiorna
          </button>
        </div>
      </div>

      {/* METRICHE */}

      <div className="task-metrics-grid">
        <div className="task-metric-card">
          <div>
            <span>Totale</span>
            <strong>
              {totalTasks}
            </strong>
          </div>

          <div className="task-metric-icon blue">
            <i className="bi bi-list-task" />
          </div>
        </div>

        <div className="task-metric-card">
          <div>
            <span>In Corso</span>
            <strong className="warning">
              {inProgressTasks}
            </strong>
          </div>

          <div className="task-metric-icon yellow">
            <i className="bi bi-hourglass-split" />
          </div>
        </div>

        <div className="task-metric-card">
          <div>
            <span>In Scadenza</span>
            <strong className="warning">
              {expTasks}
            </strong>
          </div>

          <div className="task-metric-icon yellow">
            <i className="bi bi-clock-history" />
          </div>
        </div>

        <div className="task-metric-card">
          <div>
            <span>Scaduti</span>
            <strong className="danger">
              {overdueTasks}
            </strong>
          </div>

          <div className="task-metric-icon red">
            <i className="bi bi-exclamation-triangle" />
          </div>
        </div>

        <div className="task-metric-card">
          <div>
            <span>Completati</span>
            <strong className="success">
              {doneTasks}
              <small>
                ({completionRate}%)
              </small>
            </strong>
          </div>

          <div className="task-metric-icon green">
            <i className="bi bi-check-circle-fill" />
          </div>
        </div>
      </div>

      {/* RICERCA */}

      <div className="task-search">
        <i className="bi bi-search" />

        <input
          type="text"
          placeholder="Cerca task, progetto, cliente, persona..."
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
        />

        {searchTerm && (
          <button
            type="button"
            className="task-search-clear"
            onClick={() =>
              setSearchTerm("")
            }
            title="Cancella ricerca"
          >
            <i className="bi bi-x-lg" />
          </button>
        )}
      </div>

      {/* FILTRI RAPIDI */}

      <div className="task-filters">
        {[
          "Miei",
          "Tutti",
          "Alta",
          "Media",
          "Bassa",
        ].map((p) => {
          let label = p;

          if (p === "Tutti") {
            label = "Tutti i Task";
          }

          if (p === "Miei") {
            label = "I Miei Task";
          }

          if (
            !["Tutti", "Miei"].includes(
              p
            )
          ) {
            label = `Priorità ${p}`;
          }

          return (
            <button
              key={p}
              type="button"
              className={
                priorityFilter === p
                  ? "task-filter active"
                  : "task-filter"
              }
              onClick={() =>
                setPriorityFilter(p)
              }
            >
              {label}
            </button>
          );
        })}

        <button
          type="button"
          className={
            filtersOpen
              ? "task-filter advanced active"
              : "task-filter advanced"
          }
          onClick={() =>
            setFiltersOpen(
              (prev) => !prev
            )
          }
        >
          <i className="bi bi-sliders" />
          Filtri avanzati

          {hasAdvancedFilters && (
            <span className="task-filter-count">
              {
                Object.values(
                  taskFilters
                ).filter(Boolean)
                  .length
              }
            </span>
          )}
        </button>
      </div>

      {/* FILTRI AVANZATI */}

      {filtersOpen && (
        <div className="task-advanced-filters">

          <div className="task-advanced-filters-header">
            <div>
              <strong>
                Filtri avanzati
              </strong>

              <span>
                Combina più filtri per
                restringere i risultati.
              </span>
            </div>

            <button
              type="button"
              className="task-filter-reset"
              onClick={
                resetTaskFilters
              }
            >
              <i className="bi bi-arrow-counterclockwise" />
              Azzera filtri
            </button>
          </div>

          <div className="task-filter-grid">

            {/* ASSEGNATO A */}

            <div className="task-filter-field">
              <label>
                Assegnato a
              </label>

              <select
                value={
                  taskFilters.assegnatoA
                }
                onChange={(e) =>
                  updateTaskFilter(
                    "assegnatoA",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Tutti gli utenti
                </option>

                {utenti.map((u) => (
                  <option
                    key={u.id}
                    value={u.id}
                  >
                    {u.nome}{" "}
                    {u.cognome}
                  </option>
                ))}
              </select>
            </div>

            {/* ASSEGNATO DA */}

            <div className="task-filter-field">
              <label>
                Assegnato da
              </label>

              <select
                value={
                  taskFilters.assegnatoDa
                }
                onChange={(e) =>
                  updateTaskFilter(
                    "assegnatoDa",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Tutti gli utenti
                </option>

                {utenti.map((u) => (
                  <option
                    key={u.id}
                    value={u.id}
                  >
                    {u.nome}{" "}
                    {u.cognome}
                  </option>
                ))}
              </select>
            </div>

            {/* PROGETTO */}

            <div className="task-filter-field">
              <label>
                Progetto
              </label>

              <select
                value={
                  taskFilters.progetto
                }
                onChange={(e) =>
                  updateTaskFilter(
                    "progetto",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Tutti i progetti
                </option>

                {progetti.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                  >
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* CLIENTE */}

            <div className="task-filter-field">
              <label>
                Cliente
              </label>

              <select
                value={
                  taskFilters.cliente
                }
                onChange={(e) =>
                  updateTaskFilter(
                    "cliente",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Tutti i clienti
                </option>

                {[
                  ...new Map(
                    progetti
                      .filter(
                        (p) =>
                          p.clienti?.id
                      )
                      .map((p) => [
                        p.clienti.id,
                        p.clienti,
                      ])
                  ).values(),
                ]
                  .sort((a, b) =>
                    (
                      a.azienda ||
                      a.nome ||
                      ""
                    ).localeCompare(
                      b.azienda ||
                        b.nome ||
                        "",
                      "it"
                    )
                  )
                  .map((cliente) => (
                    <option
                      key={cliente.id}
                      value={cliente.id}
                    >
                      {cliente.azienda ||
                        cliente.nome}
                    </option>
                  ))}
              </select>
            </div>

            {/* PRIORITÀ */}

            <div className="task-filter-field">
              <label>
                Priorità
              </label>

              <select
                value={
                  taskFilters.priorita
                }
                onChange={(e) =>
                  updateTaskFilter(
                    "priorita",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Tutte
                </option>

                <option value="Alta">
                  Alta
                </option>

                <option value="Media">
                  Media
                </option>

                <option value="Bassa">
                  Bassa
                </option>
              </select>
            </div>

            {/* STATO */}

            <div className="task-filter-field">
              <label>
                Stato
              </label>

              <select
                value={
                  taskFilters.stato
                }
                onChange={(e) =>
                  updateTaskFilter(
                    "stato",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Tutti
                </option>

                <option value="todo">
                  To Do
                </option>

                <option value="in_progress">
                  In corso
                </option>

                <option value="done">
                  Completato
                </option>
              </select>
            </div>

            {/* SCADENZA */}

            <div className="task-filter-field">
              <label>
                Scadenza
              </label>

              <select
                value={
                  taskFilters.scadenza
                }
                onChange={(e) =>
                  updateTaskFilter(
                    "scadenza",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Qualsiasi
                </option>

                <option value="scaduti">
                  Scaduti
                </option>

                <option value="oggi">
                  Oggi
                </option>

                <option value="prossimi_3">
                  Prossimi 3 giorni
                </option>

                <option value="prossimi_7">
                  Prossimi 7 giorni
                </option>

                <option value="senza_scadenza">
                  Senza scadenza
                </option>
              </select>
            </div>

          </div>

          <div className="task-advanced-filters-footer">
            <span>
              <strong>
                {tasksFiltrati.length}
              </strong>{" "}
              task corrispondenti
            </span>
          </div>
        </div>
      )}

      {/* TABELLA */}

      {loading ? (
        <div className="task-loading">
          <div
            className="spinner-border text-primary"
            role="status"
          >
            <span className="visually-hidden">
              Caricamento...
            </span>
          </div>
        </div>
      ) : tasksOrdinati.length ===
        0 ? (
        <div className="task-empty">
          <i className="bi bi-inbox" />

          <strong>
            Nessun task trovato
          </strong>

          <span>
            Non ci sono attività che
            corrispondono ai filtri
            selezionati.
          </span>
        </div>
      ) : (
        <div className="task-table-wrapper">
          <table className="task-table">
            <thead>
              <tr>
                <th>Titolo</th>
                <th>Progetto</th>
                <th>Priorità</th>
                <th>Assegnato da</th>
                <th>Assegnato a</th>
                <th>Scadenza</th>
                <th>Stato</th>
              </tr>
            </thead>

            <tbody>
              {tasksOrdinati.map(
                (t) => {
                  const isAssigned =
                    t.task_profili?.some(
                      (tp) =>
                        tp.profili?.id ===
                        currentProfileId
                    );

                  const canEdit =
                    isAssigned ||
                    isAdmin;

                  return (
                    <tr
                      key={t.id}
                      onClick={() =>
                        handleRowClick(t)
                      }
                    >
                      {/* TITOLO */}

                      <td>
                        <strong>
                          {t.titolo}
                        </strong>

                        {t.descrizione && (
                          <span className="task-description-preview">
                            {t.descrizione}
                          </span>
                        )}
                      </td>

                      {/* PROGETTO */}

                      <td>
                        {t.progetti?.nome ? (
                          <div>
                            <span className="task-project">
                              <i className="bi bi-folder2" />
                              {
                                t
                                  .progetti
                                  .nome
                              }
                            </span>

                            {getClientName(
                              t
                            ) && (
                              <small className="task-client-label">
                                <i className="bi bi-building" />
                                {getClientName(
                                  t
                                )}
                              </small>
                            )}
                          </div>
                        ) : (
                          <span className="task-no-project">
                            Nessun progetto
                          </span>
                        )}
                      </td>

                      {/* PRIORITÀ */}

                      <td>
                        {getPriorityBadge(
                          t
                        )}
                      </td>

                      {/* ASSEGNATO DA */}

                      <td>
                        <span className="task-creator">
                          {t.creatore
                            ? `${t.creatore.nome} ${t.creatore.cognome}`
                            : "-"}
                        </span>
                      </td>

                      {/* ASSEGNATO A */}

                      <td>
                        {t.task_profili
                          ?.length >
                        0 ? (
                          <div className="task-assignees">
                            {t.task_profili.map(
                              (
                                tp,
                                idx
                              ) => {
                                const isMe =
                                  tp
                                    .profili
                                    ?.id ===
                                  currentProfileId;

                                return (
                                  <span
                                    key={
                                      tp
                                        .profili
                                        ?.id ||
                                      idx
                                    }
                                    className={
                                      isMe
                                        ? "task-assignee me"
                                        : "task-assignee"
                                    }
                                  >
                                    <i className="bi bi-person" />

                                    {
                                      tp
                                        .profili
                                        ?.nome
                                    }{" "}
                                    {
                                      tp
                                        .profili
                                        ?.cognome
                                    }

                                    {isMe &&
                                      " (Tu)"}
                                  </span>
                                );
                              }
                            )}
                          </div>
                        ) : (
                          <span className="task-no-assignee">
                            Nessuno
                          </span>
                        )}
                      </td>

                      {/* SCADENZA */}

                      <td>
                        {t.scadenza
                          ? new Date(
                              t.scadenza
                            ).toLocaleDateString(
                              "it-IT"
                            )
                          : "-"}
                      </td>

                      {/* STATO */}

                      <td
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                      >
                        <select
                          className={`task-status-select ${getStatusBadgeStyle(
                            t.stato
                          )}`}
                          value={
                            t.stato ||
                            "todo"
                          }
                          onChange={(e) =>
                            handleStatusChange(
                              t,
                              e.target
                                .value
                            )
                          }
                          disabled={
                            !canEdit
                          }
                        >
                          <option
                            value="todo"
                            className="bg-white text-dark"
                          >
                            To Do
                          </option>

                          <option
                            value="in_progress"
                            className="bg-white text-dark"
                          >
                            In Progress
                          </option>

                          <option
                            value="done"
                            className="bg-white text-dark"
                          >
                            Done
                          </option>
                        </select>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* =====================================================
          MODALE BILANCIAMENTO
          ===================================================== */}

      <Modal
        isOpen={isBalanceModalOpen}
        onClose={() =>
          setIsBalanceModalOpen(
            false
          )
        }
      >
        <div className="task-modal">
          <div className="task-modal-header">
            <div className="task-modal-heading">
              <div className="task-modal-icon">
                <i className="bi bi-robot" />
              </div>

              <div>
                <h3>
                  Gestione e Candidati Task
                </h3>

                <p>
                  Individua i task critici e
                  i membri disponibili.
                </p>
              </div>
            </div>
          </div>

          <div className="task-balance-filters">
            <div>
              <label>
                Filtra per Ruolo
              </label>

              <select
                value={balanceRole}
                onChange={(e) =>
                  setBalanceRole(
                    e.target.value
                  )
                }
              >
                {ruoliDisponibili.map(
                  (r, index) => (
                    <option
                      key={index}
                      value={r}
                    >
                      {r === "Tutti"
                        ? "Tutti i ruoli"
                        : r}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label>
                Criterio Task
              </label>

              <select
                value={balanceScope}
                onChange={(e) =>
                  setBalanceScope(
                    e.target.value
                  )
                }
              >
                <option value="scaduti">
                  Solo task già scaduti
                </option>

                <option value="in_scadenza">
                  Task in scadenza (3 giorni)
                </option>

                <option value="tutti">
                  Tutti i task aperti
                </option>
              </select>
            </div>
          </div>

          <div className="task-balance-title">
            Task filtrati e membri
            candidati (
            {modalTaskList.length})
          </div>

          {modalTaskList.length ===
          0 ? (
            <div className="task-balance-empty">
              Nessun task risponde ai
              filtri selezionati.
            </div>
          ) : (
            <div className="task-balance-list">
              {modalTaskList.map(
                ({
                  task,
                  candidate,
                }) => (
                  <div
                    key={task.id}
                    className="task-balance-item"
                  >
                    <div>
                      <strong>
                        {task.titolo}
                      </strong>

                      <span>
                        <i className="bi bi-calendar-event" />
                        Scadenza:{" "}
                        {task.scadenza
                          ? new Date(
                              task.scadenza
                            ).toLocaleDateString(
                              "it-IT"
                            )
                          : "-"}
                      </span>
                    </div>

                    <div className="task-balance-candidate">
                      <div>
                        <small>
                          Candidato ottimale
                        </small>

                        {candidate ? (
                          <span className="task-candidate-badge">
                            <i className="bi bi-person-fill" />

                            {
                              candidate.nome
                            }{" "}
                            {
                              candidate.cognome
                            }

                            {candidate.ruolo &&
                              ` (${candidate.ruolo})`}
                          </span>
                        ) : (
                          <span className="task-no-candidate">
                            Nessuno disponibile
                          </span>
                        )}
                      </div>

                      {candidate && (
                        <button
                          type="button"
                          className="task-page-button primary"
                          onClick={() =>
                            handleAssignSingleTask(
                              task.id,
                              task.titolo,
                              candidate.id
                            )
                          }
                        >
                          Assegna
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          <div className="task-modal-actions">
            <button
              type="button"
              className="task-page-button danger"
              onClick={() =>
                setIsBalanceModalOpen(
                  false
                )
              }
            >
              Chiudi
            </button>
          </div>
        </div>
      </Modal>

      {/* =====================================================
          MODALE CREAZIONE / MODIFICA
          ===================================================== */}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
          clearPendingFiles();
        }}
      >
        <div className="task-modal">

          <div className="task-modal-header">
            <div className="task-modal-heading">
              <div className="task-modal-icon">
                <i className="bi bi-list-check" />
              </div>

              <div>
                <h3>
                  {selectedTask
                    ? "Modifica Task"
                    : "Nuovo Task"}
                </h3>

                <p>
                  {selectedTask
                    ? "Modifica i dati, le assegnazioni e gli allegati del task."
                    : "Crea l'attività e assegna i membri responsabili."}
                </p>
              </div>
            </div>

            {selectedTask &&
              getPriorityBadge(
                selectedTask
              )}
          </div>

          <form
            onSubmit={handleSaveTask}
            className="task-create-form"
          >
            {/* TITOLO */}

            <div className="task-form-group">
              <label htmlFor="task-titolo">
                Titolo{" "}
                <span>*</span>
              </label>

              <input
                id="task-titolo"
                type="text"
                name="titolo"
                value={
                  formData.titolo
                }
                onChange={
                  handleInputChange
                }
                placeholder="Inserisci il titolo del task"
                required
              />
            </div>

            {/* PROGETTO */}

            <div className="task-form-group">
              <label htmlFor="task-progetto">
                Progetto di riferimento
              </label>

              <select
                id="task-progetto"
                name="progetto_id"
                value={
                  formData.progetto_id
                }
                onChange={
                  handleInputChange
                }
              >
                <option value="">
                  Nessun progetto
                  (Task indipendente)
                </option>

                {progetti.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                  >
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* PRIORITÀ / SCADENZA */}

            <div className="task-form-grid">
              <div className="task-form-group">
                <label htmlFor="task-priorita">
                  Priorità
                </label>

                <select
                  id="task-priorita"
                  name="priorita"
                  value={
                    formData.priorita
                  }
                  onChange={
                    handleInputChange
                  }
                >
                  <option value="Bassa">
                    Bassa
                  </option>

                  <option value="Media">
                    Media
                  </option>

                  <option value="Alta">
                    Alta
                  </option>
                </select>
              </div>

              <div className="task-form-group">
                <label htmlFor="task-scadenza">
                  Scadenza
                </label>

                <input
                  id="task-scadenza"
                  type="date"
                  name="scadenza"
                  value={
                    formData.scadenza
                  }
                  onChange={
                    handleInputChange
                  }
                />
              </div>
            </div>

            {/* STATO */}

            {selectedTask && (
              <div className="task-form-group">
                <label htmlFor="task-stato">
                  Stato
                </label>

                <select
                  id="task-stato"
                  name="stato"
                  value={
                    formData.stato
                  }
                  onChange={
                    handleInputChange
                  }
                >
                  <option value="todo">
                    To Do
                  </option>

                  <option value="in_progress">
                    In Progress
                  </option>

                  <option value="done">
                    Done
                  </option>
                </select>
              </div>
            )}

            {/* MEMBRI */}

            <div className="task-form-group">
              <label>
                Assegna a membri del team
              </label>

              <div className="task-members-box">
                {utenti.length ===
                0 ? (
                  <span className="task-empty-inline">
                    Nessun membro trovato
                  </span>
                ) : (
                  utenti.map(
                    (member) => {
                      const isSelected =
                        selectedProfili.includes(
                          member.id
                        );

                      return (
                        <button
                          key={
                            member.id
                          }
                          type="button"
                          className={
                            isSelected
                              ? "task-member selected"
                              : "task-member"
                          }
                          onClick={() =>
                            toggleProfilo(
                              member.id
                            )
                          }
                        >
                          <i
                            className={
                              isSelected
                                ? "bi bi-check-circle-fill"
                                : "bi bi-plus-circle"
                            }
                          />

                          <span>
                            {member.nome}{" "}
                            {
                              member.cognome
                            }
                          </span>
                        </button>
                      );
                    }
                  )
                )}
              </div>
            </div>

            {/* DESCRIZIONE */}

            <div className="task-form-group">
              <label htmlFor="task-descrizione">
                Descrizione
              </label>

              <textarea
                id="task-descrizione"
                name="descrizione"
                value={
                  formData.descrizione
                }
                onChange={
                  handleInputChange
                }
                rows={4}
                placeholder="Inserisci una descrizione..."
              />
            </div>

            {/* ALLEGATI */}

            <div className="task-form-group">
              <label>
                Allegati
              </label>

              <div className="task-attachments-box">
                {pendingFiles.length >
                0 ? (
                  <div className="task-pending-files">
                    {pendingFiles.map(
                      (
                        file,
                        idx
                      ) => {
                        const previewKey =
                          getPendingFileKey(
                            file
                          );

                        const previewUrl =
                          pendingPreviewUrls[
                            previewKey
                          ];

                        const image =
                          isImageFile(
                            file
                          );

                        return (
                          <div
                            key={
                              previewKey
                            }
                            className="task-pending-file"
                          >
                            {image &&
                            previewUrl ? (
                              <img
                                src={
                                  previewUrl
                                }
                                alt={
                                  file.name
                                }
                                className="task-file-thumbnail"
                              />
                            ) : (
                              <div className="task-file-icon">
                                <i
                                  className={`bi ${getFileIcon(
                                    file.name,
                                    file.type
                                  )}`}
                                />
                              </div>
                            )}

                            <div className="task-pending-file-info">
                              <span
                                title={
                                  file.name
                                }
                              >
                                {
                                  file.name
                                }
                              </span>

                              <small>
                                {image
                                  ? "Immagine"
                                  : "Documento"}
                              </small>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removePendingFile(
                                  idx
                                )
                              }
                              title="Rimuovi file"
                              className="task-file-remove"
                            >
                              <i className="bi bi-x" />
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <span className="task-empty-inline">
                    Nessun file selezionato.
                  </span>
                )}

                <label className="task-upload-button">
                  <i className="bi bi-cloud-arrow-up" />
                  Seleziona file o immagini

                  <input
                    type="file"
                    onChange={
                      handlePendingFileSelect
                    }
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  />
                </label>
              </div>
            </div>

            {/* AZIONI */}

            <div className="task-modal-actions">
              <button
                type="button"
                className="task-page-button danger"
                onClick={() => {
                  setIsModalOpen(
                    false
                  );
                  setSelectedTask(
                    null
                  );
                  clearPendingFiles();
                }}
              >
                Annulla
              </button>

              <button
                type="submit"
                className="task-page-button primary"
              >
                <i className="bi bi-check2" />

                {selectedTask
                  ? "Salva Modifiche"
                  : "Crea Task"}
              </button>
            </div>
          </form>

          {/* =================================================
              NOTE E ALLEGATI
              ================================================= */}

          {selectedTask && (
            <>
              {/* ALLEGATI ESISTENTI */}

              <div className="task-detail-section">
                <span>
                  Allegati (Doc / Immagini)
                </span>

                <div className="task-files">
                  {allegatiList.map(
                    (file) => {
                      const isImage =
                        getUploadedFileIsImage(
                          file
                        );

                      return (
                        <a
                          key={
                            file.id
                          }
                          href={
                            file.url_file
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className={
                            isImage
                              ? "task-file-link task-file-link-image"
                              : "task-file-link"
                          }
                          title={`Apri ${file.nome_file}`}
                        >
                          {isImage ? (
                            <img
                              src={
                                file.url_file
                              }
                              alt={
                                file.nome_file
                              }
                              className="task-file-thumbnail uploaded"
                            />
                          ) : (
                            <div className="task-file-icon">
                              <i
                                className={`bi ${getFileIcon(
                                  file.nome_file,
                                  file.tipo_file ||
                                    ""
                                )}`}
                              />
                            </div>
                          )}

                          <div className="task-file-link-info">
                            <span
                              title={
                                file.nome_file
                              }
                            >
                              {
                                file.nome_file
                              }
                            </span>

                            <small>
                              {isImage
                                ? "Immagine"
                                : "Documento"}
                            </small>
                          </div>

                          <i className="bi bi-box-arrow-up-right task-file-open-icon" />
                        </a>
                      );
                    }
                  )}

                  {allegatiList.length ===
                    0 && (
                    <small>
                      Nessun file allegato.
                    </small>
                  )}
                </div>

                <label className="task-upload-button">
                  <i className="bi bi-upload" />

                  {uploadingFile
                    ? "Caricamento..."
                    : "Aggiungi file o immagine"}

                  <input
                    type="file"
                    onChange={
                      handleFileUpload
                    }
                    disabled={
                      uploadingFile
                    }
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  />
                </label>
              </div>

              {/* NOTE */}

              <div className="task-detail-section">
                <span>
                  Note e Commenti
                </span>

                <div className="task-notes-list">
                  {noteList.map(
                    (nota) => (
                      <div
                        key={
                          nota.id
                        }
                        className="task-note"
                      >
                        <div>
                          <strong>
                            {nota.profili
                              ? `${nota.profili.nome} ${nota.profili.cognome}`
                              : "Utente"}
                          </strong>

                          <small>
                            {new Date(
                              nota.created_at
                            ).toLocaleString(
                              "it-IT"
                            )}
                          </small>
                        </div>

                        <p>
                          {nota.testo}
                        </p>
                      </div>
                    )
                  )}

                  {noteList.length ===
                    0 && (
                    <small>
                      Nessuna nota presente.
                    </small>
                  )}
                </div>

                <form
                  onSubmit={
                    handleAddNota
                  }
                  className="task-note-form"
                >
                  <input
                    type="text"
                    placeholder="Scrivi una nota..."
                    value={
                      nuovaNota
                    }
                    onChange={(e) =>
                      setNuovaNota(
                        e.target.value
                      )
                    }
                  />

                  <button type="submit">
                    Invia
                  </button>
                </form>
              </div>

              {/* AZIONI FINALI */}

              <div className="task-modal-actions between">
                <button
                  type="button"
                  className="task-page-button danger"
                  onClick={() =>
                    handleDeleteTask(
                      selectedTask.id
                    )
                  }
                >
                  <i className="bi bi-trash" />
                  Elimina Task
                </button>

                <button
                  type="button"
                  className="task-page-button secondary"
                  onClick={() => {
                    setIsModalOpen(
                      false
                    );
                    setSelectedTask(
                      null
                    );
                    clearPendingFiles();
                  }}
                >
                  Chiudi
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default TaskPage;