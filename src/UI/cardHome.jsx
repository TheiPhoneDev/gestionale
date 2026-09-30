import "./cardHome.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

import Modal from "./Modal";
import { supabase } from "../supabaseClient";

const RUOLI_DISPONIBILI = [
  "Developer",
  "Designer",
  "Project Manager",
  "Tester",
  "Membro",
  "Admin"
];

const COLORI_AVATAR = [
  "#6574df",
  "#9b72d8",
  "#e86b91",
  "#ed765f",
  "#e6a23c",
  "#10a98f",
  "#36a3d9",
  "#7b82d8",
];

const getInitials = (member) => {
  const nome = member?.nome || "";
  const cognome = member?.cognome || "";

  const initials = `${nome.charAt(0)}${cognome.charAt(0)}`;

  return initials.toUpperCase() || "U";
};

function CardHome() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nome: "",
    cognome: "",
    ruolo: RUOLI_DISPONIBILI[0],
  });

  // =========================================================
  // CARICAMENTO TEAM
  // =========================================================

  const fetchTeam = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profili")
      .select("id, nome, cognome, ruolo");

    if (error) {
      console.error(
        "Errore durante il caricamento del team:",
        error
      );
    } else if (data) {
      setTeam(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  // =========================================================
  // FORM
  // =========================================================

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================================================
  // REGISTRAZIONE NUOVO UTENTE
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailPulita = formData.email.trim();

    if (
      !emailPulita ||
      !formData.password ||
      !formData.nome ||
      !formData.cognome
    ) {
      alert(
        "Compila tutti i campi obbligatori (Email, Password, Nome, Cognome)"
      );
      return;
    }

    if (formData.password.length < 6) {
      alert(
        "La password deve contenere almeno 6 caratteri."
      );
      return;
    }

    try {
      const supabaseUrl =
        import.meta.env.VITE_SUPABASE_URL;

      const supabaseKey =
        import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          "Variabili VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY non trovate nel file .env!"
        );
      }

      /*
       * Client temporaneo isolato.
       *
       * persistSession: false impedisce al nuovo signup
       * di sostituire la sessione dell'amministratore.
       */

      const tempSupabase = createClient(
        supabaseUrl,
        supabaseKey,
        {
          auth: {
            persistSession: false,
          },
        }
      );

      const { error } =
        await tempSupabase.auth.signUp({
          email: emailPulita,
          password: formData.password,
          options: {
            data: {
              nome: formData.nome.trim(),
              cognome: formData.cognome.trim(),
              ruolo: formData.ruolo,
            },
          },
        });

      if (error) {
        console.error(
          "Errore durante la creazione del profilo:",
          error
        );

        alert(
          `Errore Supabase: ${error.message}`
        );

        return;
      }

      alert(
        "Nuovo membro registrato con successo!"
      );

      setIsModalOpen(false);
      resetForm();
      fetchTeam();
    } catch (err) {
      console.error(
        "Errore durante la registrazione:",
        err
      );

      alert(
        `Errore: ${err.message || err}`
      );
    }
  };

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      nome: "",
      cognome: "",
      ruolo: RUOLI_DISPONIBILI[0],
    });
  };

  // =========================================================
  // APERTURA MODAL
  // =========================================================

  const openModal = () => {
    setIsModalOpen(true);
  };

  // =========================================================
  // CHIUSURA MODAL
  // =========================================================

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      {/* =====================================================
          CARD TEAM
          ===================================================== */}

      <div className="card-home-container">

        {/* HEADER */}

        <div className="card-home-header">
          <div className="card-home-heading">

            <div className="card-home-icon">
              <i className="bi bi-people-fill" />
            </div>

            <div>
              <h2 className="cardTitle">
                Team
              </h2>

              <p>
                Persone che lavorano al gestionale
              </p>
            </div>

          </div>

          <div className="team-count">
            {team.length}
          </div>
        </div>

        {/* TEAM */}

        <div className="team-content">

          {loading ? (
            <div className="team-loading">

              <div className="team-loading-spinner" />

              <span>
                Caricamento team...
              </span>

            </div>
          ) : team.length === 0 ? (
            <div className="team-empty">

              <div className="team-empty-icon">
                <i className="bi bi-person-x" />
              </div>

              <strong>
                Nessun membro
              </strong>

              <span>
                Non sono ancora presenti membri nel team.
              </span>

            </div>
          ) : (
            <div className="team-members-grid">

              {team.map((member, index) => {
                const backgroundColor =
                  COLORI_AVATAR[
                    index % COLORI_AVATAR.length
                  ];

                const initials =
                  getInitials(member);

                return (
                  <div
                    key={member.id}
                    className="member-card"
                  >

                    <div
                      className="member-avatar"
                      style={{
                        "--avatar-color":
                          backgroundColor,
                      }}
                    >
                      {initials}
                    </div>

                    <div className="member-info">

                      <strong>
                        {member.nome || "Utente"}{" "}
                        {member.cognome || ""}
                      </strong>

                      {member.ruolo && (
                        <span>
                          {member.ruolo}
                        </span>
                      )}

                    </div>

                    <div className="member-status">
                      <span />
                      Attivo
                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </div>

        {/* FOOTER */}

        <div className="card-home-footer">

          <div className="team-footer-info">
            <i className="bi bi-shield-check" />

            <span>
              Gestione membri e ruoli
            </span>
          </div>

          <button
            type="button"
            className="manage-team-button"
            onClick={openModal}
          >
            Gestisci team

            <i className="bi bi-arrow-up-right" />
          </button>

        </div>

      </div>

      {/* =====================================================
          MODAL NUOVO MEMBRO
          ===================================================== */}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
      >

        <div className="team-modal">

          {/* HEADER MODAL */}

          <div className="team-modal-header">

            <div className="team-modal-icon">
              <i className="bi bi-person-plus-fill" />
            </div>

            <div className="team-modal-title">

              <h3>
                Nuovo membro
              </h3>

              <p>
                Aggiungi una nuova persona al team.
              </p>

            </div>

          </div>

          {/* FORM */}

          <form
            onSubmit={handleSubmit}
            className="team-form"
          >

            <div className="team-form-grid">

              {/* NOME */}

              <div className="team-form-field">

                <label htmlFor="nome">
                  Nome
                </label>

                <input
                  id="nome"
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Es. Mario"
                  required
                />

              </div>

              {/* COGNOME */}

              <div className="team-form-field">

                <label htmlFor="cognome">
                  Cognome
                </label>

                <input
                  id="cognome"
                  type="text"
                  name="cognome"
                  value={formData.cognome}
                  onChange={handleInputChange}
                  placeholder="Es. Rossi"
                  required
                />

              </div>

              {/* EMAIL */}

              <div className="team-form-field full-width">

                <label htmlFor="email">
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="mario.rossi@email.com"
                  required
                />

              </div>

              {/* PASSWORD */}

              <div className="team-form-field">

                <label htmlFor="password">
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Minimo 6 caratteri"
                  required
                />

              </div>

              {/* RUOLO */}

              <div className="team-form-field">

                <label htmlFor="ruolo">
                  Ruolo
                </label>

                <select
                  id="ruolo"
                  name="ruolo"
                  value={formData.ruolo}
                  onChange={handleInputChange}
                >
                  {RUOLI_DISPONIBILI.map(
                    (ruoloOption) => (
                      <option
                        key={ruoloOption}
                        value={ruoloOption}
                      >
                        {ruoloOption}
                      </option>
                    )
                  )}
                </select>

              </div>

            </div>

            {/* AZIONI */}

            <div className="team-modal-actions">

              <button
                type="button"
                className="team-button secondary"
                onClick={closeModal}
              >
                Annulla
              </button>

              <button
                type="submit"
                className="team-button primary"
              >
                <i className="bi bi-person-plus" />
                Crea membro
              </button>

            </div>

          </form>

        </div>

      </Modal>
    </>
  );
}

export default CardHome;