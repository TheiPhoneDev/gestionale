import "../App.css";
import "./taskCard.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import Modal from "./Modal";
import React, { useState, useEffect } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { supabase } from "../supabaseClient";
import "./dashboard.css";

function TaskCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [utenti, setUtenti] = useState([]);
  const [progetti, setProgetti] = useState([]);
  const [selectedProfili, setSelectedProfili] = useState([]);

  const [formData, setFormData] = useState({
    titolo: "",
    priorita: "Media",
    scadenza: "",
    progetto_id: "",
    descrizione: "",
  });

  const [selectedProjectLabel, setSelectedProjectLabel] = useState("Seleziona progetto");

  useEffect(() => {
    async function loadDropdownData() {
      const { data: progettiData, error: projErr } = await supabase
        .from("progetti")
        .select("id, nome");

      if (projErr) console.error("Errore Progetti:", projErr);
      else if (progettiData) setProgetti(progettiData);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleProfilo = (profiloId) => {
    setSelectedProfili((prev) =>
      prev.includes(profiloId)
        ? prev.filter((id) => id !== profiloId)
        : [...prev, profiloId]
    );
  };

  const handleSubmit = async () => {
    if (!formData.titolo) {
      alert("Inserisci almeno il titolo del task");
      return;
    }

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

      {/* Pulsante principale */}
      <button className="add-new-task" onClick={() => setIsModalOpen(true)}>
        <b>
          <i className="bi bi-plus me-1"></i>
          Crea e assegna
        </b>
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="modal-internal-content">
          <h3 className="modal-title">Nuovo Task</h3>

          <div className="MioContenitore">
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
              <b>Crea Task</b>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default TaskCard;