import React, { useState, useEffect } from 'react';
import { getCurrentUser, signOut, fetchAuthSession } from 'aws-amplify/auth';
import LoginPage from './components/LoginPage';
import DefaultPortal from './portals/DefaultPortal';
import PolicePortal from './portals/PolicePortal';
import DouanePortal from './portals/DouanePortal';
import OntPortal from './portals/OntPortal';
import AssurancePortal from './portals/AssurancePortal';
import MairiePortal from './portals/MairiePortal';
import MtsPortal from './portals/MtsPortal';
import EtatPortal from './portals/EtatPortal';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    setLoading(true);
    try {
    const session = await fetchAuthSession();
    const currentUser = { username: session.tokens.idToken.payload.username }; 
    const groups = session.tokens.idToken.payload['cognito:groups'] || [];

    // AJOUTEZ CETTE LIGNE EXACTEMENT ICI
    console.log("LOG DE DÉBOGAGE -- Groupes reçus de Cognito :", groups);

    // Le reste de la logique...
    if (groups.includes('ETAT')) {
        setUserRole('ETAT');
    } else {
        setUserRole(groups[0]);
    }
    setUser(currentUser);

    } catch (error) {
      setUser(null);
      setUserRole(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkUser();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };

  const PortalRouter = () => {
    const role = userRole ? userRole.toLowerCase() : '';
    switch (role) {
      case 'police': return <PolicePortal user={user} onSignOut={handleSignOut} />;
      case 'douane': return <DouanePortal user={user} onSignOut={handleSignOut} />;
      case 'ont': return <OntPortal user={user} onSignOut={handleSignOut} />;
      // On active les routes pour les nouveaux portails
      case 'assurance': return <AssurancePortal user={user} onSignOut={handleSignOut} />;
      case 'mairie': return <MairiePortal user={user} onSignOut={handleSignOut} />;
      case 'mts': return <MtsPortal user={user} onSignOut={handleSignOut} />;
      case 'etat': return <EtatPortal user={user} onSignOut={handleSignOut} />;
      default: return <DefaultPortal user={user} onSignOut={handleSignOut} />;
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="App">
      {user ? <PortalRouter /> : <LoginPage onLoginSuccess={checkUser} />}
    </div>
  );
}

export default App;

