import React, { useState, useEffect } from 'react';
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
  
  // État pour stocker le prix de la carte grise récupéré depuis l'API
  const [prixCarteGrise, setPrixCarteGrise] = useState(null);

  // Effet pour récupérer les paramètres au montage du composant
  useEffect(() => {
    const fetchParametres = async () => {
      try {
        // Récupération du token d'authentification depuis le stockage de session
        const token = sessionStorage.getItem('token');
        
        if (!token) {
          console.warn('Token d\'authentification manquant pour récupérer les paramètres');
          return;
        }

        // Appel API pour récupérer les paramètres avec authentification
        const response = await axios.get(`${API_URL}/parametres`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // Debug : Log des données brutes reçues de l'API
        console.log('Données brutes reçues de /parametres:', response.data);

        // Recherche du paramètre prix_carte_grise dans la réponse
        // L'API retourne probablement un tableau de paramètres
        let trouveParam = null;
        if (Array.isArray(response.data)) {
          trouveParam = response.data.find(param => param.param_nom === 'prix_carte_grise');
        } else if (response.data && response.data.prix_carte_grise) {
          // Fallback : si l'API retourne directement l'objet avec les propriétés
          trouveParam = { param_valeur: response.data.prix_carte_grise };
        }

        // Debug : Log du paramètre trouvé
        console.log('Paramètre trouvé:', trouveParam);

        // Mise à jour de l'état avec le prix de la carte grise
        if (trouveParam) {
          console.log('Mise à jour de l\'état avec la valeur:', trouveParam.param_valeur);
          setPrixCarteGrise(trouveParam.param_valeur);
        } else {
          console.log('Aucun paramètre correspondant trouvé dans la réponse.');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des paramètres:', error);
        // En cas d'erreur, on garde prixCarteGrise à null pour afficher "Chargement..."
      }
    };

    // Exécution de la fonction de récupération des paramètres
    fetchParametres();
  }, []); // Tableau de dépendances vide pour s'exécuter une seule fois au montage

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
        {/* Affichage du prix actuel de la carte grise */}
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6', 
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <h3>Informations sur la Carte Grise</h3>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>
            Prix actuel de la carte grise : {prixCarteGrise ? `${prixCarteGrise} FCFA` : 'Chargement...'}
          </p>
        </div>

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