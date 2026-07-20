import "../App.css";
import "./taskCard.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import Modal from "./Modal";
import React, { useState } from "react";

function TaskCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          <p>Inserisci qui i dettagli del task da assegnare...</p>
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
