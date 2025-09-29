import React, { useState } from 'react';
import axios from 'axios';
import './DouanePortal.css'; // Nous créerons ce fichier de style

const API_URL = 'http://localhost:3001';

function DouanePortal({ user, onSignOut }) {
  // États pour tous les champs du formulaire
  const [formData, setFormData] = useState({
    prop_nom: '',
    prop_prenom: '',
    prop_adresse: '',
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
    setLoading(true);
    setMessage('');

    try {
      // Étape 1 : Créer le propriétaire
      const proprietaireResponse = await axios.post(`${API_URL}/proprietaires`, {
        nom: formData.prop_nom,
        prenom: formData.prop_prenom,
        adresse: formData.prop_adresse
      });
      const newProprietaireId = proprietaireResponse.data.id;

      // Étape 2 : Créer le véhicule
      const vehiculeResponse = await axios.post(`${API_URL}/vehicules`, {
        plaque_immatriculation: formData.veh_plaque.toUpperCase(),
        marque: formData.veh_marque,
        modele: formData.veh_modele,
        annee: parseInt(formData.veh_annee),
        couleur: formData.veh_couleur,
        numero_chassis: formData.veh_chassis.toUpperCase()
      });
      const newVehiculePlaque = vehiculeResponse.data.plaque_immatriculation;

      // Étape 3 : Lier le véhicule au propriétaire
      await axios.put(`${API_URL}/vehicules/${newVehiculePlaque}`, {
        proprietaire_id: newProprietaireId,
        couleur: formData.veh_couleur, // L'API attend ces champs, on les redonne
        statut_general: 'NORMAL'
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