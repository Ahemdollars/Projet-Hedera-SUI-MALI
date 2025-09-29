import React, { useState } from 'react';
import axios from 'axios';
import './PolicePortal.css'; // On peut réutiliser le style du portail de la police

const API_URL = import.meta.env.VITE_API_URL;

// Ce composant est un modèle qui reçoit des instructions spécifiques via les "props"
function GenericPortal({ user, onSignOut, portalName, documentName, apiEndpoint, apiSubPath, statusField }) {
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
      const url = `${API_URL}${apiEndpoint}/${plaque}/${apiSubPath}`;
      const response = await axios.put(url, { nouveau_statut: nouveauStatut });
      setSearchResult(response.data.vehicule);
      setMessage(`Statut de ${documentName} mis à jour à '${nouveauStatut}'.`);
    } catch (err) {
      setError('Impossible de mettre à jour le statut.');
    }
  };

  return (
    <div className="portal-container">
      <header className="portal-header">
        <h1>{portalName}</h1>
        <div className="user-info">
          <span>Agent {user.username}</span>
          <button onClick={onSignOut} className="logout-button">Se déconnecter</button>
        </div>
      </header>

      <main className="portal-content">
        <div className="search-widget">
          <h2>Gérer {documentName}</h2>
          <form onSubmit={handleSearch}>
            <input type="text" value={plaque} onChange={(e) => setPlaque(e.target.value.toUpperCase())} placeholder="Entrez une plaque d'immatriculation" />
            <button type="submit" disabled={loading}>{loading ? 'Recherche...' : 'Rechercher'}</button>
          </form>
        </div>

        {error && <p className="error-message">{error}</p>}
        {message && <p style={{textAlign: 'center', color: 'green', fontWeight: 'bold'}}>{message}</p>}

        {searchResult && (
          <div className="results-widget">
            <div className="result-grid">
              <div className="result-section">
                <h4>Véhicule: {searchResult.marque} {searchResult.modele}</h4>
                <p><strong>Plaque:</strong> {searchResult.plaque_immatriculation}</p>
              </div>
              <div className="result-section">
                <h4>Actions sur {documentName}</h4>
                <p><strong>Statut Actuel:</strong> <span className={`status ${searchResult[statusField]}`}>{searchResult[statusField]}</span></p>
                <div className="action-buttons">
                  <button onClick={() => handleStatusUpdate('VALIDE')}>Valider</button>
                  <button onClick={() => handleStatusUpdate('EXPIRÉ')} className="danger">Marquer Expiré</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default GenericPortal;
