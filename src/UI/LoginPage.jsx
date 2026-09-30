import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import "./LoginPage.css";

function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      if (onLoginSuccess) onLoginSuccess(data.user);
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <i className="bi bi-person-circle" />
          </div>

          <div>
            <h1>Accedi al Gestionale</h1>
            <p>Inserisci le tue credenziali per continuare.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="login-error">
            <i className="bi bi-exclamation-circle-fill" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-form-group">
            <label htmlFor="login-email">Email</label>

            <div className="login-input-wrapper">
              <i className="bi bi-envelope" />

              <input
                id="login-email"
                type="email"
                placeholder="nome@azienda.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="login-form-group">
            <label htmlFor="login-password">Password</label>

            <div className="login-input-wrapper">
              <i className="bi bi-lock" />

              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-button"
            disabled={loading}
          >
            <i
              className={
                loading
                  ? "bi bi-hourglass-split"
                  : "bi bi-box-arrow-in-right"
              }
            />

            {loading ? "Accesso in corso..." : "Accedi"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
