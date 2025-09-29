import React from 'react';
import GenericPortal from './GenericPortal';

function MtsPortal({ user, onSignOut }) {
  return (
    <GenericPortal
      user={user}
      onSignOut={onSignOut}
      portalName="Portail du Mali Technic System (MTS)"
      documentName="la Visite Technique"
      apiEndpoint="/mts/vehicules"
      apiSubPath="visite-technique" // Le bout d'URL spécifique
      statusField="statut_visite_technique" // La colonne à afficher dans la BDD
    />
  );
}

export default MtsPortal;
