import "../App.css";
import "./cardHome.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js"; // Client per istanza isolata
import Modal from "./Modal";
import { supabase } from "../supabaseClient";

// Array dei ruoli disponibili
const RUOLI_DISPONIBILI = [
  "Developer",
  "Designer",
  "Project Manager",
  "Tester",
  "Membro",
];

// Palette di colori per gli avatar
const COLORI_AVATAR = [
  "#0d6efd", // Blu
  "#6f42c1", // Viola
  "#d63384", // Rosa
  "#dc3545", // Rosso
  "#fd7e14", // Arancione
  "#198754", // Verde
  "#20c997", // Smeraldo
  "#0dcaf0", // Azzurro
];

function CardHome() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stato per i dati del form
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nome: "",
    cognome: "",
    ruolo: RUOLI_DISPONIBILI[0],
  });

  // Caricamento dei membri dal DB
  const fetchTeam = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profili")
      .select("id, nome, cognome, ruolo");

    if (error) {
      console.error("Errore durante il caricamento del team:", error);
    } else if (data) {
      setTeam(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  // Gestione input form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Registrazione nuovo utente
  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailPulita = formData.email.trim();

    if (!emailPulita || !formData.password || !formData.nome || !formData.cognome) {
      alert("Compila tutti i campi obbligatori (Email, Password, Nome, Cognome)");
      return;
    }

    if (formData.password.length < 6) {
      alert("La password deve contenere almeno 6 caratteri.");
      return;
    }

    try {
      // Variabili d'ambiente gestite nativamente da Vite
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Variabili VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY non trovate nel file .env!");
      }

      // 1. Client temporaneo isolato (persistSession: false impedisce il logout dell'admin)
      const tempSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
        },
      });

      // 2. Registriamo il nuovo utente usando il client temporaneo
      const { data, error } = await tempSupabase.auth.signUp({
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
        console.error("Errore durante la creazione del profilo:", error);
        alert(`Errore Supabase: ${error.message}`);
      } else {
        alert("Nuovo membro registrato con successo!");
        setIsModalOpen(false);
        resetForm();
        fetchTeam(); // Ricarica la lista del team
      }
    } catch (err) {
      console.error("Errore durante la registrazione:", err);
      alert(`Errore: ${err.message || err}`);
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      nome: "",
      cognome: "",
      ruolo: RUOLI_DISPONIBILI[0],
    });
  };

  return (
    <div className="card-home-container">
      <h2 className="cardTitle">Componenti del team</h2>

      {loading ? (
        <p>Caricamento in corso...</p>
      ) : (
        <div className="team-mebers-grid">
          {team.length === 0 ? (
            <p>Nessun membro del team trovato.</p>
          ) : (
            team.map((member, index) => {
              const backgroundColor = COLORI_AVATAR[index % COLORI_AVATAR.length];
              const iniziali = `${(member.nome || "").charAt(0)}${(member.cognome || "").charAt(0)}`.toUpperCase() || "U";

              return (
                <div key={member.id} className="member-space">
                  <div
                    className="rounded-circle text-white d-flex align-items-center justify-content-center mx-auto mb-2 fw-bold shadow-sm"
                    style={{
                      width: "60px",
                      height: "60px",
                      backgroundColor: backgroundColor,
                      fontSize: "1.25rem",
                      letterSpacing: "1px",
                    }}
                  >
                    {iniziali}
                  </div>
                  <h3>{member.nome}</h3>
                  <h5>{member.cognome}</h5>
                  {member.ruolo && <small className="text-muted">{member.ruolo}</small>}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pulsante per aprire la modale */}
      <button className="add-new-member" onClick={() => setIsModalOpen(true)}>
        <b>
          Gestisci team <i className="bi bi-person-plus-fill ms-1"></i>
        </b>
      </button>

      {/* Modale creazione nuovo membro */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="modal-internal-content">
          <h3 className="modal-title mb-3">Registra Nuovo Membro</h3>

          <form onSubmit={handleSubmit} className="MioContenitore">
            <div className="form-group">
              <span>Nome *</span>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Es. Mario"
                required
              />
            </div>

            <div className="form-group">
              <span>Cognome *</span>
              <input
                type="text"
                name="cognome"
                value={formData.cognome}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Es. Rossi"
                required
              />
            </div>

            <div className="form-group">
              <span>Email *</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-control"
                placeholder="mario.rossi@email.com"
                required
              />
            </div>

            <div className="form-group">
              <span>Password *</span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Minimo 6 caratteri"
                required
              />
            </div>

            <div className="form-group full-width">
              <span>Ruolo</span>
              <select
                name="ruolo"
                value={formData.ruolo}
                onChange={handleInputChange}
                className="form-select"
              >
                {RUOLI_DISPONIBILI.map((ruoloOption, index) => (
                  <option key={index} value={ruoloOption}>
                    {ruoloOption}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions mt-3 full-width">
              <button type="submit" className="btn btn-primary">
                Salva e Registra
              </button>
              <button
                type="button"
                className="btn btn-custom-cancel"
                onClick={() => setIsModalOpen(false)}
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

export default CardHome;