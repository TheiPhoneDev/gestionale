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

function App() {
  const [paginaMostrata, selezionaPaginaMostrata] = useState("dashboard");
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  // Stato per gestire il blocco mobile
  const [isMobile, setIsMobile] = useState(false);

  // Controllo dimensioni schermo per bloccare i dispositivi mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
      setCurrentUser({ ...data, email: user.email });
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      }
      setLoadingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isMobile) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center vh-100 text-center p-4 bg-light">
        <div className="card shadow border-0 p-4 max-w-md rounded-4" style={{ maxWidth: "400px" }}>
          <div className="text-primary mb-3">
            <i className="bi bi-display fs-1"></i>
          </div>
          <h3 className="fw-bold mb-2">Dispositivo non supportato</h3>
          <p className="text-muted mb-0">
            Questa applicazione è ottimizzata esclusivamente per schermi Desktop. Si prega di accedere da un computer per continuare ad utilizzare la piattaforma.
          </p>
        </div>
      </div>
    );
  }

  if (loadingAuth) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Caricamento...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginPage onLoginSuccess={() => selezionaPaginaMostrata("dashboard")} />
    );
  }

  // Routing delle pagine dell'applicazione
  const mostra = () => {
    // Se la pagina attiva è un singolo progetto, mostra ProgettoDettaglio passandogli ID e funzione onBack[cite: 5]
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

    switch (paginaMostrata) {
      case "dashboard":
        return <Dashboard />;
      case "task":
        return <TaskPage />;
      case "projects": 
        return <ProgettiList onSelectProgetto={(destinazione) => selezionaPaginaMostrata(destinazione)} />;
      case "clienti":
        return <ClientsPage />;
      case "ganttChart":
        return <Gantt />;
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

  return (
    <div>
      <Header />
      <Sidebar
        activePage={paginaMostrata}
        onPageChange={selezionaPaginaMostrata}
        currentUser={currentUser}
      />
      <main className="main-content">{mostra()}</main>
    </div>
  );
}

export default App;