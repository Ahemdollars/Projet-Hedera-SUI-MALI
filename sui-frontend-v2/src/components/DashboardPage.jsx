import React, { useState, useEffect } from 'react';
import axios from 'axios'; // On importe Axios pour faire des requêtes HTTP
import './DashboardPage.css'; // On importera un peu de style

function DashboardPage({ user, onSignOut }) {
  // On crée des états pour stocker la liste des véhicules et gérer le chargement
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ce "useEffect" se lance une fois, quand le composant est affiché
  useEffect(() => {
    const fetchVehicules = async () => {
      try {
        // On appelle notre API backend pour récupérer la liste des véhicules
        const response = await axios.get('http://localhost:3001/vehicules');
        setVehicules(response.data); // On met les données reçues dans notre état
      } catch (err) {
        setError("Impossible de charger les données des véhicules.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicules();
  }, []); // Le tableau vide signifie "ne s'exécute qu'une fois"

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Tableau de Bord - SIU Mali</h1>
        <div className="user-info">
          <span>Bienvenue, {user.username} !</span>
          <button onClick={onSignOut} className="logout-button">Se déconnecter</button>
        </div>
      </header>
      
      <main className="dashboard-content">
        <h2>Liste des Véhicules Enregistrés</h2>
        
        {loading && <p>Chargement des véhicules...</p>}
        {error && <p className="error-message">{error}</p>}
        
        {!loading && !error && (
          <table className="vehicules-table">
            <thead>
              <tr>
                <th>Plaque</th>
                <th>Marque</th>
                <th>Modèle</th>
                <th>Année</th>
                <th>Couleur</th>
                <th>Statut Général</th>
              </tr>
            </thead>
            <tbody>
              {vehicules.map((vehicule) => (
                <tr key={vehicule.plaque_immatriculation}>
                  <td>{vehicule.plaque_immatriculation}</td>
                  <td>{vehicule.marque}</td>
                  <td>{vehicule.modele}</td>
                  <td>{vehicule.annee}</td>
                  <td>{vehicule.couleur}</td>
                  <td>{vehicule.statut_general}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}

export default DashboardPage;