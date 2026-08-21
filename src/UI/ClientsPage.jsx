import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "../App.css";
import "./taskCard.css";
import "./TaskPage.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import Modal from "./Modal";

function ClientsPage() {
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState(""); // Stato per il ruolo utente

  // Stato Modale (Creazione e Modifica)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefono: "",
    azienda: "",
  });

  // Funzione per ricavare il ruolo dell'utente corrente dalla tabella "profili"
  const fetchCurrentUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profiloData } = await supabase
        .from("profili")
        .select("ruolo")
        .eq("id", user.id)
        .single();

      if (profiloData) {
        setCurrentUserRole(profiloData.ruolo || "");
      }
    }
  };

  const fetchClienti = async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("clienti")
      .select("id, nome, azienda, telefono, email")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore Supabase nel recupero dei clienti:", error);
      setErrorMessage(error.message);
    } else if (data) {
      setClienti(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCurrentUserRole();
    fetchClienti();
  }, []);

  const isAdmin = currentUserRole?.toLowerCase() === "admin"; // Controllo permessi

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({ nome: "", email: "", telefono: "", azienda: "" });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cliente) => {
    if (!isAdmin) {
      alert("Non hai i permessi per modificare questo cliente.");
      return;
    }
    
    setEditingId(cliente.id);
    setFormData({
      nome: cliente.nome || "",
      email: cliente.email || "",
      telefono: cliente.telefono || "",
      azienda: cliente.azienda || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!formData.nome.trim()) {
      alert("Inserisci almeno il nome del cliente");
      return;
    }

    const payload = {
      nome: formData.nome.trim(),
      email: formData.email ? formData.email.trim() : null,
      telefono: formData.telefono ? formData.telefono.trim() : null,
      azienda: formData.azienda ? formData.azienda.trim() : null,
    };

    if (editingId) {
      // Blocco di sicurezza lato funzione
      if (!isAdmin) return;

      const { error } = await supabase
        .from("clienti")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        console.error("Errore durante l'aggiornamento del cliente:", error);
        alert("Si è verificato un errore durante la modifica del cliente.");
      } else {
        setIsModalOpen(false);
        fetchClienti();
      }
    } else {
      const { error } = await supabase.from("clienti").insert([payload]);

      if (error) {
        console.error("Errore durante il salvataggio del cliente:", error);
        alert("Si è verificato un errore durante la creazione del cliente.");
      } else {
        setIsModalOpen(false);
        fetchClienti();
      }
    }
  };

  const handleDelete = async (id, nome) => {
    if (!isAdmin) {
      alert("Non hai i permessi per eliminare questo cliente.");
      return;
    }

    if (!window.confirm(`Sei sicuro di voler eliminare il cliente "${nome}"?`)) {
      return;
    }

    const { error } = await supabase.from("clienti").delete().eq("id", id);

    if (error) {
      console.error("Errore durante l'eliminazione del cliente:", error);
      alert("Impossibile eliminare il cliente. Verificare che non sia associato a dei progetti.");
    } else {
      fetchClienti();
    }
  };

  const clientiFiltrati = clienti.filter((c) => {
    if (!searchTerm) return true;
    const ricerca = searchTerm.toLowerCase();

    const nome = (c.nome || "").toLowerCase();
    const azienda = (c.azienda || "").toLowerCase();
    const telefono = (c.telefono || "").toLowerCase();
    const email = (c.email || "").toLowerCase();

    return (
      nome.includes(ricerca) ||
      azienda.includes(ricerca) ||
      telefono.includes(ricerca) ||
      email.includes(ricerca)
    );
  });

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h2>Lista Clienti</h2>
        <div className="d-flex align-items-center gap-2">
          <button className="add-new-task" onClick={handleOpenCreateModal}>
            <b>
              <i className="bi bi-person-plus-fill me-1"></i> Nuovo Cliente
            </b>
          </button>
          <button className="add-new-task" onClick={fetchClienti}>
            <b>
              <i className="bi bi-arrow-clockwise me-1"></i> Aggiorna
            </b>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="alert alert-danger rounded-4 border-0 shadow-sm mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>Errore DB:</strong> {errorMessage}
        </div>
      )}

      {/* Barra di ricerca arrotondata e pulita */}
      <div className="mb-4">
        <div className="input-group search-bar-clean align-items-center">
          <span className="bg-transparent border-0 pe-2">
            <i className="bi bi-search text-muted"></i>
          </span>
          <input
            type="text"
            className="form-control bg-transparent border-0 ps-0 shadow-none"
            placeholder="Cerca cliente per nome, azienda, telefono o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento clienti...</span>
          </div>
        </div>
      ) : clientiFiltrati.length === 0 ? (
        <div className="alert alert-light rounded-4 text-muted text-center border-0 p-4">
          {searchTerm
            ? "Nessun cliente corrisponde ai criteri di ricerca."
            : "Nessun cliente registrato nel sistema."}
        </div>
      ) : (
        <div className="table-responsive shadow-sm rounded-4 border-0">
          <table className="table table-hover align-middle mb-0 bg-white">
            <thead className="table-light">
              <tr>
                <th>Nome</th>
                <th>Azienda</th>
                <th>Email</th>
                <th>Numero di Telefono</th>
                <th className="text-end">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {clientiFiltrati.map((cliente, index) => {
                const nomeMostrato = cliente.nome || "Cliente senza nome";

                return (
                  <tr key={cliente.id || index}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div
                          className="rounded-circle bg-light text-dark d-flex align-items-center justify-content-center me-2"
                          style={{ width: "36px", height: "36px", fontWeight: "600", fontSize: "0.9rem" }}
                        >
                          {(cliente.nome || "C").charAt(0).toUpperCase()}
                        </div>
                        <strong>{nomeMostrato}</strong>
                      </div>
                    </td>
                    <td>
                      {cliente.azienda ? (
                        <span className="badge bg-light text-dark border-0 rounded-pill px-3 py-2">
                          <i className="bi bi-building me-1"></i>
                          {cliente.azienda}
                        </span>
                      ) : (
                        <span className="text-muted small">-</span>
                      )}
                    </td>
                    <td>
                      {cliente.email ? (
                        <a
                          href={`mailto:${cliente.email}`}
                          className="text-decoration-none text-secondary"
                        >
                          <i className="bi bi-envelope me-1"></i>
                          {cliente.email}
                        </a>
                      ) : (
                        <span className="text-muted small">-</span>
                      )}
                    </td>
                    <td>
                      {cliente.telefono ? (
                        <a
                          href={`tel:${cliente.telefono}`}
                          className="text-decoration-none text-secondary"
                        >
                          <i className="bi bi-telephone me-2 text-muted"></i>
                          {cliente.telefono}
                        </a>
                      ) : (
                        <span className="text-muted small">-</span>
                      )}
                    </td>
                    <td className="text-end">
                      {isAdmin ? (
                        <>
                          <button
                            className="add-new-task me-2"
                            style={{ backgroundColor: "#ffc107", color: "#fff" }}
                            onClick={() => handleOpenEditModal(cliente)}
                          >
                            <b>
                              <i className="bi bi-pencil-fill me-1"></i> Modifica
                            </b>
                          </button>
                          <button
                            className="add-new-task"
                            style={{ backgroundColor: "#dc3545", color: "#fff" }}
                            onClick={() => handleDelete(cliente.id, nomeMostrato)}
                          >
                            <b>
                              <i className="bi bi-trash-fill me-1"></i> Elimina
                            </b>
                          </button>
                        </>
                      ) : (
                        <span className="text-muted small" title="Solo gli admin possono gestire i clienti">
                          <i className="bi bi-lock-fill me-1"></i> Sola lettura
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale Creazione / Modifica Cliente */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-3">
          <h3 className="modal-title mb-4">
            {editingId ? "Modifica Cliente" : "Nuovo Cliente"}
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Nome / Referente *</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Es. Mario Rossi"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Azienda</label>
              <input
                type="text"
                name="azienda"
                value={formData.azienda}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Es. Acme S.r.l."
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-control"
                placeholder="mario.rossi@azienda.it"
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Telefono</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                className="form-control"
                placeholder="+39 333 1234567"
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
                <b>{editingId ? "Salva Modifiche" : "Salva Cliente"}</b>
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

export default ClientsPage;