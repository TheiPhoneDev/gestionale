import "../App.css";
import "./taskCard.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import Modal from "./Modal";
import React, { useState, useEffect } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { supabase } from "../supabaseClient";
import "./dashboard.css"; // Importa il CSS specifico per la dashboard


function TaskCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stati per i dati da caricare da Supabase
  const [utenti, setUtenti] = useState([]);
  const [progetti, setProgetti] = useState([]);

  // Stato per la selezione multipla dei membri assegnati
  const [selectedProfili, setSelectedProfili] = useState([]);

  // Stato per i restanti campi del form
  const [formData, setFormData] = useState({
    titolo: "",
    priorita: "Media",
    scadenza: "",
    progetto_id: "",
    descrizione: "",
  });

  // Etichetta visiva per la selezione del progetto
  const [selectedProjectLabel, setSelectedProjectLabel] = useState("Seleziona progetto");

  // Fetch dei membri del team e dei progetti all'apertura della modale
  useEffect(() => {
    async function loadDropdownData() {
      // 1. Carica lista progetti
      const { data: progettiData, error: projErr } = await supabase
        .from("progetti")
        .select("id, nome");

      if (projErr) console.error("Errore Progetti:", projErr);
      else if (progettiData) setProgetti(progettiData);

      // 2. Carica lista utenti dalla tabella 'profili'
      const { data: utentiData, error: userErr } = await supabase
        .from("profili")
        .select("id, nome, cognome, ruolo");

      if (userErr) {
        console.error("Errore Profili:", userErr);
      } else if (utentiData) {
        setUtenti(utentiData);
      }
    }

    if (isModalOpen) {
      loadDropdownData();
    }
  }, [isModalOpen]);

  // Gestione degli input di testo e data
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Funzione per selezionare / deselezionare un membro del team
  const toggleProfilo = (profiloId) => {
    setSelectedProfili((prev) =>
      prev.includes(profiloId)
        ? prev.filter((id) => id !== profiloId)
        : [...prev, profiloId]
    );
  };

  // Invio dei dati a Supabase
  const handleSubmit = async () => {
    if (!formData.titolo) {
      alert("Inserisci almeno il titolo del task");
      return;
    }

    // 1. Inserisci il task nella tabella 'task'
    const { data: newTask, error: taskError } = await supabase
      .from("task")
      .insert([
        {
          titolo: formData.titolo,
          descrizione: formData.descrizione,
          scadenza: formData.scadenza || null,
          progetto_id: formData.progetto_id || null,
          stato: "todo",
        },
      ])
      .select()
      .single();

    if (taskError) {
      console.error("Errore nel salvataggio del task:", taskError);
      alert(`Errore: ${taskError.message}`);
      return;
    }

    // 2. Se ci sono persone selezionate, inserisci le relazioni nella tabella 'task_profili'
    if (newTask && selectedProfili.length > 0) {
      const assegnazioni = selectedProfili.map((profiloId) => ({
        task_id: newTask.id,
        profilo_id: profiloId,
      }));

      const { error: relError } = await supabase
        .from("task_profili")
        .insert(assegnazioni);

      if (relError) {
        console.error("Errore nell'assegnazione dei membri:", relError);
        alert("Task creato, ma si è verificato un errore nell'assegnare i membri.");
        return;
      }
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      titolo: "",
      priorita: "Media",
      scadenza: "",
      progetto_id: "",
      descrizione: "",
    });
    setSelectedProfili([]);
    setSelectedProjectLabel("Seleziona progetto");
  };

  return (
    <div className="task-card-home-container">
      <h2 className="taskcardTitle">Assegna Task</h2>
      <p>Crea e assegna task ai membri del team</p>
      <button className="add-new-task" onClick={() => setIsModalOpen(true)}>
        <b>
          <i className="bi bi-plus"></i>
          Crea e assegna
        </b>
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="modal-internal-content">
          <h3 className="modal-title">Nuovo Task</h3>

          <div className="MioContenitore">
            {/* Titolo */}
            <div className="form-group">
              <span>Titolo *</span>
              <input
                type="text"
                name="titolo"
                value={formData.titolo}
                onChange={handleInputChange}
                className="form-control"
              />
            </div>

            {/* Priorità */}
            <div className="form-group">
              <span>Priorità</span>
              <select
                name="priorita"
                value={formData.priorita}
                onChange={handleInputChange}
                className="form-control"
              >
                <option value="Bassa">Bassa</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
              </select>
            </div>

            {/* Scadenza */}
            <div className="form-group">
              <span>Scadenza</span>
              <input
                type="date"
                name="scadenza"
                value={formData.scadenza}
                onChange={handleInputChange}
                className="form-control"
              />
            </div>

            {/* Dropdown Progetto */}
            <div className="form-group">
              <span>Progetto</span>
              <Dropdown className="w-100">
                <Dropdown.Toggle id="dropdown-progetti" className="w-100 text-start">
                  {selectedProjectLabel}
                </Dropdown.Toggle>
                <Dropdown.Menu>
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

            {/* Selezione Multipla Assegna a */}
            <div className="form-group full-width">
              <span className="mb-2 d-block">Assegna a (seleziona uno o più membri):</span>
              <div className="d-flex flex-wrap gap-2 p-2 border rounded bg-light">
                {utenti.length === 0 ? (
                  <span className="text-muted small">Nessun membro del team trovato</span>
                ) : (
                  utenti.map((member) => {
                    const isSelected = selectedProfili.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        className={`btn btn-sm ${
                          isSelected ? "btn-primary" : "btn-outline-secondary"
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

            {/* Descrizione */}
            <div className="form-group full-width">
              <span>Descrizione</span>
              <textarea
                name="descrizione"
                value={formData.descrizione}
                onChange={handleInputChange}
                className="form-control"
                rows="3"
              />
            </div>
          </div>

          <div className="modal-actions mt-3">
            <button className="btn btn-custom-create" onClick={handleSubmit}>
              Crea
            </button>
            <button className="btn btn-custom-cancel" onClick={() => setIsModalOpen(false)}>
              Annulla
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default TaskCard;