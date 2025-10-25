// Dans src/portals/EtatPortal.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import './EtatPortal.css';

// Définition de l'URL de l'API à partir des variables d'environnement.
// C'est cette ligne qui permet au code de fonctionner en local ET en production.
const API_URL = import.meta.env.VITE_API_URL;

// Enregistrement des composants de Chart.js pour les graphiques en donut et linéaires
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend);


function EtatPortal({ user, onSignOut }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // États pour les filtres de date
    const [dateDebut, setDateDebut] = useState(''); // Date de début du filtre
    const [dateFin, setDateFin] = useState('');     // Date de fin du filtre

    // Fonction pour récupérer les statistiques avec filtres de date optionnels
    const fetchStats = async () => {
        try {
            // Logique pour le filtrage sur une seule journée
            // Si seule la date de début est définie, on utilise la même date pour la fin
            let effectiveDateFin = dateFin; // Utilise dateFin par défaut
            if (dateDebut && !dateFin) { // Si debut est rempli mais fin est vide
                effectiveDateFin = dateDebut; // Utilise debut comme date de fin aussi
            }

            // Construction des paramètres de requête pour les filtres de date
            const params = {};
            if (dateDebut) {
                params.debut = dateDebut; // Ajout du paramètre de début si défini
            }
            if (effectiveDateFin) {
                params.fin = effectiveDateFin; // Ajout du paramètre de fin (réel ou calculé)
            }

            // Log pour déboguer les paramètres envoyés à l'API
            console.log("Appel API /stats avec les paramètres :", params); // Log pour déboguer les dates envoyées
            
            // Appel API avec les paramètres de filtre et authentification
            const response = await axios.get(`${API_URL}/stats`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
                params: params // Inclusion des paramètres de date dans la requête
            });
            setStats(response.data);
        } catch (error) {
            console.error("Erreur lors de la récupération des stats", error);
        } finally {
            setLoading(false);
        }
    };

    // Fonction pour réinitialiser les filtres de date
    const handleResetDates = () => {
        // Réinitialisation des états de date
        setDateDebut('');
        setDateFin('');
        // Le rechargement se fera automatiquement via le useEffect qui dépend des dates
    };

    // Effet pour charger les statistiques au montage du composant
    useEffect(() => {
        fetchStats();
    }, []); // Dépendances vides pour s'exécuter une seule fois au montage

    // Effet pour recharger les statistiques lorsque les dates changent
    useEffect(() => {
        // Rechargement automatique des statistiques quand les dates changent
        // Cela inclut la réinitialisation (quand les dates redeviennent vides)
        if (dateDebut !== undefined || dateFin !== undefined) {
            fetchStats();
        }
    }, [dateDebut, dateFin]); // Dépendances sur les états de date

    if (loading) {
        return <div>Chargement des statistiques...</div>;
    }

    if (!stats) {
        return <div>Impossible de charger les statistiques.</div>;
    }

    // Préparation des données pour le graphique en donut des revenus par service
    // MIGRATION : Passage de stats.revenusSimules vers stats.revenusReels
    // Les revenus réels sont maintenant calculés directement depuis la base de données
    
    // ✅ SERVICES MAINTENANT INCLUS - MISE À JOUR TERMINÉE ✅
    // Les services suivants sont maintenant inclus dans le graphique des revenus :
    // - "ONT (Cartes Grises)" : présent et fonctionnel
    // - "Assurance" : AJOUTÉ - utilise stats.revenusReels.assurance
    // - "MTS" : AJOUTÉ - utilise stats.revenusReels.mts
    // Le backend doit fournir ces données via stats.revenusReels.assurance et stats.revenusReels.mts
    
    const revenusData = {
        labels: ['Douane', 'Mairie (Vignettes)', 'ONT (Cartes Grises)', 'Assurance', 'MTS'],
        datasets: [{
            label: 'Revenus en Francs CFA',
            // NOUVELLE STRUCTURE : Utilisation de stats.revenusReels avec les clés simplifiées
            data: [
                stats.revenusReels?.douane || 0,        // Revenus réels de la douane (importations)
                stats.revenusReels?.mairie || 0,       // Revenus réels de la mairie (vignettes)
                stats.revenusReels?.ont || 0,          // Revenus réels de l'ONT (cartes grises)
                stats.revenusReels?.assurance || 0,    // Revenus réels de l'Assurance
                stats.revenusReels?.mts || 0           // Revenus réels de MTS
            ],
            // Palette de couleurs optimisée pour un graphique en donut
            backgroundColor: [
                '#3e95cd', // Bleu pour la Douane
                '#8e5ea2', // Violet pour la Mairie
                '#3cba9f', // Vert pour l'ONT
                '#ff6b35', // Orange pour l'Assurance
                '#ffc107'  // Jaune pour MTS
            ],
            borderColor: [
                '#2c7be5', // Bordure bleue plus foncée
                '#6f42c1', // Bordure violette plus foncée
                '#28a745', // Bordure verte plus foncée
                '#e55a2b', // Bordure orange plus foncée
                '#e0a800'  // Bordure jaune plus foncée
            ],
            borderWidth: 2 // Épaisseur de la bordure pour le donut
        }],
    };

    // Préparation des données pour le graphique linéaire de tendance des revenus
    // NOUVELLE FONCTIONNALITÉ : Affichage de l'évolution des revenus dans le temps
    const tendanceRevenusChartData = {
        labels: stats?.tendanceRevenusData?.labels || [], // Les dates en abscisse
        datasets: [{
            label: 'Revenus Journaliers (FCFA)',
            data: stats?.tendanceRevenusData?.data || [], // Les montants en ordonnée
            fill: false, // Ne pas remplir sous la ligne
            borderColor: 'rgb(75, 192, 192)', // Couleur de la ligne (turquoise)
            backgroundColor: 'rgba(75, 192, 192, 0.1)', // Couleur de fond légère
            tension: 0.1, // Un peu de courbure pour une ligne plus fluide
            pointBackgroundColor: 'rgb(75, 192, 192)', // Couleur des points
            pointBorderColor: '#fff', // Bordure blanche des points
            pointBorderWidth: 2, // Épaisseur de la bordure des points
            pointRadius: 4 // Taille des points
        }]
    };

    // Préparation des données pour le graphique circulaire de répartition des statuts police
    // NOUVELLE FONCTIONNALITÉ : Visualisation des différents statuts des véhicules (NORMAL, VOLÉ, EN FUITE, INTERCEPTÉ)
    const repartitionStatutPoliceChartData = {
        labels: stats?.repartitionStatutPoliceData?.labels || [], // Les statuts (NORMAL, VOLÉ...)
        datasets: [{
            label: 'Nombre de Véhicules',
            data: stats?.repartitionStatutPoliceData?.data || [], // Les comptages
            backgroundColor: [ // Palette de couleurs suggérée
                'rgba(40, 167, 69, 0.7)',  // Vert pour NORMAL
                'rgba(220, 53, 69, 0.7)',   // Rouge pour VOLÉ
                'rgba(255, 193, 7, 0.7)',   // Jaune pour EN FUITE
                'rgba(13, 110, 253, 0.7)',  // Bleu pour INTERCEPTÉ
            ],
            borderColor: [ // Bordures pour séparer les sections
                'rgba(255, 255, 255, 1)',
                'rgba(255, 255, 255, 1)',
                'rgba(255, 255, 255, 1)',
                'rgba(255, 255, 255, 1)'
            ],
            borderWidth: 1 // Épaisseur de la bordure pour séparer les sections
        }]
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
                {/* Section des filtres de date */}
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#f8f9fa', 
                    border: '1px solid #dee2e6', 
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <h3>Filtres de Date</h3>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontWeight: 'bold', color: '#2c3e50' }}>Date de début :</label>
                            <input 
                                type="date" 
                                value={dateDebut} 
                                onChange={(e) => setDateDebut(e.target.value)}
                                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontWeight: 'bold', color: '#2c3e50' }}>Date de fin :</label>
                            <input 
                                type="date" 
                                value={dateFin} 
                                onChange={(e) => setDateFin(e.target.value)}
                                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                            />
                        </div>
                        <button 
                            onClick={fetchStats}
                            style={{ 
                                padding: '10px 20px', 
                                backgroundColor: '#007bff', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '4px', 
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Appliquer le filtre
                        </button>
                        <button 
                            onClick={handleResetDates}
                            style={{ 
                                padding: '10px 20px', 
                                backgroundColor: '#6c757d', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '4px', 
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Réinitialiser
                        </button>
                    </div>
                </div>

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
                    
                    {/* Nouvelle carte KPI pour les véhicules signalés (Volés ou En Fuite) */}
                    <div className="kpi-card">
                        <span className="kpi-value">{stats?.vehiculesSignales}</span>
                        <span className="kpi-label">Véhicules Signalés</span>
                    </div>
                </div>

                {/* Section des Graphiques */}
                <div className="charts-grid">
                    <div className="chart-card">
                        <h3>Répartition des Revenus par Service</h3>
                        {/* MODIFICATION : Passage du graphique à barres vers un graphique en donut */}
                        {/* CONTENEUR POUR LIMITER LA TAILLE : Le graphique est maintenant limité à 400px max */}
                        <div style={{ maxWidth: '400px', maxHeight: '400px', margin: 'auto' }}>
                            <Doughnut data={revenusData} />
                        </div>
                    </div>
                    
                    {/* NOUVEAU GRAPHIQUE : Tendance des revenus dans le temps */}
                    <div className="chart-card">
                        <h3>Tendance des Revenus</h3>
                        {/* Graphique linéaire pour visualiser l'évolution des revenus journaliers */}
                        <Line data={tendanceRevenusChartData} />
                    </div>
                    
                    {/* NOUVEAU GRAPHIQUE : Répartition des statuts police */}
                    <div className="chart-card">
                        <h3>Répartition des Statuts Police</h3>
                        {/* Graphique circulaire pour visualiser la répartition des statuts des véhicules */}
                        <div style={{ maxWidth: '350px', maxHeight: '350px', margin: 'auto' }}>
                            <Doughnut data={repartitionStatutPoliceChartData} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default EtatPortal;