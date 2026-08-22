import React from "react";
import { supabase } from "../supabaseClient";
import "./taskCard.css"; // Importato per usare la classe add-new-task
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";

function ProfilePage({ currentUser, onLogout }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (onLogout) onLogout();
  };

  if (!currentUser) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning">
          Effettua l'accesso per visualizzare le tue informazioni.
        </div>
      </div>
    );
  }

  // Estrae le iniziali dal nome e cognome dell'utente
  const getInitials = () => {
    const nomeIniziale = currentUser.nome ? currentUser.nome.charAt(0) : "";
    const cognomeIniziale = currentUser.cognome ? currentUser.cognome.charAt(0) : "";
    const initials = `${nomeIniziale}${cognomeIniziale}`.toUpperCase();
    return initials || (currentUser.email ? currentUser.email.charAt(0).toUpperCase() : "U");
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Il mio Profilo</h2>

      <div className="card shadow-sm border-0 rounded-4 p-4 max-w-lg bg-white">
        <div className="d-flex align-items-center mb-4">
          {/* Cerchio colorato con le iniziali dell'utente */}
          <div
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3 fw-bold flex-shrink-0"
            style={{ width: "70px", height: "70px", fontSize: "1.5rem" }}
          >
            {getInitials()}
          </div>
          <div>
            <h3 className="mb-0">
              {currentUser.nome} {currentUser.cognome}
            </h3>
            <span className="badge bg-secondary">
              {currentUser.ruolo || "Membro"}
            </span>
          </div>
        </div>

        <hr />

        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="text-muted small">Nome</label>
            <p className="fw-semibold mb-0">{currentUser.nome || "-"}</p>
          </div>

          <div className="col-12 col-md-6">
            <label className="text-muted small">Cognome</label>
            <p className="fw-semibold mb-0">{currentUser.cognome || "-"}</p>
          </div>

          <div className="col-12 col-md-6">
            <label className="text-muted small">Email</label>
            <p className="fw-semibold mb-0">{currentUser.email}</p>
          </div>

          <div className="col-12 col-md-6">
            <label className="text-muted small">Ruolo</label>
            <p className="fw-semibold mb-0">{currentUser.ruolo || "Membro"}</p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-top d-flex justify-content-end">
          {/* Bottone di Logout coordinato con la classe add-new-task */}
          <button
            className="add-new-task"
            style={{ backgroundColor: "#dc3545", color: "#fff" }}
            onClick={handleLogout}
          >
            <b>
              <i className="bi bi-box-arrow-right me-1"></i> Esci dall'account
            </b>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;