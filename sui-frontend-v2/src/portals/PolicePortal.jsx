import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './PolicePortal.css';

const API_URL = import.meta.env.VITE_API_URL;

function PolicePortal({ user, onSignOut }) {
  const [plaque, setPlaque] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // On utilise une "ref" pour garder une trace de la plaque recherchée,
  // accessible à tout moment par notre écouteur d'événements.
  const currentPlaqueRef = useRef(null);

  useEffect(() => {
    // On établit la connexion au serveur WebSocket une seule fois.
    const socket = io(API_URL);
    socket.on('connect', () => {
      console.log('Connecté au serveur en temps réel.');
    });

    // On écoute les événements de mise à jour.
    socket.on('vehicle_updated', (data) => {
      console.log('Notification reçue pour la plaque :', data.plaque);
      
      // Si la plaque du message correspond à la plaque actuellement affichée...
      if (currentPlaqueRef.current && data.plaque === currentPlaqueRef.current) {
        console.log('Mise à jour automatique de l\'affichage...');
        // ...on rafraîchit les données.
        fetchVehicleData(data.plaque);
      }
    });

    // On se déconnecte quand l'utilisateur quitte la page.
    return () => {
      socket.disconnect();
    };
  }, []); // Le tableau vide [] garantit que ceci ne s'exécute qu'une seule fois.

  const fetchVehicleData = async (plaqueToFetch) => {
    try {
      const response = await axios.get(`${API_URL}/vehicules/${plaqueToFetch}`);
      setSearchResult(response.data);
      currentPlaqueRef.current = plaqueToFetch; // On met à jour la plaque actuelle
    } catch (err) {
      setError(`Impossible de charger les données pour la plaque : ${plaqueToFetch}`);
      setSearchResult(null);
      currentPlaqueRef.current = null;
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!plaque) return;
    setLoading(true);
    setError('');
    setSearchResult(null);
    currentPlaqueRef.current = plaque; // On met à jour avant la recherche

    try {
      await fetchVehicleData(plaque);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError(`Aucun véhicule trouvé pour la plaque : ${plaque}`);
      } else {
        setError("Erreur de communication avec le serveur.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-container">
      <header className="portal-header">
        <h1>Portail de la Police Nationale</h1>
        <div className="user-info">
          <span>Agent {user.username}</span>
          <button onClick={onSignOut} className="logout-button">Se déconnecter</button>
        </div>
      </header>

      <main className="portal-content">
        <div className="search-widget">
          <h2>Consulter un véhicule</h2>
          <form onSubmit={handleSearch}>
            <input 
              type="text" 
              value={plaque}
              onChange={(e) => setPlaque(e.target.value.toUpperCase())}
              placeholder="Entrez une plaque d'immatriculation" 
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Recherche...' : 'Rechercher'}
            </button>
          </form>
        </div>

        {error && <p className="error-message">{error}</p>}
        {searchResult && (
          // Le reste du JSX pour afficher les résultats est inchangé
           <div className="results-widget">
            <h3>Résultats pour : {searchResult.plaque_immatriculation}</h3>
            <div className="result-grid">
                <div className="result-section">
                    <h4>Informations Véhicule</h4>
                    <p><strong>Marque:</strong> {searchResult.marque}</p>
                    <p><strong>Modèle:</strong> {searchResult.modele}</p>
                    <p><strong>Année:</strong> {searchResult.annee}</p>
                    <p><strong>Couleur:</strong> {searchResult.couleur}</p>
                    <p><strong>N° Châssis:</strong> {searchResult.numero_chassis}</p>
                  </div>
                  <div className="result-section">
                    <h4>Informations Propriétaire</h4>
                    {searchResult.proprietaire_id ? (
                      <>
                        <p><strong>Nom:</strong> {searchResult.proprietaire_nom}</p>
                        <p><strong>Prénom:</strong> {searchResult.proprietaire_prenom}</p>
                        <p><strong>Adresse:</strong> {searchResult.proprietaire_adresse}</p>
                      </>
                    ) : (
                      <p>Aucun propriétaire assigné.</p>
                    )}
                  </div>
                  <div className="result-section status-section">
                    <h4>Statuts des Documents</h4>
                    <p><strong>Carte Grise:</strong> <span className={`status ${searchResult.statut_carte_grise}`}>{searchResult.statut_carte_grise}</span></p>
                    <p><strong>Assurance:</strong> <span className={`status ${searchResult.statut_assurance}`}>{searchResult.statut_assurance}</span></p>
                    <p><strong>Vignette:</strong> <span className={`status ${searchResult.statut_vignette}`}>{searchResult.statut_vignette}</span></p>
                    <p><strong>Visite Technique:</strong> <span className={`status ${searchResult.statut_visite_technique}`}>{searchResult.statut_visite_technique}</span></p>
                  </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default PolicePortal;