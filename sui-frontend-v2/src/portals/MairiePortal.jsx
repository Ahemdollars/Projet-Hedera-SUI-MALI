import React from 'react';
import GenericPortal from './GenericPortal';

function MairiePortal({ user, onSignOut }) {
  return (
    <GenericPortal
      user={user}
      onSignOut={onSignOut}
      portalName="Portail de la Mairie"
      documentName="la Vignette"
      apiEndpoint="/mairie/vehicules"
      apiSubPath="vignette" // Le bout d'URL spécifique
      statusField="statut_vignette" // La colonne à afficher dans la BDD
    />
  );
}

export default MairiePortal;
