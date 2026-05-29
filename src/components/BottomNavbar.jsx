import React from 'react';
import { NavLink } from 'react-router-dom';
import './BottomNavbar.css';

const BottomNavbar = () => {
  return (
    <nav className="bottom-navbar">
      <NavLink to="/" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        <span>🏠</span>
        <small>Dashboard</small>
      </NavLink>
      
      <NavLink to="/squadre" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        <span>🛡️</span>
        <small>Squadre</small>
      </NavLink>
      
      <NavLink to="/calendario" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        <span>📅</span>
        <small>Calendario</small>
      </NavLink>
      
      <NavLink to="/classifica" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        <span>🏆</span>
        <small>Classifica</small>
      </NavLink>
    </nav>
  );
};

export default BottomNavbar;