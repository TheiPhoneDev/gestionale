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

function App() {
  const [paginaMostrata, selezionaPaginaMostrata] = useState("dashboard");
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Carica il profilo dell'utente loggato dalla tabella 'profili'
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
    // Controllo sessione iniziale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      }
      setLoadingAuth(false);
    });

    // Ascolta cambi di stato auth (login/logout)
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

  // Se l'autenticazione è in fase di caricamento
  if (loadingAuth) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Caricamento...</span>
        </div>
      </div>
    );
  }

  // Se l'utente NON è loggato, mostra la pagina di Login
  if (!session) {
    return (
      <LoginPage onLoginSuccess={() => selezionaPaginaMostrata("dashboard")} />
    );
  }

  // Routing delle pagine dell'applicazione
  const mostra = () => {
    if (
      typeof paginaMostrata === "string" &&
      paginaMostrata.startsWith("progetto-")
    ) {
      const projectId = paginaMostrata.replace("progetto-", "");
      return <TaskPage projectId={projectId} />;
    }

    switch (paginaMostrata) {
      case "dashboard":
        return <Dashboard />;
      case "task":
        return <TaskPage />;
      case "clienti":
        return <ClientsPage />;
      case "ganttChart":
        return <Gantt />;
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
