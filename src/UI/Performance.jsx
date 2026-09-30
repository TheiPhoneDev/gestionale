import React, { useEffect, useState } from "react";

import "../App.css";
import "./TaskPage.css";
import "./Performance.css";

import "bootstrap-icons/font/bootstrap-icons.min.css";

import { supabase } from "../supabaseClient";

function Performance() {
  const [stats, setStats] = useState([]);
  const [projectStats, setProjectStats] = useState([]);
  const [incompleteTasks, setIncompleteTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Palette di colori per i cerchi delle iniziali
  const avatarColors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#f97316",
    "#6366f1",
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

    // 3. Fetch Progetti con i relativi Task e Clienti
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

    const threeDaysFromNow = new Date(
      oraAttuale.getTime() + 3 * 24 * 60 * 60 * 1000
    );

    // A. Elaborazione Statistiche Membri
    const performanceData = profili.map((p) => {
      const assegnazioni = taskProfili.filter(
        (tp) => tp.profilo_id === p.id
      );

      const userTasks = assegnazioni
        .map((tp) => tp.task)
        .filter(Boolean);

      const totali = userTasks.length;

      const completati = userTasks.filter(
        (t) =>
          (t.stato || "").toLowerCase() === "done" ||
          (t.stato || "").toLowerCase() === "completato"
      ).length;

      const inCorso = userTasks.filter(
        (t) =>
          (t.stato || "").toLowerCase() === "in_progress" ||
          (t.stato || "").toLowerCase() === "in_corso"
      ).length;

      const daFare = userTasks.filter(
        (t) => (t.stato || "").toLowerCase() === "todo"
      ).length;

      const inRitardo = userTasks.filter((t) => {
        const isCompleted =
          (t.stato || "").toLowerCase() === "done" ||
          (t.stato || "").toLowerCase() === "completato";

        if (isCompleted || !t.scadenza) return false;

        const dScadenza = new Date(t.scadenza);
        dScadenza.setHours(0, 0, 0, 0);

        return dScadenza < oraAttuale;
      }).length;

      const tassoCompletamento =
        totali > 0 ? Math.round((completati / totali) * 100) : 0;

      let indiceQualita = 0;

      if (totali > 0) {
        const baseScore = tassoCompletamento;
        const percentualeRitardo = (inRitardo / totali) * 100;

        indiceQualita = Math.round(
          baseScore - percentualeRitardo * 0.5
        );

        if (indiceQualita < 0) indiceQualita = 0;
        if (indiceQualita > 100) indiceQualita = 100;
      }

      return {
        id: p.id,
        nome: p.nome,
        cognome: p.cognome,
        nomeCompleto:
          `${p.nome || ""} ${p.cognome || ""}`.trim() ||
          "Utente Senza Nome",
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

    // B. Elaborazione Statistiche Progetti & Task Incompleti
    const progettiDataFormatted = [];
    const tuttiTaskIncompleti = [];

    (progetti || []).forEach((proj) => {
      const taskDelProgetto = proj.task || [];

      const totaliTask = taskDelProgetto.length;

      const completatiTask = taskDelProgetto.filter(
        (t) =>
          (t.stato || "").toLowerCase() === "done" ||
          (t.stato || "").toLowerCase() === "completato"
      ).length;

      const avanzamento =
        totaliTask > 0
          ? Math.round((completatiTask / totaliTask) * 100)
          : 0;

      const membriSet = new Map();

      taskDelProgetto.forEach((t) => {
        const statoTask = (t.stato || "").toLowerCase();

        if (statoTask !== "done" && statoTask !== "completato") {
          const dataCreazione = t.created_at
            ? new Date(t.created_at)
            : new Date();

          dataCreazione.setHours(0, 0, 0, 0);

          const giorniAperti = Math.floor(
            (oraAttuale - dataCreazione) /
              (1000 * 60 * 60 * 24)
          );

          let isScaduto = false;
          let isInScadenza = false;

          if (t.scadenza) {
            const dataScadenza = new Date(t.scadenza);
            dataScadenza.setHours(0, 0, 0, 0);

            if (dataScadenza < oraAttuale) {
              isScaduto = true;
            } else if (
              dataScadenza >= oraAttuale &&
              dataScadenza <= threeDaysFromNow
            ) {
              isInScadenza = true;
            }
          }

          const isApertoDaTempo = giorniAperti >= 14;

          if (
            isScaduto ||
            isInScadenza ||
            isApertoDaTempo
          ) {
            const membriAssegnati = t.task_profili
              ? t.task_profili
                  .map((tp) => tp.profili)
                  .filter(Boolean)
              : [];

            tuttiTaskIncompleti.push({
              id: t.id,
              titolo: t.titolo || "Senza titolo",
              stato: t.stato || "todo",
              progettoNome: proj.nome,
              giorniAperti:
                giorniAperti >= 0 ? giorniAperti : 0,
              dataCreazione: t.created_at
                ? new Date(t.created_at).toLocaleDateString(
                    "it-IT"
                  )
                : "-",
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
        cliente:
          proj.clienti?.azienda ||
          proj.clienti?.nome ||
          "Cliente Privato / NESSUNO",
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

  const progettiOrdinati = [...projectStats].sort(
    (a, b) => b.avanzamento - a.avanzamento
  );

  const taskIncompletiOrdinati = [...incompleteTasks].sort(
    (a, b) => {
      if (a.isScaduto !== b.isScaduto) {
        return a.isScaduto ? -1 : 1;
      }

      if (a.isInScadenza !== b.isInScadenza) {
        return a.isInScadenza ? -1 : 1;
      }

      return b.giorniAperti - a.giorniAperti;
    }
  );

  const renderRankBadge = (rank) => {
    if (rank === 0) {
      return (
        <span className="performance-rank performance-rank-gold">
          1
        </span>
      );
    }

    if (rank === 1) {
      return (
        <span className="performance-rank performance-rank-silver">
          2
        </span>
      );
    }

    if (rank === 2) {
      return (
        <span className="performance-rank performance-rank-bronze">
          3
        </span>
      );
    }

    return (
      <span className="performance-rank performance-rank-default">
        {rank + 1}
      </span>
    );
  };

  const getQualityClass = (value) => {
    if (value >= 80) return "performance-quality-high";
    if (value >= 50) return "performance-quality-medium";
    return "performance-quality-low";
  };

  const getProgressClass = (value) => {
    if (value >= 80) return "performance-progress-high";
    if (value >= 40) return "performance-progress-medium";
    return "performance-progress-low";
  };

  const getStatusLabel = (status) => {
    switch ((status || "").toLowerCase()) {
      case "done":
        return "Completato";
      case "completato":
        return "Completato";
      case "in_progress":
        return "In corso";
      case "in_corso":
        return "In corso";
      case "todo":
        return "Da fare";
      default:
        return status || "Da fare";
    }
  };

  return (
    <div className="task-page performance-page">
      {loading ? (
        <div className="task-loading">
          <div className="task-loading-spinner" />
          <p>Caricamento performance...</p>
        </div>
      ) : (
        <>
          {/* HEADER */}
          <div className="task-page-header">
            <div className="task-page-heading">
              

              <div>
                <div className="task-page-title-row">
                  <h1>Performance</h1>

                  <span className="task-company-badge">
                    {stats.length} membri
                  </span>
                </div>

                <p>
                  Panoramica dell&apos;avanzamento dei progetti,
                  dei task critici e delle performance del team.
                </p>
              </div>
            </div>

            <div className="task-page-actions">
              <button
                type="button"
                className="task-page-button secondary"
                onClick={fetchPerformanceData}
              >
                <i className="bi bi-arrow-clockwise" />
                Aggiorna
              </button>
            </div>
          </div>

          {/* KPI */}
          <div className="task-metrics-grid performance-kpi-grid">
            <div className="task-metric-card">
              <div className="task-metric-icon blue">
                <i className="bi bi-kanban-fill" />
              </div>

              <div>
                <span>Progetti</span>
                <strong>{projectStats.length}</strong>
              </div>
            </div>

            <div className="task-metric-card">
              <div className="task-metric-icon purple">
                <i className="bi bi-people-fill" />
              </div>

              <div>
                <span>Membri</span>
                <strong>{stats.length}</strong>
              </div>
            </div>

            <div className="task-metric-card">
              <div className="task-metric-icon orange">
                <i className="bi bi-exclamation-triangle-fill" />
              </div>

              <div>
                <span>Task critici</span>
                <strong>{incompleteTasks.length}</strong>
              </div>
            </div>

            <div className="task-metric-card">
              <div className="task-metric-icon green">
                <i className="bi bi-check-circle-fill" />
              </div>

              <div>
                <span>Task completati</span>
                <strong>
                  {stats.reduce(
                    (total, member) => total + member.completati,
                    0
                  )}
                </strong>
              </div>
            </div>
          </div>

          {/* SEZIONE 1 */}
          <section className="performance-section">
            <div className="performance-section-header">
              <div>
                <h2>Performance Progetti</h2>
                <p>
                  Monitoraggio dell&apos;avanzamento e delle risorse
                  coinvolte.
                </p>
              </div>

              <span className="performance-section-badge blue">
                <i className="bi bi-kanban" />
                {projectStats.length} progetti
              </span>
            </div>

            {progettiOrdinati.length === 0 ? (
              <div className="task-empty">
                <i className="bi bi-kanban" />
                <h3>Nessun progetto trovato</h3>
                <p>
                  Non sono presenti progetti da visualizzare.
                </p>
              </div>
            ) : (
              <div className="task-table-wrapper performance-table-wrapper">
                <table className="task-table performance-table">
                  <thead>
                    <tr>
                      <th className="performance-rank-column">
                        Rank
                      </th>
                      <th>Progetto &amp; Cliente</th>
                      <th className="text-center">
                        Task
                      </th>
                      <th>Membri coinvolti</th>
                      <th className="performance-progress-column">
                        Avanzamento
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {progettiOrdinati.map((proj, index) => (
                      <tr key={proj.id}>
                        <td>
                          <div className="performance-rank-wrapper">
                            {renderRankBadge(index)}
                          </div>
                        </td>

                        <td>
                          <div className="performance-project">
                            <strong>{proj.nome}</strong>

                            <span>
                              <i className="bi bi-building" />
                              {proj.cliente}
                            </span>
                          </div>
                        </td>

                        <td className="text-center">
                          <span className="performance-task-count">
                            <strong>{proj.completatiTask}</strong>
                            <span>/</span>
                            {proj.totaliTask}
                          </span>
                        </td>

                        <td>
                          {proj.membriCoinvolti.length === 0 ? (
                            <span className="performance-muted">
                              Nessun membro assegnato
                            </span>
                          ) : (
                            <div className="performance-members">
                              {proj.membriCoinvolti.map(
                                (m, mIdx) => (
                                  <span
                                    key={m.id || mIdx}
                                    className="performance-member"
                                    title={`${m.nome} ${m.cognome}`}
                                  >
                                    <span
                                      className="performance-member-avatar"
                                      style={{
                                        backgroundColor:
                                          getColor(mIdx),
                                      }}
                                    >
                                      {getInitials(
                                        m.nome,
                                        m.cognome
                                      )}
                                    </span>

                                    <span>
                                      {m.nome} {m.cognome}
                                    </span>
                                  </span>
                                )
                              )}
                            </div>
                          )}
                        </td>

                        <td>
                          <div className="performance-progress">
                            <div className="performance-progress-track">
                              <div
                                className={`performance-progress-fill ${getProgressClass(
                                  proj.avanzamento
                                )}`}
                                style={{
                                  width: `${proj.avanzamento}%`,
                                }}
                              />
                            </div>

                            <span>
                              {proj.avanzamento}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* SEZIONE 2 */}
          <section className="performance-section">
            <div className="performance-section-header">
              <div>
                <h2>Task Critici</h2>
                <p>
                  Task scaduti, prossimi alla scadenza o aperti da
                  troppo tempo.
                </p>
              </div>

              <span className="performance-section-badge red">
                <i className="bi bi-exclamation-triangle-fill" />
                {incompleteTasks.length} da verificare
              </span>
            </div>

            {taskIncompletiOrdinati.length === 0 ? (
              <div className="performance-success-state">
                <div className="performance-success-icon">
                  <i className="bi bi-check-lg" />
                </div>

                <div>
                  <strong>Nessun task critico</strong>
                  <p>
                    Non ci sono task scaduti o aperti da troppo
                    tempo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="task-table-wrapper performance-table-wrapper">
                <table className="task-table performance-table performance-critical-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Progetto</th>
                      <th>Membri assegnati</th>
                      <th className="text-center">
                        Criticità
                      </th>
                      <th className="text-center">
                        Giorni aperti
                      </th>
                      <th className="text-center">
                        Stato
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {taskIncompletiOrdinati.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <div className="performance-task-title">
                            <strong>{t.titolo}</strong>

                            <span>
                              Creazione: {t.dataCreazione}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="performance-project-tag">
                            <i className="bi bi-folder-fill" />
                            {t.progettoNome}
                          </span>
                        </td>

                        <td>
                          {t.membriAssegnati.length === 0 ? (
                            <span className="performance-muted">
                              Non assegnato
                            </span>
                          ) : (
                            <div className="performance-members">
                              {t.membriAssegnati.map(
                                (m, mIdx) => (
                                  <span
                                    key={m.id || mIdx}
                                    className="performance-member"
                                  >
                                    <span
                                      className="performance-member-avatar"
                                      style={{
                                        backgroundColor:
                                          getColor(mIdx),
                                      }}
                                    >
                                      {getInitials(
                                        m.nome,
                                        m.cognome
                                      )}
                                    </span>

                                    <span>
                                      {m.nome} {m.cognome}
                                    </span>
                                  </span>
                                )
                              )}
                            </div>
                          )}
                        </td>

                        <td className="text-center">
                          <div className="performance-critical-badges">
                            {t.isScaduto && (
                              <span className="performance-critical-badge danger">
                                <i className="bi bi-exclamation-octagon-fill" />
                                Scaduto
                              </span>
                            )}

                            {t.isInScadenza && (
                              <span className="performance-critical-badge warning">
                                <i className="bi bi-clock-fill" />
                                In scadenza
                              </span>
                            )}

                            {t.isApertoDaTempo && (
                              <span className="performance-critical-badge neutral">
                                <i className="bi bi-hourglass-split" />
                                Aperto da tempo
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="text-center">
                          <span className="performance-open-days">
                            {t.giorniAperti}
                            <small>giorni</small>
                          </span>
                        </td>

                        <td className="text-center">
                          <span className="performance-status">
                            {getStatusLabel(t.stato)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* SEZIONE 3 */}
          <section className="performance-section">
            <div className="performance-section-header">
              <div>
                <h2>Top Performer</h2>
                <p>
                  Classifica dei membri in base all&apos;indice di
                  qualità.
                </p>
              </div>

              <span className="performance-section-badge purple">
                <i className="bi bi-trophy-fill" />
                Indice di qualità
              </span>
            </div>

            <div className="task-table-wrapper performance-table-wrapper">
              <table className="task-table performance-table">
                <thead>
                  <tr>
                    <th className="performance-rank-column">
                      Pos.
                    </th>
                    <th>Membro</th>
                    <th>Ruolo</th>
                    <th className="text-center">
                      Task completati
                    </th>
                    <th className="text-center">
                      Indice di qualità
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {leaderboard.map((p, index) => (
                    <tr key={p.id}>
                      <td>
                        <div className="performance-rank-wrapper">
                          {renderRankBadge(index)}
                        </div>
                      </td>

                      <td>
                        <div className="performance-person">
                          <div
                            className="performance-person-avatar"
                            style={{
                              backgroundColor: getColor(index),
                            }}
                          >
                            {getInitials(
                              p.nome,
                              p.cognome
                            )}
                          </div>

                          <strong>{p.nomeCompleto}</strong>
                        </div>
                      </td>

                      <td>
                        <span className="performance-role">
                          {p.ruolo}
                        </span>
                      </td>

                      <td className="text-center">
                        <span className="performance-task-count">
                          <strong>{p.completati}</strong>
                          <span>/</span>
                          {p.totali}
                        </span>
                      </td>

                      <td className="text-center">
                        <span
                          className={`performance-quality ${getQualityClass(
                            p.indiceQualita
                          )}`}
                        >
                          {p.indiceQualita}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* SEZIONE 4 */}
          <section className="performance-detail-section">
            <div className="performance-section-header">
              <div>
                <h2>Dettaglio Membri</h2>
                <p>
                  Riepilogo individuale delle attività del team.
                </p>
              </div>
            </div>

            <div className="performance-member-grid">
              {stats.map((p, index) => (
                <article
                  key={p.id}
                  className="performance-member-card"
                >
                  <div className="performance-member-card-header">
                    <div
                      className="performance-large-avatar"
                      style={{
                        backgroundColor: getColor(index),
                      }}
                    >
                      {getInitials(p.nome, p.cognome)}
                    </div>

                    <div className="performance-member-info">
                      <h3>{p.nomeCompleto}</h3>
                      <span>{p.ruolo}</span>
                    </div>
                  </div>

                  <div className="performance-quality-block">
                    <div className="performance-quality-heading">
                      <span>Indice di qualità</span>
                      <strong>{p.indiceQualita}%</strong>
                    </div>

                    <div className="performance-progress-track">
                      <div
                        className={`performance-progress-fill ${getProgressClass(
                          p.indiceQualita
                        )}`}
                        style={{
                          width: `${p.indiceQualita}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="performance-member-stats">
                    <div>
                      <span>Totali</span>
                      <strong>{p.totali}</strong>
                    </div>

                    <div className="success">
                      <span>Done</span>
                      <strong>{p.completati}</strong>
                    </div>

                    <div className="warning">
                      <span>In corso</span>
                      <strong>{p.inCorso}</strong>
                    </div>

                    <div className="danger">
                      <span>Scaduti</span>
                      <strong>{p.inRitardo}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Performance;
