// =============================================
// ==              INITIALISATION             ==
// =============================================

// Charger les variables d'environnement du fichier .env
require('dotenv').config();

// Importer les librairies externes
const express = require('express');
const cors = require('cors');
const http = require('http'); // Module HTTP natif de Node.js
const { Server } = require("socket.io"); // Librairie pour le temps réel

// Importer nos modules internes
const pool = require('./db');
const { logAction } = require('./hedera');

// =============================================
// ==         CONFIGURATION DU SERVEUR        ==
// =============================================

const app = express();
const port = 3001;

// Créer un serveur HTTP à partir de l'application Express
const server = http.createServer(app);

// Initialiser Socket.IO pour la communication en temps réel
const io = new Server(server, {
  cors: {
    origin: "*", // Accepter toutes les origines
    methods: ["GET", "POST"]
  }
});

// =============================================
// ==              MIDDLEWARES                ==
// =============================================

// Activer CORS pour les requêtes HTTP classiques
app.use(cors());
// Permettre au serveur de comprendre le JSON
app.use(express.json());
// Rendre 'io' accessible dans toutes les routes pour pouvoir émettre des événements
app.use((req, res, next) => {
  req.io = io;
  next();
});

// =============================================
// ==    LOGIQUE DE CONNEXION TEMPS RÉEL      ==
// =============================================

io.on('connection', (socket) => {
  console.log('✅ Un utilisateur s\'est connecté en temps réel via WebSocket');
  socket.on('disconnect', () => {
    console.log('❌ Un utilisateur s\'est déconnecté');
  });
});

// =====================================================================
// ==                  ROUTES API POUR LES VÉHICULES                  ==
// =====================================================================

// Route principale
app.get('/', (req, res) => {
  res.json({ message: "Bienvenue sur l'API du SIU Mali !" });
});

// Créer un nouveau véhicule (F-DOU-01)
app.post('/vehicules', async (req, res) => {
  try {
    const { plaque_immatriculation, marque, modele, annee, couleur, numero_chassis } = req.body;
    const newVehicule = await pool.query(
      "INSERT INTO vehicules (plaque_immatriculation, marque, modele, annee, couleur, numero_chassis) VALUES($1, $2, $3, $4, $5, $6) RETURNING *",
      [plaque_immatriculation, marque, modele, annee, couleur, numero_chassis]
    );
    await logAction(`VEHICULE_CREE: Plaque=${plaque_immatriculation}, Marque=${marque}`);
    res.status(201).json(newVehicule.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur du serveur");
  }
});

// Récupérer un véhicule spécifique et son propriétaire (F-POL-01)
app.get('/vehicules/:plaque', async (req, res) => {
  try {
    const { plaque } = req.params;
    const query = `
      SELECT 
        v.*, 
        p.nom AS proprietaire_nom, 
        p.prenom AS proprietaire_prenom,
        p.adresse AS proprietaire_adresse
      FROM vehicules v
      LEFT JOIN proprietaires p ON v.proprietaire_id = p.id
      WHERE v.plaque_immatriculation = $1
    `;
    const vehicule = await pool.query(query, [plaque]);
    if (vehicule.rows.length === 0) {
      return res.status(404).json({ message: "Véhicule non trouvé" });
    }
    res.json(vehicule.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur du serveur");
  }
});

// Récupérer TOUS les véhicules
app.get('/vehicules', async (req, res) => {
  try {
    const allVehicules = await pool.query("SELECT * FROM vehicules ORDER BY date_creation DESC");
    res.json(allVehicules.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur du serveur");
  }
});

// Mettre à jour un véhicule
app.put('/vehicules/:plaque', async (req, res) => {
  try {
    const { plaque } = req.params;
    const { couleur, statut_general, proprietaire_id } = req.body;
    const updateVehicule = await pool.query(
      "UPDATE vehicules SET couleur = $1, statut_general = $2, proprietaire_id = $3, date_modification = CURRENT_TIMESTAMP WHERE plaque_immatriculation = $4 RETURNING *",
      [couleur, statut_general, proprietaire_id, plaque]
    );
    if (updateVehicule.rows.length === 0) {
      return res.status(404).json({ message: "Impossible de mettre à jour : Véhicule non trouvé" });
    }
    req.io.emit('vehicle_updated', { plaque: plaque });
    await logAction(`VEHICULE_UPDATE: Plaque=${plaque}`);
    res.json({ message: "Véhicule mis à jour avec succès", vehicule: updateVehicule.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur du serveur");
  }
});

// Supprimer un véhicule
app.delete('/vehicules/:plaque', async (req, res) => {
  try {
    const { plaque } = req.params;
    const deleteVehicule = await pool.query(
      "DELETE FROM vehicules WHERE plaque_immatriculation = $1 RETURNING *",
      [plaque]
    );
    if (deleteVehicule.rows.length === 0) {
      return res.status(404).json({ message: "Impossible de supprimer : Véhicule non trouvé" });
    }
    res.json({ message: "Véhicule supprimé avec succès", vehicule: deleteVehicule.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur du serveur");
  }
});

// =====================================================================
// ==                  ROUTES API POUR LES PROPRIÉTAIRES              ==
// =====================================================================

// Créer un nouveau propriétaire
app.post('/proprietaires', async (req, res) => {
  try {
    const { nom, prenom, date_naissance, adresse, telephone, email } = req.body;
    const newProprietaire = await pool.query(
      "INSERT INTO proprietaires (nom, prenom, date_naissance, adresse, telephone, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [nom, prenom, date_naissance, adresse, telephone, email]
    );
    res.status(201).json(newProprietaire.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur du serveur");
  }
});

// Récupérer TOUS les propriétaires
app.get('/proprietaires', async (req, res) => {
  try {
    const allProprietaires = await pool.query("SELECT * FROM proprietaires ORDER BY nom, prenom");
    res.json(allProprietaires.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur du serveur");
  }
});

// Récupérer un propriétaire spécifique par son ID
app.get('/proprietaires/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const proprietaire = await pool.query("SELECT * FROM proprietaires WHERE id = $1", [id]);
    if (proprietaire.rows.length === 0) {
      return res.status(404).json({ message: "Propriétaire non trouvé" });
    }
    res.json(proprietaire.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur du serveur");
  }
});

// Mettre à jour un propriétaire
app.put('/proprietaires/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { adresse, telephone, email } = req.body;
    const updateProprietaire = await pool.query(
      "UPDATE proprietaires SET adresse = $1, telephone = $2, email = $3 WHERE id = $4 RETURNING *",
      [adresse, telephone, email, id]
    );
    if (updateProprietaire.rows.length === 0) {
      return res.status(404).json({ message: "Impossible de mettre à jour : Propriétaire non trouvé" });
    }
    res.json({ message: "Propriétaire mis à jour", data: updateProprietaire.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur du serveur");
  }
});

// Supprimer un propriétaire
app.delete('/proprietaires/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleteProprietaire = await pool.query("DELETE FROM proprietaires WHERE id = $1 RETURNING *", [id]);
    if (deleteProprietaire.rows.length === 0) {
      return res.status(404).json({ message: "Impossible de supprimer : Propriétaire non trouvé" });
    }
    res.json({ message: "Propriétaire supprimé", data: deleteProprietaire.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur du serveur");
  }
});

// =====================================================================
// ==           ROUTES SPÉCIFIQUES AUX MODULES (AVEC TEMPS RÉEL)      ==
// =====================================================================

// Module ONT (F-ONT-02)
app.put('/ont/vehicules/:plaque/carte-grise', async (req, res) => {
  try {
    const { plaque } = req.params;
    const { nouveau_statut } = req.body;
    if (!['MANQUANT', 'VALIDE', 'EXPIRÉ'].includes(nouveau_statut)) {
      return res.status(400).json({ message: "Statut non valide." });
    }
    const update = await pool.query(
      "UPDATE vehicules SET statut_carte_grise = $1, date_modification = CURRENT_TIMESTAMP WHERE plaque_immatriculation = $2 RETURNING *",
      [nouveau_statut, plaque]
    );
    if (update.rows.length === 0) return res.status(404).json({ message: "Véhicule non trouvé" });
    
    req.io.emit('vehicle_updated', { plaque: plaque });
    await logAction(`CARTE_GRISE_UPDATE: Plaque=${plaque}, Statut=${nouveau_statut}`);
    
    res.json({ message: `Statut de la carte grise mis à jour à '${nouveau_statut}'`, vehicule: update.rows[0] });
  } catch (err) { console.error(err.message); res.status(500).send("Erreur du serveur"); }
});

// Module Assurance (F-ASS-02)
app.put('/assurance/vehicules/:plaque/statut', async (req, res) => {
  try {
    const { plaque } = req.params;
    const { nouveau_statut } = req.body;
    if (!['MANQUANT', 'VALIDE', 'EXPIRÉ'].includes(nouveau_statut)) {
      return res.status(400).json({ message: "Statut non valide." });
    }
    const update = await pool.query(
      "UPDATE vehicules SET statut_assurance = $1, date_modification = CURRENT_TIMESTAMP WHERE plaque_immatriculation = $2 RETURNING *",
      [nouveau_statut, plaque]
    );
    if (update.rows.length === 0) return res.status(404).json({ message: "Véhicule non trouvé" });

    req.io.emit('vehicle_updated', { plaque: plaque });
    await logAction(`ASSURANCE_UPDATE: Plaque=${plaque}, Statut=${nouveau_statut}`);

    res.json({ message: `Statut de l'assurance mis à jour à '${nouveau_statut}'`, vehicule: update.rows[0] });
  } catch (err) { console.error(err.message); res.status(500).send("Erreur du serveur"); }
});

// Module Mairie (F-MAI-03)
app.put('/mairie/vehicules/:plaque/vignette', async (req, res) => {
  try {
    const { plaque } = req.params;
    const { nouveau_statut } = req.body;
    if (!['MANQUANT', 'VALIDE', 'EXPIRÉ'].includes(nouveau_statut)) {
      return res.status(400).json({ message: "Statut non valide." });
    }
    const update = await pool.query(
      "UPDATE vehicules SET statut_vignette = $1, date_modification = CURRENT_TIMESTAMP WHERE plaque_immatriculation = $2 RETURNING *",
      [nouveau_statut, plaque]
    );
    if (update.rows.length === 0) return res.status(404).json({ message: "Véhicule non trouvé" });

    req.io.emit('vehicle_updated', { plaque: plaque });
    await logAction(`VIGNETTE_UPDATE: Plaque=${plaque}, Statut=${nouveau_statut}`);

    res.json({ message: `Statut de la vignette mis à jour à '${nouveau_statut}'`, vehicule: update.rows[0] });
  } catch (err) { console.error(err.message); res.status(500).send("Erreur du serveur"); }
});

// Module MTS (F-MTS-02)
app.put('/mts/vehicules/:plaque/visite-technique', async (req, res) => {
  try {
    const { plaque } = req.params;
    const { nouveau_statut } = req.body;
    if (!['MANQUANT', 'VALIDE', 'EXPIRÉ'].includes(nouveau_statut)) {
      return res.status(400).json({ message: "Statut non valide." });
    }
    const update = await pool.query(
      "UPDATE vehicules SET statut_visite_technique = $1, date_modification = CURRENT_TIMESTAMP WHERE plaque_immatriculation = $2 RETURNING *",
      [nouveau_statut, plaque]
    );
    if (update.rows.length === 0) return res.status(404).json({ message: "Véhicule non trouvé" });

    req.io.emit('vehicle_updated', { plaque: plaque });
    await logAction(`VISITE_TECHNIQUE_UPDATE: Plaque=${plaque}, Statut=${nouveau_statut}`);

    res.json({ message: `Statut de la visite technique mis à jour à '${nouveau_statut}'`, vehicule: update.rows[0] });
  } catch (err) { console.error(err.message); res.status(500).send("Erreur du serveur"); }
});


// =====================================================================
// ==                  ROUTES POUR LE TABLEAU DE BORD DE L'ÉTAT       ==
// =====================================================================

// ROUTES POUR LE TABLEAU DE BORD DE L'ETAT (F-ETA-02)
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Route pour récupérer les statistiques globales
// Dans server.js

// ...

// Dans server.js

app.get('/stats', async (req, res) => {
    try {
        const [
            totalVehiculesRes,
            totalProprietairesRes,
            statutsRes,
            vehiculesAJourRes,
            citoyensAJourRes
        ] = await Promise.all([
            pool.query("SELECT COUNT(*) FROM vehicules"),
            pool.query("SELECT COUNT(*) FROM proprietaires"),
            pool.query(
                `SELECT 
                    (SELECT COUNT(*) FROM vehicules WHERE statut_carte_grise = 'VALIDE') as carte_grise_valide,
                    (SELECT COUNT(*) FROM vehicules WHERE statut_assurance = 'VALIDE') as assurance_valide,
                    (SELECT COUNT(*) FROM vehicules WHERE statut_vignette = 'EXPIRÉ') as vignette_valide, -- CORRECTION FINALE
                    (SELECT COUNT(*) FROM vehicules WHERE statut_visite_technique = 'VALIDE') as visite_valide`
            ),
            pool.query(
                `SELECT COUNT(*) FROM vehicules 
                 WHERE statut_assurance = 'VALIDE' 
                 AND statut_vignette = 'EXPIRÉ' -- CORRECTION FINALE
                 AND statut_visite_technique = 'VALIDE';`
            ),
            pool.query(
                `SELECT COUNT(DISTINCT p.id) FROM proprietaires p
                 WHERE NOT EXISTS (
                     SELECT 1 FROM vehicules v 
                     WHERE v.proprietaire_id = p.id 
                     AND (v.statut_assurance != 'VALIDE' OR v.statut_vignette != 'VALIDE' OR v.statut_visite_technique != 'VALIDE') -- CORRECTION FINALE
                 );`
            )
        ]);

        const stats = {
            totalVehicules: parseInt(totalVehiculesRes.rows[0].count),
            totalProprietaires: parseInt(totalProprietairesRes.rows[0].count),
            vehiculesAJour: parseInt(vehiculesAJourRes.rows[0].count),
            citoyensAJour: parseInt(citoyensAJourRes.rows[0].count),
            conformiteDocuments: {
                carteGrise: parseInt(statutsRes.rows[0].carte_grise_valide),
                assurance: parseInt(statutsRes.rows[0].assurance_valide),
                vignette: parseInt(statutsRes.rows[0].vignette_valide),
                visiteTechnique: parseInt(statutsRes.rows[0].visite_valide),
            },
            revenusSimules: {
                douane: 5420000,
                mairie_vignettes: 12500000,
                ont_cartes_grises: 21000000
            }
        };

        res.json(stats);

    } catch (err) {
        console.error("ERREUR SUR LA ROUTE /stats:", err.message);
        res.status(500).send("Erreur du serveur lors du calcul des statistiques");
    }
});

// ... (reste du fichier)
// =============================================
// ==           DÉMARRAGE DU SERVEUR          ==
// =============================================
server.listen(port, () => {
  console.log(`Serveur SUI (HTTP + Real-time) démarré sur le port ${port}`);
});