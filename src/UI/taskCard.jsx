import "../App.css";
import "./taskCard.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import Modal from "./Modal";
import React, { useState } from "react";
import { teamMembers } from "./TeamMembers";
import Dropdown from "react-bootstrap/Dropdown";

function TaskCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const gestisciScelta = (eventKey) => {
    alert(`Hai selezionato l'opzione: ${eventKey}`);
  };
  return (
    <div className="task-card-home-container">
      <h2 className="taskcardTitle">Assegna Task</h2>
      <p>Crea e assegna task ai membri del team</p>
      <button className="add-new-task" onClick={() => setIsModalOpen(true)}>
        <b>
          <i className="bi bi-plus"></i>
          Crea e assegna
        </b>
      </button>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="modal-internal-content">
          <h3 className="modal-title">Nuovo Task</h3>

          <div className="MioContenitore">
            <div className="form-group">
              <span>Titolo</span>
              <input type="text" name="titleInput" className="form-control" />
            </div>

            <div className="form-group">
              <span>Priorità</span>
              <input
                type="text"
                name="priorityInput"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <span>Scadenza</span>
              <input
                type="date"
                name="scadenzaInput"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <span>Assegna a:</span>
              <Dropdown onSelect={gestisciScelta} className="w-100">
                <Dropdown.Toggle
                  id="dropdown-eventi"
                  className="w-100 text-start"
                >
                  Seleziona membro
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  {teamMembers.map((member) => (
                    <Dropdown.Item key={member.id} eventKey={member.name}>
                      {member.name}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </div>

            <div className="form-group">
              <span>Progetto</span>
              <Dropdown onSelect={gestisciScelta} className="w-100">
                <Dropdown.Toggle
                  id="dropdown-eventi"
                  className="w-100 text-start"
                >
                  Seleziona progetto
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  {teamMembers.map((member) => (
                    <Dropdown.Item key={member.id} eventKey={member.name}>
                      {member.name}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </div>

            {/* La descrizione occupa 2 colonne per dare più spazio */}
            <div className="form-group full-width">
              <span>Descrizione</span>
              <textarea
                name="descrizioneInput"
                className="form-control"
                rows="3"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button
              className="btn btn-custom-create"
              onClick={() => setIsModalOpen(false)}
            >
              Crea
            </button>
            <button
              className="btn btn-custom-cancel"
              onClick={() => setIsModalOpen(false)}
            >
              Annulla
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default TaskCard;
