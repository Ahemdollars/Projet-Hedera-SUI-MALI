import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GenericPortal from './GenericPortal';

// URL de base de l'API depuis les variables d'environnement
const API_URL = import.meta.env.VITE_API_URL;

function MairiePortal({ user, onSignOut }) {
  // État pour stocker le prix de la vignette récupéré depuis l'API
  const [prixVignette, setPrixVignette] = useState(null);

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

        // Recherche du paramètre prix_vignette dans la réponse
        // L'API retourne probablement un tableau de paramètres
        let trouveParam = null;
        if (Array.isArray(response.data)) {
          trouveParam = response.data.find(param => param.param_nom === 'prix_vignette');
        } else if (response.data && response.data.prix_vignette) {
          // Fallback : si l'API retourne directement l'objet avec les propriétés
          trouveParam = { param_valeur: response.data.prix_vignette };
        }

        // Debug : Log du paramètre trouvé
        console.log('Paramètre trouvé:', trouveParam);

        // Mise à jour de l'état avec le prix de la vignette
        if (trouveParam) {
          console.log('Mise à jour de l\'état avec la valeur:', trouveParam.param_valeur);
          setPrixVignette(trouveParam.param_valeur);
        } else {
          console.log('Aucun paramètre correspondant trouvé dans la réponse.');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des paramètres:', error);
        // En cas d'erreur, on garde prixVignette à null pour afficher "Chargement..."
      }
    };

    // Exécution de la fonction de récupération des paramètres
    fetchParametres();
  }, []); // Tableau de dépendances vide pour s'exécuter une seule fois au montage

  return (
    <div>
      {/* Affichage du prix actuel de la vignette */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h3>Informations sur la Vignette</h3>
        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>
          Prix actuel de la vignette : {prixVignette ? `${prixVignette} FCFA` : 'Chargement...'}
        </p>
      </div>

      {/* Composant générique pour la gestion des vignettes */}
      <GenericPortal
        user={user}
        onSignOut={onSignOut}
        portalName="Portail de la Mairie"
        documentName="la Vignette"
        apiEndpoint="/mairie/vehicules"
        apiSubPath="vignette" // Le bout d'URL spécifique
        statusField="statut_vignette" // La colonne à afficher dans la BDD
      />
    </div>
  );
}

export default MairiePortal;
