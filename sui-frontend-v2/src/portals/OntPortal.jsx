import React, { useState } from 'react';
import axios from 'axios';
// On peut réutiliser le style du portail de la police
import './PolicePortal.css'; 

const API_URL = import.meta.env.VITE_API_URL;

function OntPortal({ user, onSignOut }) {
  const [plaque, setPlaque] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setSearchResult(null);
    try {
      const response = await axios.get(`${API_URL}/vehicules/${plaque}`);
      setSearchResult(response.data);
    } catch (err) {
      setError(`Aucun véhicule trouvé pour la plaque : ${plaque}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (nouveauStatut) => {
    try {
        const response = await axios.put(`${API_URL}/ont/vehicules/${plaque}/carte-grise`, {
            nouveau_statut: nouveauStatut
        });
        setSearchResult(response.data.vehicule); // Mettre à jour l'affichage avec les nouvelles données
        setMessage(`Statut de la carte grise mis à jour à '${nouveauStatut}'.`);
    } catch (err) {
        setError('Impossible de mettre à jour le statut.');
    }
  };

  return (
    <div className="portal-container">
      <header className="portal-header">
        <h1>Portail de l'Office National des Transports</h1>
        <div className="user-info">
          <span>Agent {user.username}</span>
          <button onClick={onSignOut} className="logout-button">Se déconnecter</button>
        </div>
      </header>

      <main className="portal-content">
        <div className="search-widget">
          <h2>Gérer une Carte Grise</h2>
          <form onSubmit={handleSearch}>
            <input 
              type="text" 
              value={plaque}
              onChange={(e) => setPlaque(e.target.value.toUpperCase())}
              placeholder="Entrez une plaque d'immatriculation" 
            />
            <button type="submit" disabled={loading}>{loading ? 'Recherche...' : 'Rechercher'}</button>
          </form>
        </div>

        {error && <p className="error-message">{error}</p>}
        {message && <p style={{textAlign: 'center', color: 'green', fontWeight: 'bold'}}>{message}</p>}

        {searchResult && (
          <div className="results-widget">
            <div className="result-grid">
              <div className="result-section">
                <h4>Informations Véhicule</h4>
                {/* ... (informations du véhicule) ... */}
                <p><strong>Marque:</strong> {searchResult.marque}</p>
                <p><strong>Modèle:</strong> {searchResult.modele}</p>
              </div>
              <div className="result-section">
                <h4>Actions sur la Carte Grise</h4>
                <p><strong>Statut Actuel:</strong> <span className={`status ${searchResult.statut_carte_grise}`}>{searchResult.statut_carte_grise}</span></p>
                <div className="action-buttons">
                    <button onClick={() => handleStatusUpdate('VALIDE')}>Valider</button>
                    <button onClick={() => handleStatusUpdate('EXPIRÉ')} className="danger">Marquer Expirée</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default OntPortal;