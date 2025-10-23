import React, { useState } from 'react';
import axios from 'axios';
import './DouanePortal.css'; // Nous créerons ce fichier de style

const API_URL = import.meta.env.VITE_API_URL;

function DouanePortal({ user, onSignOut }) {
  // États pour tous les champs du formulaire
  const [formData, setFormData] = useState({
    prop_nom: '',
    prop_prenom: '',
    prop_adresse: '',
    prop_type_piece: 'Passeport', // Type de pièce d'identité par défaut
    prop_numero_piece: '', // Numéro de la pièce d'identité
    veh_plaque: '',
    veh_marque: '',
    veh_modele: '',
    veh_annee: '',
    veh_couleur: '',
    veh_chassis: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation du format de plaque d'immatriculation (format XX-1234-XX)
    const regex = /^[A-Z]{2}-\d{4}-[A-Z]{2}$/;
    if (!regex.test(formData.veh_plaque.toUpperCase())) {
      setMessage("Le format de la plaque d'immatriculation est invalide. Le format attendu est XX-1234-XX.");
      return;
    }
    
    setLoading(true);
    setMessage('');

    // 1. Récupérer le token depuis le stockage de session
    const token = sessionStorage.getItem('token'); 

    // 2. Vérifier si le token existe (si l'utilisateur est vraiment connecté)
    if (!token) {
       setMessage("Erreur : Utilisateur non connecté ou session expirée. Veuillez vous reconnecter.");
       setLoading(false); // Arrêter l'indicateur de chargement
       return; // Arrêter l'exécution de la fonction ici
    }

    try {
      // Étape 1 : Créer le propriétaire avec les informations de pièce d'identité
      // Configuration de sécurité : inclure le token JWT dans l'en-tête d'autorisation
      const proprietaireResponse = await axios.post(`${API_URL}/proprietaires`, {
        nom: formData.prop_nom,
        prenom: formData.prop_prenom,
        adresse: formData.prop_adresse,
        type_piece_identite: formData.prop_type_piece,
        numero_piece_identite: formData.prop_numero_piece
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const newProprietaireId = proprietaireResponse.data.id;

      // Étape 2 : Créer le véhicule
      // Configuration de sécurité : inclure le token JWT dans l'en-tête d'autorisation
      const vehiculeResponse = await axios.post(`${API_URL}/vehicules`, {
        plaque_immatriculation: formData.veh_plaque.toUpperCase(),
        marque: formData.veh_marque,
        modele: formData.veh_modele,
        annee: parseInt(formData.veh_annee),
        couleur: formData.veh_couleur,
        numero_chassis: formData.veh_chassis.toUpperCase()
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const newVehiculePlaque = vehiculeResponse.data.plaque_immatriculation;

      // Étape 3 : Lier le véhicule au propriétaire
      // Configuration de sécurité : inclure le token JWT dans l'en-tête d'autorisation
      await axios.put(`${API_URL}/vehicules/${newVehiculePlaque}`, {
        proprietaire_id: newProprietaireId,
        couleur: formData.veh_couleur, // L'API attend ces champs, on les redonne
        statut_general: 'NORMAL'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Succès !
      setMessage(`Succès ! Le véhicule ${newVehiculePlaque} a été créé et assigné au propriétaire ${formData.prop_nom}.`);
      e.target.reset(); // Vider le formulaire

    } catch (err) {
      console.error(err);
      setMessage(`Erreur : ${err.response?.data?.message || 'Impossible de créer le véhicule.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-container">
      <header className="portal-header">
        <h1>Portail de la Douane</h1>
        <div className="user-info">
          <span>Agent {user.username}</span>
          <button onClick={onSignOut} className="logout-button">Se déconnecter</button>
        </div>
      </header>

      <main className="portal-content">
        <div className="form-widget">
          <h2>Enregistrer un nouveau véhicule importé</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Informations Propriétaire</h3>
              <input name="prop_nom" onChange={handleChange} placeholder="Nom" required />
              <input name="prop_prenom" onChange={handleChange} placeholder="Prénom" required />
              <input name="prop_adresse" onChange={handleChange} placeholder="Adresse" required />
              
              {/* Nouveaux champs pour la pièce d'identité du propriétaire */}
              <select name="prop_type_piece" value={formData.prop_type_piece} onChange={handleChange}>
                <option value="Passeport">Passeport</option>
                <option value="Carte biometrique">Carte biometrique</option>
                <option value="Carte d'identite">Carte d'identite</option>
                <option value="Fiche individuelle">Fiche individuelle</option>
              </select>
              <input 
                name="prop_numero_piece" 
                type="text" 
                value={formData.prop_numero_piece} 
                onChange={handleChange} 
                placeholder="Numéro de la pièce" 
                required 
              />
            </div>
            <div className="form-section">
              <h3>Informations Véhicule</h3>
              <input name="veh_plaque" onChange={handleChange} placeholder="Plaque d'immatriculation" required />
              <input name="veh_marque" onChange={handleChange} placeholder="Marque" required />
              <input name="veh_modele" onChange={handleChange} placeholder="Modèle" required />
              <input name="veh_annee" onChange={handleChange} type="number" placeholder="Année" required />
              <input name="veh_couleur" onChange={handleChange} placeholder="Couleur" required />
              <input name="veh_chassis" onChange={handleChange} placeholder="Numéro de châssis" required />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Enregistrement en cours...' : 'Enregistrer le Véhicule'}
            </button>
          </form>
          {message && <p className="message">{message}</p>}
        </div>
      </main>
    </div>
  );
}

export default DouanePortal;