import "../App.css";
import "./taskCard.css"; 
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";

function Performance() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Palette di colori per i cerchi delle iniziali
  const avatarColors = [
    "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", 
    "#ec4899", "#06b6d4", "#f97316", "#6366f1"
  ];

  // Funzione helper per estrarre le iniziali dal nome
  const getInitials = (nome, cognome) => {
    const n = (nome || "").trim().charAt(0);
    const c = (cognome || "").trim().charAt(0);
    if (!n && !c) return "U";
    return `${n}${c}`.toUpperCase();
  };

  // Funzione per assegnare un colore coerente in base all'index
  const getColor = (index) => {
    return avatarColors[index % avatarColors.length];
  };

  const fetchPerformanceData = async () => {
    setLoading(true);

    const { data: profili, error: profiliError } = await supabase
      .from("profili")
      .select("id, nome, cognome, ruolo");

    if (profiliError) {
      console.error("Errore recupero profili:", profiliError);
      setLoading(false);
      return;
    }

    const { data: taskProfili, error: tpError } = await supabase
      .from("task_profili")
      .select("profilo_id, task(id, stato, scadenza)");

    if (tpError) {
      console.error("Errore recupero task_profili:", tpError);
      setLoading(false);
      return;
    }

    const oraAttuale = new Date();

    const performanceData = profili.map((p) => {
      const assegnazioni = taskProfili.filter((tp) => tp.profilo_id === p.id);
      const userTasks = assegnazioni.map((tp) => tp.task).filter(Boolean);

      const totali = userTasks.length;
      const completati = userTasks.filter(
        (t) => (t.stato || "").toLowerCase() === "done" || (t.stato || "").toLowerCase() === "completato"
      ).length;
      const inCorso = userTasks.filter(
        (t) => (t.stato || "").toLowerCase() === "in_progress" || (t.stato || "").toLowerCase() === "in_corso"
      ).length;
      const daFare = userTasks.filter(
        (t) => (t.stato || "").toLowerCase() === "todo"
      ).length;

      const inRitardo = userTasks.filter((t) => {
        const isCompleted =
          (t.stato || "").toLowerCase() === "done" || (t.stato || "").toLowerCase() === "completato";
        if (isCompleted || !t.scadenza) return false;
        return new Date(t.scadenza) < oraAttuale;
      }).length;

      const tassoCompletamento = totali > 0 ? Math.round((completati / totali) * 100) : 0;

      return {
        id: p.id,
        nome: p.nome,
        cognome: p.cognome,
        nomeCompleto: `${p.nome || ""} ${p.cognome || ""}`.trim() || "Utente Senza Nome",
        ruolo: p.ruolo || "Membro del Team",
        totali,
        completati,
        inCorso,
        daFare,
        inRitardo,
        tassoCompletamento,
      };
    });

    setStats(performanceData);
    setLoading(false);
  };

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  // Classifica ordinata per performance
  const leaderboard = [...stats].sort((a, b) => {
    if (b.tassoCompletamento !== a.tassoCompletamento) {
      return b.tassoCompletamento - a.tassoCompletamento;
    }
    if (b.completati !== a.completati) {
      return b.completati - a.completati;
    }
    return a.inRitardo - b.inRitardo;
  });

  // Badge numerici colorati per il podio (senza icone)
  const renderRankBadge = (rank) => {
    switch (rank) {
      case 0:
        return (
          <span
            className="badge rounded-circle text-dark d-inline-flex align-items-center justify-content-center fw-bold shadow-sm"
            style={{ width: "32px", height: "32px", backgroundColor: "#f59e0b", fontSize: "0.95rem" }}
            title="1° Posto"
          >
            1
          </span>
        );
      case 1:
        return (
          <span
            className="badge rounded-circle text-dark d-inline-flex align-items-center justify-content-center fw-bold shadow-sm"
            style={{ width: "32px", height: "32px", backgroundColor: "#9ca3af", fontSize: "0.95rem" }}
            title="2° Posto"
          >
            2
          </span>
        );
      case 2:
        return (
          <span
            className="badge rounded-circle text-white d-inline-flex align-items-center justify-content-center fw-bold shadow-sm"
            style={{ width: "32px", height: "32px", backgroundColor: "#b45309", fontSize: "0.95rem" }}
            title="3° Posto"
          >
            3
          </span>
        );
      default:
        return (
          <span
            className="badge bg-light text-dark border rounded-circle d-inline-flex align-items-center justify-content-center"
            style={{ width: "32px", height: "32px", fontSize: "0.85rem" }}
          >
            {rank + 1}
          </span>
        );
    }
  };

  return (
    <div className="container pt-4 mb-5">
      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      ) : stats.length === 0 ? (
        <div className="alert alert-info">Nessun dipendente trovato nel sistema.</div>
      ) : (
        <>
          {/* Sezione Classifica */}
          <div className="card shadow-sm border-0 rounded-4 mb-5 p-4 bg-white">
            <h4 className="fw-bold mb-4">
              Classifica Top Performer
            </h4>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "80px" }}>Pos.</th>
                    <th>Membro</th>
                    <th>Ruolo</th>
                    <th className="text-center">Task Completati</th>
                    <th className="text-center">Tasso Completamento</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((p, index) => (
                    <tr key={p.id}>
                      <td>
                        <div className="d-flex align-items-center justify-content-center fw-bold">
                          {renderRankBadge(index)}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold me-2"
                            style={{
                              width: "36px",
                              height: "36px",
                              backgroundColor: getColor(index),
                              fontSize: "0.85rem",
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(p.nome, p.cognome)}
                          </div>
                          <strong>{p.nomeCompleto}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="text-muted small text-capitalize">{p.ruolo}</span>
                      </td>
                      <td className="text-center fw-bold text-success">
                        {p.completati} / {p.totali}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${p.tassoCompletamento >= 80 ? 'bg-success' : p.tassoCompletamento >= 50 ? 'bg-warning text-dark' : 'bg-danger'} px-3 py-2 fs-6`}>
                          {p.tassoCompletamento}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sezione Schede Singole */}
          <h4 className="fw-bold mb-3">Dettaglio Membri</h4>
          <div className="row g-4">
            {stats.map((p, index) => (
              <div key={p.id} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm border-0">
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-3">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold me-3"
                        style={{
                          width: "48px",
                          height: "48px",
                          backgroundColor: getColor(index),
                          fontSize: "1.1rem",
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(p.nome, p.cognome)}
                      </div>
                      <div style={{ overflow: "hidden" }}>
                        <h5 className="card-title mb-0 text-truncate">{p.nomeCompleto}</h5>
                        <small className="text-muted text-capitalize text-truncate d-block">
                          {p.ruolo}
                        </small>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between small fw-bold mb-1">
                        <span>Tasso Completamento</span>
                        <span>{p.tassoCompletamento}%</span>
                      </div>
                      <div className="progress" style={{ height: "10px" }}>
                        <div
                          className={`progress-bar ${
                            p.tassoCompletamento >= 80
                              ? "bg-success"
                              : p.tassoCompletamento >= 50
                              ? "bg-warning"
                              : "bg-danger"
                          }`}
                          role="progressbar"
                          style={{ width: `${p.tassoCompletamento}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="row text-center g-2 mt-2">
                      <div className="col-3">
                        <div className="p-2 border rounded bg-light">
                          <small className="d-block text-muted">Totali</small>
                          <strong className="fs-6">{p.totali}</strong>
                        </div>
                      </div>
                      <div className="col-3">
                        <div className="p-2 border rounded bg-light">
                          <small className="d-block text-success">Done</small>
                          <strong className="fs-6 text-success">{p.completati}</strong>
                        </div>
                      </div>
                      <div className="col-3">
                        <div className="p-2 border rounded bg-light">
                          <small className="d-block text-warning">In Corso</small>
                          <strong className="fs-6 text-warning">{p.inCorso}</strong>
                        </div>
                      </div>
                      <div className="col-3">
                        <div className="p-2 border rounded bg-light">
                          <small className="d-block text-danger">Scaduti</small>
                          <strong className="fs-6 text-danger">{p.inRitardo}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Performance;