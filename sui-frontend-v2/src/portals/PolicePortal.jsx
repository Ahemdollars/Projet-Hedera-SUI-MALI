import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './PolicePortal.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Log de débogage pour vérifier que l'URL est correctement chargée
console.log('Tentative de connexion du socket à :', API_URL);

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

  // États pour la nouvelle liste de véhicules signalés
  const [vehiculesSignales, setVehiculesSignales] = useState([]);
  const [loadingSignales, setLoadingSignales] = useState(false);
  const [erreurSignales, setErreurSignales] = useState('');

  // États pour les filtres de date
  const [filtreDateDebut, setFiltreDateDebut] = useState('');
  const [filtreDateFin, setFiltreDateFin] = useState('');

  // États pour la boîte de dialogue (modal) de signalement
  const [modalVisible, setModalVisible] = useState(false);
  const [statutEnCours, setStatutEnCours] = useState(''); // (ex: 'VOLÉ' ou 'EN FUITE')
  const [descriptionNote, setDescriptionNote] = useState('');

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

  // useEffect unique pour gérer TOUTE la logique du socket
  useEffect(() => {
    // 1. CRÉER le socket ici, à l'intérieur du hook.
    // IMPORTANT: io() sans paramètre se connecte à la racine du domaine
    // Le serveur Socket.IO et le client se trouveront automatiquement sur /socket.io/
    // qui sera intercepté par notre location /socket.io/ dans Nginx
    const socket = io();

    // 2. Charger la liste des véhicules signalés au montage
    fetchVehiculesSignales();

    // 3. Définir tous les listeners sur cette instance locale
    socket.on('connect', () => {
      console.log('Connecté au serveur en temps réel. ID Socket:', socket.id);
    });

    socket.on('vehicle_updated', (data) => {
      console.log('Notification reçue pour la plaque :', data.plaque);
      // Utilise currentPlaqueRef.current pour obtenir la valeur actuelle de la ref
      if (currentPlaqueRef.current && data.plaque === currentPlaqueRef.current) {
        console.log('Mise à jour automatique de l\'affichage...');
        fetchVehicleData(data.plaque);
      }
      // Mettre à jour la liste des véhicules signalés en temps réel
      fetchVehiculesSignales(filtreDateDebut, filtreDateFin);
    });

    socket.on('vehicule_en_fuite_alerte', (data) => {
      console.log('ALERTE EN FUITE REÇUE:', data);
      setAlerte(data);
      setTimeout(() => setAlerte(null), 15000);
    });

    // 4. Fonction de nettoyage
    // Elle s'exécutera sur ce socket local et le détruira.
    // Au remontage (en Strict Mode), un NOUVEAU socket sera créé.
    return () => {
      console.log('Nettoyage du socket : déconnexion et suppression des listeners.');
      socket.disconnect();
    };
  }, []); // Le tableau vide `[]` est crucial.

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

  // Fonction pour charger la liste des véhicules signalés
  const fetchVehiculesSignales = async (debut, fin) => {
    setLoadingSignales(true);
    setErreurSignales('');
    
    const token = sessionStorage.getItem('token');
    if (!token) {
      setErreurSignales("Session expirée. Veuillez vous reconnecter.");
      setLoadingSignales(false);
      return;
    }

    try {
      // Construit les paramètres de requête pour les dates
      const params = new URLSearchParams();
      if (debut) params.append('dateDebut', debut);
      if (fin) params.append('dateFin', fin);

      const response = await axios.get(`${API_URL}/police/vehicules/signales`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: params
      });

      setVehiculesSignales(response.data);

    } catch (err) {
      console.error('Erreur fetchVehiculesSignales:', err);
      setErreurSignales("Impossible de charger la liste des véhicules signalés.");
    } finally {
      setLoadingSignales(false);
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

  // Fonction pour ouvrir la boîte de dialogue de signalement
  const ouvrirModalSignalement = (statut) => {
    setStatutEnCours(statut);
    setDescriptionNote(''); // Réinitialiser le champ
    setModalVisible(true);
  };

  // Fonction pour mettre à jour le statut police d'un véhicule
  const handleUpdateStatusPolice = async (newStatus, description = '') => {
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
        nouveau_statut: newStatus,
        description: description
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
      if (newStatus === 'VOLÉ' || newStatus === 'EN FUITE') setModalVisible(false);
    }
  };

  return (
    <div className="portal-container">
      {/* Bandeau d'alerte fixe en haut de l'écran */}
      {alerte && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#D32F2F', // Rouge foncé
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          zIndex: 1000,
          fontSize: '1.1rem',
          fontWeight: 'bold',
          boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
          border: '2px solid #B71C1C', // Bordure plus foncée
          textAlign: 'center'
        }}>
          {alerte.message}
        </div>
      )}

      {/* Modal pour ajouter une description */}
      {modalVisible && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Signaler Véhicule : {statutEnCours}</h3>
            <p>Veuillez ajouter une description pour ce signalement :</p>
            <textarea
              rows="4"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              value={descriptionNote}
              onChange={(e) => setDescriptionNote(e.target.value)}
              placeholder="Motif, dernier lieu vu, informations pertinentes..."
            />
            <div className="modal-actions">
              <button onClick={() => setModalVisible(false)} className="action-btn normal-btn" disabled={isUpdatingStatus}>
                Annuler
              </button>
              <button 
                onClick={() => handleUpdateStatusPolice(statutEnCours, descriptionNote)} 
                className="action-btn fugitive-btn"
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? 'Envoi...' : 'Confirmer Signalement'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="portal-header" style={{ marginTop: alerte ? '100px' : '20px' }}>
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
                    onClick={() => ouvrirModalSignalement('VOLÉ')} 
                    disabled={isUpdatingStatus}
                    className="action-btn stolen-btn"
                  >
                    Signaler VOLÉ
                  </button>
                )}
                {searchResult.statut_police !== 'EN FUITE' && (
                  <button 
                    onClick={() => ouvrirModalSignalement('EN FUITE')} 
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

        {/* Section de la liste des véhicules signalés */}
        <div className="widget-signales results-widget">
          <h2>Véhicules Activement Signalés</h2>

          {/* Filtres de date */}
          <div className="filtres-date" style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center' }}>
            <label>Du:</label>
            <input type="date" value={filtreDateDebut} onChange={(e) => setFiltreDateDebut(e.target.value)} />
            <label>Au:</label>
            <input type="date" value={filtreDateFin} onChange={(e) => setFiltreDateFin(e.target.value)} />
            <button onClick={() => fetchVehiculesSignales(filtreDateDebut, filtreDateFin)} className="action-btn" disabled={loadingSignales}>
              {loadingSignales ? 'Filtrage...' : 'Filtrer'}
            </button>
            <button onClick={() => { setFiltreDateDebut(''); setFiltreDateFin(''); fetchVehiculesSignales(null, null); }} className="action-btn normal-btn" disabled={loadingSignales}>
              Réinitialiser
            </button>
          </div>

          {erreurSignales && <p className="error-message">{erreurSignales}</p>}

          {/* Tableau des résultats */}
          <table className="table-signales">
            <thead>
              <tr>
                <th>Plaque</th>
                <th>Statut</th>
                <th>Infos Véhicule</th>
                <th>Signalé le</th>
                <th>Agent</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {loadingSignales ? (
                <tr><td colSpan="6">Chargement...</td></tr>
              ) : vehiculesSignales.length === 0 ? (
                <tr><td colSpan="6">Aucun véhicule signalé trouvé pour les filtres sélectionnés.</td></tr>
              ) : (
                vehiculesSignales.map((v) => (
                  <tr key={v.plaque_immatriculation}>
                    <td>{v.plaque_immatriculation}</td>
                    <td><span className={`status ${v.statut_police.replace(' ', '.')}`}>{v.statut_police}</span></td>
                    <td>{v.marque} {v.modele} ({v.couleur})</td>
                    <td>{new Date(v.date_modification).toLocaleString('fr-FR')}</td>
                    <td>{v.police_signaled_by || 'N/A'}</td>
                    <td style={{ maxWidth: '300px' }}>{v.police_notes || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default PolicePortal;