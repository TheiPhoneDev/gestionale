import "./header.css";

import "bootstrap-icons/font/bootstrap-icons.min.css";

import NotificheDropdown from "./Notifications";

function Header() {
  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="header-menu-button"
          aria-label="Menu"
        >
          <i className="bi bi-list" />
        </button>

      
      </div>

      <div className="header-actions">
        <NotificheDropdown />
      </div>
    </header>
  );
}

export default Header;