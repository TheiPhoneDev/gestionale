import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import Modal from "./Modal";
import "../App.css";
import "./taskCard.css"; // Importato per ereditare lo stile add-new-task
import "bootstrap/dist/css/bootstrap.css";
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      const { error } = await supabase
        .from("profili")
        .update({
          nome: formData.nome.trim(),
          cognome: formData.cognome.trim(),
          ruolo: formData.ruolo,
        })
        .eq("id", editingMember.id);

      if (error) {
        alert(`Errore durante la modifica: ${error.message}`);
      } else {
        alert("Profilo aggiornato con successo!");
        setIsModalOpen(false);
        fetchTeam();
      }
    } else {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const tempSupabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });

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

  const handleDelete = async (id, nome) => {
    if (!window.confirm(`Sei sicuro di voler eliminare l'utente ${nome}?`)) {
      return;
    }

    try {
      await supabase.from("task_profili").delete().eq("profilo_id", id);

      const { data, error } = await supabase
        .from("profili")
        .delete()
        .eq("id", id)
        .select();

      if (error) {
        console.error("Errore cancellazione:", error);
        alert(`Errore nell'eliminazione: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        alert("Nessun record eliminato. Verifica che le policy RLS siano attive.");
        return;
      }

      alert("Membro eliminato con successo!");
      fetchTeam();
    } catch (err) {
      console.error("Errore generico:", err);
      alert("Si è verificato un errore durante l'eliminazione.");
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Gestione Team</h2>
        <div className="d-flex align-items-center gap-2">
          {/* Pulsante Aggiungi Membro */}
          <button className="add-new-task" onClick={openCreateModal}>
            <b>
              <i className="bi bi-person-plus-fill me-1"></i>Aggiungi Membro
            </b>
          </button>
          {/* Pulsante Aggiorna */}
          <button className="add-new-task" onClick={fetchTeam}>
            <b>
              <i className="bi bi-arrow-clockwise me-1"></i>Aggiorna
            </b>
          </button>
        </div>
      </div>

      {loading ? (
        <p>Caricamento in corso...</p>
      ) : (
        <div className="table-responsive shadow-sm rounded">
          <table className="table table-hover align-middle mb-0 bg-white">
            <thead className="table-light">
              <tr>
                <th>Nome</th>
                <th>Cognome</th>
                <th>Ruolo</th>
                <th className="text-end">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => (
                <tr key={member.id}>
                  <td><strong>{member.nome}</strong></td>
                  <td>{member.cognome}</td>
                  <td>
                    <span className="badge bg-info text-dark">
                      {member.ruolo || "Membro"}
                    </span>
                  </td>
                  <td className="text-end">
                    {/* Pulsante Modifica */}
                    <button
                      className="add-new-task me-2"
                      style={{ backgroundColor: "#ffc107", color: "#fff" }}
                      onClick={() => openEditModal(member)}
                    >
                      <b>
                        <i className="bi bi-pencil-fill me-1"></i> Modifica
                      </b>
                    </button>
                    {/* Pulsante Elimina */}
                    <button
                      className="add-new-task"
                      style={{ backgroundColor: "#dc3545", color: "#fff" }}
                      onClick={() => handleDelete(member.id, `${member.nome} ${member.cognome}`)}
                    >
                      <b>
                        <i className="bi bi-trash-fill me-1"></i> Elimina
                      </b>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale Unificata */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-3">
          <h3>{editingMember ? "Modifica Membro" : "Registra Nuovo Membro"}</h3>
          <form onSubmit={handleSubmit} className="mt-3">
            <div className="mb-3">
              <label className="form-label">Nome *</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className="form-control"
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Cognome *</label>
              <input
                type="text"
                name="cognome"
                value={formData.cognome}
                onChange={handleInputChange}
                className="form-control"
                required
              />
            </div>

            {!editingMember && (
              <>
                <div className="mb-3">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>
              </>
            )}

            <div className="mb-3">
              <label className="form-label">Ruolo</label>
              <select
                name="ruolo"
                value={formData.ruolo}
                onChange={handleInputChange}
                className="form-select"
              >
                {RUOLI_DISPONIBILI.map((r, i) => (
                  <option key={i} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              {/* Pulsante Annulla rosso con stile add-new-task */}
              <button
                type="button"
                className="add-new-task"
                style={{ backgroundColor: "#dc3545", color: "#fff" }}
                onClick={() => setIsModalOpen(false)}
              >
                <b>Annulla</b>
              </button>
              {/* Pulsante di conferma */}
              <button type="submit" className="add-new-task">
                <b>{editingMember ? "Salva Modifiche" : "Registra"}</b>
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

export default TeamManagement;