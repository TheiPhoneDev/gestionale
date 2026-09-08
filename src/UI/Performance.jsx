import "../App.css";
import "./taskCard.css"; 
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";

function Performance() {
  const [stats, setStats] = useState([]);
  const [projectStats, setProjectStats] = useState([]);
  const [incompleteTasks, setIncompleteTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Palette di colori per i cerchi delle iniziali
  const avatarColors = [
    "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", 
    "#ec4899", "#06b6d4", "#f97316", "#6366f1"
  ];

  const getInitials = (nome, cognome) => {
    const n = (nome || "").trim().charAt(0);
    const c = (cognome || "").trim().charAt(0);
    if (!n && !c) return "U";
    return `${n}${c}`.toUpperCase();
  };

  const getColor = (index) => {
    return avatarColors[index % avatarColors.length];
  };

  const fetchPerformanceData = async () => {
    setLoading(true);

    // 1. Fetch Profili
    const { data: profili, error: profiliError } = await supabase
      .from("profili")
      .select("id, nome, cognome, ruolo");

    if (profiliError) {
      console.error("Errore recupero profili:", profiliError);
      setLoading(false);
      return;
    }

    // 2. Fetch Task e Task_Profili per i membri
    const { data: taskProfili, error: tpError } = await supabase
      .from("task_profili")
      .select("profilo_id, task(id, stato, scadenza)");

    if (tpError) {
      console.error("Errore recupero task_profili:", tpError);
      setLoading(false);
      return;
    }

    // 3. Fetch Progetti con i relativi Task e Clienti (per l'azienda)
    const { data: progetti, error: progettiError } = await supabase
      .from("progetti")
      .select(`
        id,
        nome,
        stato,
        clienti ( nome, azienda ),
        task (
          id,
          titolo,
          stato,
          created_at,
          scadenza,
          progetti ( id, nome ),
          task_profili (
            profili ( id, nome, cognome )
          )
        )
      `);

    if (progettiError) {
      console.error("Errore recupero progetti:", progettiError);
    }

    const oraAttuale = new Date();
    oraAttuale.setHours(0, 0, 0, 0);

    const threeDaysFromNow = new Date(oraAttuale.getTime() + 3 * 24 * 60 * 60 * 1000);

    // A. Elaborazione Statistiche Membri
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
        const dScadenza = new Date(t.scadenza);
        dScadenza.setHours(0, 0, 0, 0);
        return dScadenza < oraAttuale;
      }).length;

      const tassoCompletamento = totali > 0 ? Math.round((completati / totali) * 100) : 0;

      let indiceQualita = 0;
      if (totali > 0) {
        const baseScore = tassoCompletamento; 
        const percentualeRitardo = (inRitardo / totali) * 100;
        
        indiceQualita = Math.round(baseScore - (percentualeRitardo * 0.5));
        
        if (indiceQualita < 0) indiceQualita = 0;
        if (indiceQualita > 100) indiceQualita = 100;
      }

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
        indiceQualita,
      };
    });

    // B. Elaborazione Statistiche Progetti & Task Incompleti con filtro rigoroso
    const progettiDataFormatted = [];
    const tuttiTaskIncompleti = [];

    (progetti || []).forEach((proj) => {
      const taskDelProgetto = proj.task || [];
      const totaliTask = taskDelProgetto.length;
      const completatiTask = taskDelProgetto.filter(
        (t) => (t.stato || "").toLowerCase() === "done" || (t.stato || "").toLowerCase() === "completato"
      ).length;

      const avanzamento = totaliTask > 0 ? Math.round((completatiTask / totaliTask) * 100) : 0;

      const membriSet = new Map();
      taskDelProgetto.forEach((t) => {
        const statoTask = (t.stato || "").toLowerCase();
        if (statoTask !== "done" && statoTask !== "completato") {
          const dataCreazione = t.created_at ? new Date(t.created_at) : new Date();
          dataCreazione.setHours(0, 0, 0, 0);
          
          const giorniAperti = Math.floor((oraAttuale - dataCreazione) / (1000 * 60 * 60 * 24));

          let isScaduto = false;
          let isInScadenza = false;

          if (t.scadenza) {
            const dataScadenza = new Date(t.scadenza);
            dataScadenza.setHours(0, 0, 0, 0);
            if (dataScadenza < oraAttuale) {
              isScaduto = true;
            } else if (dataScadenza >= oraAttuale && dataScadenza <= threeDaysFromNow) {
              isInScadenza = true;
            }
          }

          // Soglia per "aperto da parecchio tempo" (es. 14 giorni)
          const isApertoDaTempo = giorniAperti >= 14;

          // FILTRO RIGOROSO: Includiamo il task solo se rispetta almeno una delle condizioni critiche
          if (isScaduto || isInScadenza || isApertoDaTempo) {
            const membriAssegnati = t.task_profili
              ? t.task_profili.map((tp) => tp.profili).filter(Boolean)
              : [];

            tuttiTaskIncompleti.push({
              id: t.id,
              titolo: t.titolo || "Senza titolo",
              stato: t.stato || "todo",
              progettoNome: proj.nome,
              giorniAperti: giorniAperti >= 0 ? giorniAperti : 0,
              dataCreazione: t.created_at ? new Date(t.created_at).toLocaleDateString("it-IT") : "-",
              isScaduto,
              isInScadenza,
              isApertoDaTempo,
              membriAssegnati,
            });
          }
        }

        if (t.task_profili) {
          t.task_profili.forEach((tp) => {
            if (tp.profili) {
              membriSet.set(tp.profili.id, tp.profili);
            }
          });
        }
      });

      progettiDataFormatted.push({
        id: proj.id,
        nome: proj.nome,
        cliente: proj.clienti?.azienda || proj.clienti?.nome || "Cliente Privato / NESSUNO",
        statoProgetto: proj.stato || "In corso",
        totaliTask,
        completatiTask,
        avanzamento,
        membriCoinvolti: Array.from(membriSet.values()),
      });
    });

    setStats(performanceData);
    setProjectStats(progettiDataFormatted);
    setIncompleteTasks(tuttiTaskIncompleti);
    setLoading(false);
  };

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const leaderboard = [...stats].sort((a, b) => {
    if (b.indiceQualita !== a.indiceQualita) {
      return b.indiceQualita - a.indiceQualita;
    }
    return b.completati - a.completati;
  });

  const progettiOrdinati = [...projectStats].sort((a, b) => b.avanzamento - a.avanzamento);
  
  const taskIncompletiOrdinati = [...incompleteTasks].sort((a, b) => {
    if (a.isScaduto !== b.isScaduto) return a.isScaduto ? -1 : 1;
    if (a.isInScadenza !== b.isInScadenza) return a.isInScadenza ? -1 : 1;
    return b.giorniAperti - a.giorniAperti;
  });

  const renderRankBadge = (rank) => {
    switch (rank) {
      case 0:
        return (
          <span
            className="badge rounded-circle text-dark d-inline-flex align-items-center justify-content-center fw-bold shadow-sm"
            style={{ width: "32px", height: "32px", backgroundColor: "#f59e0b", fontSize: "0.95rem" }}
          >
            1
          </span>
        );
      case 1:
        return (
          <span
            className="badge rounded-circle text-dark d-inline-flex align-items-center justify-content-center fw-bold shadow-sm"
            style={{ width: "32px", height: "32px", backgroundColor: "#9ca3af", fontSize: "0.95rem" }}
          >
            2
          </span>
        );
      case 2:
        return (
          <span
            className="badge rounded-circle text-white d-inline-flex align-items-center justify-content-center fw-bold shadow-sm"
            style={{ width: "32px", height: "32px", backgroundColor: "#b45309", fontSize: "0.95rem" }}
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
      ) : (
        <>
          {/* SEZIONE 1: KPI PROGETTI */}
          <div className="card shadow-sm border-0 rounded-4 mb-5 p-4 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h4 className="fw-bold mb-0">Performance Progetti</h4>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill">
                Monitoraggio Avanzamento
              </span>
            </div>

            {progettiOrdinati.length === 0 ? (
              <div className="alert alert-light text-muted">Nessun progetto trovato.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "70px" }}>Rank</th>
                      <th>Progetto & Cliente</th>
                      <th className="text-center">Task (Completati / Tot)</th>
                      <th>Membri del Team Coinvolti</th>
                      <th className="text-center" style={{ width: "180px" }}>Avanzamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progettiOrdinati.map((proj, index) => (
                      <tr key={proj.id}>
                        <td>
                          <div className="d-flex align-items-center justify-content-center fw-bold">
                            {renderRankBadge(index)}
                          </div>
                        </td>
                        <td>
                          <div className="fw-bold text-dark">{proj.nome}</div>
                          <small className="text-muted">
                            <i className="bi bi-building me-1"></i>
                            {proj.cliente}
                          </small>
                        </td>
                        <td className="text-center fw-semibold text-success">
                          {proj.completatiTask} / {proj.totaliTask}
                        </td>
                        <td>
                          {proj.membriCoinvolti.length === 0 ? (
                            <span className="text-muted small">Nessun membro assegnato</span>
                          ) : (
                            <div className="d-flex flex-wrap gap-1">
                              {proj.membriCoinvolti.map((m, mIdx) => (
                                <span
                                  key={m.id || mIdx}
                                  className="badge bg-light text-dark border px-2 py-1"
                                  title={`${m.nome} ${m.cognome}`}
                                >
                                  {m.nome} {m.cognome}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="d-flex align-items-center gap-2">
                            <div className="progress flex-grow-1" style={{ height: "8px" }}>
                              <div
                                className={`progress-bar ${
                                  proj.avanzamento >= 80
                                    ? "bg-success"
                                    : proj.avanzamento >= 40
                                    ? "bg-warning"
                                    : "bg-secondary"
                                }`}
                                role="progressbar"
                                style={{ width: `${proj.avanzamento}%` }}
                              ></div>
                            </div>
                            <span className="small fw-bold">{proj.avanzamento}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SEZIONE 2: TASK CRITICI / INCOMPLETI */}
          <div className="card shadow-sm border-0 rounded-4 mb-5 p-4 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h4 className="fw-bold mb-0">Task Critici (Scaduti, In Scadenza o Aperti da Tempo)</h4>
              <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 rounded-pill">
                Richiedono Attenzione
              </span>
            </div>

            {taskIncompletiOrdinati.length === 0 ? (
              <div className="alert alert-success border-0 rounded-3">
                Ottimo! Non ci sono task critici o aperti da troppi giorni nel sistema.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Task</th>
                      <th>Progetto</th>
                      <th>Membri Assegnati</th>
                      <th className="text-center">Motivo Criticità</th>
                      <th className="text-center">Giorni Aperti</th>
                      <th className="text-center">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskIncompletiOrdinati.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.titolo}</strong>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border px-2 py-1">
                            <i className="bi bi-folder me-1"></i>
                            {t.progettoNome}
                          </span>
                        </td>
                        <td>
                          {t.membriAssegnati.length === 0 ? (
                            <span className="text-muted small">Non assegnato</span>
                          ) : (
                            <div className="d-flex flex-wrap gap-1">
                              {t.membriAssegnati.map((m, mIdx) => (
                                <span key={m.id || mIdx} className="badge bg-secondary-subtle text-secondary px-2 py-1">
                                  {m.nome} {m.cognome}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="d-flex flex-column align-items-center gap-1">
                            {t.isScaduto && (
                              <span className="badge bg-danger text-white px-2 py-1">
                                <i className="bi bi-exclamation-octagon me-1"></i>Scaduto
                              </span>
                            )}
                            {t.isInScadenza && (
                              <span className="badge bg-warning text-dark px-2 py-1">
                                <i className="bi bi-clock me-1"></i>In Scadenza
                              </span>
                            )}
                            {t.isApertoDaTempo && (
                              <span className="badge bg-secondary text-white px-2 py-1">
                                <i className="bi bi-hourglass-split me-1"></i>Aperto da tempo
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-center fw-bold text-secondary">
                          {t.giorniAperti} giorni
                        </td>
                        <td className="text-center">
                          <span className="badge bg-warning-subtle text-warning-emphasis border px-2 py-1 text-uppercase">
                            {t.stato}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SEZIONE 3: CLASSIFICA TOP PERFORMER CON INDICE DI QUALITÀ IN % */}
          <div className="card shadow-sm border-0 rounded-4 mb-5 p-4 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h4 className="fw-bold mb-0">Classifica Top Performer (Membri)</h4>
              <span className="badge bg-info-subtle text-info border border-info-subtle px-3 py-2 rounded-pill">
                Classificati per Indice di Qualità
              </span>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "80px" }}>Pos.</th>
                    <th>Membro</th>
                    <th>Ruolo</th>
                    <th className="text-center">Task Completati</th>
                    <th className="text-center">Indice di Qualità</th>
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
                        <span className={`badge ${p.indiceQualita >= 80 ? 'bg-success' : p.indiceQualita >= 50 ? 'bg-warning text-dark' : 'bg-danger'} px-3 py-2 fs-6`}>
                          {p.indiceQualita}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SEZIONE 4: SCHEDE DI DETTAGLIO SINGOLI MEMBRI */}
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
                        <span>Indice di Qualità</span>
                        <span>{p.indiceQualita}%</span>
                      </div>
                      <div className="progress" style={{ height: "10px" }}>
                        <div
                          className={`progress-bar ${
                            p.indiceQualita >= 80
                              ? "bg-success"
                              : p.indiceQualita >= 50
                              ? "bg-warning"
                              : "bg-danger"
                          }`}
                          role="progressbar"
                          style={{ width: `${p.indiceQualita}%` }}
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