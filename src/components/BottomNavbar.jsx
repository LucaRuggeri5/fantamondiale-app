import React from 'react';
import { NavLink } from 'react-router-dom';
import './BottomNavbar.css';

const BottomNavbar = () => {
  return (
    <nav className="bottom-navbar tactical-suite-navigation">
      <NavLink to="/" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        <span className="nav-icon">🏠</span>
        <small className="nav-label">Dashboard</small>
      </NavLink>
      
      <NavLink to="/squadre" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        <span className="nav-icon">🛡️</span>
        <small className="nav-label">Squadre</small>
      </NavLink>
      
      <NavLink to="/calendario" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        <span className="nav-icon">📅</span>
        <small className="nav-label">Calendario</small>
      </NavLink>
      
      <NavLink to="/classifica" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        <span className="nav-icon">🏆</span>
        <small className="nav-label">Classifica</small>
      </NavLink>
    </nav>
  );
};

export default BottomNavbar;