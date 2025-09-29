import React, { useState } from 'react';
import { signIn } from 'aws-amplify/auth';
import './LoginPage.css';

// Le composant reçoit maintenant une fonction à appeler en cas de succès
function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
  event.preventDefault();
  setLoading(true);
  setError(null);

  try {
    await signIn({ username, password });
    // CORRECTION MAJEURE : On recharge la page. C'est la solution la plus fiable.
    window.location.reload();
  } catch (error) {
    setError(error.message || 'Une erreur est survenue.');
    setLoading(false); // On arrête le chargement seulement en cas d'erreur
  }
};

  // Le reste du code est identique
  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Connexion - SIU Mali</h2>
        <div className="input-group">
          <label htmlFor="username">Nom d'utilisateur</label>
          <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="input-group">
          <label htmlFor="password">Mot de passe</label>
          <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Connexion en cours...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;