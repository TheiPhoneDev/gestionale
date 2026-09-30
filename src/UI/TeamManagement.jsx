import React, { useState, useEffect } from "react";

import { createClient } from "@supabase/supabase-js";

import { supabase } from "../supabaseClient";

import Modal from "./Modal";

import "../App.css";
import "./TaskPage.css";
import "./TeamManagement.css";

import "bootstrap-icons/font/bootstrap-icons.min.css";

const RUOLI_DISPONIBILI = [
  "Developer",
  "Designer",
  "Project Manager",
  "Tester",
  "Membro",
  "Admin",
];

function TeamManagement() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Modal conferma eliminazione
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nome: "",
    cognome: "",
    ruolo: RUOLI_DISPONIBILI[0],
  });

  const fetchTeam = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profili")
      .select("id, nome, cognome, ruolo");

    if (error) {
      console.error("Errore nel recupero del team:", error);
    } else if (data) {
      setTeam(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  // Conteggio totale e per ruolo
  const totaleMembri = team.length;

  const conteggioRuoli = team.reduce((acc, member) => {
    const ruolo = member.ruolo || "Membro";

    acc[ruolo] = (acc[ruolo] || 0) + 1;

    return acc;
  }, {});

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openCreateModal = () => {
    setEditingMember(null);

    setFormData({
      email: "",
      password: "",
      nome: "",
      cognome: "",
      ruolo: RUOLI_DISPONIBILI[0],
    });

    setIsModalOpen(true);
  };

  const openEditModal = (member) => {
    setEditingMember(member);

    setFormData({
      email: "",
      password: "",
      nome: member.nome || "",
      cognome: member.cognome || "",
      ruolo: member.ruolo || RUOLI_DISPONIBILI[0],
    });

    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingMember) {
      const { data, error } = await supabase
        .from("profili")
        .update({
          nome: formData.nome.trim(),
          cognome: formData.cognome.trim(),
          ruolo: formData.ruolo,
        })
        .eq("id", editingMember.id)
        .select();

      if (error) {
        alert(`Errore durante la modifica: ${error.message}`);
      } else if (!data || data.length === 0) {
        alert(
          "Nessun dato aggiornato! Verifica le policy RLS su Supabase."
        );
      } else {
        alert("Profilo aggiornato con successo!");
        setIsModalOpen(false);
        fetchTeam();
      }
    } else {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const tempSupabase = createClient(
          supabaseUrl,
          supabaseKey,
          {
            auth: {
              persistSession: false,
            },
          }
        );

        const { error } = await tempSupabase.auth.signUp({
          email: formData.email.trim(),
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
          alert(`Errore registrazione: ${error.message}`);
        } else {
          alert("Nuovo membro creato con successo!");
          setIsModalOpen(false);
          fetchTeam();
        }
      } catch (err) {
        alert(`Errore: ${err.message || err}`);
      }
    }
  };

  // Apre il modal di conferma eliminazione
  const openDeleteModal = (member) => {
    setMemberToDelete(member);
    setIsDeleteModalOpen(true);
  };

  // Chiude il modal di conferma
  const closeDeleteModal = () => {
    if (isDeleting) return;

    setIsDeleteModalOpen(false);
    setMemberToDelete(null);
  };

  // Eliminazione effettiva del membro
  const handleDelete = async () => {
    if (!memberToDelete) return;

    setIsDeleting(true);

    const { id, nome, cognome } = memberToDelete;

    try {
      await supabase
        .from("task_profili")
        .delete()
        .eq("profilo_id", id);

      const { data, error } = await supabase
        .from("profili")
        .delete()
        .eq("id", id)
        .select();

      if (error) {
        console.error("Errore cancellazione:", error);

        alert(`Errore nell'eliminazione: ${error.message}`);

        setIsDeleting(false);
        return;
      }

      if (!data || data.length === 0) {
        alert(
          "Nessun record eliminato. Verifica che le policy RLS siano attive."
        );

        setIsDeleting(false);
        return;
      }

      alert(
        `Membro ${`${nome || ""} ${cognome || ""}`.trim()} eliminato con successo!`
      );

      setIsDeleteModalOpen(false);
      setMemberToDelete(null);

      await fetchTeam();
    } catch (err) {
      console.error("Errore generico:", err);

      alert(
        "Si è verificato un errore durante l'eliminazione."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (member) => {
    const nome = (member.nome || "").trim();
    const cognome = (member.cognome || "").trim();

    const initials = `${nome.charAt(0)}${cognome.charAt(0)}`;

    return initials.toUpperCase() || "U";
  };

  const getRoleClass = (ruolo) => {
    switch ((ruolo || "").toLowerCase()) {
      case "admin":
        return "admin";

      case "developer":
        return "developer";

      case "designer":
        return "designer";

      case "project manager":
        return "manager";

      case "tester":
        return "tester";

      default:
        return "member";
    }
  };

  return (
    <div className="task-page team-management-page">
      {/* HEADER */}
      <div className="task-page-header">
        <div className="task-page-heading">
          <div>
            <div className="task-page-title-row">
              <h1>Gestione Team</h1>

              <span className="task-company-badge">
                {totaleMembri} membri
              </span>
            </div>

            <p>
              Gestisci i membri del team, i ruoli e le relative
              autorizzazioni.
            </p>
          </div>
        </div>

        <div className="task-page-actions">
          <button
            type="button"
            className="task-page-button secondary"
            onClick={fetchTeam}
          >
            <i className="bi bi-arrow-clockwise" />
            Aggiorna
          </button>

          <button
            type="button"
            className="task-page-button primary"
            onClick={openCreateModal}
          >
            <i className="bi bi-person-plus-fill" />
            Aggiungi membro
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="task-metrics-grid team-metrics-grid">
        <div className="task-metric-card">
          <div className="task-metric-icon blue">
            <i className="bi bi-people-fill" />
          </div>

          <div>
            <span>Totale membri</span>
            <strong>{totaleMembri}</strong>
          </div>
        </div>

        <div className="task-metric-card">
          <div className="task-metric-icon purple">
            <i className="bi bi-code-slash" />
          </div>

          <div>
            <span>Developer</span>
            <strong>
              {conteggioRuoli.Developer || 0}
            </strong>
          </div>
        </div>

        <div className="task-metric-card">
          <div className="task-metric-icon orange">
            <i className="bi bi-kanban-fill" />
          </div>

          <div>
            <span>Project Manager</span>
            <strong>
              {conteggioRuoli["Project Manager"] || 0}
            </strong>
          </div>
        </div>

        <div className="task-metric-card">
          <div className="task-metric-icon green">
            <i className="bi bi-shield-check" />
          </div>

          <div>
            <span>Admin</span>
            <strong>
              {conteggioRuoli.Admin || 0}
            </strong>
          </div>
        </div>
      </div>

      {/* RUOLI */}
      <section className="team-section">
        <div className="team-section-header">
          <div>
            <h2>Distribuzione del team</h2>

            <p>
              Numero di membri presenti per ciascun ruolo.
            </p>
          </div>
        </div>

        <div className="team-role-list">
          {RUOLI_DISPONIBILI.map((ruolo) => (
            <div
              key={ruolo}
              className={`team-role-card ${getRoleClass(ruolo)}`}
            >
              <div className="team-role-icon">
                <i
                  className={
                    ruolo === "Developer"
                      ? "bi bi-code-slash"
                      : ruolo === "Designer"
                      ? "bi bi-palette-fill"
                      : ruolo === "Project Manager"
                      ? "bi bi-kanban-fill"
                      : ruolo === "Tester"
                      ? "bi bi-bug-fill"
                      : ruolo === "Admin"
                      ? "bi bi-shield-fill-check"
                      : "bi bi-person-fill"
                  }
                />
              </div>

              <div className="team-role-content">
                <span>{ruolo}</span>

                <strong>
                  {conteggioRuoli[ruolo] || 0}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TEAM TABLE */}
      <section className="team-section">
        <div className="team-section-header">
          <div>
            <h2>Membri del team</h2>

            <p>
              Elenco completo degli utenti e dei relativi ruoli.
            </p>
          </div>

          <span className="team-section-count">
            {totaleMembri} membri
          </span>
        </div>

        {loading ? (
          <div className="task-loading team-loading">
            <div className="task-loading-spinner" />

            <p>Caricamento team...</p>
          </div>
        ) : team.length === 0 ? (
          <div className="task-empty">
            <i className="bi bi-people" />

            <h3>Nessun membro</h3>

            <p>
              Non sono presenti membri nel team.
            </p>

            <button
              type="button"
              className="task-page-button primary"
              onClick={openCreateModal}
            >
              <i className="bi bi-person-plus-fill" />
              Aggiungi membro
            </button>
          </div>
        ) : (
          <div className="task-table-wrapper team-table-wrapper">
            <table className="task-table team-table">
              <thead>
                <tr>
                  <th>Membro</th>
                  <th>Ruolo</th>
                  <th className="team-actions-column">
                    Azioni
                  </th>
                </tr>
              </thead>

              <tbody>
                {team.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="team-member">
                        <div className="team-member-avatar">
                          {getInitials(member)}
                        </div>

                        <div className="team-member-info">
                          <strong>
                            {member.nome || "Senza nome"}{" "}
                            {member.cognome || ""}
                          </strong>

                          <span>
                            Membro del team
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`team-role-badge ${getRoleClass(
                          member.ruolo
                        )}`}
                      >
                        {member.ruolo || "Membro"}
                      </span>
                    </td>

                    <td>
                      <div className="team-actions">
                        <button
                          type="button"
                          className="team-action-button edit"
                          onClick={() =>
                            openEditModal(member)
                          }
                        >
                          <i className="bi bi-pencil-fill" />
                          Modifica
                        </button>

                        <button
                          type="button"
                          className="team-action-button delete"
                          onClick={() =>
                            openDeleteModal(member)
                          }
                        >
                          <i className="bi bi-trash-fill" />
                          Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODALE CREAZIONE / MODIFICA */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <div className="team-modal">
          <div className="team-modal-header">
            <div className="team-modal-icon">
              <i
                className={
                  editingMember
                    ? "bi bi-person-gear"
                    : "bi bi-person-plus-fill"
                }
              />
            </div>

            <div>
              <h2>
                {editingMember
                  ? "Modifica membro"
                  : "Registra nuovo membro"}
              </h2>

              <p>
                {editingMember
                  ? "Aggiorna le informazioni e il ruolo del membro."
                  : "Inserisci i dati del nuovo membro del team."}
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="team-form"
          >
            <div className="team-form-grid">
              <div className="team-form-group">
                <label htmlFor="team-nome">
                  Nome <span>*</span>
                </label>

                <input
                  id="team-nome"
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="team-form-group">
                <label htmlFor="team-cognome">
                  Cognome <span>*</span>
                </label>

                <input
                  id="team-cognome"
                  type="text"
                  name="cognome"
                  value={formData.cognome}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {!editingMember && (
              <div className="team-form-grid">
                <div className="team-form-group">
                  <label htmlFor="team-email">
                    Email <span>*</span>
                  </label>

                  <input
                    id="team-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="team-form-group">
                  <label htmlFor="team-password">
                    Password <span>*</span>
                  </label>

                  <input
                    id="team-password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            )}

            <div className="team-form-group">
              <label htmlFor="team-ruolo">
                Ruolo
              </label>

              <select
                id="team-ruolo"
                name="ruolo"
                value={formData.ruolo}
                onChange={handleInputChange}
              >
                {RUOLI_DISPONIBILI.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="team-modal-actions">
              <button
                type="button"
                className="task-page-button secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Annulla
              </button>

              <button
                type="submit"
                className="task-page-button primary"
              >
                <i
                  className={
                    editingMember
                      ? "bi bi-check-lg"
                      : "bi bi-person-plus-fill"
                  }
                />

                {editingMember
                  ? "Salva modifiche"
                  : "Registra"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* MODALE CONFERMA ELIMINAZIONE */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
      >
        <div className="team-delete-modal">
          <div className="team-delete-icon">
            <i className="bi bi-trash3-fill" />
          </div>

          <div className="team-delete-content">
            <h2>Eliminare questo membro?</h2>

            <p>
              Stai per eliminare definitivamente{" "}
              <strong>
                {memberToDelete
                  ? `${memberToDelete.nome || ""} ${
                      memberToDelete.cognome || ""
                    }`.trim()
                  : "questo membro"}
              </strong>{" "}
              dal team.
            </p>

            <span className="team-delete-warning">
              <i className="bi bi-exclamation-triangle-fill" />
              Questa operazione non può essere annullata.
            </span>
          </div>

          <div className="team-delete-actions">
            <button
              type="button"
              className="task-page-button secondary"
              onClick={closeDeleteModal}
              disabled={isDeleting}
            >
              Annulla
            </button>

            <button
              type="button"
              className="task-page-button danger"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <i className="bi bi-arrow-repeat" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <i className="bi bi-trash-fill" />
                  Elimina membro
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default TeamManagement;
