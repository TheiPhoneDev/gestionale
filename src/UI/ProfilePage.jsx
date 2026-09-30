import React from "react";

import { supabase } from "../supabaseClient";

import "../App.css";
import "./TaskPage.css";
import "./ProfilePage.css";

import "bootstrap-icons/font/bootstrap-icons.min.css";

function ProfilePage({ currentUser, onLogout }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();

    if (onLogout) onLogout();
  };

  if (!currentUser) {
    return (
      <div className="task-page profile-page">
        <div className="profile-empty-state">
          <div className="profile-empty-icon">
            <i className="bi bi-person-lock" />
          </div>

          <h2>Accesso richiesto</h2>

          <p>
            Effettua l'accesso per visualizzare le tue informazioni.
          </p>
        </div>
      </div>
    );
  }

  // Estrae le iniziali dal nome e cognome dell'utente
  const getInitials = () => {
    const nomeIniziale = currentUser.nome
      ? currentUser.nome.charAt(0)
      : "";

    const cognomeIniziale = currentUser.cognome
      ? currentUser.cognome.charAt(0)
      : "";

    const initials =
      `${nomeIniziale}${cognomeIniziale}`.toUpperCase();

    return (
      initials ||
      (currentUser.email
        ? currentUser.email.charAt(0).toUpperCase()
        : "U")
    );
  };

  return (
    <div className="task-page profile-page">
      {/* HEADER */}
      <div className="task-page-header">
        <div className="task-page-heading">
          <div>
            <div className="task-page-title-row">
              <h1>Il mio Profilo</h1>

              <span className="task-company-badge">
                {currentUser.ruolo || "Membro"}
              </span>
            </div>

            <p>
              Visualizza le informazioni del tuo account e del
              tuo ruolo nel team.
            </p>
          </div>
        </div>
      </div>

      {/* PROFILO */}
      <section className="profile-card">
        <div className="profile-card-header">
          <div className="profile-avatar">
            {getInitials()}
          </div>

          <div className="profile-identity">
            <h2>
              {currentUser.nome || ""}{" "}
              {currentUser.cognome || ""}
            </h2>

            <div className="profile-role">
              <i className="bi bi-person-badge-fill" />
              {currentUser.ruolo || "Membro"}
            </div>
          </div>
        </div>

        <div className="profile-divider" />

        {/* INFORMAZIONI */}
        <div className="profile-section">
          <div className="profile-section-heading">
            <div className="profile-section-icon">
              <i className="bi bi-person-vcard-fill" />
            </div>

            <div>
              <h3>Informazioni personali</h3>

              <p>
                I dati associati al tuo profilo.
              </p>
            </div>
          </div>

          <div className="profile-info-grid">
            <div className="profile-info-card">
              <span>Nome</span>

              <strong>
                {currentUser.nome || "-"}
              </strong>
            </div>

            <div className="profile-info-card">
              <span>Cognome</span>

              <strong>
                {currentUser.cognome || "-"}
              </strong>
            </div>

            <div className="profile-info-card">
              <span>Email</span>

              <strong className="profile-email">
                {currentUser.email || "-"}
              </strong>
            </div>

            <div className="profile-info-card">
              <span>Ruolo</span>

              <strong>
                {currentUser.ruolo || "Membro"}
              </strong>
            </div>
          </div>
        </div>

        {/* AZIONI */}
        <div className="profile-actions">
          <div>
            <h3>Account</h3>

            <p>
              Esci dall'account attualmente collegato.
            </p>
          </div>

          <button
            type="button"
            className="task-page-button danger"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right" />
            Esci dall'account
          </button>
        </div>
      </section>
    </div>
  );
}

export default ProfilePage;
