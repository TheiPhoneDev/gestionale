import "../App.css";
import "./cardHome.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import Logo from "../assets/react.svg";


function CardHome() {
    return(
        <div className="card-home-container">
            <h2 className="cardTitle">Componenti del team</h2>
            <div className="team-mebers-grid">
                {teamMembers.map((member) => {
                    return(
                        <div key={member.id} className="member-space">
                        <img src={member.photo} alt="" />
                        <h3>{member.name}</h3>
                        <h5>{member.lastName}</h5>
                    </div>
                    )
                })}
            </div>
            <button className="add-new-member">
                <b>Gestisci team<i className="bi bi-chevron-right"></i></b>
            </button>
        </div>
    )
}

export default CardHome

const teamMembers = [
    {
        id: "teamMember1",
        name: "Mario",
        lastName: "Rossi",
        role: "Admin",
        photo: Logo,

    },
    {
        id: "teamMember2",
        name: "Francesco",
        lastName: "Verdi",
        role: "Developer",
        photo: Logo,

    },
    {
        id: "teamMember3",
        name: "Flavia",
        lastName: "Rossani",
        role: "Designer",
        photo: Logo,

    },
    {
        id: "teamMember4",
        name: "Marco",
        lastName: "Rossi",
        role: "Developer",
        photo: Logo,

    },
]