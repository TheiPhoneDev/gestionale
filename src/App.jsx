import { useState, useEffect } from "react";

import "./App.css";

import Header from "./UI/header";
import Sidebar from "./UI/sidebar";

import { supabase } from "./supabaseClient";

import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";

import Dashboard from "./UI/dashboard";
import Gantt from "./UI/gant";
import TaskPage from "./UI/TaskPage";
import ProfilePage from "./UI/ProfilePage";
import LoginPage from "./UI/LoginPage";
import ClientsPage from "./UI/ClientsPage";
import TeamManagement from "./UI/TeamManagement";
import Performance from "./UI/Performance";
import ProgettiList from "./UI/Projects";
import ProgettoDettaglio from "./UI/ProjectsDetails";
import Review from "./UI/Review";

import TaskCard from "./UI/taskCard";

function App() {
  const [paginaMostrata, selezionaPaginaMostrata] = useState("dashboard");

  const [session, setSession] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);

  const [loadingAuth, setLoadingAuth] = useState(true);

  // ============================================================
  // COMANDO APERTURA MODALE NUOVO TASK
  // ============================================================

  const [openCreateTask, setOpenCreateTask] = useState(false);

  // ============================================================
  // CONTROLLO DISPOSITIVI MOBILE
  // ============================================================

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();

    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // ============================================================
  // CARICAMENTO PROFILO UTENTE
  // ============================================================

  const loadUserProfile = async (user) => {
    if (!user) {
      setCurrentUser(null);
      return;
    }

    const { data } = await supabase
      .from("profili")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setCurrentUser({
        ...data,
        email: user.email,
      });
    } else {
      setCurrentUser({
        id: user.id,
        email: user.email,
        nome: user.user_metadata?.nome || "",
        cognome: user.user_metadata?.cognome || "",
        ruolo: user.user_metadata?.ruolo || "Membro",
      });
    }
  };

  // ============================================================
  // AUTENTICAZIONE
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setSession(session);

      if (session?.user) {
        await loadUserProfile(session.user);
      }

      if (mounted) {
        setLoadingAuth(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) {
        return;
      }

      setSession(session);

      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ============================================================
  // APERTURA NUOVO TASK DALLA SIDEBAR
  // ============================================================

  const handleCreateTask = () => {
    /*
     * IMPORTANTE:
     * Non andiamo più alla pagina "task".
     *
     * Il TaskCard viene montato direttamente sotto
     * e riceve il comando per aprire il suo modale.
     */

    setOpenCreateTask(true);
  };

  // ============================================================
  // MOBILE
  // ============================================================

  if (isMobile) {
    return (
      <div className="mobile-block-screen">
        <div className="mobile-block-card">
          <div className="mobile-block-icon">
            <i className="bi bi-display" />
          </div>

          <h3>Dispositivo non supportato</h3>

          <p>
            Questa applicazione è ottimizzata esclusivamente per schermi
            Desktop. Si prega di accedere da un computer per continuare ad
            utilizzare la piattaforma.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // AUTH LOADING
  // ============================================================

  if (loadingAuth) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>

          <span>Caricamento...</span>
        </div>
      </div>
    );
  }

  // ============================================================
  // LOGIN
  // ============================================================

  if (!session) {
    return (
      <LoginPage onLoginSuccess={() => selezionaPaginaMostrata("dashboard")} />
    );
  }

  // ============================================================
  // ROUTING INTERNO
  // ============================================================

  const mostra = () => {
    // ----------------------------------------------------------
    // DETTAGLIO PROGETTO
    // ----------------------------------------------------------

    if (
      typeof paginaMostrata === "string" &&
      paginaMostrata.startsWith("progetto-")
    ) {
      const projectId = paginaMostrata.replace("progetto-", "");

      return (
        <ProgettoDettaglio
          progettoId={projectId}
          onBack={(destinazione) => selezionaPaginaMostrata(destinazione)}
        />
      );
    }

    // ----------------------------------------------------------
    // PAGINE
    // ----------------------------------------------------------

    switch (paginaMostrata) {
      case "dashboard":
        return <Dashboard />;

      case "task":
        return <TaskPage />;

      case "projects":
        return (
          <ProgettiList
            onSelectProgetto={(destinazione) =>
              selezionaPaginaMostrata(destinazione)
            }
          />
        );

      case "clienti":
        return <ClientsPage />;

      case "ganttChart":
        return <Gantt />;

      case "review":
        return <Review />;

      case "team":
        return <TeamManagement />;

      case "performance":
        return <Performance />;

      case "profile":
        return (
          <ProfilePage
            currentUser={currentUser}
            onLogout={() => selezionaPaginaMostrata("dashboard")}
          />
        );

      default:
        return <Dashboard />;
    }
  };

  // ============================================================
  // APP LAYOUT
  // ============================================================

  return (
    <div className="app-layout">
      {/* ======================================================
          SIDEBAR
          ====================================================== */}

      <Sidebar
        activePage={paginaMostrata}
        onPageChange={selezionaPaginaMostrata}
        currentUser={currentUser}
        onCreateTask={handleCreateTask}
      />

      {/* ======================================================
          CONTENUTO PRINCIPALE
          ====================================================== */}

      <div className="app-main">
        <Header />

        <main className="main-content">{mostra()}</main>
      </div>

      <TaskCard
        openCreateTask={openCreateTask}
        onCreateTaskOpened={() => setOpenCreateTask(false)}
        hideCard={true}
      />
    </div>
  );
}

export default App;
