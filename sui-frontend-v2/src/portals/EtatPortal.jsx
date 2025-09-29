// Dans src/portals/EtatPortal.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './EtatPortal.css';

// Définition de l'URL de l'API à partir des variables d'environnement.
// C'est cette ligne qui permet au code de fonctionner en local ET en production.
const API_URL = import.meta.env.VITE_API_URL;

// Enregistrement des composants de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


function EtatPortal({ user, onSignOut }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // MODIFICATION : Utilisation de la variable API_URL
                const response = await axios.get(`${API_URL}/stats`, {
                    // Important : Envoyez le token d'authentification !
                    headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
                });
                setStats(response.data);
            } catch (error) {
                console.error("Erreur lors de la récupération des stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return <div>Chargement des statistiques...</div>;
    }

    if (!stats) {
        return <div>Impossible de charger les statistiques.</div>;
    }

    // Préparation des données pour les graphiques
    const revenusData = {
        labels: ['Douane', 'Mairie (Vignettes)', 'ONT (Cartes Grises)'],
        datasets: [{
            label: 'Revenus en Francs CFA',
            data: [
                stats.revenusSimules?.douane || 0,
                stats.revenusSimules?.mairie_vignettes || 0,
                stats.revenusSimules?.ont_cartes_grises || 0
            ],
            backgroundColor: ['#3e95cd', '#8e5ea2', '#3cba9f'],
        }],
    };

    return (
        <div className="portal-container etat-portal">
            <header className="portal-header">
                <h1>Tableau de Bord de l'État</h1>
                <div className="user-info">
                    <span>Bienvenue, {user.username}</span>
                    <button onClick={onSignOut} className="logout-button">Se déconnecter</button>
                </div>
            </header>

            <main className="portal-content">
                {/* Section des Indicateurs Clés (KPIs) */}
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <span className="kpi-value">{stats.totalVehicules}</span>
                        <span className="kpi-label">Véhicules Enregistrés</span>
                    </div>
                    <div className="kpi-card">
                        <span className="kpi-value">{stats.vehiculesAJour}</span>
                        <span className="kpi-label">Véhicules en Règle</span>
                    </div>
                    <div className="kpi-card">
                        <span className="kpi-value">{stats.totalProprietaires}</span>
                        <span className="kpi-label">Citoyens Enregistrés</span>
                    </div>
                    <div className="kpi-card">
                        <span className="kpi-value">{stats.citoyensAJour}</span>
                        <span className="kpi-label">Citoyens en Règle</span>
                    </div>
                </div>

                {/* Section des Graphiques */}
                <div className="charts-grid">
                    <div className="chart-card">
                        <h3>Répartition des Revenus par Service</h3>
                        <Bar data={revenusData} />
                    </div>
                    {/* Ajoutez d'autres graphiques ici si nécessaire */}
                </div>
            </main>
        </div>
    );
}

export default EtatPortal;