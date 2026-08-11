import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";

function ClientsPage() {
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchClienti = async () => {
    setLoading(true);
    setErrorMessage(null);

    // Query con il campo 'telefono' corretto
    const { data, error } = await supabase
      .from("clienti")
      .select("id, nome, azienda, telefono, email")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore Supabase nel recupero dei clienti:", error);
      setErrorMessage(error.message);
    } else if (data) {
      setClienti(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClienti();
  }, []);

  // Filtra i clienti per nome, azienda, telefono o email
  const clientiFiltrati = clienti.filter((c) => {
    if (!searchTerm) return true;
    const ricerca = searchTerm.toLowerCase();

    const nome = (c.nome || "").toLowerCase();
    const azienda = (c.azienda || "").toLowerCase();
    const telefono = (c.telefono || "").toLowerCase();
    const email = (c.email || "").toLowerCase();

    return (
      nome.includes(ricerca) ||
      azienda.includes(ricerca) ||
      telefono.includes(ricerca) ||
      email.includes(ricerca)
    );
  });

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h2>
          <i className="bi bi-people-fill me-2 text-primary"></i>
          Lista Clienti
        </h2>
        <button className="btn btn-outline-primary btn-sm" onClick={fetchClienti}>
          <i className="bi bi-arrow-clockwise me-1"></i> Aggiorna
        </button>
      </div>

      {/* Messaggio di Errore se la query fallisce */}
      {errorMessage && (
        <div className="alert alert-danger shadow-sm mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>Errore DB:</strong> {errorMessage}
        </div>
      )}

      {/* Barra di ricerca */}
      <div className="mb-4">
        <div className="input-group search-bar shadow-sm">
          <span className="input-group-text bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </span>
          <input
            type="text"
            className="form-control border-start-0 ps-0"
            placeholder="Cerca cliente per nome, azienda, telefono o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento clienti...</span>
          </div>
        </div>
      ) : clientiFiltrati.length === 0 ? (
        <div className="alert alert-info shadow-sm">
          {searchTerm
            ? "Nessun cliente corrisponde ai criteri di ricerca."
            : "Nessun cliente registrato nel sistema."}
        </div>
      ) : (
        <div className="table-responsive shadow-sm rounded">
          <table className="table table-hover align-middle mb-0 bg-white">
            <thead className="table-light">
              <tr>
                <th>Nome</th>
                <th>Azienda</th>
                <th>Email</th>
                <th>Numero di Telefono</th>
              </tr>
            </thead>
            <tbody>
              {clientiFiltrati.map((cliente, index) => {
                const nomeMostrato = cliente.nome || "Cliente senza nome";

                return (
                  <tr key={cliente.id || index}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div
                          className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center me-2"
                          style={{ width: "38px", height: "38px", fontWeight: "bold" }}
                        >
                          {(cliente.nome || "C").charAt(0).toUpperCase()}
                        </div>
                        <strong>{nomeMostrato}</strong>
                      </div>
                    </td>
                    <td>
                      {cliente.azienda ? (
                        <span className="badge bg-light text-dark border">
                          <i className="bi bi-building me-1"></i>
                          {cliente.azienda}
                        </span>
                      ) : (
                        <span className="text-muted small">-</span>
                      )}
                    </td>
                    <td>
                      {cliente.email ? (
                        <a
                          href={`mailto:${cliente.email}`}
                          className="text-decoration-none"
                        >
                          <i className="bi bi-envelope me-1"></i>
                          {cliente.email}
                        </a>
                      ) : (
                        <span className="text-muted small">-</span>
                      )}
                    </td>
                    <td>
                      {cliente.telefono ? (
                        <a
                          href={`tel:${cliente.telefono}`}
                          className="text-decoration-none text-dark"
                        >
                          <i className="bi bi-telephone-fill me-2 text-success"></i>
                          {cliente.telefono}
                        </a>
                      ) : (
                        <span className="text-muted small">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ClientsPage;