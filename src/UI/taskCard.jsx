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
      <p>Crea e assegna task a uno o più membri del team</p>
      <button className="add-new-task" onClick={() => setIsModalOpen(true)}>
        <b>
          <i className="bi bi-plus"></i>
          Crea e assegna
        </b>
      </button>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="modal-internal-content">
          <h3>Nuovo Task</h3>
          <label class="MioContenitore">
            <span>Titolo</span>
            <input type="text" name="titleInput" />

            <span>Descrizione</span>
            <input type="text" name="descrizioneInput" />

            <span>Priorità</span>
            <input type="text" name="priorityInput" />

            <span>Scadenza</span>
            <input type="text" name="descrizioneInput" />

            <span>Assegna a:</span>
            <Dropdown onSelect={gestisciScelta}>
              <Dropdown.Toggle id="dropdown-eventi">
                Seleziona membro
              </Dropdown.Toggle>

              <Dropdown.Menu>
                {teamMembers.map((member) => {
                  return(
                    <Dropdown.Item key={member.id} eventKey={member.name}>
                        {member.name}
                    </Dropdown.Item>
                  )
                })}
              </Dropdown.Menu>
            </Dropdown>

          </label>
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(false)}
          >
            Crea
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setIsModalOpen(false)}
          >
            Annulla
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default TaskCard;
