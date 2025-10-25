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
const { jwtDecode } = require('jwt-decode'); // Librairie pour décoder les tokens JWT d'AWS Cognito

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

// =============================================
// ==        MIDDLEWARE D'AUTORISATION        ==
// =============================================

/**
 * Middleware d'autorisation basé sur les rôles AWS Cognito
 * Vérifie que l'utilisateur authentifié possède au moins un des rôles autorisés
 * @param {string[]} allowedRoles - Tableau des rôles autorisés (ex: ['Douane', 'Police'])
 * @returns {Function} - Fonction middleware Express
 */
function authorize(allowedRoles) {
  return async (req, res, next) => {
    try {
      // Récupération de l'en-tête Authorization de la requête
      const authHeader = req.headers.authorization;
      
      // Vérification de la présence et du format de l'en-tête Authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          message: "Token d'authentification manquant ou invalide." 
        });
      }
      
      // Extraction du token JWT (partie après 'Bearer ')
      const token = authHeader.substring(7); // Supprime 'Bearer ' du début
      
      // Décodage du token JWT pour extraire les informations utilisateur
      // Utilisation de jwtDecode (destructuré depuis l'import) pour la compatibilité CommonJS
      const payload = jwtDecode(token);
      
      // Extraction des groupes/rôles de l'utilisateur depuis le payload Cognito
      // Si 'cognito:groups' n'existe pas, on utilise un tableau vide
      const userGroups = payload['cognito:groups'] || [];
      
      // Vérification si l'utilisateur possède au moins un des rôles autorisés
      // Utilisation de some() pour vérifier si au moins un groupe correspond
      const hasPermission = userGroups.some(role => allowedRoles.includes(role));
      
      if (hasPermission) {
        // L'utilisateur a les permissions nécessaires, on passe au middleware suivant
        next();
      } else {
        // L'utilisateur n'a pas les permissions requises
        return res.status(403).json({ 
          message: "Accès refusé. Rôle non autorisé." 
        });
      }
      
    } catch (error) {
      // Gestion des erreurs de décodage du token (token mal formé, expiré, etc.)
      console.error('Erreur lors du décodage du token JWT:', error.message);
      return res.status(401).json({ 
        message: "Token d'authentification invalide ou expiré." 
      });
    }
  };
}

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

// Créer un nouveau véhicule (F-DOU-01) - Accès restreint au rôle 'Douane'
app.post('/vehicules', authorize(['Douane']), async (req, res) => {
  try {
    const { plaque_immatriculation, marque, modele, annee, couleur, numero_chassis } = req.body;
    
    // Validation du format de plaque d'immatriculation selon le format XX-1234-XX
    const regex = /^[A-Z]{2}-\d{4}-[A-Z]{2}$/;
    if (!regex.test(plaque_immatriculation)) {
      return res.status(400).json({ message: "Le format de la plaque d'immatriculation est invalide. Le format attendu est XX-1234-XX." });
    }
    const newVehicule = await pool.query(
      "INSERT INTO vehicules (plaque_immatriculation, marque, modele, annee, couleur, numero_chassis) VALUES($1, $2, $3, $4, $5, $6) RETURNING *",
      [plaque_immatriculation, marque, modele, annee, couleur, numero_chassis]
    );
    
    // =============================================
    // ==        GESTION DES PAIEMENTS DOUANE     ==
    // =============================================
    // Récupération du prix de la douane depuis la table parametres
    // Ce prix est utilisé pour enregistrer automatiquement un paiement lors de la création d'un véhicule
    const resultPrix = await pool.query(
      "SELECT param_valeur FROM parametres WHERE param_nom = 'prix_douane'"
    );
    
    // Conversion du prix en entier pour le calcul des montants
    const montantDouane = parseInt(resultPrix.rows[0].param_valeur);
    
    // Enregistrement automatique du paiement dans la table paiements
    // Service='Douane', montant récupéré depuis parametres, plaque du véhicule créé
    await pool.query(
      "INSERT INTO paiements (service, montant, vehicule_plaque) VALUES ($1, $2, $3)",
      ['Douane', montantDouane, plaque_immatriculation]
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
    
    // Requête SQL complète pour récupérer toutes les informations du véhicule et de son propriétaire
    // v.* sélectionne TOUTES les colonnes de la table vehicules, incluant :
    // - Informations de base : plaque_immatriculation, marque, modele, annee, couleur, numero_chassis
    // - Statuts des documents : statut_carte_grise, statut_assurance, statut_vignette, statut_visite_technique
    // - Statut police : statut_police (nouveau champ ajouté pour la gestion des véhicules suspects)
    // - Informations système : id, proprietaire_id, statut_general, date_creation, date_modification
    // Les informations du propriétaire incluent maintenant les données d'identité et la date d'expiration
    const query = `
      SELECT 
        v.*, 
        p.nom AS proprietaire_nom, 
        p.prenom AS proprietaire_prenom,
        p.adresse AS proprietaire_adresse,
        p.telephone AS proprietaire_telephone,
        p.email AS proprietaire_email,
        p.type_piece_identite AS proprietaire_type_piece_identite,
        p.numero_piece_identite AS proprietaire_numero_piece_identite,
        p.date_expiration_piece AS proprietaire_date_expiration_piece
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
    // Extraction des champs du body de la requête, incluant les champs d'identité et la date d'expiration de la pièce
    const { nom, prenom, date_naissance, adresse, telephone, email, type_piece_identite, numero_piece_identite, date_expiration_piece } = req.body;
    
    // Requête SQL mise à jour pour inclure tous les champs d'identité et la date d'expiration de la pièce d'identité
    // La date_expiration_piece peut être NULL si non fournie par le frontend
    const newProprietaire = await pool.query(
      "INSERT INTO proprietaires (nom, prenom, date_naissance, adresse, telephone, email, type_piece_identite, numero_piece_identite, date_expiration_piece) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [nom, prenom, date_naissance, adresse, telephone, email, type_piece_identite, numero_piece_identite, date_expiration_piece]
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

// Définition des statuts valides pour les différents modules
// Statuts valides pour le module Police (gestion des véhicules suspects)
const validStatutPolice = ['NORMAL', 'VOLÉ', 'EN FUITE', 'INTERCEPTÉ'];

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
    
    // =============================================
    // ==      GESTION DES PAIEMENTS ONT          ==
    // =============================================
    // Enregistrement d'un paiement uniquement si le statut passe à 'VALIDE'
    // Un paiement est généré automatiquement quand l'ONT valide une carte grise
    if (nouveau_statut === 'VALIDE') {
      // Récupération du prix de la carte grise depuis la table parametres
      const resultPrix = await pool.query(
        "SELECT param_valeur FROM parametres WHERE param_nom = 'prix_carte_grise'"
      );
      
      // Conversion du prix en entier pour le calcul des montants
      const montantCarteGrise = parseInt(resultPrix.rows[0].param_valeur);
      
      // Enregistrement automatique du paiement dans la table paiements
      // Service='ONT', montant récupéré depuis parametres, plaque du véhicule
      await pool.query(
        "INSERT INTO paiements (service, montant, vehicule_plaque) VALUES ($1, $2, $3)",
        ['ONT', montantCarteGrise, plaque]
      );
    }
    
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

    // =============================================
    // ==     GESTION DES PAIEMENTS MAIRIE       ==
    // =============================================
    // Enregistrement d'un paiement uniquement si le statut passe à 'VALIDE'
    // Un paiement est généré automatiquement quand la Mairie valide une vignette
    if (nouveau_statut === 'VALIDE') {
      // Récupération du prix de la vignette depuis la table parametres
      const resultPrix = await pool.query(
        "SELECT param_valeur FROM parametres WHERE param_nom = 'prix_vignette'"
      );
      
      // Conversion du prix en entier pour le calcul des montants
      const montantVignette = parseInt(resultPrix.rows[0].param_valeur);
      
      // Enregistrement automatique du paiement dans la table paiements
      // Service='Mairie', montant récupéré depuis parametres, plaque du véhicule
      await pool.query(
        "INSERT INTO paiements (service, montant, vehicule_plaque) VALUES ($1, $2, $3)",
        ['Mairie', montantVignette, plaque]
      );
    }

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

// Module Police (F-POL-02) - Gestion des statuts de véhicules suspects
// Route sécurisée pour les utilisateurs avec le rôle 'Police' uniquement
app.put('/police/vehicules/:plaque/statut-police', authorize(['Police']), async (req, res) => {
  try {
    // Extraction de la plaque d'immatriculation depuis les paramètres de l'URL
    const { plaque } = req.params;
    
    // Extraction du nouveau statut depuis le corps de la requête
    const { nouveau_statut } = req.body;
    
    // Validation du statut reçu contre la liste des statuts autorisés pour la Police
    if (!validStatutPolice.includes(nouveau_statut)) {
      return res.status(400).json({ 
        message: "Statut non valide. Les statuts autorisés sont : NORMAL, VOLÉ, EN FUITE, INTERCEPTÉ." 
      });
    }
    
    // Mise à jour du statut police dans la base de données
    // Met à jour la colonne statut_police et la date de modification
    const update = await pool.query(
      "UPDATE vehicules SET statut_police = $1, date_modification = CURRENT_TIMESTAMP WHERE plaque_immatriculation = $2 RETURNING *",
      [nouveau_statut, plaque]
    );
    
    // Vérification que le véhicule existe et a été mis à jour
    if (update.rows.length === 0) {
      return res.status(404).json({ message: "Véhicule non trouvé" });
    }
    
    // Requête SELECT complète pour récupérer toutes les informations du véhicule et de son propriétaire
    // Cette requête est identique à celle de GET /vehicules/:plaque pour assurer la cohérence des données
    // Elle inclut toutes les colonnes de vehicules (v.*) et les informations complètes du propriétaire
    const selectQuery = `
      SELECT 
        v.*, 
        p.nom AS proprietaire_nom, 
        p.prenom AS proprietaire_prenom,
        p.adresse AS proprietaire_adresse,
        p.telephone AS proprietaire_telephone,
        p.email AS proprietaire_email,
        p.type_piece_identite AS proprietaire_type_piece_identite,
        p.numero_piece_identite AS proprietaire_numero_piece_identite,
        p.date_expiration_piece AS proprietaire_date_expiration_piece
      FROM vehicules v
      LEFT JOIN proprietaires p ON v.proprietaire_id = p.id
      WHERE v.plaque_immatriculation = $1
    `;
    
    // Exécution de la requête SELECT pour récupérer les informations complètes
    const selectResult = await pool.query(selectQuery, [plaque]);
    
    // Émission d'un événement temps réel pour notifier tous les clients connectés
    // Permet aux autres modules (État, Douane, etc.) de voir les changements en temps réel
    req.io.emit('vehicle_updated', { plaque: plaque });
    
    // Enregistrement de l'action sur la blockchain Hedera pour audit et traçabilité
    await logAction(`STATUT_POLICE_UPDATE: Plaque=${plaque}, Statut=${nouveau_statut}`);
    
    // Retour d'une réponse de succès avec les informations complètes du véhicule et de son propriétaire
    // Utilise selectResult.rows[0] au lieu de update.rows[0] pour inclure les données du propriétaire
    res.json({ 
      message: `Statut police mis à jour à '${nouveau_statut}' pour le véhicule ${plaque}`, 
      vehicule: selectResult.rows[0] 
    });
    
  } catch (err) { 
    // Gestion des erreurs inattendues avec logging pour debugging
    console.error('Erreur lors de la mise à jour du statut police:', err.message); 
    res.status(500).send("Erreur du serveur lors de la mise à jour du statut police"); 
  }
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
        // =============================================
        // ==      RÉCUPÉRATION DES PARAMÈTRES      ==
        // =============================================
        // Récupération des paramètres de filtrage par période depuis la requête
        // Les paramètres debut et fin sont optionnels et au format 'YYYY-MM-DD'
        const { debut, fin } = req.query;
        
        // =============================================
        // ==      VÉRIFICATION ET CORRECTION DES DATES ==
        // =============================================
        // Debug : Vérification du type et de la valeur des dates reçues
        console.log('Type date debut reçue:', typeof debut, 'Valeur:', debut);
        console.log('Type date fin reçue:', typeof fin, 'Valeur:', fin);
        
        // Correction du format des dates pour éviter l'erreur "invalid input syntax for type date"
        // S'assurer que debut et fin sont des chaînes de caractères valides ou null
        const debutFormate = (debut && typeof debut === 'string') ? debut : null;
        const finFormate = (fin && typeof fin === 'string') ? fin : null;
        
        // Debug : Vérification des dates formatées
        console.log('Date debut formatée:', debutFormate);
        console.log('Date fin formatée:', finFormate);
        
        // =============================================
        // ==      CALCUL DES STATISTIQUES          ==
        // =============================================
        // Exécution de toutes les requêtes en parallèle avec filtrage par période
        // Utilisation de conditions dans WHERE pour gérer les cas où les dates ne sont pas fournies
        const [
            totalVehiculesRes,
            totalProprietairesRes,
            statutsRes,
            vehiculesAJourRes,
            citoyensAJourRes,
            revenusRes,
            vehiculesSignalesRes
        ] = await Promise.all([
            // Comptage des véhicules avec filtrage par date de création
            // Logique robuste : >= debut ET < fin+1 jour pour inclure toute la journée même si debut=fin
            pool.query(
                "SELECT COUNT(*) FROM vehicules WHERE ($1::DATE IS NULL OR date_creation >= $1::DATE) AND ($2::DATE IS NULL OR date_creation < ($2::DATE + INTERVAL '1 day'))",
                [debutFormate, finFormate]
            ),
            // Comptage des propriétaires avec filtrage par date de création
            // Logique robuste : >= debut ET < fin+1 jour pour inclure toute la journée même si debut=fin
            pool.query(
                "SELECT COUNT(*) FROM proprietaires WHERE ($1::DATE IS NULL OR date_creation >= $1::DATE) AND ($2::DATE IS NULL OR date_creation < ($2::DATE + INTERVAL '1 day'))",
                [debutFormate, finFormate]
            ),
            // Calcul des statuts des documents avec filtrage par date de création des véhicules
            // Logique robuste : >= debut ET < fin+1 jour pour inclure toute la journée même si debut=fin
            pool.query(
                `SELECT 
                    (SELECT COUNT(*) FROM vehicules WHERE statut_carte_grise = 'VALIDE' AND ($1::DATE IS NULL OR date_creation >= $1::DATE) AND ($2::DATE IS NULL OR date_creation < ($2::DATE + INTERVAL '1 day'))) as carte_grise_valide,
                    (SELECT COUNT(*) FROM vehicules WHERE statut_assurance = 'VALIDE' AND ($1::DATE IS NULL OR date_creation >= $1::DATE) AND ($2::DATE IS NULL OR date_creation < ($2::DATE + INTERVAL '1 day'))) as assurance_valide,
                    (SELECT COUNT(*) FROM vehicules WHERE statut_vignette = 'EXPIRÉ' AND ($1::DATE IS NULL OR date_creation >= $1::DATE) AND ($2::DATE IS NULL OR date_creation < ($2::DATE + INTERVAL '1 day'))) as vignette_valide,
                    (SELECT COUNT(*) FROM vehicules WHERE statut_visite_technique = 'VALIDE' AND ($1::DATE IS NULL OR date_creation >= $1::DATE) AND ($2::DATE IS NULL OR date_creation < ($2::DATE + INTERVAL '1 day'))) as visite_valide`,
                [debutFormate, finFormate]
            ),
            // Comptage des véhicules à jour avec filtrage par date de création
            // Logique robuste : >= debut ET < fin+1 jour pour inclure toute la journée même si debut=fin
            pool.query(
                `SELECT COUNT(*) FROM vehicules 
                 WHERE statut_assurance = 'VALIDE' 
                 AND statut_vignette = 'EXPIRÉ'
                 AND statut_visite_technique = 'VALIDE'
                 AND ($1::DATE IS NULL OR date_creation >= $1::DATE) 
                 AND ($2::DATE IS NULL OR date_creation < ($2::DATE + INTERVAL '1 day'))`,
                [debutFormate, finFormate]
            ),
            // Comptage des citoyens à jour avec filtrage par date de création des propriétaires
            // Logique robuste : >= debut ET < fin+1 jour pour inclure toute la journée même si debut=fin
            pool.query(
                `SELECT COUNT(DISTINCT p.id) FROM proprietaires p
                 WHERE ($1::DATE IS NULL OR p.date_creation >= $1::DATE) 
                 AND ($2::DATE IS NULL OR p.date_creation < ($2::DATE + INTERVAL '1 day'))
                 AND NOT EXISTS (
                     SELECT 1 FROM vehicules v 
                     WHERE v.proprietaire_id = p.id 
                     AND (v.statut_assurance != 'VALIDE' OR v.statut_vignette != 'VALIDE' OR v.statut_visite_technique != 'VALIDE')
                 )`,
                [debutFormate, finFormate]
            ),
            // Calcul des revenus réels avec filtrage par date de paiement
            // Logique robuste : >= debut ET < fin+1 jour pour inclure toute la journée même si debut=fin
            pool.query(
                "SELECT service, SUM(montant) as total FROM paiements WHERE ($1::DATE IS NULL OR date_paiement >= $1::DATE) AND ($2::DATE IS NULL OR date_paiement < ($2::DATE + INTERVAL '1 day')) GROUP BY service",
                [debutFormate, finFormate]
            ),
            // =============================================
            // ==      COMPTAGE DES VÉHICULES SIGNALÉS  ==
            // =============================================
            // Comptage des véhicules signalés par la police (VOLÉ ou EN FUITE)
            // Nouveau KPI pour le tableau de bord : indicateur de sécurité routière
            pool.query(
                "SELECT COUNT(*) FROM vehicules WHERE statut_police = 'VOLÉ' OR statut_police = 'EN FUITE'"
            )
        ]);

        // =============================================
        // ==      CALCUL DES REVENUS RÉELS        ==
        // =============================================
        // Construction de l'objet des revenus réels depuis la base de données
        // Initialisation avec des valeurs par défaut à 0 pour tous les services
        const revenusReels = {
            douane: 0,
            ont: 0,
            mairie: 0
        };
        
        // Population de l'objet revenusReels avec les données réelles de la table paiements
        // Gestion des cas où un service n'a encore aucun paiement (reste à 0)
        revenusRes.rows.forEach(row => {
            const serviceKey = row.service.toLowerCase();
            if (serviceKey === 'douane') {
                revenusReels.douane = parseInt(row.total);
            } else if (serviceKey === 'ont') {
                revenusReels.ont = parseInt(row.total);
            } else if (serviceKey === 'mairie') {
                revenusReels.mairie = parseInt(row.total);
            }
        });

        const stats = {
            totalVehicules: parseInt(totalVehiculesRes.rows[0].count),
            totalProprietaires: parseInt(totalProprietairesRes.rows[0].count),
            vehiculesAJour: parseInt(vehiculesAJourRes.rows[0].count),
            citoyensAJour: parseInt(citoyensAJourRes.rows[0].count),
            // =============================================
            // ==      NOUVEAU KPI : VÉHICULES SIGNALÉS  ==
            // =============================================
            // Indicateur de sécurité routière : nombre de véhicules signalés par la police
            // Compte les véhicules avec statut_police = 'VOLÉ' ou 'EN FUITE'
            vehiculesSignales: parseInt(vehiculesSignalesRes.rows[0].count),
            conformiteDocuments: {
                carteGrise: parseInt(statutsRes.rows[0].carte_grise_valide),
                assurance: parseInt(statutsRes.rows[0].assurance_valide),
                vignette: parseInt(statutsRes.rows[0].vignette_valide),
                visiteTechnique: parseInt(statutsRes.rows[0].visite_valide),
            },
            revenusReels: revenusReels
        };

        res.json(stats);

    } catch (err) {
        console.error("ERREUR SUR LA ROUTE /stats:", err.message);
        res.status(500).send("Erreur du serveur lors du calcul des statistiques");
    }
});

// =====================================================================
// ==                  ROUTES POUR LA GESTION DES PARAMÈTRES          ==
// =====================================================================

// =============================================
// ==        CONSULTATION DES PARAMÈTRES     ==
// =============================================
// Récupérer tous les paramètres (prix des services) - Accès autorisé aux rôles pertinents
// Les rôles Douane, Mairie, ONT et ETAT peuvent consulter les prix des services
// Correction des permissions : inclusion des variantes de casse pour résoudre l'erreur 403
// Support des rôles en majuscules et minuscules selon la configuration AWS Cognito
app.get('/parametres', authorize(['Douane', 'Mairie', 'ONT', 'ETAT', 'douane', 'mairie', 'ont', 'etat']), async (req, res) => {
  try {
    // Récupération de tous les paramètres depuis la table parametres
    // Permet aux services concernés de consulter les prix configurés dans le système
    const parametres = await pool.query("SELECT * FROM parametres ORDER BY param_nom");
    res.json(parametres.rows);
  } catch (err) {
    console.error('Erreur lors de la récupération des paramètres:', err.message);
    res.status(500).send("Erreur du serveur lors de la récupération des paramètres");
  }
});

// =============================================
// ==      MODIFICATION DES PARAMÈTRES        ==
// =============================================
// Mettre à jour un paramètre spécifique (prix d'un service) - Accès restreint au rôle 'ETAT'
// Seul l'État peut modifier les prix des services dans le système
app.put('/parametres/:nom', authorize(['ETAT']), async (req, res) => {
  try {
    // Extraction du nom du paramètre depuis l'URL
    const { nom } = req.params;
    // Extraction de la nouvelle valeur depuis le corps de la requête
    const { valeur } = req.body;
    
    // Validation de la présence de la valeur dans le corps de la requête
    if (valeur === undefined || valeur === null) {
      return res.status(400).json({ message: "La valeur du paramètre est requise" });
    }
    
    // Mise à jour du paramètre dans la base de données
    // Permet à l'État de modifier les prix des services (douane, carte grise, vignette)
    const updateParametre = await pool.query(
      "UPDATE parametres SET param_valeur = $1 WHERE param_nom = $2 RETURNING *",
      [valeur, nom]
    );
    
    // Vérification que le paramètre existe et a été mis à jour
    if (updateParametre.rows.length === 0) {
      return res.status(404).json({ message: "Paramètre non trouvé" });
    }
    
    // Retour d'une réponse de succès avec les nouvelles données du paramètre
    res.json({ 
      message: `Paramètre '${nom}' mis à jour avec succès`, 
      parametre: updateParametre.rows[0] 
    });
  } catch (err) {
    console.error('Erreur lors de la mise à jour du paramètre:', err.message);
    res.status(500).send("Erreur du serveur lors de la mise à jour du paramètre");
  }
});

// ... (reste du fichier)
// =============================================
// ==           DÉMARRAGE DU SERVEUR          ==
// =============================================
server.listen(port, () => {
  console.log(`Serveur SUI (HTTP + Real-time) démarré sur le port ${port}`);
});