import "../App.css";
import "./ProjectCard.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";

import Modal from "./Modal";
import React, { useEffect, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { supabase } from "../supabaseClient";

function ProjectCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clienti, setClienti] = useState([]);

  const [formData, setFormData] = useState({
    nome: "",
    descrizione: "",
    stato: "in_corso",
    cliente_id: "",
  });

  const [selectedClientLabel, setSelectedClientLabel] =
    useState("Seleziona cliente");

  useEffect(() => {
    let isMounted = true;

    async function loadClients() {
      const { data, error } = await supabase
        .from("clienti")
        .select("id, nome, azienda")
        .order("nome", { ascending: true });

      if (error) {
        console.error("Errore caricamento clienti:", error);
        return;
      }

      if (isMounted && data) {
        setClienti(data);
      }
    }

    loadClients();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      alert("Inserisci almeno il nome del progetto");
      return;
    }

    const { error } = await supabase.from("progetti").insert([
      {
        nome: formData.nome.trim(),
        descrizione: formData.descrizione.trim() || null,
        stato: formData.stato,
        cliente_id: formData.cliente_id || null,
      },
    ]);

    if (error) {
      console.error(
        "Errore nel salvataggio del progetto:",
        error
      );

      alert("Errore durante la creazione del progetto.");
      return;
    }

    handleCloseModal();
  };

  return (
    <div className="project-card-home-container">
      <div className="project-card-header">
        <div className="project-card-icon">
          <i className="bi bi-kanban-fill"></i>
        </div>

        <div className="project-card-heading">
          <h2 className="project-card-title">
            Gestione Progetti
          </h2>

          <p>
            Crea nuovi progetti e assegnali ai clienti
          </p>
        </div>
      </div>

      <div className="project-card-content">
        <div className="project-card-description">
          <i className="bi bi-folder2-open"></i>

          <span>
            Crea un nuovo progetto e collega il relativo cliente.
          </span>
        </div>

        <button
          type="button"
          className="project-add-button"
          onClick={() => setIsModalOpen(true)}
        >
          <i className="bi bi-folder-plus"></i>
          <span>Nuovo Progetto</span>
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      >
        <div className="project-modal">
          <div className="project-modal-header">
            <div className="project-modal-heading">
              <div className="project-modal-icon">
                <i className="bi bi-folder-plus"></i>
              </div>

              <div>
                <h3>Nuovo Progetto</h3>

                <p>
                  Crea un progetto e collegalo a un cliente.
                </p>
              </div>
            </div>
          </div>

          <form
            className="project-form"
            onSubmit={handleSubmit}
          >
            <div className="project-form-grid">
              <div className="project-form-group">
                <label htmlFor="project-nome">
                  Nome Progetto <span>*</span>
                </label>

                <input
                  id="project-nome"
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Es. Restyling Sito Web"
                  required
                />
              </div>

              <div className="project-form-group">
                <label htmlFor="project-stato">
                  Stato
                </label>

                <select
                  id="project-stato"
                  name="stato"
                  value={formData.stato}
                  onChange={handleInputChange}
                >
                  <option value="in_corso">
                    In Corso
                  </option>

                  <option value="completato">
                    Completato
                  </option>

                  <option value="in_pausa">
                    In Pausa
                  </option>
                </select>
              </div>
            </div>

            <div className="project-form-group">
              <label>
                Cliente
              </label>

              <Dropdown className="project-client-dropdown">
                <Dropdown.Toggle
                  id="project-client-dropdown"
                  className="project-client-toggle"
                >
                  <span>
                    {selectedClientLabel}
                  </span>
                </Dropdown.Toggle>

                <Dropdown.Menu className="project-client-menu">
                  {clienti.length === 0 ? (
                    <Dropdown.Item disabled>
                      Nessun cliente trovato
                    </Dropdown.Item>
                  ) : (
                    clienti.map((cli) => (
                      <Dropdown.Item
                        key={cli.id}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            cliente_id: cli.id,
                          }));

                          setSelectedClientLabel(
                            `${cli.nome} (${
                              cli.azienda || "Privato"
                            })`
                          );
                        }}
                      >
                        <div className="project-client-option">
                          <strong>{cli.nome}</strong>

                          {cli.azienda && (
                            <small>
                              {cli.azienda}
                            </small>
                          )}
                        </div>
                      </Dropdown.Item>
                    ))
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </div>

            <div className="project-form-group">
              <label htmlFor="project-descrizione">
                Descrizione Progetto
              </label>

              <textarea
                id="project-descrizione"
                name="descrizione"
                value={formData.descrizione}
                onChange={handleInputChange}
                rows={4}
                placeholder="Dettagli del progetto..."
              />
            </div>

            <div className="project-modal-actions">
              <button
                type="button"
                className="project-button project-button-cancel"
                onClick={handleCloseModal}
              >
                <span>Annulla</span>
              </button>

              <button
                type="submit"
                className="project-button project-button-primary"
              >
                <i className="bi bi-check2"></i>
                <span>Salva Progetto</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

export default ProjectCard;