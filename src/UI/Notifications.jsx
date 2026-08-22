import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import { supabase } from "../supabaseClient";

function NotificheDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifiche, setNotifiche] = useState([]);
  const [nonLette, setNonLette] = useState(0);
  const dropdownRef = useRef(null);

  const controllaScadenzeTask = async (userId) => {
    if (!userId) return;

    // Recupero i task tramite la tabella di relazione
    const { data: taskAssegnati, error } = await supabase
      .from("task_profili")
      .select(`
        task_id,
        task:task_id ( id, titolo, scadenza, stato )
      `)
      .eq("profilo_id", userId);

    if (error) {
      console.error("DEBUG SUPABASE ERROR:", error);
      return;
    }

    if (!taskAssegnati || taskAssegnati.length === 0) {
      return;
    }

    const oggiStr = new Date().toISOString().split("T")[0];

    // Calcoliamo anche la data di domani in formato YYYY-MM-DD
    const domani = new Date();
    domani.setDate(domani.getDate() + 1);
    const domaniStr = domani.toISOString().split("T")[0];

    for (const item of taskAssegnati) {
      const task = item.task;
      if (!task || !task.scadenza) continue;

      const isDone = ["done", "completato", "completata"].includes((task.stato || "").toLowerCase());
      if (isDone) continue;

      const scadenzaStr = task.scadenza.split("T")[0];

      let titoloNotifica = "";
      let messaggioNotifica = "";

      if (scadenzaStr === oggiStr) {
        titoloNotifica = "Task in scadenza oggi!";
        messaggioNotifica = `Il task "${task.titolo}" scade oggi.`;
      } else if (scadenzaStr < oggiStr) {
        titoloNotifica = "Task scaduto!";
        messaggioNotifica = `Il task "${task.titolo}" è scaduto.`;
      } else if (scadenzaStr === domaniStr) {
        titoloNotifica = "Task in scadenza domani!";
        messaggioNotifica = `Il task "${task.titolo}" scade domani.`;
      }

      if (titoloNotifica) {
        const { data: esistente } = await supabase
          .from("notifiche")
          .select("id")
          .eq("user_id", userId)
          .eq("titolo", titoloNotifica)
          .ilike("messaggio", `%${task.titolo}%`)
          .eq("letta", false);

        if (!esistente || esistente.length === 0) {
          await supabase.from("notifiche").insert([
            {
              user_id: userId,
              titolo: titoloNotifica,
              messaggio: messaggioNotifica,
              letta: false,
            },
          ]);
        }
      }
    }
  };

  // Funzione per caricare le notifiche dal database
  const fetchNotifiche = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notifiche")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifiche(data);
      setNonLette(data.filter((n) => !n.letta).length);
    }
  };

  // Effetto per avviare il controllo scadenze ed eseguire il fetch iniziale
  useEffect(() => {
    const runScadenzeCheck = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await controllaScadenzeTask(user.id);
      }
      fetchNotifiche();
    };

    runScadenzeCheck();
    // Intervallo di controllo impostato a un'ora per evitare chiamate ripetute eccessive
    const interval = setInterval(runScadenzeCheck, 3600000); 
    return () => clearInterval(interval);
  }, []);

  // Chiusura del menu al click esterno
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Aggiornamento locale immediato per evitare loop nelle chiamate
  const segnaComeLetta = async (id, e) => {
    e.stopPropagation();
    await supabase.from("notifiche").update({ letta: true }).eq("id", id);
    
    setNotifiche((prev) => prev.map((n) => (n.id === id ? { ...n, letta: true } : n)));
    setNonLette((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="dropdown position-relative" ref={dropdownRef}>
      <button
        className="btn position-relative p-2 border-0 bg-transparent"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: "40px", height: "40px" }}
      >
        <i className="bi bi-bell-fill fs-5 text-white"></i>

        {nonLette > 0 && (
          <span
            className="position-absolute top-25 start-75 translate-middle badge rounded-pill bg-danger"
            style={{ fontSize: "0.6rem" }}
          >
            {nonLette}
          </span>
        )}
      </button>

      {isOpen && (
        <ul
          className="dropdown-menu dropdown-menu-end shadow-sm border-0 p-2 rounded-4 show position-absolute end-0 mt-2"
          style={{ width: "320px", maxHeight: "400px", overflowY: "auto" }}
        >
          <li className="dropdown-header fw-bold text-dark px-2 pb-2 border-bottom">
            Notifiche
          </li>
          {notifiche.length === 0 ? (
            <li className="dropdown-item text-muted text-center py-3 small">
              Nessuna notifica
            </li>
          ) : (
            notifiche.map((n) => (
              <li
                key={n.id}
                className={`dropdown-item rounded-3 p-2 mb-1 text-wrap ${
                  n.letta ? "bg-white text-muted" : "bg-light fw-medium"
                }`}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="small fw-bold text-primary">{n.titolo}</div>
                    <div
                      className="small text-secondary"
                      style={{ fontSize: "0.8rem" }}
                    >
                      {n.messaggio}
                    </div>
                  </div>
                  {!n.letta && (
                    <button
                      className="btn btn-link p-0 text-success ms-2"
                      onClick={(e) => segnaComeLetta(n.id, e)}
                      title="Segna come letta"
                    >
                      <i className="bi bi-check2 fs-5"></i>
                    </button>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default NotificheDropdown;