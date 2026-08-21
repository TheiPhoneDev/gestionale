import "../App.css";
import "./taskCard.css"; 
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import Modal from "./Modal";
import React, { useState } from "react";
import { supabase } from "../supabaseClient";

function ClientCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefono: "",
    azienda: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.nome) {
      alert("Inserisci almeno il nome del cliente");
      return;
    }

    const { error } = await supabase.from("clienti").insert([
      {
        nome: formData.nome,
        email: formData.email || null,
        telefono: formData.telefono || null,
        azienda: formData.azienda || null,
      },
    ]);

    if (error) {
      console.error("Errore durante il salvataggio del cliente:", error);
      alert("Si è verificato un errore durante la creazione del cliente.");
    } else {
      setIsModalOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
      telefono: "",
      azienda: "",
    });
  };

  return (
    <div className="task-card-home-container">
      <h2 className="taskcardTitle">Gestione Clienti</h2>
      <p>Aggiungi e gestisci la tua anagrafica clienti</p>
      
      {/* Pulsante principale */}
      <button 
        className="add-new-task" 
        onClick={() => setIsModalOpen(true)}
        style={{ backgroundColor: 'rgb(40, 40, 255)' }}
      >
        <b>
          <i className="bi bi-person-plus-fill me-1"></i> Nuovo Cliente
        </b>
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="modal-internal-content">
          <h3 className="modal-title">Nuovo Cliente</h3>

          <div className="MioContenitore">
            <div className="form-group">
              <span>Nome / Referente *</span>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Es. Mario Rossi"
              />
            </div>

            <div className="form-group">
              <span>Azienda</span>
              <input
                type="text"
                name="azienda"
                value={formData.azienda}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Es. Acme S.r.l."
              />
            </div>

            <div className="form-group">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-control"
                placeholder="mario.rossi@azienda.it"
              />
            </div>

            <div className="form-group">
              <span>Telefono</span>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                className="form-control"
                placeholder="+39 333 1234567"
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
            <button 
              className="add-new-task" 
              onClick={handleSubmit} 
              style={{ backgroundColor: 'rgb(40, 40, 255)', color: '#fff' }}
            >
              <b>Salva Cliente</b>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ClientCard;