import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './PolicePortal.css';

const API_URL = import.meta.env.VITE_API_URL;

// Initialisation du client socket à l'extérieur du composant
const socket = io();

function PolicePortal({ user, onSignOut }) {
  const [plaque, setPlaque] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // État pour gérer le chargement pendant la mise à jour du statut police
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [message, setMessage] = useState('');
  
  // État pour stocker l'alerte de véhicule en fuite reçue
  const [alerte, setAlerte] = useState(null);

  // On utilise une "ref" pour garder une trace de la plaque recherchée,
  // accessible à tout moment par notre écouteur d'événements.
  const currentPlaqueRef = useRef(null);

  // Fonction utilitaire pour formater les dates au format français
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return dateString; // Retourner la chaîne originale si le formatage échoue
    }
  };

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
        // Correction : éviter le conflit avec les mises à jour manuelles
        // On ne rafraîchit que si on n'est pas en train de faire une mise à jour manuelle
        if (!isUpdatingStatus) {
          fetchVehicleData(data.plaque);
        }
      }
    });

    // On se déconnecte quand l'utilisateur quitte la page.
    return () => {
      // Suppression des écouteurs pour éviter les fuites mémoire
      socket.off('vehicle_updated');
      socket.disconnect();
    };
  }, [isUpdatingStatus]); // Dépendance ajoutée pour éviter les race conditions

  // useEffect dédié pour écouter les alertes de véhicules en fuite
  useEffect(() => {
    socket.on('vehicule_en_fuite_alerte', (data) => {
      setAlerte(data);
      // Auto-fermer l'alerte après 15 secondes
      setTimeout(() => {
        setAlerte(null);
      }, 15000);
    });

    // Fonction de nettoyage
    return () => {
      socket.off('vehicule_en_fuite_alerte');
    };
  }, []); // Tableau de dépendances vide

  const fetchVehicleData = async (plaqueToFetch) => {
    // Protection : ne pas faire d'appel API si on est en train de faire une mise à jour manuelle
    if (isUpdatingStatus) {
      console.log('Mise à jour manuelle en cours, fetchVehicleData ignoré');
      return;
    }

    try {
      // Appel API pour récupérer les données complètes du véhicule
      const response = await axios.get(`${API_URL}/vehicules/${plaqueToFetch}`);
      
      // Debug : Log de la réponse pour identifier la structure des données
      console.log('Réponse API fetchVehicleData:', response.data);
      
      // Mise à jour de l'état avec toutes les données reçues du backend
      setSearchResult(response.data);
      currentPlaqueRef.current = plaqueToFetch; // On met à jour la plaque actuelle
      setError(''); // Effacer les erreurs précédentes en cas de succès
    } catch (err) {
      // Gestion des erreurs avec messages spécifiques selon le type d'erreur
      if (err.response && err.response.status === 404) {
        setError(`Aucun véhicule trouvé pour la plaque : ${plaqueToFetch}`);
      } else {
        setError(`Impossible de charger les données pour la plaque : ${plaqueToFetch}`);
      }
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

  // Fonction pour mettre à jour le statut police d'un véhicule
  const handleUpdateStatusPolice = async (newStatus) => {
    setIsUpdatingStatus(true);
    setMessage('');

    // Récupération et vérification du token JWT pour l'authentification
    const token = sessionStorage.getItem('token');
    if (!token) {
      setMessage("Erreur : Utilisateur non connecté ou session expirée. Veuillez vous reconnecter.");
      setIsUpdatingStatus(false);
      return;
    }

    try {
      // Appel API pour mettre à jour le statut police avec authentification
      const response = await axios.put(`${API_URL}/police/vehicules/${searchResult.plaque_immatriculation}/statut-police`, {
        nouveau_statut: newStatus
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Debug : Log de la réponse pour identifier la structure des données
      console.log('Réponse API mise à jour statut:', response.data);
      
      // Correction : Vérifier la structure de la réponse et mettre à jour l'état de manière sécurisée
      if (response.data && typeof response.data === 'object') {
        // Si la réponse contient directement les données du véhicule
        if (response.data.plaque_immatriculation) {
          setSearchResult(response.data);
        } 
        // Si la réponse contient un objet véhicule imbriqué
        else if (response.data.vehicule) {
          setSearchResult(response.data.vehicule);
        }
        // Si la réponse ne contient que le statut mis à jour, on met à jour seulement ce champ
        else if (response.data.statut_police) {
          setSearchResult(prevResult => ({
            ...prevResult,
            statut_police: response.data.statut_police
          }));
        }
        // Fallback : garder l'état actuel si la structure n'est pas reconnue
        else {
          console.warn('Structure de réponse API non reconnue:', response.data);
          setSearchResult(prevResult => ({
            ...prevResult,
            statut_police: newStatus
          }));
        }
      } else {
        // Si la réponse est vide ou invalide, mettre à jour seulement le statut localement
        console.warn('Réponse API vide ou invalide, mise à jour locale uniquement');
        setSearchResult(prevResult => ({
          ...prevResult,
          statut_police: newStatus
        }));
      }

      setMessage(`Statut police mis à jour avec succès : ${newStatus}`);
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      setMessage(`Erreur lors de la mise à jour du statut : ${err.response?.data?.message || 'Erreur de communication avec le serveur.'}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="portal-container">
      {/* Bandeau d'alerte fixe en haut de l'écran */}
      {alerte && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          backgroundColor: 'red',
          color: 'white',
          padding: '15px',
          zIndex: 9999,
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          borderBottom: '3px solid #cc0000'
        }}>
          🚨 ALERTE VÉHICULE EN FUITE 🚨 - Véhicule {alerte.plaque} ({alerte.marque} {alerte.modele}, {alerte.couleur}) signalé EN FUITE !
        </div>
      )}

      <header className="portal-header" style={{ marginTop: alerte ? '100px' : '0' }}>
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
            <h3>Résultats pour : {searchResult?.plaque_immatriculation || 'N/A'}</h3>
            <div className="result-grid">
                <div className="result-section">
                    <h4>Informations Véhicule</h4>
                    <p><strong>Marque:</strong> {searchResult?.marque || 'N/A'}</p>
                    <p><strong>Modèle:</strong> {searchResult?.modele || 'N/A'}</p>
                    <p><strong>Année:</strong> {searchResult?.annee || 'N/A'}</p>
                    <p><strong>Couleur:</strong> {searchResult?.couleur || 'N/A'}</p>
                    <p><strong>N° Châssis:</strong> {searchResult?.numero_chassis || 'N/A'}</p>
                  </div>
                  <div className="result-section">
                    <h4>Informations Propriétaire</h4>
                    {searchResult?.proprietaire_id ? (
                      <>
                        <p><strong>Nom:</strong> {searchResult?.proprietaire_nom || 'N/A'}</p>
                        <p><strong>Prénom:</strong> {searchResult?.proprietaire_prenom || 'N/A'}</p>
                        <p><strong>Adresse:</strong> {searchResult?.proprietaire_adresse || 'N/A'}</p>
                        
                        {/* Nouvelles informations sur la pièce d'identité du propriétaire */}
                        <p><strong>Type Pièce:</strong> {searchResult?.proprietaire_type_piece_identite || 'N/A'}</p>
                        <p><strong>N° Pièce:</strong> {searchResult?.proprietaire_numero_piece_identite || 'N/A'}</p>
                        <p><strong>Expiration Pièce:</strong> {formatDate(searchResult?.proprietaire_date_expiration_piece)}</p>
                      </>
                    ) : (
                      <p>Aucun propriétaire assigné.</p>
                    )}
                  </div>
                  <div className="result-section status-section">
                    <h4>Statuts des Documents</h4>
                    <p><strong>Carte Grise:</strong> <span className={`status ${searchResult?.statut_carte_grise}`}>{searchResult?.statut_carte_grise || 'N/A'}</span></p>
                    <p><strong>Assurance:</strong> <span className={`status ${searchResult?.statut_assurance}`}>{searchResult?.statut_assurance || 'N/A'}</span></p>
                    <p><strong>Vignette:</strong> <span className={`status ${searchResult?.statut_vignette}`}>{searchResult?.statut_vignette || 'N/A'}</span></p>
                    <p><strong>Visite Technique:</strong> <span className={`status ${searchResult?.statut_visite_technique}`}>{searchResult?.statut_visite_technique || 'N/A'}</span></p>
                    
                    {/* Affichage du statut police du véhicule avec badge coloré - affiché seulement si un véhicule a été trouvé */}
                    <p><strong>Statut Police:</strong> <span className={`status-badge ${
                      searchResult?.statut_police === 'VOLÉ' || searchResult?.statut_police === 'EN FUITE' ? 'status-expire' :
                      searchResult?.statut_police === 'INTERCEPTÉ' ? 'status-intercepted' :
                      searchResult?.statut_police === 'NORMAL' ? 'status-valide' :
                      'status-manquant' // Cas par défaut pour statuts inconnus ou null
                    }`}>
                      {searchResult?.statut_police || 'N/A'}
                    </span></p>
                  </div>
            </div>
            
            {/* Section des boutons d'action pour modifier le statut police */}
            <div className="police-actions-section">
              <h4>Actions Police</h4>
              <div className="action-buttons">
                {searchResult.statut_police !== 'VOLÉ' && (
                  <button 
                    onClick={() => handleUpdateStatusPolice('VOLÉ')} 
                    disabled={isUpdatingStatus}
                    className="action-btn stolen-btn"
                  >
                    Signaler VOLÉ
                  </button>
                )}
                {searchResult.statut_police !== 'EN FUITE' && (
                  <button 
                    onClick={() => handleUpdateStatusPolice('EN FUITE')} 
                    disabled={isUpdatingStatus}
                    className="action-btn fugitive-btn"
                  >
                    Signaler EN FUITE
                  </button>
                )}
                {searchResult.statut_police !== 'INTERCEPTÉ' && (
                  <button 
                    onClick={() => handleUpdateStatusPolice('INTERCEPTÉ')} 
                    disabled={isUpdatingStatus}
                    className="action-btn intercepted-btn"
                  >
                    Marquer INTERCEPTÉ
                  </button>
                )}
                {searchResult.statut_police !== 'NORMAL' && (
                  <button 
                    onClick={() => handleUpdateStatusPolice('NORMAL')} 
                    disabled={isUpdatingStatus}
                    className="action-btn normal-btn"
                  >
                    Retour à NORMAL
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Affichage des messages de confirmation ou d'erreur */}
        {message && <p className="message">{message}</p>}
      </main>
    </div>
  );
}

export default PolicePortal;