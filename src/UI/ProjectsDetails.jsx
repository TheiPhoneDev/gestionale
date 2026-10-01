import "../App.css";
import "./TaskPage.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "../supabaseClient";
import Modal from "./Modal";

function ProgettoDettaglio({ progettoId, onBack }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [progetto, setProgetto] = useState(null);
  const [nomeProgetto, setNomeProgetto] = useState("");
  const [nomeAzienda, setNomeAzienda] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("Miei");
  const [filtersOpen, setFiltersOpen] = useState(false);

  /*
   * ============================================================
   * FILTRI AVANZATI
   * ============================================================
   */

  const [taskFilters, setTaskFilters] = useState({
    assegnatoA: "",
    assegnatoDa: "",
    priorita: "",
    stato: "",
    scadenza: "",
  });

  const [utenti, setUtenti] = useState([]);

  const [currentProfileId, setCurrentProfileId] =
    useState(null);

  const [currentUserRole, setCurrentUserRole] =
    useState("");

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [selectedTask, setSelectedTask] =
    useState(null);

  const [selectedProfili, setSelectedProfili] =
    useState([]);

  const [isBalanceModalOpen, setIsBalanceModalOpen] =
    useState(false);

  const [balanceRole, setBalanceRole] =
    useState("Tutti");

  const [balanceScope, setBalanceScope] =
    useState("scaduti");

  const [noteList, setNoteList] =
    useState([]);

  const [nuovaNota, setNuovaNota] =
    useState("");

  const [allegatiList, setAllegatiList] =
    useState([]);

  const [uploadingFile, setUploadingFile] =
    useState(false);

  const [pendingFiles, setPendingFiles] =
    useState([]);

  const [pendingPreviewUrls, setPendingPreviewUrls] =
    useState({});

  /*
   * Manteniamo gli ObjectURL anche in una ref.
   */
  const pendingPreviewUrlsRef =
    useRef({});

  const [errorMessage, setErrorMessage] =
    useState("");

  const [formData, setFormData] = useState({
    titolo: "",
    descrizione: "",
    scadenza: "",
    priorita: "Media",
    progetto_id: progettoId || "",
    stato: "todo",
  });

  const isAdmin =
    (currentUserRole || "")
      .trim()
      .toLowerCase() === "admin";

  /*
   * ============================================================
   * UTILITY
   * ============================================================
   */

  const normalizeStatus = (status) => {
    return (status || "")
      .toString()
      .trim()
      .toLowerCase();
  };

  const isDone = (task) => {
    const status = normalizeStatus(
      task?.stato
    );

    return (
      status === "done" ||
      status === "completato" ||
      status === "completed"
    );
  };

  const isInProgress = (task) => {
    const status = normalizeStatus(
      task?.stato
    );

    return (
      status === "in_progress" ||
      status === "in_corso" ||
      status === "in progress"
    );
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString(
      "it-IT"
    );
  };

  const formatDateInput = (value) => {
    if (!value) return "";

    return String(value).split("T")[0];
  };

  /*
   * ============================================================
   * FILTRI AVANZATI - UTILITY
   * ============================================================
   */

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
      priorita: "",
      stato: "",
      scadenza: "",
    });

    setSearchTerm("");

    setPriorityFilter(
      isAdmin ? "Tutti" : "Miei"
    );
  };

  const activeTaskFiltersCount =
    Object.values(taskFilters).filter(
      Boolean
    ).length +
    (searchTerm.trim() ? 1 : 0) +
    (priorityFilter !==
    (isAdmin ? "Tutti" : "Miei")
      ? 1
      : 0);

  const hasAdvancedFilters =
    Object.values(taskFilters).some(Boolean);

  /*
   * ============================================================
   * UTILITY FILE
   * ============================================================
   */

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
    return `${file.name}-${file.lastModified}-${file.size}`;
  };

  const getFileIcon = (
    fileName = "",
    fileType = ""
  ) => {
    const normalizedType =
      fileType.toLowerCase();

    const normalizedName =
      fileName.toLowerCase();

    if (
      normalizedType.startsWith(
        "image/"
      ) ||
      /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
        normalizedName
      )
    ) {
      return "bi-file-earmark-image";
    }

    if (
      normalizedType ===
        "application/pdf" ||
      /\.pdf$/i.test(normalizedName)
    ) {
      return "bi-file-earmark-pdf";
    }

    if (
      normalizedType.includes(
        "word"
      ) ||
      normalizedType.includes(
        "document"
      ) ||
      /\.(doc|docx)$/i.test(
        normalizedName
      )
    ) {
      return "bi-file-earmark-word";
    }

    if (
      normalizedType.includes(
        "excel"
      ) ||
      normalizedType.includes(
        "spreadsheet"
      ) ||
      /\.(xls|xlsx)$/i.test(
        normalizedName
      )
    ) {
      return "bi-file-earmark-excel";
    }

    if (
      normalizedType.includes(
        "powerpoint"
      ) ||
      /\.(ppt|pptx)$/i.test(
        normalizedName
      )
    ) {
      return "bi-file-earmark-ppt";
    }

    if (
      normalizedType.includes("zip") ||
      /\.(zip|rar|7z)$/i.test(
        normalizedName
      )
    ) {
      return "bi-file-earmark-zip";
    }

    return "bi-file-earmark";
  };

  const isUploadedImage = (file) => {
    if (!file) return false;

    return (
      file.tipo_file?.startsWith(
        "image/"
      ) ||
      /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
        file.nome_file || ""
      )
    );
  };

  const clearPendingFiles = () => {
    const urls = Object.values(
      pendingPreviewUrlsRef.current ||
        {}
    );

    urls.forEach((url) => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    });

    pendingPreviewUrlsRef.current =
      {};

    setPendingPreviewUrls({});
    setPendingFiles([]);
  };

  /*
   * ============================================================
   * UTENTE CORRENTE
   * ============================================================
   */

  const fetchCurrentUserProfile =
    async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error(
            "Errore recupero utente autenticato:",
            authError
          );
          return;
        }

        if (!user) {
          setCurrentProfileId(null);
          setCurrentUserRole("");
          return;
        }

        setCurrentProfileId(user.id);

        const {
          data: profiloData,
          error: profiloError,
        } = await supabase
          .from("profili")
          .select("id, nome, cognome, ruolo")
          .eq("id", user.id)
          .maybeSingle();

        if (profiloError) {
          console.warn(
            "Profilo non disponibile, uso l'ID Auth:",
            profiloError
          );

          setCurrentUserRole(
            user.user_metadata?.ruolo ||
              ""
          );

          return;
        }

        if (profiloData) {
          setCurrentProfileId(
            profiloData.id
          );

          setCurrentUserRole(
            profiloData.ruolo || ""
          );
        } else {
          setCurrentUserRole(
            user.user_metadata?.ruolo ||
              ""
          );
        }
      } catch (error) {
        console.error(
          "Errore fetchCurrentUserProfile:",
          error
        );
      }
    };

  /*
   * ============================================================
   * CARICAMENTO UTENTI
   * ============================================================
   */

  const fetchUtenti = async () => {
    try {
      const { data, error } =
        await supabase
          .from("profili")
          .select(
            "id, nome, cognome, ruolo"
          )
          .order("nome", {
            ascending: true,
          });

      if (error) {
        console.error(
          "Errore caricamento utenti:",
          error
        );

        setUtenti([]);
        return;
      }

      setUtenti(data || []);
    } catch (error) {
      console.error(
        "Errore fetchUtenti:",
        error
      );

      setUtenti([]);
    }
  };

  /*
   * ============================================================
   * CARICAMENTO PROGETTO
   * ============================================================
   */

  const fetchProgetto = async () => {
    if (!progettoId) {
      setProgetto(null);
      setNomeProgetto("");
      setNomeAzienda("");
      return null;
    }

    try {
      const cleanProjectId =
        String(progettoId).trim();

      console.log(
        "[ProjectDetails] Caricamento progetto:",
        cleanProjectId
      );

      const { data, error } =
        await supabase
          .from("progetti")
          .select(`
            *,
            clienti (
              nome,
              azienda
            )
          `)
          .eq("id", cleanProjectId)
          .maybeSingle();

      if (error) {
        console.error(
          "Errore caricamento progetto:",
          error
        );

        setErrorMessage(
          `Errore caricamento progetto: ${error.message}`
        );

        return null;
      }

      if (!data) {
        setErrorMessage(
          "Progetto non trovato."
        );

        return null;
      }

      setProgetto(data);
      setNomeProgetto(
        data.nome || ""
      );

      setNomeAzienda(
        data.clienti?.azienda ||
          data.clienti?.nome ||
          ""
      );

      return data;
    } catch (error) {
      console.error(
        "Errore fetchProgetto:",
        error
      );

      setErrorMessage(
        `Errore caricamento progetto: ${
          error.message ||
          "errore sconosciuto"
        }`
      );

      return null;
    }
  };

  /*
   * ============================================================
   * CARICAMENTO TASK
   * ============================================================
   */

  const fetchTasks = async () => {
    if (!progettoId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const cleanProjectId =
        String(progettoId).trim();

      console.log(
        "[ProjectDetails] Caricamento task:",
        cleanProjectId
      );

      const {
        data: taskData,
        error: taskError,
      } = await supabase
        .from("task")
        .select("*")
        .eq(
          "progetto_id",
          cleanProjectId
        )
        .order("scadenza", {
          ascending: true,
        });

      if (taskError) {
        console.error(
          "ERRORE CARICAMENTO TASK:",
          taskError
        );

        setTasks([]);

        setErrorMessage(
          `Errore caricamento task: ${taskError.message}`
        );

        return;
      }

      const rawTasks =
        taskData || [];

      console.log(
        "[ProjectDetails] Task caricati:",
        rawTasks.length
      );

      if (rawTasks.length === 0) {
        setTasks([]);
        setErrorMessage("");
        return;
      }

      /*
       * --------------------------------------------------------
       * CREATORI
       * --------------------------------------------------------
       */

      const creatorIds = [
        ...new Set(
          rawTasks
            .map(
              (task) =>
                task.creato_da
            )
            .filter(Boolean)
        ),
      ];

      let creators = [];

      if (
        creatorIds.length > 0
      ) {
        const {
          data: creatorData,
          error: creatorError,
        } = await supabase
          .from("profili")
          .select(
            "id, nome, cognome, ruolo"
          )
          .in(
            "id",
            creatorIds
          );

        if (creatorError) {
          console.warn(
            "Impossibile caricare i creatori:",
            creatorError
          );
        } else {
          creators =
            creatorData || [];
        }
      }

      const creatorMap =
        new Map(
          creators.map(
            (profile) => [
              String(profile.id),
              profile,
            ]
          )
        );

      /*
       * --------------------------------------------------------
       * ASSEGNAZIONI TASK
       * --------------------------------------------------------
       */

      const taskIds = rawTasks
        .map(
          (task) => task.id
        )
        .filter(Boolean);

      let assignmentRows = [];

      if (
        taskIds.length > 0
      ) {
        const {
          data: assignmentData,
          error: assignmentError,
        } = await supabase
          .from("task_profili")
          .select(
            "task_id, profilo_id"
          )
          .in(
            "task_id",
            taskIds
          );

        if (assignmentError) {
          console.warn(
            "Impossibile caricare le assegnazioni:",
            assignmentError
          );
        } else {
          assignmentRows =
            assignmentData || [];
        }
      }

      /*
       * --------------------------------------------------------
       * PROFILI ASSEGNATI
       * --------------------------------------------------------
       */

      const assignedProfileIds = [
        ...new Set(
          assignmentRows
            .map(
              (row) =>
                row.profilo_id
            )
            .filter(Boolean)
        ),
      ];

      let assignedProfiles = [];

      if (
        assignedProfileIds.length >
        0
      ) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profili")
          .select(
            "id, nome, cognome, ruolo"
          )
          .in(
            "id",
            assignedProfileIds
          );

        if (profileError) {
          console.warn(
            "Impossibile caricare i profili assegnati:",
            profileError
          );
        } else {
          assignedProfiles =
            profileData || [];
        }
      }

      const profileMap =
        new Map(
          assignedProfiles.map(
            (profile) => [
              String(profile.id),
              profile,
            ]
          )
        );

      /*
       * --------------------------------------------------------
       * RICOSTRUZIONE STRUTTURA
       * --------------------------------------------------------
       */

      const assignmentsMap =
        new Map();

      assignmentRows.forEach(
        (row) => {
          const taskKey =
            String(row.task_id);

          if (
            !assignmentsMap.has(
              taskKey
            )
          ) {
            assignmentsMap.set(
              taskKey,
              []
            );
          }

          const profile =
            profileMap.get(
              String(
                row.profilo_id
              )
            );

          if (profile) {
            assignmentsMap
              .get(taskKey)
              .push({
                profili: profile,
              });
          }
        }
      );

      const enrichedTasks =
        rawTasks.map(
          (task) => ({
            ...task,

            progetti: {
              id: progettoId,
              nome:
                nomeProgetto ||
                progetto?.nome ||
                "",
            },

            creatore:
              creatorMap.get(
                String(
                  task.creato_da
                )
              ) || null,

            task_profili:
              assignmentsMap.get(
                String(task.id)
              ) || [],
          })
        );

      console.log(
        "[ProjectDetails] Task finali:",
        enrichedTasks
      );

      setTasks(enrichedTasks);
      setErrorMessage("");
    } catch (error) {
      console.error(
        "Errore generale fetchTasks:",
        error
      );

      setTasks([]);

      setErrorMessage(
        `Errore caricamento task: ${
          error.message ||
          "errore sconosciuto"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * INIT
   * ============================================================
   */

  useEffect(() => {
    let active = true;

    const init = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        await fetchCurrentUserProfile();

        const project =
          await fetchProgetto();

        if (!active) return;

        if (project) {
          await fetchTasks();
        } else {
          setTasks([]);
        }

        await fetchUtenti();
      } catch (error) {
        console.error(
          "Errore inizializzazione ProjectDetails:",
          error
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      active = false;
    };
  }, [progettoId]);

  /*
   * Cleanup ObjectURL
   */

  useEffect(() => {
    return () => {
      Object.values(
        pendingPreviewUrlsRef.current ||
          {}
      ).forEach((url) => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });

      pendingPreviewUrlsRef.current =
        {};
    };
  }, []);

  /*
   * ============================================================
   * REFRESH
   * ============================================================
   */

  const refreshPage = async () => {
    setErrorMessage("");

    await fetchProgetto();
    await fetchTasks();
    await fetchUtenti();
  };

  /*
   * ============================================================
   * NOTE / ALLEGATI
   * ============================================================
   */

  const fetchTaskDetailsExtra =
    async (taskId) => {
      if (!taskId) return;

      try {
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
          .eq(
            "task_id",
            taskId
          )
          .order("created_at", {
            ascending: true,
          });

        if (notesError) {
          console.error(
            "Errore caricamento note:",
            notesError
          );
        }

        setNoteList(
          notesData || []
        );

        const {
          data: filesData,
          error: filesError,
        } = await supabase
          .from("task_allegati")
          .select("*")
          .eq(
            "task_id",
            taskId
          )
          .order("created_at", {
            ascending: false,
          });

        if (filesError) {
          console.error(
            "Errore caricamento allegati:",
            filesError
          );
        }

        setAllegatiList(
          filesData || []
        );
      } catch (error) {
        console.error(
          "Errore fetchTaskDetailsExtra:",
          error
        );
      }
    };

  /*
   * ============================================================
   * PRIORITÀ
   * ============================================================
   */

  const getPriorityBadge = (
    task
  ) => {
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
            <i className="bi bi-arrow-up-circle-fill"></i>
            Alta
          </span>
        );

      case "media":
        return (
          <span className="task-priority-badge medium">
            <i className="bi bi-dash-circle-fill"></i>
            Media
          </span>
        );

      case "bassa":
        return (
          <span className="task-priority-badge low">
            <i className="bi bi-arrow-down-circle-fill"></i>
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

  /*
   * ============================================================
   * STATUS
   * ============================================================
   */

  const getStatusBadgeStyle = (
    stato
  ) => {
    switch (
      normalizeStatus(stato)
    ) {
      case "done":
      case "completato":
      case "completed":
        return "bg-success text-white";

      case "in_progress":
      case "in_corso":
      case "in progress":
        return "bg-warning text-dark";

      default:
        return "bg-secondary text-white";
    }
  };

  /*
   * ============================================================
   * APERTURA MODALE
   * ============================================================
   */

  const handleRowClick = async (
    task
  ) => {
    const isAssigned =
      task.task_profili?.some(
        (tp) =>
          String(
            tp.profili?.id
          ) ===
          String(
            currentProfileId
          )
      );

    if (
      !isAssigned &&
      !isAdmin
    ) {
      alert(
        "Non hai i permessi per modificare questo task."
      );
      return;
    }

    clearPendingFiles();

    setSelectedTask(task);

    setFormData({
      titolo: task.titolo || "",
      descrizione:
        task.descrizione || "",
      scadenza:
        formatDateInput(
          task.scadenza
        ),
      priorita:
        task.priorita ||
        "Media",
      progetto_id:
        progettoId || "",
      stato:
        task.stato || "todo",
    });

    setSelectedProfili(
      task.task_profili
        ? task.task_profili
            .map(
              (tp) =>
                tp.profili?.id
            )
            .filter(Boolean)
        : []
    );

    setNoteList([]);
    setAllegatiList([]);
    setNuovaNota("");

    setIsModalOpen(true);

    await fetchTaskDetailsExtra(
      task.id
    );
  };

  /*
   * ============================================================
   * CREAZIONE TASK
   * ============================================================
   */

  const handleOpenCreateModal =
    () => {
      clearPendingFiles();

      setSelectedTask(null);

      setFormData({
        titolo: "",
        descrizione: "",
        scadenza: "",
        priorita: "Media",
        progetto_id:
          progettoId || "",
        stato: "todo",
      });

      setSelectedProfili([]);
      setNoteList([]);
      setAllegatiList([]);
      setNuovaNota("");

      setIsModalOpen(true);
    };

  /*
   * ============================================================
   * INPUT FORM
   * ============================================================
   */

  const handleInputChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /*
   * ============================================================
   * ASSEGNAZIONI
   * ============================================================
   */

  const toggleProfilo = (
    profiloId
  ) => {
    setSelectedProfili((prev) =>
      prev.includes(profiloId)
        ? prev.filter(
            (id) =>
              id !== profiloId
          )
        : [
            ...prev,
            profiloId,
          ]
    );
  };

  /*
   * ============================================================
   * FILE PENDENTI
   * ============================================================
   */

  const handlePendingFileSelect =
    (event) => {
      const files = Array.from(
        event.target.files || []
      );

      if (files.length > 0) {
        setPendingFiles((prev) => [
          ...prev,
          ...files,
        ]);

        files.forEach((file) => {
          if (!isImageFile(file)) {
            return;
          }

          const previewKey =
            getPendingFileKey(
              file
            );

          const previewUrl =
            URL.createObjectURL(
              file
            );

          const previousUrl =
            pendingPreviewUrlsRef
              .current?.[
              previewKey
            ];

          if (previousUrl) {
            URL.revokeObjectURL(
              previousUrl
            );
          }

          pendingPreviewUrlsRef.current =
            {
              ...pendingPreviewUrlsRef.current,
              [previewKey]:
                previewUrl,
            };

          setPendingPreviewUrls(
            (prev) => ({
              ...prev,
              [previewKey]:
                previewUrl,
            })
          );
        });
      }

      event.target.value = null;
    };

  const removePendingFile = (
    indexToRemove
  ) => {
    const fileToRemove =
      pendingFiles[
        indexToRemove
      ];

    if (fileToRemove) {
      const previewKey =
        getPendingFileKey(
          fileToRemove
        );

      const previewUrl =
        pendingPreviewUrlsRef
          .current?.[
          previewKey
        ];

      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }

      const updatedUrls = {
        ...pendingPreviewUrlsRef.current,
      };

      delete updatedUrls[
        previewKey
      ];

      pendingPreviewUrlsRef.current =
        updatedUrls;

      setPendingPreviewUrls(
        updatedUrls
      );
    }

    setPendingFiles((prev) =>
      prev.filter(
        (_, index) =>
          index !==
          indexToRemove
      )
    );
  };

  /*
   * ============================================================
   * SALVATAGGIO TASK
   * ============================================================
   */

  const handleSaveTask = async (
    event
  ) => {
    event.preventDefault();

    if (
      !formData.titolo.trim()
    ) {
      alert(
        "Inserisci almeno il titolo del task."
      );
      return;
    }

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      const creatorId =
        currentProfileId ||
        user?.id ||
        null;

      const payload = {
        titolo:
          formData.titolo.trim(),

        descrizione:
          formData.descrizione.trim() ||
          null,

        scadenza:
          formData.scadenza ||
          null,

        priorita:
          formData.priorita ||
          "Media",

        progetto_id:
          progettoId || null,

        stato:
          formData.stato ||
          "todo",
      };

      let targetTaskId = null;

      /*
       * MODIFICA
       */

      if (selectedTask) {
        const {
          error: updateError,
        } = await supabase
          .from("task")
          .update(payload)
          .eq(
            "id",
            selectedTask.id
          );

        if (updateError) {
          alert(
            `Errore aggiornamento task: ${updateError.message}`
          );
          return;
        }

        targetTaskId =
          selectedTask.id;

        const {
          error:
            deleteAssignmentError,
        } =
          await supabase
            .from(
              "task_profili"
            )
            .delete()
            .eq(
              "task_id",
              targetTaskId
            );

        if (
          deleteAssignmentError
        ) {
          console.warn(
            "Errore eliminazione vecchie assegnazioni:",
            deleteAssignmentError
          );
        }
      }

      /*
       * CREAZIONE
       */

      else {
        if (creatorId) {
          payload.creato_da =
            creatorId;
        }

        const {
          data: newTask,
          error: insertError,
        } =
          await supabase
            .from("task")
            .insert([
              payload,
            ])
            .select("*")
            .single();

        if (insertError) {
          alert(
            `Errore creazione task: ${insertError.message}`
          );
          return;
        }

        targetTaskId =
          newTask.id;
      }

      /*
       * NUOVE ASSEGNAZIONI
       */

      if (
        targetTaskId &&
        selectedProfili.length >
          0
      ) {
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
          error:
            assignmentError,
        } =
          await supabase
            .from(
              "task_profili"
            )
            .insert(
              assegnazioni
            );

        if (assignmentError) {
          console.error(
            "Errore assegnazione task:",
            assignmentError
          );
        }

        const notifiche =
          selectedProfili.map(
            (profiloId) => ({
              user_id:
                profiloId,

              titolo:
                selectedTask
                  ? "Task aggiornato"
                  : "Nuovo task assegnato",

              messaggio:
                `Ti è stato assegnato il task "${formData.titolo.trim()}".`,

              letta: false,
            })
          );

        const {
          error:
            notificationError,
        } =
          await supabase
            .from(
              "notifiche"
            )
            .insert(
              notifiche
            );

        if (notificationError) {
          console.warn(
            "Errore notifiche:",
            notificationError
          );
        }
      }

      /*
       * UPLOAD FILE NUOVI
       */

      if (
        targetTaskId &&
        pendingFiles.length > 0
      ) {
        for (const file of pendingFiles) {
          try {
            const fileExt =
              file.name.includes(
                "."
              )
                ? file.name
                    .split(".")
                    .pop()
                : "";

            const randomPart =
              Math.random()
                .toString(36)
                .substring(2);

            const fileName =
              `${randomPart}_${Date.now()}${
                fileExt
                  ? `.${fileExt}`
                  : ""
              }`;

            const filePath =
              `${targetTaskId}/${fileName}`;

            const {
              error: uploadError,
            } =
              await supabase.storage
                .from(
                  "task-attachments"
                )
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
              data:
                publicUrlData,
            } =
              supabase.storage
                .from(
                  "task-attachments"
                )
                .getPublicUrl(
                  filePath
                );

            if (
              publicUrlData?.publicUrl
            ) {
              const {
                error:
                  attachmentError,
              } =
                await supabase
                  .from(
                    "task_allegati"
                  )
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

              if (
                attachmentError
              ) {
                console.error(
                  "Errore salvataggio allegato:",
                  attachmentError
                );
              }
            }
          } catch (error) {
            console.error(
              "Errore caricamento file:",
              error
            );
          }
        }
      }

      clearPendingFiles();

      setIsModalOpen(false);
      setSelectedTask(null);
      setNoteList([]);
      setAllegatiList([]);
      setNuovaNota("");

      await fetchTasks();
    } catch (error) {
      console.error(
        "Errore handleSaveTask:",
        error
      );

      alert(
        `Errore: ${
          error.message ||
          "errore sconosciuto"
        }`
      );
    }
  };

  /*
   * ============================================================
   * CAMBIO STATO
   * ============================================================
   */

  const handleStatusChange = async (
    task,
    newStatus
  ) => {
    const isAssigned =
      task.task_profili?.some(
        (tp) =>
          String(
            tp.profili?.id
          ) ===
          String(
            currentProfileId
          )
      );

    if (
      !isAssigned &&
      !isAdmin
    ) {
      alert(
        "Non puoi modificare questo task."
      );
      return;
    }

    const previousTasks =
      tasks;

    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id
          ? {
              ...item,
              stato: newStatus,
            }
          : item
      )
    );

    const { error } =
      await supabase
        .from("task")
        .update({
          stato: newStatus,
        })
        .eq(
          "id",
          task.id
        );

    if (error) {
      console.error(
        "Errore aggiornamento stato:",
        error
      );

      setTasks(
        previousTasks
      );

      alert(
        `Errore aggiornamento stato: ${error.message}`
      );
    }
  };

  /*
   * ============================================================
   * ELIMINAZIONE
   * ============================================================
   */

  const handleDeleteTask =
    async (taskId) => {
      if (!isAdmin) {
        alert(
          "Solo un amministratore può eliminare un task."
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Sei sicuro di voler eliminare questo task?"
        );

      if (!confirmed) return;

      try {
        const { error } =
          await supabase
            .from("task")
            .delete()
            .eq(
              "id",
              taskId
            );

        if (error) {
          alert(
            `Errore durante l'eliminazione: ${error.message}`
          );
          return;
        }

        clearPendingFiles();

        setIsModalOpen(false);
        setSelectedTask(null);

        await fetchTasks();
      } catch (error) {
        console.error(
          "Errore eliminazione:",
          error
        );
      }
    };

  /*
   * ============================================================
   * NOTE
   * ============================================================
   */

  const handleAddNota = async (
    event
  ) => {
    event.preventDefault();

    if (
      !nuovaNota.trim() ||
      !selectedTask
    ) {
      return;
    }

    if (!currentProfileId) {
      alert(
        "Profilo utente non disponibile."
      );
      return;
    }

    const { error } =
      await supabase
        .from("task_note")
        .insert([
          {
            task_id:
              selectedTask.id,

            profilo_id:
              currentProfileId,

            testo:
              nuovaNota.trim(),
          },
        ]);

    if (error) {
      alert(
        `Errore nell'invio della nota: ${error.message}`
      );
      return;
    }

    setNuovaNota("");

    await fetchTaskDetailsExtra(
      selectedTask.id
    );
  };

  /*
   * ============================================================
   * UPLOAD FILE TASK ESISTENTE
   * ============================================================
   */

  const handleFileUpload =
    async (event) => {
      const file =
        event.target.files?.[0];

      if (
        !file ||
        !selectedTask
      ) {
        return;
      }

      setUploadingFile(true);

      try {
        const fileExt =
          file.name.includes(
            "."
          )
            ? file.name
                .split(".")
                .pop()
            : "";

        const fileName =
          `${Math.random()
            .toString(36)
            .substring(2)}_${Date.now()}${
            fileExt
              ? `.${fileExt}`
              : ""
          }`;

        const filePath =
          `${selectedTask.id}/${fileName}`;

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from(
              "task-attachments"
            )
            .upload(
              filePath,
              file
            );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data:
            publicUrlData,
        } =
          supabase.storage
            .from(
              "task-attachments"
            )
            .getPublicUrl(
              filePath
            );

        if (
          !publicUrlData?.publicUrl
        ) {
          throw new Error(
            "URL pubblico del file non disponibile."
          );
        }

        const {
          error: dbError,
        } =
          await supabase
            .from(
              "task_allegati"
            )
            .insert([
              {
                task_id:
                  selectedTask.id,

                nome_file:
                  file.name,

                url_file:
                  publicUrlData.publicUrl,

                tipo_file:
                  file.type,
              },
            ]);

        if (dbError) {
          throw dbError;
        }

        await fetchTaskDetailsExtra(
          selectedTask.id
        );
      } catch (error) {
        console.error(
          "Errore upload file:",
          error
        );

        alert(
          `Errore durante il caricamento del file: ${error.message}`
        );
      } finally {
        setUploadingFile(false);
        event.target.value = null;
      }
    };

  /*
   * ============================================================
   * BILANCIAMENTO
   * ============================================================
   */

  const now = useMemo(() => {
    const date = new Date();

    date.setHours(
      0,
      0,
      0,
      0
    );

    return date;
  }, []);

  const threeDaysFromNow =
    useMemo(() => {
      return new Date(
        now.getTime() +
          3 *
            24 *
            60 *
            60 *
            1000
      );
    }, [now]);

  const ruoliDisponibili =
    useMemo(() => {
      const roles = utenti
        .map(
          (user) =>
            user.ruolo
        )
        .filter(Boolean);

      return [
        "Tutti",
        ...new Set(roles),
      ];
    }, [utenti]);

  const getFilteredTasksForModal =
    () => {
      const filteredUsers =
        utenti.filter((user) => {
          if (
            balanceRole ===
            "Tutti"
          ) {
            return true;
          }

          return (
            (
              user.ruolo || ""
            )
              .trim()
              .toLowerCase() ===
            balanceRole
              .trim()
              .toLowerCase()
          );
        });

      const workloadMap = {};

      filteredUsers.forEach(
        (user) => {
          workloadMap[user.id] =
            0;
        }
      );

      tasks.forEach((task) => {
        if (isDone(task)) {
          return;
        }

        task.task_profili?.forEach(
          (tp) => {
            const profileId =
              tp.profili?.id;

            if (
              profileId &&
              workloadMap[
                profileId
              ] !== undefined
            ) {
              workloadMap[
                profileId
              ] += 1;
            }
          }
        );
      });

      const matchingTasks =
        tasks.filter((task) => {
          if (isDone(task)) {
            return false;
          }

          if (
            balanceScope ===
            "scaduti"
          ) {
            if (!task.scadenza) {
              return false;
            }

            const date =
              new Date(
                task.scadenza
              );

            date.setHours(
              0,
              0,
              0,
              0
            );

            return date < now;
          }

          if (
            balanceScope ===
            "in_scadenza"
          ) {
            if (!task.scadenza) {
              return false;
            }

            const date =
              new Date(
                task.scadenza
              );

            date.setHours(
              0,
              0,
              0,
              0
            );

            return (
              date >= now &&
              date <=
                threeDaysFromNow
            );
          }

          return true;
        });

      return matchingTasks.map(
        (task) => {
          const sortedAvailable =
            [...filteredUsers].sort(
              (a, b) =>
                (workloadMap[
                  a.id
                ] || 0) -
                (workloadMap[
                  b.id
                ] || 0)
            );

          const candidate =
            sortedAvailable.length >
            0
              ? sortedAvailable[0]
              : null;

          return {
            task,
            candidate,
          };
        }
      );
    };

  const modalTaskList =
    getFilteredTasksForModal();

  const handleAssignSingleTask =
    async (
      taskId,
      taskTitolo,
      targetUserId
    ) => {
      if (!targetUserId) {
        alert(
          "Nessun utente valido selezionato."
        );
        return;
      }

      const existingTask =
        tasks.find(
          (task) =>
            String(task.id) ===
            String(taskId)
        );

      const alreadyAssigned =
        existingTask?.task_profili?.some(
          (tp) =>
            String(
              tp.profili?.id
            ) ===
            String(
              targetUserId
            )
        );

      if (alreadyAssigned) {
        alert(
          "Questo utente è già assegnato al task."
        );
        return;
      }

      const { error } =
        await supabase
          .from(
            "task_profili"
          )
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

      const {
        error: notificationError,
      } =
        await supabase
          .from("notifiche")
          .insert([
            {
              user_id:
                targetUserId,

              titolo:
                "Task assegnato",

              messaggio:
                `Ti è stato assegnato il task "${taskTitolo}".`,

              letta: false,
            },
          ]);

      if (notificationError) {
        console.warn(
          "Errore notifica:",
          notificationError
        );
      }

      alert(
        "Task assegnato con successo!"
      );

      await fetchTasks();
    };

  /*
   * ============================================================
   * FILTRI TASK
   * ============================================================
   */

  const tasksFiltrati =
    useMemo(() => {
      return tasks.filter(
        (task) => {
          /*
           * ----------------------------------------------------
           * PERMESSI
           * ----------------------------------------------------
           */

          if (!isAdmin) {
            const isAssigned =
              task.task_profili?.some(
                (tp) =>
                  String(
                    tp.profili?.id
                  ) ===
                  String(
                    currentProfileId
                  )
              );

            if (!isAssigned) {
              return false;
            }
          }

          /*
           * ----------------------------------------------------
           * RICERCA
           * ----------------------------------------------------
           */

          const ricerca =
            searchTerm
              .toLowerCase()
              .trim();

          const titolo =
            (
              task.titolo || ""
            ).toLowerCase();

          const descrizione =
            (
              task.descrizione ||
              ""
            ).toLowerCase();

          const assegnati =
            task.task_profili
              ?.map(
                (tp) =>
                  `${tp.profili?.nome || ""} ${
                    tp.profili?.cognome || ""
                  }`
              )
              .join(" ")
              .toLowerCase() ||
            "";

          const creatore =
            task.creatore
              ? `${task.creatore.nome || ""} ${
                  task.creatore.cognome ||
                  ""
                }`
                  .trim()
                  .toLowerCase()
              : "";

          const matchesSearch =
            !ricerca ||
            titolo.includes(
              ricerca
            ) ||
            descrizione.includes(
              ricerca
            ) ||
            assegnati.includes(
              ricerca
            ) ||
            creatore.includes(
              ricerca
            );

          if (!matchesSearch) {
            return false;
          }

          /*
           * ----------------------------------------------------
           * FILTRO RAPIDO
           * ----------------------------------------------------
           */

          if (
            priorityFilter ===
            "Miei"
          ) {
            const isMine =
              task.task_profili?.some(
                (tp) =>
                  String(
                    tp.profili?.id
                  ) ===
                  String(
                    currentProfileId
                  )
              );

            if (!isMine) {
              return false;
            }
          }

          if (
            priorityFilter !==
              "Miei" &&
            priorityFilter !==
              "Tutti"
          ) {
            const taskPriority =
              (
                task.priorita ||
                ""
              )
                .toString()
                .trim()
                .toLowerCase();

            if (
              taskPriority !==
              priorityFilter
                .toLowerCase()
                .trim()
            ) {
              return false;
            }
          }

          /*
           * ----------------------------------------------------
           * ASSEGNATO A
           * ----------------------------------------------------
           */

          if (
            taskFilters.assegnatoA
          ) {
            const isAssignedTo =
              task.task_profili?.some(
                (tp) =>
                  String(
                    tp.profili?.id
                  ) ===
                  String(
                    taskFilters.assegnatoA
                  )
              );

            if (!isAssignedTo) {
              return false;
            }
          }

          /*
           * ----------------------------------------------------
           * ASSEGNATO DA
           * ----------------------------------------------------
           */

          if (
            taskFilters.assegnatoDa
          ) {
            if (
              String(
                task.creatore?.id
              ) !==
              String(
                taskFilters.assegnatoDa
              )
            ) {
              return false;
            }
          }

          /*
           * ----------------------------------------------------
           * PRIORITÀ
           * ----------------------------------------------------
           */

          if (
            taskFilters.priorita
          ) {
            const taskPriority =
              (
                task.priorita ||
                ""
              )
                .toString()
                .trim()
                .toLowerCase();

            if (
              taskPriority !==
              taskFilters.priorita
                .toLowerCase()
                .trim()
            ) {
              return false;
            }
          }

          /*
           * ----------------------------------------------------
           * STATO
           * ----------------------------------------------------
           */

          if (
            taskFilters.stato
          ) {
            const taskStatus =
              normalizeStatus(
                task.stato
              );

            const filterStatus =
              normalizeStatus(
                taskFilters.stato
              );

            if (
              taskStatus !==
              filterStatus
            ) {
              return false;
            }
          }

          /*
           * ----------------------------------------------------
           * SCADENZA
           * ----------------------------------------------------
           */

          if (
            taskFilters.scadenza
          ) {
            /*
             * SENZA SCADENZA
             */

            if (
              taskFilters.scadenza ===
              "senza_scadenza"
            ) {
              if (
                task.scadenza
              ) {
                return false;
              }
            }

            /*
             * CON SCADENZA
             */

            else {
              if (
                !task.scadenza
              ) {
                return false;
              }

              const today =
                new Date();

              today.setHours(
                0,
                0,
                0,
                0
              );

              const dueDate =
                new Date(
                  task.scadenza
                );

              dueDate.setHours(
                0,
                0,
                0,
                0
              );

              switch (
                taskFilters.scadenza
              ) {
                case "scaduti":
                  if (
                    isDone(
                      task
                    ) ||
                    dueDate >=
                      today
                  ) {
                    return false;
                  }

                  break;

                case "oggi":
                  if (
                    dueDate.getTime() !==
                    today.getTime()
                  ) {
                    return false;
                  }

                  break;

                case "3_giorni": {
                  const threeDays =
                    new Date(
                      today.getTime() +
                        3 *
                          24 *
                          60 *
                          60 *
                          1000
                    );

                  if (
                    isDone(
                      task
                    ) ||
                    dueDate <
                      today ||
                    dueDate >
                      threeDays
                  ) {
                    return false;
                  }

                  break;
                }

                case "7_giorni": {
                  const sevenDays =
                    new Date(
                      today.getTime() +
                        7 *
                          24 *
                          60 *
                          60 *
                          1000
                    );

                  if (
                    isDone(
                      task
                    ) ||
                    dueDate <
                      today ||
                    dueDate >
                      sevenDays
                  ) {
                    return false;
                  }

                  break;
                }

                default:
                  break;
              }
            }
          }

          return true;
        }
      );
    }, [
      tasks,
      isAdmin,
      currentProfileId,
      searchTerm,
      priorityFilter,
      taskFilters,
    ]);

  /*
   * ============================================================
   * ORDINAMENTO
   * ============================================================
   */

  const tasksOrdinati =
    useMemo(() => {
      return [
        ...tasksFiltrati,
      ].sort((a, b) => {
        const doneA =
          isDone(a);

        const doneB =
          isDone(b);

        if (
          doneA !== doneB
        ) {
          return doneA ? 1 : -1;
        }

        if (
          !a.scadenza &&
          !b.scadenza
        ) {
          return 0;
        }

        if (!a.scadenza) {
          return 1;
        }

        if (!b.scadenza) {
          return -1;
        }

        return (
          new Date(
            a.scadenza
          ).getTime() -
          new Date(
            b.scadenza
          ).getTime()
        );
      });
    }, [
      tasksFiltrati,
    ]);

  /*
   * ============================================================
   * FILTRI DISPONIBILI
   * ============================================================
   */

  const filterOptions =
    isAdmin
      ? [
          "Tutti",
          "Miei",
          "Alta",
          "Media",
          "Bassa",
        ]
      : [
          "Miei",
          "Alta",
          "Media",
          "Bassa",
        ];

  /*
   * ============================================================
   * METRICHE
   * ============================================================
   */

  const totalTasks =
    tasksFiltrati.length;

  const doneTasks =
    tasksFiltrati.filter(
      (task) =>
        isDone(task)
    ).length;

  const inProgressTasks =
    tasksFiltrati.filter(
      (task) =>
        isInProgress(task)
    ).length;

  const expTasks =
    tasksFiltrati.filter(
      (task) => {
        if (
          !task.scadenza ||
          isDone(task)
        ) {
          return false;
        }

        const date =
          new Date(
            task.scadenza
          );

        date.setHours(
          0,
          0,
          0,
          0
        );

        return (
          date >= now &&
          date <=
            threeDaysFromNow
        );
      }
    ).length;

  const overdueTasks =
    tasksFiltrati.filter(
      (task) => {
        if (
          !task.scadenza ||
          isDone(task)
        ) {
          return false;
        }

        const date =
          new Date(
            task.scadenza
          );

        date.setHours(
          0,
          0,
          0,
          0
        );

        return date < now;
      }
    ).length;

  const completionRate =
    totalTasks > 0
      ? Math.round(
          (doneTasks /
            totalTasks) *
            100
        )
      : 0;

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="task-page">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="task-page-header">
        <div className="task-page-heading">
          <div className="task-page-title-row">
            {onBack && (
              <button
                type="button"
                className="task-page-button secondary"
                onClick={() =>
                  onBack(
                    "projects"
                  )
                }
                title="Torna ai progetti"
                style={{
                  marginRight:
                    "10px",
                }}
              >
                <i className="bi bi-arrow-left"></i>
                Indietro
              </button>
            )}

            <h2>
              {nomeProgetto ||
                "Caricamento..."}
            </h2>

            {nomeAzienda && (
              <span className="task-company-badge">
                <i className="bi bi-building"></i>
                {nomeAzienda}
              </span>
            )}
          </div>

          <p>
            Gestisci attività,
            scadenze e
            assegnazioni del team
            per questo progetto.
          </p>
        </div>

        <div className="task-page-actions">
          {isAdmin && (
            <button
              type="button"
              className="task-page-button secondary"
              onClick={() =>
                setIsBalanceModalOpen(
                  true
                )
              }
              title="Gestisci task critici"
            >
              <i className="bi bi-robot"></i>
              Bilancia Task
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              className="task-page-button primary"
              onClick={
                handleOpenCreateModal
              }
            >
              <i className="bi bi-plus"></i>
              Crea Task
            </button>
          )}

          <button
            type="button"
            className="task-page-button secondary"
            onClick={
              refreshPage
            }
          >
            <i className="bi bi-arrow-clockwise"></i>
            Aggiorna
          </button>
        </div>
      </div>

      {/* ======================================================
          ERRORE
      ====================================================== */}

      {errorMessage && (
        <div
          className="alert alert-danger d-flex align-items-center"
          role="alert"
          style={{
            marginBottom:
              "20px",
          }}
        >
          <i
            className="bi bi-exclamation-triangle-fill"
            style={{
              marginRight:
                "10px",
            }}
          ></i>

          <div>
            {errorMessage}
          </div>
        </div>
      )}

      {/* ======================================================
          METRICHE
      ====================================================== */}

      <div className="task-metrics-grid">
        <div className="task-metric-card">
          <div>
            <span>
              Totale
            </span>

            <strong>
              {totalTasks}
            </strong>
          </div>

          <div className="task-metric-icon blue">
            <i className="bi bi-list-task"></i>
          </div>
        </div>

        <div className="task-metric-card">
          <div>
            <span>
              In Corso
            </span>

            <strong className="warning">
              {inProgressTasks}
            </strong>
          </div>

          <div className="task-metric-icon yellow">
            <i className="bi bi-hourglass-split"></i>
          </div>
        </div>

        <div className="task-metric-card">
          <div>
            <span>
              In Scadenza
            </span>

            <strong className="warning">
              {expTasks}
            </strong>
          </div>

          <div className="task-metric-icon yellow">
            <i className="bi bi-clock-history"></i>
          </div>
        </div>

        <div className="task-metric-card">
          <div>
            <span>
              Scaduti
            </span>

            <strong className="danger">
              {overdueTasks}
            </strong>
          </div>

          <div className="task-metric-icon red">
            <i className="bi bi-exclamation-triangle"></i>
          </div>
        </div>

        <div className="task-metric-card">
          <div>
            <span>
              Completati
            </span>

            <strong className="success">
              {doneTasks}

              <small>
                ({completionRate}%)
              </small>
            </strong>
          </div>

          <div className="task-metric-icon green">
            <i className="bi bi-check-circle-fill"></i>
          </div>
        </div>
      </div>

      {/* ======================================================
          RICERCA
      ====================================================== */}

      <div className="task-search">
        <i className="bi bi-search"></i>

        <input
          type="text"
          placeholder="Cerca task, descrizione, assegnatario o creatore..."
          value={searchTerm}
          onChange={(event) =>
            setSearchTerm(
              event.target.value
            )
          }
        />
      </div>

      {/* ======================================================
          FILTRI RAPIDI
      ====================================================== */}

      <div className="task-filters">
        {filterOptions.map((filter) => {
          let label = filter;

          if (filter === "Tutti") label = "Tutti i Task";
          if (filter === "Miei") label = "I Miei Task";
          if (!["Tutti", "Miei"].includes(filter)) {
            label = `Priorità ${filter}`;
          }

          return (
            <button
              key={filter}
              type="button"
              className={
                priorityFilter === filter
                  ? "task-filter active"
                  : "task-filter"
              }
              onClick={() => setPriorityFilter(filter)}
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
          onClick={() => setFiltersOpen((prev) => !prev)}
        >
          <i className="bi bi-sliders" />
          Filtri avanzati

          {hasAdvancedFilters && (
            <span className="task-filter-count">
              {Object.values(taskFilters).filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* ======================================================
          FILTRI AVANZATI
      ====================================================== */}

      {filtersOpen && (
        <div className="task-advanced-filters">
          <div className="task-advanced-filters-header">
            <div>
              <strong>Filtri avanzati</strong>
              <span>
                Combina più filtri per restringere i risultati.
              </span>
            </div>

            <button
              type="button"
              className="task-filter-reset"
              onClick={resetTaskFilters}
            >
              <i className="bi bi-arrow-counterclockwise" />
              Azzera filtri
            </button>
          </div>

          <div className="task-filter-grid">
            <div className="task-filter-field">
              <label>Assegnato a</label>
              <select
                value={taskFilters.assegnatoA}
                onChange={(e) =>
                  updateTaskFilter("assegnatoA", e.target.value)
                }
              >
                <option value="">Tutti gli utenti</option>
                {utenti.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} {u.cognome}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-filter-field">
              <label>Assegnato da</label>
              <select
                value={taskFilters.assegnatoDa}
                onChange={(e) =>
                  updateTaskFilter("assegnatoDa", e.target.value)
                }
              >
                <option value="">Tutti gli utenti</option>
                {utenti.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} {u.cognome}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-filter-field">
              <label>Priorità</label>
              <select
                value={taskFilters.priorita}
                onChange={(e) =>
                  updateTaskFilter("priorita", e.target.value)
                }
              >
                <option value="">Tutte</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Bassa">Bassa</option>
              </select>
            </div>

            <div className="task-filter-field">
              <label>Stato</label>
              <select
                value={taskFilters.stato}
                onChange={(e) =>
                  updateTaskFilter("stato", e.target.value)
                }
              >
                <option value="">Tutti</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In corso</option>
                <option value="done">Completato</option>
              </select>
            </div>

            <div className="task-filter-field">
              <label>Scadenza</label>
              <select
                value={taskFilters.scadenza}
                onChange={(e) =>
                  updateTaskFilter("scadenza", e.target.value)
                }
              >
                <option value="">Qualsiasi</option>
                <option value="scaduti">Scaduti</option>
                <option value="oggi">Oggi</option>
                <option value="3_giorni">Prossimi 3 giorni</option>
                <option value="7_giorni">Prossimi 7 giorni</option>
                <option value="senza_scadenza">Senza scadenza</option>
              </select>
            </div>
          </div>

          <div className="task-advanced-filters-footer">
            <span>
              <strong>{tasksFiltrati.length}</strong>{" "}
              task corrispondenti
            </span>
          </div>
        </div>
      )}

      {/* ======================================================
          TABELLA
      ====================================================== */}

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
          <i className="bi bi-inbox"></i>

          <strong>
            Nessun task trovato
          </strong>

          <span>
            Non ci sono attività
            che corrispondono ai
            filtri selezionati.
          </span>

          {isAdmin && (
            <button
              type="button"
              className="task-page-button primary"
              onClick={
                handleOpenCreateModal
              }
              style={{
                marginTop:
                  "15px",
              }}
            >
              <i className="bi bi-plus"></i>
              Crea il primo
              task
            </button>
          )}
        </div>
      ) : (
        <div className="task-table-wrapper">
          <table className="task-table">
            <thead>
              <tr>
                <th>
                  Titolo
                </th>
                <th>
                  Progetto
                </th>
                <th>
                  Priorità
                </th>
                <th>
                  Assegnato da
                </th>
                <th>
                  Assegnato a
                </th>
                <th>
                  Scadenza
                </th>
                <th>
                  Stato
                </th>
              </tr>
            </thead>

            <tbody>
              {tasksOrdinati.map(
                (task) => {
                  const isAssigned =
                    task.task_profili?.some(
                      (tp) =>
                        String(
                          tp
                            .profili
                            ?.id
                        ) ===
                        String(
                          currentProfileId
                        )
                    );

                  const canEdit =
                    isAssigned ||
                    isAdmin;

                  return (
                    <tr
                      key={
                        task.id
                      }
                      onClick={() =>
                        handleRowClick(
                          task
                        )
                      }
                      style={{
                        cursor:
                          canEdit
                            ? "pointer"
                            : "default",
                      }}
                    >
                      <td>
                        <strong>
                          {
                            task.titolo
                          }
                        </strong>

                        {task.descrizione && (
                          <span className="task-description-preview">
                            {
                              task.descrizione
                            }
                          </span>
                        )}
                      </td>

                      <td>
                        {nomeProgetto ? (
                          <span className="task-project">
                            <i className="bi bi-folder2"></i>
                            {
                              nomeProgetto
                            }
                          </span>
                        ) : (
                          <span className="task-no-project">
                            Nessun
                            progetto
                          </span>
                        )}
                      </td>

                      <td>
                        {getPriorityBadge(
                          task
                        )}
                      </td>

                      <td>
                        <span className="task-creator">
                          {task.creatore
                            ? `${task.creatore.nome || ""} ${
                                task.creatore.cognome ||
                                ""
                              }`.trim()
                            : "-"}
                        </span>
                      </td>

                      <td>
                        {task
                          .task_profili
                          ?.length >
                        0 ? (
                          <div className="task-assignees">
                            {task.task_profili.map(
                              (
                                assignment,
                                index
                              ) => {
                                const profile =
                                  assignment.profili;

                                const isMe =
                                  String(
                                    profile?.id
                                  ) ===
                                  String(
                                    currentProfileId
                                  );

                                return (
                                  <span
                                    key={
                                      profile?.id ||
                                      index
                                    }
                                    className={
                                      isMe
                                        ? "task-assignee me"
                                        : "task-assignee"
                                    }
                                  >
                                    <i className="bi bi-person"></i>

                                    {
                                      profile?.nome ||
                                      ""
                                    }{" "}
                                    {
                                      profile?.cognome ||
                                      ""
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

                      <td>
                        {formatDate(
                          task.scadenza
                        )}
                      </td>

                      <td
                        onClick={(
                          event
                        ) =>
                          event.stopPropagation()
                        }
                      >
                        <select
                          className={`task-status-select ${getStatusBadgeStyle(
                            task.stato
                          )}`}
                          value={
                            task.stato ||
                            "todo"
                          }
                          onChange={(
                            event
                          ) =>
                            handleStatusChange(
                              task,
                              event
                                .target
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

      {/* ======================================================
          MODALE BILANCIAMENTO
      ====================================================== */}

      <Modal
        isOpen={
          isBalanceModalOpen
        }
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
                <i className="bi bi-robot"></i>
              </div>

              <div>
                <h3>
                  Gestione e
                  Candidati Task
                </h3>

                <p>
                  Individua i
                  task critici e
                  i membri
                  disponibili.
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
                value={
                  balanceRole
                }
                onChange={(
                  event
                ) =>
                  setBalanceRole(
                    event.target
                      .value
                  )
                }
              >
                {ruoliDisponibili.map(
                  (
                    role,
                    index
                  ) => (
                    <option
                      key={
                        index
                      }
                      value={
                        role
                      }
                    >
                      {role ===
                      "Tutti"
                        ? "Tutti i ruoli"
                        : role}
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
                value={
                  balanceScope
                }
                onChange={(
                  event
                ) =>
                  setBalanceScope(
                    event.target
                      .value
                  )
                }
              >
                <option value="scaduti">
                  Solo task già
                  scaduti
                </option>

                <option value="in_scadenza">
                  Task in
                  scadenza (3
                  giorni)
                </option>

                <option value="tutti">
                  Tutti i task
                  aperti
                </option>
              </select>
            </div>
          </div>

          <div className="task-balance-title">
            Task filtrati e
            membri candidati (
            {
              modalTaskList.length
            }
            )
          </div>

          {modalTaskList.length ===
          0 ? (
            <div className="task-balance-empty">
              Nessun task
              risponde ai filtri
              selezionati.
            </div>
          ) : (
            <div className="task-balance-list">
              {modalTaskList.map(
                ({
                  task,
                  candidate,
                }) => (
                  <div
                    key={
                      task.id
                    }
                    className="task-balance-item"
                  >
                    <div>
                      <strong>
                        {
                          task.titolo
                        }
                      </strong>

                      <span>
                        <i className="bi bi-calendar-event"></i>
                        Scadenza:{" "}
                        {formatDate(
                          task.scadenza
                        )}
                      </span>
                    </div>

                    <div className="task-balance-candidate">
                      <div>
                        <small>
                          Candidato
                          ottimale
                        </small>

                        {candidate ? (
                          <span className="task-candidate-badge">
                            <i className="bi bi-person-fill"></i>

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
                            Nessuno
                            disponibile
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

      {/* ======================================================
          MODALE CREAZIONE / MODIFICA
      ====================================================== */}

      <Modal
        isOpen={
          isModalOpen
        }
        onClose={() => {
          clearPendingFiles();
          setIsModalOpen(
            false
          );
          setSelectedTask(
            null
          );
          setNoteList([]);
          setAllegatiList([]);
          setNuovaNota("");
        }}
      >
        <div className="task-modal">
          <div className="task-modal-header">
            <div className="task-modal-heading">
              <div className="task-modal-icon">
                <i className="bi bi-list-check"></i>
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
            onSubmit={
              handleSaveTask
            }
            className="task-create-form"
          >
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

            <div className="task-form-group">
              <label>
                Progetto di
                riferimento
              </label>

              <input
                type="text"
                value={
                  nomeProgetto ||
                  "Progetto corrente"
                }
                disabled
              />

              <input
                type="hidden"
                name="progetto_id"
                value={
                  formData.progetto_id
                }
                readOnly
              />
            </div>

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

            <div className="task-form-group">
              <label>
                Assegna a membri del
                team
              </label>

              <div className="task-members-box">
                {utenti.length ===
                0 ? (
                  <span className="task-empty-inline">
                    Nessun membro
                    trovato
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
                          ></i>

                          <span>
                            {
                              member.nome
                            }{" "}
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
                        index
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
                                ></i>
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
                              className="task-file-remove"
                              onClick={() =>
                                removePendingFile(
                                  index
                                )
                              }
                              title="Rimuovi file"
                              aria-label={`Rimuovi ${file.name}`}
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <span className="task-empty-inline">
                    Nessun file
                    selezionato.
                  </span>
                )}

                <label className="task-upload-button">
                  <i className="bi bi-cloud-arrow-up"></i>

                  Seleziona file o
                  immagini

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

            <div className="task-modal-actions">
              <button
                type="button"
                className="task-page-button danger"
                onClick={() => {
                  clearPendingFiles();

                  setIsModalOpen(
                    false
                  );

                  setSelectedTask(
                    null
                  );

                  setNoteList([]);
                  setAllegatiList(
                    []
                  );

                  setNuovaNota(
                    ""
                  );
                }}
              >
                Annulla
              </button>

              <button
                type="submit"
                className="task-page-button primary"
              >
                <i className="bi bi-check2"></i>

                {selectedTask
                  ? "Salva Modifiche"
                  : "Crea Task"}
              </button>
            </div>
          </form>

          {selectedTask && (
            <>
              <div className="task-detail-section">
                <span>
                  Allegati (Doc /
                  Immagini)
                </span>

                <div className="task-files">
                  {allegatiList.map(
                    (file) => {
                      const isImage =
                        isUploadedImage(
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
                              ></i>
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

                          <i className="bi bi-box-arrow-up-right task-file-open-icon"></i>
                        </a>
                      );
                    }
                  )}

                  {allegatiList.length ===
                    0 && (
                    <small>
                      Nessun file
                      allegato.
                    </small>
                  )}
                </div>

                <label className="task-upload-button">
                  <i className="bi bi-upload"></i>

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
                              ? `${nota.profili.nome || ""} ${
                                  nota.profili.cognome ||
                                  ""
                                }`.trim()
                              : "Utente"}
                          </strong>

                          <small>
                            {nota.created_at
                              ? new Date(
                                  nota.created_at
                                ).toLocaleString(
                                  "it-IT"
                                )
                              : ""}
                          </small>
                        </div>

                        <p>
                          {
                            nota.testo
                          }
                        </p>
                      </div>
                    )
                  )}

                  {noteList.length ===
                    0 && (
                    <small>
                      Nessuna nota
                      presente.
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
                    onChange={(
                      event
                    ) =>
                      setNuovaNota(
                        event.target
                          .value
                      )
                    }
                  />

                  <button type="submit">
                    Invia
                  </button>
                </form>
              </div>

              <div className="task-modal-actions between">
                {isAdmin ? (
                  <button
                    type="button"
                    className="task-page-button danger"
                    onClick={() =>
                      handleDeleteTask(
                        selectedTask.id
                      )
                    }
                  >
                    <i className="bi bi-trash"></i>
                    Elimina Task
                  </button>
                ) : (
                  <span></span>
                )}

                <button
                  type="button"
                  className="task-page-button secondary"
                  onClick={() => {
                    clearPendingFiles();

                    setIsModalOpen(
                      false
                    );

                    setSelectedTask(
                      null
                    );
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

export default ProgettoDettaglio;