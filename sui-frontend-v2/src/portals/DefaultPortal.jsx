import React from 'react';

// On peut réutiliser notre ancien tableau de bord ici
import DashboardPage from '../components/DashboardPage';

function DefaultPortal({ user, onSignOut }) {
    // Pour l'instant, le portail par défaut est notre ancien tableau de bord
    return <DashboardPage user={user} onSignOut={onSignOut} />;
}

export default DefaultPortal;