import { useState } from 'react'
import './App.css'
import Header from './UI/header'
import Sidebar from './UI/sidebar'

import 'bootstrap/dist/css/bootstrap.css';
import "bootstrap-icons/font/bootstrap-icons.min.css";
import Dashboard from './UI/dashboard';
import Gantt from './UI/gant';
import TaskPage from './UI/TaskPage';

function App() {

  const [paginaMostrata, selezionaPaginaMostrata] = useState("dashboard");

  const mostra = () => {

    console.log("La pagina attiva in App.jsx è diventata:", paginaMostrata);

    switch(paginaMostrata) {
      case "dashboard":
        return <Dashboard/>
        case "task":
          return <TaskPage/>
      case "ganttChart":
        return <Gantt/>
      default:
        return <Home/>
    }
  }

  return (
    <div>
      <Header/>
      <Sidebar activePage={paginaMostrata} onPageChange={selezionaPaginaMostrata}/>
      <main className='main-content'>
        {mostra()}
      </main>
    </div>
  )
}

export default App
