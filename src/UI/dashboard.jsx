import "../App.css";
import "./dashboard.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

import CardHome from './cardHome';
import TaskCard from './taskCard';
import ProjectCard from "./ProjectCard";
import ClientCard from "./ClientCard";

function Dashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profilo, error } = await supabase
            .from("profili")
            .select("ruolo")
            .eq("id", user.id)
            .single();

          if (!error && profilo) {
            const ruoloLower = (profilo.ruolo || "").toLowerCase();
            if (ruoloLower === "admin" || ruoloLower === "administrator") {
              setIsAdmin(true);
            }
          }
        }
      } catch (err) {
        console.error("Errore nel controllo dei permessi:", err);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Caricamento dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Dashboard</h1>

      {/* Visibile solo agli Admin */}
      {isAdmin && (
        <div className="dashboard-section">
          <CardHome />
        </div>
      )}

      {/* Griglia per le 3 card rimaste */}
      <div className="dashboard-grid">
        <TaskCard />
        <ClientCard />
        <ProjectCard />
      </div>
    </div>
  );
}

export default Dashboard;