import React from 'react';
import GenericPortal from './GenericPortal';

function AssurancePortal({ user, onSignOut }) {
  return (
    <GenericPortal
      user={user}
      onSignOut={onSignOut}
      portalName="Portail des Agences d'Assurance"
      documentName="l'Assurance"
      apiEndpoint="/assurance/vehicules"
      apiSubPath="statut" // Le bout d'URL spécifique
      statusField="statut_assurance" // La colonne à afficher dans la BDD
    />
  );
}

export default AssurancePortal;
