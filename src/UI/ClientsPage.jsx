import React, { useEffect, useMemo, useState } from "react";

import { supabase } from "../supabaseClient";

import "../App.css";
import "./TaskPage.css";

import "bootstrap-icons/font/bootstrap-icons.min.css";

import Modal from "./Modal";

function ClientsPage() {
  const [clienti, setClienti] = useState([]);
  const [progetti, setProgetti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefono: "",
    azienda: "",
  });

  // Modale conferma eliminazione
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clienteDaEliminare, setClienteDaEliminare] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCurrentUserRole = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setCurrentUserRole("");
        return;
      }

      const { data, error } = await supabase
        .from("profili")
        .select("ruolo")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setCurrentUserRole(data?.ruolo || "");
    } catch (error) {
      console.error("Errore recupero ruolo:", error);
      setCurrentUserRole("");
    }
  };

  const fetchClienti = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const { data: clientiData, error: clientiError } = await supabase
        .from("clienti")
        .select("id, nome, azienda, telefono, email")
        .order("nome", { ascending: true });

      if (clientiError) throw clientiError;

      const { data: progettiData, error: progettiError } = await supabase
        .from("progetti")
        .select("id, nome, cliente_id")
        .order("nome", { ascending: true });

      if (progettiError) throw progettiError;

      setClienti(clientiData || []);
      setProgetti(progettiData || []);
    } catch (error) {
      console.error("Errore caricamento clienti:", error);

      setErrorMessage(
        error?.message ||
          "Si è verificato un errore durante il caricamento.",
      );

      setClienti([]);
      setProgetti([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUserRole();
    fetchClienti();
  }, []);

  const isAdmin = currentUserRole?.trim().toLowerCase() === "admin";

  /*
   * Raggruppa i progetti per cliente.
   */
  const progettiPerCliente = useMemo(() => {
    return progetti.reduce((acc, progetto) => {
      const clienteId = progetto.cliente_id;

      if (!clienteId) {
        return acc;
      }

      if (!acc[clienteId]) {
        acc[clienteId] = [];
      }

      acc[clienteId].push(progetto);

      return acc;
    }, {});
  }, [progetti]);

  /*
   * Ricerca clienti anche per nome progetto.
   */
  const clientiFiltrati = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return clienti;
    }

    return clienti.filter((cliente) => {
      const progettiCliente = progettiPerCliente[cliente.id] || [];

      const nomiProgetti = progettiCliente
        .map((progetto) => progetto.nome || "")
        .join(" ");

      return (
        (cliente.nome || "").toLowerCase().includes(term) ||
        (cliente.azienda || "").toLowerCase().includes(term) ||
        (cliente.email || "").toLowerCase().includes(term) ||
        (cliente.telefono || "").toLowerCase().includes(term) ||
        nomiProgetti.toLowerCase().includes(term)
      );
    });
  }, [clienti, progettiPerCliente, searchTerm]);

  const totaleClienti = clienti.length;

  const clientiConAzienda = clienti.filter((cliente) =>
    cliente.azienda?.trim(),
  ).length;

  const clientiConEmail = clienti.filter((cliente) =>
    cliente.email?.trim(),
  ).length;

  const openCreateModal = () => {
    setEditingId(null);

    setFormData({
      nome: "",
      email: "",
      telefono: "",
      azienda: "",
    });

    setIsModalOpen(true);
  };

  const openEditModal = (cliente) => {
    setEditingId(cliente.id);

    setFormData({
      nome: cliente.nome || "",
      email: cliente.email || "",
      telefono: cliente.telefono || "",
      azienda: cliente.azienda || "",
    });

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);

    setFormData({
      nome: "",
      email: "",
      telefono: "",
      azienda: "",
    });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setErrorMessage("");

      const payload = {
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        telefono: formData.telefono.trim(),
        azienda: formData.azienda.trim(),
      };

      if (!payload.nome) {
        setErrorMessage("Il nome del cliente è obbligatorio.");
        return;
      }

      if (editingId) {
        const { error } = await supabase
          .from("clienti")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("clienti")
          .insert([payload]);

        if (error) throw error;
      }

      closeModal();

      await fetchClienti();
    } catch (error) {
      console.error("Errore salvataggio cliente:", error);

      setErrorMessage(
        error?.message ||
          "Si è verificato un errore durante il salvataggio del cliente.",
      );
    }
  };

  /*
   * Apre il modale di conferma eliminazione.
   */
  const openDeleteModal = (cliente) => {
    setClienteDaEliminare(cliente);
    setIsDeleteModalOpen(true);
  };

  /*
   * Chiude il modale di conferma.
   */
  const closeDeleteModal = () => {
    if (isDeleting) {
      return;
    }

    setIsDeleteModalOpen(false);
    setClienteDaEliminare(null);
  };

  /*
   * Elimina definitivamente il cliente.
   */
  const handleDelete = async () => {
    if (!clienteDaEliminare) {
      return;
    }

    try {
      setIsDeleting(true);
      setErrorMessage("");

      /*
       * Elimina prima i progetti collegati al cliente.
       *
       * Se hai ON DELETE CASCADE sulla foreign key
       * progetti.cliente_id, questa parte può essere rimossa.
       */
      const { error: progettiError } = await supabase
        .from("progetti")
        .delete()
        .eq("cliente_id", clienteDaEliminare.id);

      if (progettiError) {
        throw progettiError;
      }

      const { error: clienteError } = await supabase
        .from("clienti")
        .delete()
        .eq("id", clienteDaEliminare.id);

      if (clienteError) {
        throw clienteError;
      }

      setIsDeleteModalOpen(false);
      setClienteDaEliminare(null);

      await fetchClienti();
    } catch (error) {
      console.error("Errore eliminazione cliente:", error);

      setErrorMessage(
        error?.message ||
          "Si è verificato un errore durante l'eliminazione del cliente.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="task-page">
      {/* HEADER */}
      <div className="task-page-header">
        <div>
          <div className="task-page-title-row">
            <h1 className="task-page-heading">Clienti</h1>

            <span className="task-company-badge">
              {totaleClienti}{" "}
              {totaleClienti === 1 ? "cliente" : "clienti"}
            </span>
          </div>

          <p>
            Gestisci anagrafiche, aziende, contatti e progetti dei clienti.
          </p>
        </div>

        <div className="task-page-actions">
          {isAdmin && (
            <button
              type="button"
              className="task-page-button primary"
              onClick={openCreateModal}
            >
              <i className="bi bi-plus-lg" />
              Nuovo Cliente
            </button>
          )}

          <button
            type="button"
            className="task-page-button secondary"
            onClick={fetchClienti}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise" />
            Aggiorna
          </button>
        </div>
      </div>

      {/* ERRORE */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            marginBottom: "20px",
            padding: "14px 16px",
            border: "1px solid #f5c2c7",
            borderRadius: "10px",
            background: "#f8d7da",
            color: "#842029",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <i className="bi bi-exclamation-triangle-fill" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* METRICHE */}
      <div className="clients-metrics-grid">
        <div className="clients-metric-card">
          <div className="clients-metric-icon">
            <i className="bi bi-people" />
          </div>

          <div className="clients-metric-content">
            <div className="clients-metric-value">{totaleClienti}</div>
            <div className="clients-metric-label">Totale clienti</div>
          </div>
        </div>

        <div className="clients-metric-card">
          <div className="clients-metric-icon">
            <i className="bi bi-building" />
          </div>

          <div className="clients-metric-content">
            <div className="clients-metric-value">
              {clientiConAzienda}
            </div>
            <div className="clients-metric-label">Con azienda</div>
          </div>
        </div>

        <div className="clients-metric-card">
          <div className="clients-metric-icon">
            <i className="bi bi-envelope" />
          </div>

          <div className="clients-metric-content">
            <div className="clients-metric-value">{clientiConEmail}</div>
            <div className="clients-metric-label">Con email</div>
          </div>
        </div>

        <div className="clients-metric-card">
          <div className="clients-metric-icon">
            <i className="bi bi-kanban" />
          </div>

          <div className="clients-metric-content">
            <div className="clients-metric-value">{progetti.length}</div>
            <div className="clients-metric-label">Progetti totali</div>
          </div>
        </div>
      </div>

      {/* RICERCA */}
      <div className="task-search">
        <i className="bi bi-search" />

        <input
          type="text"
          placeholder="Cerca cliente, azienda, email, telefono o progetto..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      {/* CONTENUTO */}
      {loading ? (
        <div className="task-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">
              Caricamento clienti...
            </span>
          </div>
        </div>
      ) : clientiFiltrati.length === 0 ? (
        <div className="task-empty">
          <i className="bi bi-people" />

          <h3>Nessun cliente trovato</h3>

          <p>
            {searchTerm
              ? "Nessun cliente corrisponde ai criteri di ricerca."
              : "Non sono ancora presenti clienti."}
          </p>
        </div>
      ) : (
        <div
          className="task-table-wrapper"
          style={{
            overflowX: "auto",
            width: "100%",
          }}
        >
          <table
            className="task-table"
            style={{
              width: "100%",
              minWidth: "1350px",
              tableLayout: "auto",
            }}
          >
            <thead>
              <tr>
                <th style={{ minWidth: "220px" }}>Nome</th>
                <th style={{ minWidth: "200px" }}>Azienda</th>
                <th style={{ minWidth: "280px" }}>Email</th>
                <th style={{ minWidth: "180px" }}>Telefono</th>
                <th style={{ minWidth: "350px" }}>Progetti</th>
                <th style={{ minWidth: "220px" }}>Azioni</th>
              </tr>
            </thead>

            <tbody>
              {clientiFiltrati.map((cliente) => {
                const progettiCliente =
                  progettiPerCliente[cliente.id] || [];

                return (
                  <tr key={cliente.id}>
                    {/* NOME */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          className="task-metric-icon"
                          style={{
                            width: "38px",
                            height: "38px",
                            minWidth: "38px",
                          }}
                        >
                          <i className="bi bi-person" />
                        </div>

                        <div>
                          <strong>{cliente.nome || "—"}</strong>

                          <div
                            style={{
                              fontSize: "12px",
                              color: "#6c757d",
                            }}
                          >
                            Cliente
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* AZIENDA */}
                    <td>
                      {cliente.azienda ? (
                        <div className="task-project">
                          <i className="bi bi-building" />

                          <span
                            style={{
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {cliente.azienda}
                          </span>
                        </div>
                      ) : (
                        <span className="task-no-project">
                          Nessuna azienda
                        </span>
                      )}
                    </td>

                    {/* EMAIL */}
                    <td>
                      {cliente.email ? (
                        <a
                          href={`mailto:${cliente.email}`}
                          className="task-assignee"
                          style={{
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                          }}
                        >
                          <i className="bi bi-envelope" />
                          <span>{cliente.email}</span>
                        </a>
                      ) : (
                        <span className="task-no-assignee">
                          Nessuna email
                        </span>
                      )}
                    </td>

                    {/* TELEFONO */}
                    <td>
                      {cliente.telefono ? (
                        <a
                          href={`tel:${cliente.telefono}`}
                          className="task-assignee"
                          style={{
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                          }}
                        >
                          <i className="bi bi-telephone" />
                          <span>{cliente.telefono}</span>
                        </a>
                      ) : (
                        <span className="task-no-assignee">
                          Nessun telefono
                        </span>
                      )}
                    </td>

                    {/* PROGETTI */}
                    <td>
                      {progettiCliente.length > 0 ? (
                        <div className="client-projects-list">
                          {progettiCliente.map((progetto) => (
                            <div
                              key={progetto.id}
                              className="client-project-badge"
                            >
                              <i className="bi bi-kanban" />

                              <span>
                                {progetto.nome ||
                                  "Progetto senza nome"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="task-no-project">
                          Nessun progetto
                        </span>
                      )}
                    </td>

                    {/* AZIONI */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        {isAdmin ? (
                          <>
                            <button
                              type="button"
                              className="task-page-button secondary"
                              onClick={() => openEditModal(cliente)}
                            >
                              <i className="bi bi-pencil" />
                              Modifica
                            </button>

                            <button
                              type="button"
                              className="task-page-button danger"
                              onClick={() => openDeleteModal(cliente)}
                            >
                              <i className="bi bi-trash" />
                              Elimina
                            </button>
                          </>
                        ) : (
                          <span className="task-no-assignee">
                            Sola lettura
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODALE CLIENTE */}
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <div className="task-modal">
          <div className="task-modal-header">
            <div className="task-modal-heading">
              <div className="task-modal-icon">
                <i
                  className={
                    editingId
                      ? "bi bi-pencil-square"
                      : "bi bi-person-plus"
                  }
                />
              </div>

              <div>
                <h2>
                  {editingId ? "Modifica cliente" : "Nuovo cliente"}
                </h2>

                <p>
                  {editingId
                    ? "Modifica i dati del cliente."
                    : "Inserisci i dati del nuovo cliente."}
                </p>
              </div>
            </div>
          </div>

          <form
            className="task-create-form"
            onSubmit={handleSubmit}
          >
            <div className="task-form-grid">
              {/* NOME */}
              <div className="task-form-group">
                <label htmlFor="nome">Nome</label>

                <input
                  id="nome"
                  name="nome"
                  type="text"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Nome cliente"
                  required
                />
              </div>

              {/* AZIENDA */}
              <div className="task-form-group">
                <label htmlFor="azienda">Azienda</label>

                <input
                  id="azienda"
                  name="azienda"
                  type="text"
                  value={formData.azienda}
                  onChange={handleInputChange}
                  placeholder="Azienda"
                />
              </div>

              {/* EMAIL */}
              <div className="task-form-group">
                <label htmlFor="email">Email</label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@esempio.it"
                />
              </div>

              {/* TELEFONO */}
              <div className="task-form-group">
                <label htmlFor="telefono">Telefono</label>

                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  placeholder="+39 ..."
                />
              </div>
            </div>

            <div className="task-modal-actions">
              <button
                type="button"
                className="task-page-button secondary"
                onClick={closeModal}
              >
                Annulla
              </button>

              <button
                type="submit"
                className="task-page-button primary"
              >
                <i
                  className={
                    editingId
                      ? "bi bi-check-lg"
                      : "bi bi-plus-lg"
                  }
                />

                {editingId ? "Salva modifiche" : "Crea cliente"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* MODALE CONFERMA ELIMINAZIONE */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
      >
        <div className="task-modal client-delete-modal">
          <div className="task-modal-header">
            <div className="task-modal-heading">
              <div
                className="task-modal-icon client-delete-icon"
              >
                <i className="bi bi-trash3" />
              </div>

              <div>
                <h2>Elimina cliente</h2>

                <p>
                  Questa operazione non può essere annullata.
                </p>
              </div>
            </div>
          </div>

          <div className="client-delete-content">
            <p>
              Sei sicuro di voler eliminare il cliente{" "}
              <strong>
                "{clienteDaEliminare?.nome || "questo cliente"}"
              </strong>
              ?
            </p>

            <div className="client-delete-warning">
              <i className="bi bi-exclamation-triangle-fill" />

              <span>
                Verranno eliminati anche tutti i progetti
                collegati a questo cliente.
              </span>
            </div>
          </div>

          <div className="task-modal-actions">
            <button
              type="button"
              className="task-page-button secondary"
              onClick={closeDeleteModal}
              disabled={isDeleting}
            >
              Annulla
            </button>

            <button
              type="button"
              className="task-page-button danger"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <i
                className={
                  isDeleting
                    ? "bi bi-hourglass-split"
                    : "bi bi-trash3"
                }
              />

              {isDeleting ? "Eliminazione..." : "Elimina cliente"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ClientsPage;
