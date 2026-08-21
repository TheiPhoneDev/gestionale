import "../App.css";
import "./taskCard.css"; 
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import Modal from "./Modal";
import React, { useState, useEffect } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { supabase } from "../supabaseClient";
import "./ProjectCard.css";
import "./dashboard.css";

function ProjectCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clienti, setClienti] = useState([]);

  const [formData, setFormData] = useState({
    nome: "",
    descrizione: "",
    stato: "in_corso",
    cliente_id: "",
  });

  const [selectedClientLabel, setSelectedClientLabel] = useState("Seleziona cliente");

  useEffect(() => {
    async function loadClients() {
      const { data, error } = await supabase
        .from("clienti")
        .select("id, nome, azienda");

      if (error) {
        console.error("Errore caricamento clienti:", error);
      } else if (data) {
        setClienti(data);
      }
    }

    if (isModalOpen) {
      loadClients();
    }
  }, [isModalOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.nome) {
      alert("Inserisci almeno il nome del progetto");
      return;
    }

    const { error } = await supabase.from("progetti").insert([
      {
        nome: formData.nome,
        descrizione: formData.descrizione,
        stato: formData.stato,
        cliente_id: formData.cliente_id || null,
      },
    ]);

    if (error) {
      console.error("Errore nel salvataggio del progetto:", error);
      alert("Errore durante la creazione del progetto.");
    } else {
      setIsModalOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      descrizione: "",
      stato: "in_corso",
      cliente_id: "",
    });
    setSelectedClientLabel("Seleziona cliente");
  };

  return (
    <div className="task-card-home-container">
      <h2 className="taskcardTitle">Gestione Progetti</h2>
      <p>Crea nuovi progetti e assegnali ai clienti</p>
      
      {/* Pulsante principale */}
      <button className="add-new-task" onClick={() => setIsModalOpen(true)}>
        <b>
          <i className="bi bi-folder-plus me-1"></i> Nuovo Progetto
        </b>
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="modal-internal-content">
          <h3 className="modal-title">Nuovo Progetto</h3>

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
            {/* Pulsante Annulla rosso */}
            <button 
              className="add-new-task" 
              style={{ backgroundColor: "#dc3545", color: "#fff" }}
              onClick={() => setIsModalOpen(false)}
            >
              <b>Annulla</b>
            </button>
            {/* Pulsante di conferma */}
            <button className="add-new-task" onClick={handleSubmit}>
              <b>Salva Progetto</b>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ProjectCard;