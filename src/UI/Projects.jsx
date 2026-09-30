import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";

import Modal from "./Modal";
import Dropdown from "react-bootstrap/Dropdown";

import "./Projects.css";

function ProgettiList({ onSelectProgetto }) {
  const [progetti, setProgetti] = useState([]);
  const [clienti, setClienti] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Utente e filtri visibilità
  const [currentProfileId, setCurrentProfileId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [projectFilter, setProjectFilter] = useState("Miei");

  const isAdmin = currentUserRole?.toLowerCase() === "admin";

  // Modale crea/modifica
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProgetto, setCurrentProgetto] = useState(null);

  const [formData, setFormData] = useState({
    nome: "",
    descrizione: "",
    stato: "in_corso",
    cliente_id: "",
  });

  const [selectedClientLabel, setSelectedClientLabel] =
    useState("Seleziona cliente");

  // Modale eliminazione
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [progettoDaEliminare, setProgettoDaEliminare] = useState(null);

  // =========================================================
  // UTENTE CORRENTE
  // =========================================================

  const fetchCurrentUserProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profiloData, error } = await supabase
      .from("profili")
      .select("id, ruolo")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Errore recupero profilo:", error);

      setCurrentProfileId(user.id);
      setCurrentUserRole("");

      return;
    }

    if (profiloData) {
      setCurrentProfileId(profiloData.id);
      setCurrentUserRole(profiloData.ruolo || "");

      if ((profiloData.ruolo || "").toLowerCase() !== "admin") {
        setProjectFilter("Miei");
      }
    } else {
      setCurrentProfileId(user.id);
    }
  };

  // =========================================================
  // CARICAMENTO PROGETTI E CLIENTI
  // =========================================================

  const fetchProgettiEClienti = async () => {
    setLoading(true);

    const { data: projData, error: projError } = await supabase
      .from("progetti")
      .select(
        `
        id,
        nome,
        descrizione,
        stato,
        cliente_id,
        clienti (
          id,
          nome,
          azienda
        ),
        task (
          id,
          stato,
          task_profili (
            profilo_id
          )
        )
      `,
      )
      .order("nome", { ascending: true });

    if (projError) {
      console.error("Errore recupero progetti:", projError);
    } else if (projData) {
      setProgetti(projData);
    }

    const { data: clientiData, error: clientiError } = await supabase
      .from("clienti")
      .select("id, nome, azienda")
      .order("nome", { ascending: true });

    if (clientiError) {
      console.error("Errore recupero clienti:", clientiError);
    } else if (clientiData) {
      setClienti(clientiData);
    }

    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      await fetchCurrentUserProfile();
      await fetchProgettiEClienti();
    };

    init();
  }, []);

  // =========================================================
  // STATO PROGETTO
  // =========================================================

  const getEffectiveStatus = (proj) => {
    const tasks = proj.task || [];

    if (tasks.length > 0) {
      const allDone = tasks.every((task) => {
        const stato = (task.stato || "").toLowerCase();

        return stato === "done" || stato === "completato";
      });

      if (allDone) {
        return "completato";
      }
    }

    return proj.stato || "in_corso";
  };

  const getProjectStatus = (status) => {
    const stato = (status || "").toLowerCase();

    switch (stato) {
      case "completato":
      case "done":
        return {
          label: "Completato",
          className: "project-status project-status-completed",
          icon: "bi-check-circle-fill",
        };

      case "in_pausa":
      case "pausa":
        return {
          label: "In pausa",
          className: "project-status project-status-paused",
          icon: "bi-pause-circle-fill",
        };

      case "in_corso":
      case "in_progress":
        return {
          label: "In corso",
          className: "project-status project-status-progress",
          icon: "bi-arrow-repeat",
        };

      default:
        return {
          label: status || "N/D",
          className: "project-status project-status-default",
          icon: "bi-circle-fill",
        };
    }
  };

  // =========================================================
  // CREA PROGETTO
  // =========================================================

  const handleOpenCreate = () => {
    setCurrentProgetto(null);

    setFormData({
      nome: "",
      descrizione: "",
      stato: "in_corso",
      cliente_id: "",
    });

    setSelectedClientLabel("Seleziona cliente");
    setIsModalOpen(true);
  };

  // =========================================================
  // MODIFICA PROGETTO
  // =========================================================

  const handleOpenEdit = (proj) => {
    setCurrentProgetto(proj);

    setFormData({
      nome: proj.nome || "",
      descrizione: proj.descrizione || "",
      stato: proj.stato || "in_corso",
      cliente_id: proj.cliente_id || "",
    });

    if (proj.clienti) {
      setSelectedClientLabel(
        `${proj.clienti.nome} (${proj.clienti.azienda || "Privato"})`,
      );
    } else if (proj.cliente_id) {
      const cliFound = clienti.find(
        (cliente) => cliente.id === proj.cliente_id,
      );

      if (cliFound) {
        setSelectedClientLabel(
          `${cliFound.nome} (${cliFound.azienda || "Privato"})`,
        );
      } else {
        setSelectedClientLabel("Seleziona cliente");
      }
    } else {
      setSelectedClientLabel("Seleziona cliente");
    }

    setIsModalOpen(true);
  };

  // =========================================================
  // INPUT FORM
  // =========================================================

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================================================
  // SALVA PROGETTO
  // =========================================================

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      alert("Inserisci almeno il nome del progetto");
      return;
    }

    const payload = {
      nome: formData.nome.trim(),
      descrizione: formData.descrizione,
      stato: formData.stato,
      cliente_id: formData.cliente_id || null,
    };

    if (currentProgetto) {
      const { error } = await supabase
        .from("progetti")
        .update(payload)
        .eq("id", currentProgetto.id);

      if (error) {
        console.error("Errore aggiornamento progetto:", error);
        alert("Errore durante l'aggiornamento del progetto.");
        return;
      }
    } else {
      const { error } = await supabase.from("progetti").insert([payload]);

      if (error) {
        console.error("Errore creazione progetto:", error);
        alert("Errore durante la creazione del progetto.");
        return;
      }
    }

    setIsModalOpen(false);
    setCurrentProgetto(null);

    await fetchProgettiEClienti();
  };

  // =========================================================
  // ELIMINAZIONE
  // =========================================================

  const handleOpenDelete = (proj) => {
    setProgettoDaEliminare(proj);
    setShowDeleteModal(true);
  };

  const handleCloseDelete = () => {
    setShowDeleteModal(false);
    setProgettoDaEliminare(null);
  };

  const handleConfirmDelete = async () => {
    if (!progettoDaEliminare) return;

    const { error } = await supabase
      .from("progetti")
      .delete()
      .eq("id", progettoDaEliminare.id);

    if (error) {
      console.error("Errore eliminazione progetto:", error);
      alert("Errore durante l'eliminazione del progetto.");
      return;
    }

    handleCloseDelete();

    await fetchProgettiEClienti();
  };

  // =========================================================
  // FILTRAGGIO
  // =========================================================

  const filteredProgetti = progetti.filter((project) => {
    if (!isAdmin || projectFilter === "Miei") {
      const hasMyTask = project.task?.some((task) =>
        task.task_profili?.some(
          (taskProfile) => taskProfile.profilo_id === currentProfileId,
        ),
      );

      if (!hasMyTask) {
        return false;
      }
    }

    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    const nomeProgetto = (project.nome || "").toLowerCase();
    const clienteNome = (project.clienti?.nome || "").toLowerCase();
    const clienteAzienda = (project.clienti?.azienda || "").toLowerCase();

    return (
      nomeProgetto.includes(query) ||
      clienteNome.includes(query) ||
      clienteAzienda.includes(query)
    );
  });

  const filterOptions = isAdmin ? ["Tutti", "Miei"] : ["Miei"];

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="projects-page">
      <div className="projects-page-header">
        <div>
          <div className="projects-page-eyebrow">
            <i className="bi bi-folder2-open"></i>
            Gestione
          </div>

          <h1 className="projects-page-title">
            {isAdmin && projectFilter === "Tutti"
              ? "Tutti i progetti"
              : "I miei progetti"}
          </h1>

          <p className="projects-page-subtitle">
            Gestisci progetti, clienti, stato e attività assegnate al team.
          </p>
        </div>

        <button
          type="button"
          className="projects-primary-button"
          onClick={handleOpenCreate}
        >
          <i className="bi bi-plus-lg"></i>
          Nuovo progetto
        </button>
      </div>

      <div className="projects-toolbar">
        <div className="projects-filters">
          {filterOptions.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`projects-filter-button ${
                projectFilter === filter ? "projects-filter-button-active" : ""
              }`}
              onClick={() => setProjectFilter(filter)}
            >
              {filter === "Tutti" ? "Tutti i progetti" : "I miei progetti"}
            </button>
          ))}
        </div>

        <div className="projects-search">
          <i className="bi bi-search"></i>

          <input
            type="text"
            placeholder="Cerca progetto, cliente o azienda..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              title="Cancella ricerca"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          )}
        </div>
      </div>

      <div className="projects-card">
        <div className="projects-card-header">
          <div>
            <h2>Progetti</h2>
            <span>
              {filteredProgetti.length}{" "}
              {filteredProgetti.length === 1 ? "progetto" : "progetti"}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="projects-empty-state">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Caricamento...</span>
            </div>

            <p>Caricamento progetti...</p>
          </div>
        ) : filteredProgetti.length === 0 ? (
          <div className="projects-empty-state">
            <div className="projects-empty-icon">
              <i className="bi bi-folder2-open"></i>
            </div>

            <h3>Nessun progetto trovato</h3>

            <p>
              Non ci sono progetti che corrispondono ai criteri selezionati.
            </p>

            {searchQuery && (
              <button
                type="button"
                className="projects-secondary-button"
                onClick={() => setSearchQuery("")}
              >
                Azzera ricerca
              </button>
            )}
          </div>
        ) : (
          <div className="projects-table-wrapper">
            <table className="projects-table">
              <thead>
                <tr>
                  <th>Progetto</th>
                  <th>Cliente</th>
                  <th>Attività</th>
                  <th>Stato</th>
                  <th className="projects-actions-column">Azioni</th>
                </tr>
              </thead>

              <tbody>
                {filteredProgetti.map((project) => {
                  const clienteNome = project.clienti?.nome || "Nessun cliente";

                  const clienteAzienda = project.clienti?.azienda || "";

                  const tasks = project.task || [];
                  const statoReale = getEffectiveStatus(project);
                  const status = getProjectStatus(statoReale);

                  return (
                    <tr key={project.id}>
                      <td>
                        <div className="project-name-cell">
                          <div className="project-icon">
                            <i className="bi bi-folder-fill"></i>
                          </div>

                          <div>
                            <div className="project-name">{project.nome}</div>

                            {project.descrizione && (
                              <div className="project-description">
                                {project.descrizione}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="project-client-cell">
                          <div className="project-client-icon">
                            <i className="bi bi-building"></i>
                          </div>

                          <div>
                            <div className="project-client-name">
                              {clienteNome}
                            </div>

                            {clienteAzienda && (
                              <div className="project-client-company">
                                {clienteAzienda}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="project-task-count">
                          <i className="bi bi-list-check"></i>
                          {tasks.length}
                        </span>
                      </td>

                      <td>
                        <span className={status.className}>
                          <i className={`bi ${status.icon}`}></i>
                          {status.label}
                        </span>
                      </td>

                      <td className="projects-actions-column">
                        <div className="project-actions">
                          <button
                            type="button"
                            className="project-action-button project-action-view"
                            onClick={() => {
                              if (onSelectProgetto) {
                                onSelectProgetto(`progetto-${project.id}`);
                              }
                            }}
                            title="Visualizza progetto"
                          >
                            <i className="bi bi-eye"></i>
                          </button>

                          <button
                            type="button"
                            className="project-action-button project-action-edit"
                            onClick={() => handleOpenEdit(project)}
                            title="Modifica progetto"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>

                          <button
                            type="button"
                            className="project-action-button project-action-delete"
                            onClick={() => handleOpenDelete(project)}
                            title="Elimina progetto"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================================
          MODALE CREA / MODIFICA
          ===================================================== */}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCurrentProgetto(null);
        }}
      >
        <div className="project-form">
          <div className="project-form-header">
            <div>
              <div className="project-form-icon">
                <i
                  className={`bi ${
                    currentProgetto ? "bi-pencil-square" : "bi-folder-plus"
                  }`}
                ></i>
              </div>

              <div>
                <h2>
                  {currentProgetto ? "Modifica progetto" : "Nuovo progetto"}
                </h2>

                <p>
                  {currentProgetto
                    ? "Aggiorna le informazioni del progetto."
                    : "Inserisci le informazioni del nuovo progetto."}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="project-form-close"
              onClick={() => {
                setIsModalOpen(false);
                setCurrentProgetto(null);
              }}
              title="Chiudi"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className="project-form-grid">
            <div className="project-form-field project-form-field-full">
              <label htmlFor="project-name">Nome progetto</label>

              <input
                id="project-name"
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                placeholder="Es. Restyling Sito Web"
              />
            </div>

            <div className="project-form-field">
              <label htmlFor="project-status">Stato</label>

              <select
                id="project-status"
                name="stato"
                value={formData.stato}
                onChange={handleInputChange}
              >
                <option value="in_corso">In corso</option>
                <option value="completato">Completato</option>
                <option value="in_pausa">In pausa</option>
              </select>
            </div>

            <div className="project-form-field">
              <label>Cliente</label>

              <Dropdown className="w-100">
                <Dropdown.Toggle
                  id="dropdown-clienti"
                  className="project-client-dropdown"
                >
                  <span className="project-client-dropdown-text">
                    {selectedClientLabel}
                  </span>
                </Dropdown.Toggle>

                <Dropdown.Menu className="project-client-dropdown-menu">
                  {clienti.length === 0 ? (
                    <Dropdown.Item disabled>
                      Nessun cliente trovato
                    </Dropdown.Item>
                  ) : (
                    clienti.map((cliente) => (
                      <Dropdown.Item
                        key={cliente.id}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            cliente_id: cliente.id,
                          }));

                          setSelectedClientLabel(
                            `${cliente.nome} (${cliente.azienda || "Privato"})`,
                          );
                        }}
                      >
                        <div className="project-client-option">
                          <strong>{cliente.nome}</strong>

                          {cliente.azienda && <small>{cliente.azienda}</small>}
                        </div>
                      </Dropdown.Item>
                    ))
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </div>

            <div className="project-form-field project-form-field-full">
              <label htmlFor="project-description">Descrizione</label>

              <textarea
                id="project-description"
                name="descrizione"
                value={formData.descrizione}
                onChange={handleInputChange}
                rows="5"
                placeholder="Inserisci una descrizione del progetto..."
              />
            </div>
          </div>

          <div className="task-modal-actions">
            <button
              type="button"
              className="task-page-button secondary"
              onClick={() => {
                setIsModalOpen(false);
                setCurrentProgetto(null);
              }}
            >
              Annulla
            </button>

            <button
              type="button"
              className="task-page-button primary"
              onClick={handleSubmit}
            >
              <i
                className={`bi ${
                  currentProgetto ? "bi-check-lg" : "bi-folder-plus"
                }`}
              />

              {currentProgetto ? "Salva modifiche" : "Crea progetto"}
            </button>
          </div>
        </div>
      </Modal>

      {/* =====================================================
          MODALE ELIMINAZIONE
          ===================================================== */}

      <Modal isOpen={showDeleteModal} onClose={handleCloseDelete}>
        <div className="project-delete-modal">
          <div className="project-delete-icon">
            <i className="bi bi-trash3"></i>
          </div>

          <h2>Eliminare il progetto?</h2>

          <p>
            Stai per eliminare il progetto{" "}
            <strong>{progettoDaEliminare?.nome}</strong>.
          </p>

          <span className="project-delete-warning">
            Questa operazione non può essere annullata.
          </span>

          <div className="task-modal-actions">
            <button
              type="button"
              className="task-page-button secondary"
              onClick={handleCloseDelete}
            >
              Annulla
            </button>

            <button
              type="button"
              className="task-page-button danger"
              onClick={handleConfirmDelete}
            >
              <i className="bi bi-trash3" />
              Elimina progetto
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ProgettiList;
