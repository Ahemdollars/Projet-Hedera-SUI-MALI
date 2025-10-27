import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GenericPortal from './GenericPortal';

// Définition de l'URL de l'API à partir des variables d'environnement
const API_URL = import.meta.env.VITE_API_URL;

function AssurancePortal({ user, onSignOut }) {
  // État pour stocker le prix actuel de l'assurance
  const [prixAssurance, setPrixAssurance] = useState(null);

  // Effet pour récupérer le prix de l'assurance au montage du composant
  useEffect(() => {
    // Fonction asynchrone pour récupérer le prix depuis l'API
    const fetchPrix = async () => {
      try {
        // Récupération du token JWT depuis le sessionStorage
        const token = sessionStorage.getItem('token');
        
        // Vérification de l'existence du token
        if (!token) {
          console.error('Token JWT non trouvé dans sessionStorage');
          return;
        }

        // Appel API pour récupérer les paramètres
        const response = await axios.get(`${API_URL}/parametres`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // Recherche du paramètre prix_assurance dans la réponse
        const trouveParam = response.data.find(param => param.param_nom === 'prix_assurance');
        
        // Mise à jour de l'état si le paramètre est trouvé
        if (trouveParam) {
          setPrixAssurance(trouveParam.param_valeur);
        } else {
          console.warn('Paramètre prix_assurance non trouvé dans la réponse API');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du prix de l\'assurance:', error);
      }
    };

    // Appel de la fonction de récupération
    fetchPrix();
  }, []); // Tableau de dépendances vide pour s'exécuter une seule fois au montage

  return (
    <div>
      {/* Affichage du prix actuel de l'assurance */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderBottom: '1px solid #dee2e6',
        textAlign: 'center'
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#495057' }}>
          Prix actuel de l'assurance : {prixAssurance ? `${prixAssurance} FCFA` : 'Chargement...'}
        </h2>
        <p style={{ margin: '0', color: '#6c757d', fontSize: '14px' }}>
          Ce prix est récupéré automatiquement depuis les paramètres de l'application
        </p>
      </div>

      {/* Composant GenericPortal pour la gestion des véhicules */}
      <GenericPortal
        user={user}
        onSignOut={onSignOut}
        portalName="Portail des Agences d'Assurance"
        documentName="l'Assurance"
        apiEndpoint="/assurance/vehicules"
        apiSubPath="statut" // Le bout d'URL spécifique
        statusField="statut_assurance" // La colonne à afficher dans la BDD
      />
    </div>
  );
}

export default AssurancePortal;
