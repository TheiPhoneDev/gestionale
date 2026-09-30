import "../App.css";
import "./taskCard.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import Modal from "./Modal";
import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import "./ClientCard.css";

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

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
      telefono: "",
      azienda: "",
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      alert("Inserisci almeno il nome del cliente");
      return;
    }

    const { error } = await supabase.from("clienti").insert([
      {
        nome: formData.nome.trim(),
        email: formData.email.trim() || null,
        telefono: formData.telefono.trim() || null,
        azienda: formData.azienda.trim() || null,
      },
    ]);

    if (error) {
      console.error(
        "Errore durante il salvataggio del cliente:",
        error
      );

      alert(
        "Si è verificato un errore durante la creazione del cliente."
      );

      return;
    }

    handleCloseModal();
  };

  return (
    <div className="client-card-home-container">
      <div className="client-card-header">
        <div className="client-card-icon">
          <i className="bi bi-people-fill"></i>
        </div>

        <div className="client-card-heading">
          <h2 className="client-card-title">
            Gestione Clienti
          </h2>

          <p>
            Aggiungi e gestisci la tua anagrafica clienti
          </p>
        </div>
      </div>

      <div className="client-card-content">
        <div className="client-card-description">
          <i className="bi bi-person-vcard"></i>

          <span>
            Crea una nuova scheda cliente e inserisci i relativi
            dati di contatto.
          </span>
        </div>

        <button
          type="button"
          className="client-add-button"
          onClick={() => setIsModalOpen(true)}
        >
          <i className="bi bi-person-plus-fill"></i>
          <span>Nuovo Cliente</span>
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      >
        <div className="client-modal">
          <div className="client-modal-header">
            <div className="client-modal-heading">
              <div className="client-modal-icon">
                <i className="bi bi-person-plus-fill"></i>
              </div>

              <div>
                <h3>Nuovo Cliente</h3>

                <p>
                  Inserisci i dati del nuovo cliente.
                </p>
              </div>
            </div>
          </div>

          <form
            className="client-form"
            onSubmit={handleSubmit}
          >
            <div className="client-form-grid">
              <div className="client-form-group">
                <label htmlFor="cliente-nome">
                  Nome / Referente <span>*</span>
                </label>

                <input
                  id="cliente-nome"
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Es. Mario Rossi"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="client-form-group">
                <label htmlFor="cliente-azienda">
                  Azienda
                </label>

                <input
                  id="cliente-azienda"
                  type="text"
                  name="azienda"
                  value={formData.azienda}
                  onChange={handleInputChange}
                  placeholder="Es. Acme S.r.l."
                  autoComplete="organization"
                />
              </div>

              <div className="client-form-group">
                <label htmlFor="cliente-email">
                  Email
                </label>

                <input
                  id="cliente-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="mario.rossi@azienda.it"
                  autoComplete="email"
                />
              </div>

              <div className="client-form-group">
                <label htmlFor="cliente-telefono">
                  Telefono
                </label>

                <input
                  id="cliente-telefono"
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  placeholder="+39 333 1234567"
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="client-modal-actions">
              <button
                type="button"
                className="client-button client-button-cancel"
                onClick={handleCloseModal}
              >
                <span>Annulla</span>
              </button>

              <button
                type="submit"
                className="client-button client-button-primary"
              >
                <i className="bi bi-check2"></i>
                <span>Salva Cliente</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

export default ClientCard;