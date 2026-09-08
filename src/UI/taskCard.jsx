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
  const [pendingFiles, setPendingFiles] = useState([]);
  const [currentProfileId, setCurrentProfileId] = useState(null);

  const [formData, setFormData] = useState({
    titolo: "",
    priorita: "Media",
    scadenza: "",
    progetto_id: "",
    descrizione: "",
  });

  const [selectedProjectLabel, setSelectedProjectLabel] = useState("Seleziona progetto");

  useEffect(() => {
    async function loadInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentProfileId(user.id);
      }

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
      loadInitialData();
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

  const handlePendingFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setPendingFiles((prev) => [...prev, ...files]);
    }
    e.target.value = null;
  };

  const removePendingFile = (indexToRemove) => {
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.titolo) {
      alert("Inserisci almeno il titolo del task");
      return;
    }

    const payload = {
      titolo: formData.titolo,
      descrizione: formData.descrizione,
      scadenza: formData.scadenza || null,
      priorita: formData.priorita,
      progetto_id: formData.progetto_id || null,
      stato: "todo",
    };

    if (currentProfileId) {
      payload.creato_da = currentProfileId;
    }

    const { data: newTask, error: taskError } = await supabase
      .from("task")
      .insert([payload])
      .select()
      .single();

    if (taskError) {
      console.error("Errore nel salvataggio del task:", taskError);
      alert(`Errore: ${taskError.message}`);
      return;
    }

    const targetTaskId = newTask.id;

    if (selectedProfili.length > 0) {
      const assegnazioni = selectedProfili.map((profiloId) => ({
        task_id: targetTaskId,
        profilo_id: profiloId,
      }));

      const { error: relError } = await supabase
        .from("task_profili")
        .insert(assegnazioni);

      if (relError) {
        console.error("Errore nell'assegnazione dei membri:", relError);
      }

      const notificheDaCreare = selectedProfili.map((profiloId) => ({
        user_id: profiloId,
        titolo: "Nuovo task assegnato",
        messaggio: `Ti è stato assegnato il task "${formData.titolo}".`,
        letta: false,
      }));

      await supabase.from("notifiche").insert(notificheDaCreare);
    }

    if (pendingFiles.length > 0) {
      for (const file of pendingFiles) {
        try {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
          const filePath = `${targetTaskId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("task-attachments")
            .upload(filePath, file);

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from("task-attachments")
              .getPublicUrl(filePath);

            await supabase.from("task_allegati").insert([
              {
                task_id: targetTaskId,
                nome_file: file.name,
                url_file: publicUrlData.publicUrl,
                tipo_file: file.type,
              },
            ]);
          }
        } catch (err) {
          console.error("Errore caricamento file in sospeso:", err);
        }
      }
    }

    setIsModalOpen(false);
    resetForm();
    alert("Task creato con successo!");
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
    setPendingFiles([]);
    setSelectedProjectLabel("Seleziona progetto");
  };

  return (
    <div className="task-card-home-container">
      <h2 className="taskcardTitle">Assegna Task</h2>
      <p>Crea e assegna task ai membri del team</p>

      <button className="add-new-task" onClick={() => setIsModalOpen(true)}>
        <b>
          <i className="bi bi-plus me-1"></i>
          Crea e assegna
        </b>
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-3" style={{ maxHeight: "80vh", overflowY: "auto" }}>
          <h3 className="modal-title mb-4">Nuovo Task</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Titolo *</label>
              <input
                type="text"
                name="titolo"
                value={formData.titolo}
                onChange={handleInputChange}
                className="form-control"
                required
              />
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Priorità</label>
                <select
                  name="priorita"
                  value={formData.priorita}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="Bassa">Bassa</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Scadenza</label>
                <input
                  type="date"
                  name="scadenza"
                  value={formData.scadenza}
                  onChange={handleInputChange}
                  className="form-control"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Progetto</label>
              <Dropdown className="w-100">
                <Dropdown.Toggle id="dropdown-progetti" className="w-100 text-start bg-white text-dark border">
                  {selectedProjectLabel}
                </Dropdown.Toggle>
                <Dropdown.Menu className="w-100">
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

            <div className="mb-3">
              <label className="form-label fw-semibold d-block">Assegna a (seleziona uno o più membri):</label>
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

            <div className="mb-3">
              <label className="form-label fw-semibold">Descrizione</label>
              <textarea
                name="descrizione"
                value={formData.descrizione}
                onChange={handleInputChange}
                className="form-control"
                rows="3"
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Allegati (Doc / Immagini)</label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {pendingFiles.map((file, idx) => (
                  <span key={idx} className="badge bg-light text-dark border p-2 d-flex align-items-center gap-2">
                    <i className="bi bi-paperclip"></i>
                    <span className="text-truncate" style={{ maxWidth: "150px" }}>{file.name}</span>
                    <button type="button" className="btn-close btn-close-sm" style={{ fontSize: "0.6rem" }} onClick={() => removePendingFile(idx)}></button>
                  </span>
                ))}
                {pendingFiles.length === 0 && <span className="text-muted small d-block">Nessun file selezionato per il caricamento.</span>}
              </div>
              <div>
                <label className="btn btn-sm btn-outline-secondary">
                  <i className="bi bi-upload me-1"></i> Seleziona file o immagini
                  <input type="file" onChange={handlePendingFileSelect} style={{ display: "none" }} multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
                </label>
              </div>
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
                <b>Crea Task</b>
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

export default TaskCard;