import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import Modal from "./Modal";
import Dropdown from "react-bootstrap/Dropdown";
import "./taskCard.css"; 
import "./ProjectCard.css";

function ProgettiList({ onSelectProgetto }) {
  const [progetti, setProgetti] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Stati per la gestione del modale Crea/Modifica
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProgetto, setCurrentProgetto] = useState(null);
  
  const [formData, setFormData] = useState({
    nome: "",
    descrizione: "",
    stato: "in_corso",
    cliente_id: "",
  });
  const [selectedClientLabel, setSelectedClientLabel] = useState("Seleziona cliente");

  // Stati per il modale di eliminazione
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [progettoDaEliminare, setProgettoDaEliminare] = useState(null);

  const fetchProgettiEClienti = async () => {
    setLoading(true);
    
    const { data: projData, error: projError } = await supabase
      .from("progetti")
      .select(`
        id,
        nome,
        descrizione,
        stato,
        cliente_id,
        clienti ( id, nome, azienda ),
        task ( stato )
      `);

    if (projError) {
      console.error("Errore recupero progetti:", projError);
    } else if (projData) {
      setProgetti(projData);
    }

    const { data: clientiData, error: clientiError } = await supabase
      .from("clienti")
      .select("id, nome, azienda");

    if (!clientiError && clientiData) {
      setClienti(clientiData);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchProgettiEClienti();
  }, []);

  const getEffectiveStatus = (proj) => {
    const tasks = proj.task || [];
    if (tasks.length > 0) {
      const allDone = tasks.every((t) => {
        const s = (t.stato || "").toLowerCase();
        return s === "done" || s === "completato";
      });
      if (allDone) return "Completato";
    }
    return proj.stato || "In Corso";
  };

  const getProjectStatusBadge = (statoReale) => {
    const s = (statoReale || "").toLowerCase();
    switch (s) {
      case "completato":
      case "done":
        return (
          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 text-uppercase">
            Completato
          </span>
        );
      case "in_progress":
      case "in_corso":
        return (
          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 text-uppercase">
            In Corso
          </span>
        );
      default:
        return (
          <span className="badge bg-secondary-subtle text-secondary border px-2 py-1 text-uppercase">
            {statoReale}
          </span>
        );
    }
  };

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

  const handleOpenEdit = (proj) => {
    setCurrentProgetto(proj);
    setFormData({
      nome: proj.nome || "",
      descrizione: proj.descrizione || "",
      stato: proj.stato || "in_corso",
      cliente_id: proj.cliente_id || "",
    });

    if (proj.clienti) {
      setSelectedClientLabel(`${proj.clienti.nome} (${proj.clienti.azienda || 'Privato'})`);
    } else if (proj.cliente_id) {
      const cliFound = clienti.find(c => c.id === proj.cliente_id);
      if (cliFound) {
        setSelectedClientLabel(`${cliFound.nome} (${cliFound.azienda || 'Privato'})`);
      } else {
        setSelectedClientLabel("Seleziona cliente");
      }
    } else {
      setSelectedClientLabel("Seleziona cliente");
    }

    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.nome) {
      alert("Inserisci almeno il nome del progetto");
      return;
    }

    const payload = {
      nome: formData.nome,
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
      }
    } else {
      const { error } = await supabase.from("progetti").insert([payload]);

      if (error) {
        console.error("Errore creazione progetto:", error);
        alert("Errore durante la creazione del progetto.");
      }
    }

    setIsModalOpen(false);
    fetchProgettiEClienti();
  };

  const handleConfirmDelete = async () => {
    if (!progettoDaEliminare) return;

    const { error } = await supabase
      .from("progetti")
      .delete()
      .eq("id", progettoDaEliminare.id);

    if (error) {
      console.error("Errore eliminazione progetto:", error);
      alert("Impossibile eliminare il progetto (potrebbero esserci task collegati).");
    } else {
      fetchProgettiEClienti();
    }

    setShowDeleteModal(false);
    setProgettoDaEliminare(null);
  };

  const filteredProgetti = progetti.filter((p) => {
    const nomeProj = (p.nome || "").toLowerCase();
    const clienteNome = (p.clienti?.nome || "").toLowerCase();
    const clienteAzienda = (p.clienti?.azienda || "").toLowerCase();
    const query = searchQuery.toLowerCase();

    return (
      nomeProj.includes(query) ||
      clienteNome.includes(query) ||
      clienteAzienda.includes(query)
    );
  });

  return (
    <div className="container pt-4 mb-5">
      <div className="card shadow-sm border-0 rounded-4 p-4 bg-white">
        
        {/* Intestazione con Titolo e Pulsante Nuovo Progetto in alto */}
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3">
          <h4 className="fw-bold mb-0">Lista Progetti</h4>
          
          <button className="add-new-task" onClick={handleOpenCreate}>
            <b>
              <i className="bi bi-folder-plus me-1"></i> Nuovo Progetto
            </b>
          </button>
        </div>

        {/* Barra di ricerca moderna posizionata sotto il titolo */}
        <div className="mb-4">
          <div className="input-group shadow-sm rounded-pill overflow-hidden border bg-light" style={{ maxWidth: "450px" }}>
            <span className="input-group-text bg-transparent border-0 ps-3">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control border-0 bg-transparent shadow-none py-2 px-2"
              placeholder="Cerca per nome progetto o azienda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="btn btn-link text-muted border-0 pe-3 text-decoration-none" 
                onClick={() => setSearchQuery("")}
                title="Cancella ricerca"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Caricamento...</span>
            </div>
          </div>
        ) : filteredProgetti.length === 0 ? (
          <div className="alert alert-light text-muted text-center py-4">
            Nessun progetto trovato con i criteri di ricerca inseriti.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Nome Progetto</th>
                  <th>Cliente / Azienda</th>
                  <th>Stato</th>
                  <th className="text-end">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredProgetti.map((proj) => {
                  const clienteStr = proj.clienti?.azienda || proj.clienti?.nome || "Nessun cliente";
                  const statoReale = getEffectiveStatus(proj);
                  
                  return (
                    <tr key={proj.id}>
                      <td className="fw-bold text-dark">{proj.nome}</td>
                      <td>
                        <i className="bi bi-building me-1 text-muted"></i>
                        {clienteStr}
                      </td>
                      <td>
                        {getProjectStatusBadge(statoReale)}
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2">
                          <button
                            className="add-new-task px-2 py-1"
                            style={{ fontSize: "0.8rem", minHeight: "auto" }}
                            onClick={() => {
                              if (onSelectProgetto) onSelectProgetto(`progetto-${proj.id}`);
                            }}
                            title="Visualizza Dettagli"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                          <button
                            className="add-new-task px-2 py-1"
                            style={{ fontSize: "0.8rem", minHeight: "auto", backgroundColor: "#ffc107", color: "#000" }}
                            onClick={() => handleOpenEdit(proj)}
                            title="Modifica Progetto"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="add-new-task px-2 py-1"
                            style={{ fontSize: "0.8rem", minHeight: "auto", backgroundColor: "#dc3545", color: "#fff" }}
                            onClick={() => {
                              setProgettoDaEliminare(proj);
                              setShowDeleteModal(true);
                            }}
                            title="Elimina Progetto"
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

      {/* MODALE CREAZIONE / MODIFICA PROGETTO */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="modal-internal-content">
          <h3 className="modal-title">
            {currentProgetto ? "Modifica Progetto" : "Nuovo Progetto"}
          </h3>

          <div className="MioContenitore">
            <div className="form-group">
              <span>Nome Progetto</span>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Es: Restyling Sito Web"
              />
            </div>

            <div className="form-group">
              <span>Stato</span>
              <select
                name="stato"
                value={formData.stato}
                onChange={handleInputChange}
                className="form-control"
              >
                <option value="in_corso">In Corso</option>
                <option value="completato">Completato</option>
                <option value="in_pausa">In Pausa</option>
              </select>
            </div>

            <div className="form-group">
              <span>Cliente</span>
              <Dropdown className="w-100">
                <Dropdown.Toggle id="dropdown-clienti" className="w-100 text-start">
                  {selectedClientLabel}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {clienti.length === 0 ? (
                    <Dropdown.Item disabled>Nessun cliente trovato</Dropdown.Item>
                  ) : (
                    clienti.map((cli) => (
                      <Dropdown.Item
                        key={cli.id}
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, cliente_id: cli.id }));
                          setSelectedClientLabel(`${cli.nome} (${cli.azienda || 'Privato'})`);
                        }}
                      >
                        {cli.nome} {cli.azienda && <small>- {cli.azienda}</small>}
                      </Dropdown.Item>
                    ))
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </div>

            <div className="form-group full-width">
              <span>Descrizione Progetto</span>
              <textarea
                name="descrizione"
                value={formData.descrizione}
                onChange={handleInputChange}
                className="form-control"
                rows="3"
                placeholder="Dettagli del progetto..."
              />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 full-width">
            <button 
              className="add-new-task" 
              style={{ backgroundColor: "#dc3545", color: "#fff" }}
              onClick={() => setIsModalOpen(false)}
            >
              <b>Annulla</b>
            </button>
            <button className="add-new-task" onClick={handleSubmit}>
              <b>{currentProgetto ? "Salva Modifiche" : "Salva Progetto"}</b>
            </button>
          </div>
        </div>
      </Modal>

      {/* MODALE CONFERMA ELIMINAZIONE */}
      {showDeleteModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg rounded-4 text-center p-3 bg-white">
              <div className="modal-body">
                <div className="text-danger mb-3">
                  <i className="bi bi-exclamation-circle fs-1"></i>
                </div>
                <h5 className="fw-bold mb-2">Conferma Eliminazione</h5>
                <p className="text-muted small mb-4">
                  Sei sicuro di voler eliminare il progetto <strong>{progettoDaEliminare?.nome}</strong>? L'azione è irreversibile.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="add-new-task w-50"
                    style={{ backgroundColor: "#6c757d", color: "#fff" }}
                    onClick={() => setShowDeleteModal(false)}
                  >
                    <b>Annulla</b>
                  </button>
                  <button
                    type="button"
                    className="add-new-task w-50"
                    style={{ backgroundColor: "#dc3545", color: "#fff" }}
                    onClick={handleConfirmDelete}
                  >
                    <b>Elimina</b>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgettiList;