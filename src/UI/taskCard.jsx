import "../App.css";
import "./taskCard.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";

import Modal from "./Modal";

import React, {
  useState,
  useEffect,
} from "react";

import Dropdown from "react-bootstrap/Dropdown";

import { supabase } from "../supabaseClient";

// ============================================================
// THUMBNAIL ALLEGATO
// ============================================================

function AttachmentThumbnail({ file }) {
  const [previewUrl, setPreviewUrl] =
    useState(null);

  useEffect(() => {
    if (!file?.type?.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);

    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={file.name}
        className="task-file-thumbnail"
      />
    );
  }

  let iconClass = "bi-file-earmark";

  if (
    file?.type ===
    "application/pdf"
  ) {
    iconClass =
      "bi-file-earmark-pdf";
  } else if (
    file?.type?.includes("word") ||
    file?.name
      ?.toLowerCase()
      .endsWith(".doc") ||
    file?.name
      ?.toLowerCase()
      .endsWith(".docx")
  ) {
    iconClass =
      "bi-file-earmark-word";
  } else if (
    file?.type?.includes("excel") ||
    file?.type?.includes(
      "spreadsheet"
    ) ||
    file?.name
      ?.toLowerCase()
      .endsWith(".xls") ||
    file?.name
      ?.toLowerCase()
      .endsWith(".xlsx")
  ) {
    iconClass =
      "bi-file-earmark-excel";
  }

  return (
    <div className="task-file-icon">
      <i
        className={`bi ${iconClass}`}
      />
    </div>
  );
}

// ============================================================
// TASK CARD
// ============================================================

function TaskCard({
  openCreateTask = false,
  onCreateTaskOpened,
  hideCard = false,
}) {
  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [utenti, setUtenti] =
    useState([]);

  const [progetti, setProgetti] =
    useState([]);

  const [selectedProfili, setSelectedProfili] =
    useState([]);

  const [pendingFiles, setPendingFiles] =
    useState([]);

  const [currentProfileId, setCurrentProfileId] =
    useState(null);

  const [formData, setFormData] =
    useState({
      titolo: "",
      priorita: "Media",
      scadenza: "",
      progetto_id: "",
      descrizione: "",
    });

  const [selectedProjectLabel, setSelectedProjectLabel] =
    useState("Seleziona progetto");

  // ============================================================
  // APERTURA MODALE DA ESTERNO
  // ============================================================

  useEffect(() => {
    if (!openCreateTask) {
      return;
    }

    resetForm();
    setIsModalOpen(true);

    if (onCreateTaskOpened) {
      onCreateTaskOpened();
    }
  }, [
    openCreateTask,
    onCreateTaskOpened,
  ]);

  // ============================================================
  // CARICAMENTO DATI
  // ============================================================

  useEffect(() => {
    async function loadInitialData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentProfileId(user.id);
      }

      const {
        data: progettiData,
        error: projErr,
      } = await supabase
        .from("progetti")
        .select("id, nome");

      if (projErr) {
        console.error(
          "Errore Progetti:",
          projErr
        );
      } else if (progettiData) {
        setProgetti(progettiData);
      }

      const {
        data: utentiData,
        error: userErr,
      } = await supabase
        .from("profili")
        .select(
          "id, nome, cognome, ruolo"
        );

      if (userErr) {
        console.error(
          "Errore Profili:",
          userErr
        );
      } else if (utentiData) {
        setUtenti(utentiData);
      }
    }

    if (isModalOpen) {
      loadInitialData();
    }
  }, [isModalOpen]);

  // ============================================================
  // INPUT
  // ============================================================

  const handleInputChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ============================================================
  // SELEZIONE PROFILO
  // ============================================================

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

  // ============================================================
  // FILE
  // ============================================================

  const handlePendingFileSelect = (
    e
  ) => {
    const files = Array.from(
      e.target.files || []
    );

    if (files.length > 0) {
      setPendingFiles((prev) => [
        ...prev,
        ...files,
      ]);
    }

    e.target.value = null;
  };

  const removePendingFile = (
    indexToRemove
  ) => {
    setPendingFiles((prev) =>
      prev.filter(
        (_, idx) =>
          idx !== indexToRemove
      )
    );
  };

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async (e) => {
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
        formData.descrizione,

      scadenza:
        formData.scadenza || null,

      priorita:
        formData.priorita,

      progetto_id:
        formData.progetto_id ||
        null,

      stato: "todo",
    };

    if (currentProfileId) {
      payload.creato_da =
        currentProfileId;
    }

    // ========================================================
    // CREA TASK
    // ========================================================

    const {
      data: newTask,
      error: taskError,
    } = await supabase
      .from("task")
      .insert([payload])
      .select()
      .single();

    if (taskError) {
      console.error(
        "Errore nel salvataggio del task:",
        taskError
      );

      alert(
        `Errore: ${taskError.message}`
      );

      return;
    }

    const targetTaskId =
      newTask.id;

    // ========================================================
    // ASSEGNA MEMBRI
    // ========================================================

    if (
      selectedProfili.length > 0
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
        error: relError,
      } = await supabase
        .from("task_profili")
        .insert(
          assegnazioni
        );

      if (relError) {
        console.error(
          "Errore nell'assegnazione dei membri:",
          relError
        );
      }

      // ======================================================
      // NOTIFICHE
      // ======================================================

      const notificheDaCreare =
        selectedProfili.map(
          (profiloId) => ({
            user_id:
              profiloId,

            titolo:
              "Nuovo task assegnato",

            messaggio:
              `Ti è stato assegnato il task "${formData.titolo}".`,

            letta: false,
          })
        );

      await supabase
        .from("notifiche")
        .insert(
          notificheDaCreare
        );
    }

    // ========================================================
    // UPLOAD ALLEGATI
    // ========================================================

    if (
      pendingFiles.length > 0
    ) {
      for (const file of pendingFiles) {
        try {
          const fileExt =
            file.name
              .split(".")
              .pop();

          const fileName =
            `${Math.random()
              .toString(36)
              .substring(
                2
              )}_${Date.now()}.${fileExt}`;

          const filePath =
            `${targetTaskId}/${fileName}`;

          const {
            error: uploadError,
          } = await supabase.storage
            .from(
              "task-attachments"
            )
            .upload(
              filePath,
              file
            );

          if (!uploadError) {
            const {
              data: publicUrlData,
            } = supabase.storage
              .from(
                "task-attachments"
              )
              .getPublicUrl(
                filePath
              );

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
          }
        } catch (err) {
          console.error(
            "Errore caricamento file in sospeso:",
            err
          );
        }
      }
    }

    // ========================================================
    // CHIUSURA
    // ========================================================

    setIsModalOpen(false);

    resetForm();

    alert(
      "Task creato con successo!"
    );
  };

  // ============================================================
  // RESET
  // ============================================================

  const resetForm = () => {
    setFormData({
      titolo: "",
      priorita: "Media",
      scadenza: "",
      progetto_id: "",
      descrizione: "",
    });

    setSelectedProfili([]);

    setPendingFiles([]);

    setSelectedProjectLabel(
      "Seleziona progetto"
    );
  };

  // ============================================================
  // MODAL
  // ============================================================

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      {/* ======================================================
          CARD
          
          Viene mostrata solo quando hideCard è false.
          Quando TaskCard viene utilizzato dall'App per il
          pulsante "Nuovo Task", hideCard è true.
          ====================================================== */}

      {!hideCard && (
        <div className="task-card-home-container">

          <div className="task-card-header">
            <div className="task-card-icon">
              <i className="bi bi-list-check" />
            </div>

            <div className="task-card-heading">
              <h2 className="taskcardTitle">
                Assegna Task
              </h2>

              <p>
                Crea e assegna task ai membri
                del team
              </p>
            </div>
          </div>

          <div className="task-card-content">

            <div className="task-card-description">
              <i className="bi bi-kanban" />

              <span>
                Crea un nuovo task, assegna i
                membri responsabili e collega
                eventuali allegati.
              </span>
            </div>

            <button
              type="button"
              className="add-new-task"
              onClick={openModal}
            >
              <i className="bi bi-plus" />

              <span>
                Crea e assegna
              </span>
            </button>

          </div>
        </div>
      )}

      {/* ======================================================
          MODALE
          ====================================================== */}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
      >
        <div className="task-modal">

          {/* ==================================================
              HEADER
              ================================================== */}

          <div className="task-modal-header">

            <div className="task-modal-heading">

              <div className="task-modal-icon">
                <i className="bi bi-list-check" />
              </div>

              <div>
                <h3>
                  Nuovo Task
                </h3>

                <p>
                  Crea un'attività e
                  assegnala ai membri del
                  team.
                </p>
              </div>

            </div>

          </div>

          {/* ==================================================
              FORM
              ================================================== */}

          <form
            onSubmit={handleSubmit}
            className="task-form"
          >

            {/* =================================================
                TITOLO
                ================================================= */}

            <div className="task-form-section">

              <label
                htmlFor="task-titolo"
                className="task-form-label"
              >
                Titolo
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
                className="task-form-input"
                placeholder="Inserisci il titolo del task"
                required
              />

            </div>

            {/* =================================================
                PRIORITÀ + SCADENZA
                ================================================= */}

            <div className="task-form-grid">

              <div className="task-form-section">

                <label
                  htmlFor="task-priorita"
                  className="task-form-label"
                >
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
                  className="task-form-input"
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

              <div className="task-form-section">

                <label
                  htmlFor="task-scadenza"
                  className="task-form-label"
                >
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
                  className="task-form-input"
                />

              </div>

            </div>

            {/* =================================================
                PROGETTO
                ================================================= */}

            <div className="task-form-section">

              <label className="task-form-label">
                Progetto
              </label>

              <Dropdown className="task-project-dropdown">

                <Dropdown.Toggle
                  id="dropdown-progetti"
                  className="task-project-toggle"
                >
                  <span>
                    {
                      selectedProjectLabel
                    }
                  </span>
                </Dropdown.Toggle>

                <Dropdown.Menu className="task-project-menu">

                  {progetti.length === 0 ? (
                    <Dropdown.Item disabled>
                      Nessun progetto trovato
                    </Dropdown.Item>
                  ) : (
                    progetti.map(
                      (proj) => (
                        <Dropdown.Item
                          key={proj.id}
                          onClick={() => {
                            setFormData(
                              (prev) => ({
                                ...prev,
                                progetto_id:
                                  proj.id,
                              })
                            );

                            setSelectedProjectLabel(
                              proj.nome
                            );
                          }}
                        >
                          {proj.nome}
                        </Dropdown.Item>
                      )
                    )
                  )}

                </Dropdown.Menu>

              </Dropdown>

            </div>

            {/* =================================================
                MEMBRI
                ================================================= */}

            <div className="task-form-section">

              <label className="task-form-label">
                Assegna a
              </label>

              <p className="task-form-help">
                Seleziona uno o più membri
                del team
              </p>

              <div className="task-members-box">

                {utenti.length === 0 ? (

                  <div className="task-members-empty">

                    <i className="bi bi-people" />

                    <span>
                      Nessun membro del
                      team trovato
                    </span>

                  </div>

                ) : (

                  <div className="task-members-grid">

                    {utenti.map(
                      (member) => {

                        const isSelected =
                          selectedProfili.includes(
                            member.id
                          );

                        return (
                          <button
                            key={member.id}
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

                            <span className="task-member-icon">

                              <i
                                className={
                                  isSelected
                                    ? "bi bi-check-circle-fill"
                                    : "bi bi-plus-circle"
                                }
                              />

                            </span>

                            <span className="task-member-info">

                              <strong>
                                {
                                  member.nome
                                }{" "}
                                {
                                  member.cognome
                                }
                              </strong>

                              {member.ruolo && (
                                <small>
                                  {
                                    member.ruolo
                                  }
                                </small>
                              )}

                            </span>

                          </button>
                        );
                      }
                    )}

                  </div>

                )}

              </div>

            </div>

            {/* =================================================
                DESCRIZIONE
                ================================================= */}

            <div className="task-form-section">

              <label
                htmlFor="task-descrizione"
                className="task-form-label"
              >
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
                className="task-form-textarea"
                placeholder="Inserisci una descrizione..."
                rows={4}
              />

            </div>

            {/* =================================================
                ALLEGATI
                ================================================= */}

            <div className="task-form-section">

              <label className="task-form-label">
                Allegati
              </label>

              <p className="task-form-help">
                Documenti e immagini
              </p>

              <div className="task-attachments">

                {pendingFiles.length > 0 && (

                  <div className="task-files-list">

                    {pendingFiles.map(
                      (file, idx) => (

                        <div
                          className="task-file"
                          key={`${file.name}-${file.lastModified}-${idx}`}
                        >

                          <AttachmentThumbnail
                            file={file}
                          />

                          <div className="task-file-info">

                            <span
                              className="task-file-name"
                              title={file.name}
                            >
                              {file.name}
                            </span>

                            <small className="task-file-type">

                              {file.type?.startsWith(
                                "image/"
                              )
                                ? "Immagine"
                                : file.type ===
                                    "application/pdf"
                                  ? "PDF"
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
                            className="task-file-remove"
                            title="Rimuovi file"
                          >
                            <i className="bi bi-x" />
                          </button>

                        </div>

                      )
                    )}

                  </div>
                )}

                {pendingFiles.length === 0 && (
                  <div className="task-files-empty">
                    Nessun file selezionato.
                  </div>
                )}

                <label className="task-upload-button">

                  <i className="bi bi-cloud-arrow-up" />

                  <span>
                    Seleziona file
                  </span>

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

            {/* =================================================
                AZIONI
                ================================================= */}

            <div className="task-modal-actions">

              <button
                type="button"
                className="task-button secondary"
                onClick={closeModal}
              >
                Annulla
              </button>

              <button
                type="submit"
                className="task-button primary"
              >
                <i className="bi bi-check2" />

                <span>
                  Crea Task
                </span>
              </button>

            </div>

          </form>

        </div>
      </Modal>
    </>
  );
}

export default TaskCard;