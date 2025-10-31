# Projet SIU-Mali (Système d'Information Unifié)

> **Candidature au Concours de Plan d’Affaires (AES 2025) & au Hackathon Hedera**

Ce dépôt contient le code source d'un prototype fonctionnel (Proof-of-Concept) du SIU-Mali, une plateforme GovTech de modernisation pour la gestion du parc automobile au Mali.

---

## SECTION 1 : POUR LE JURY DU CONCOURS AES 2025 (Démo)

### 1.1 Lien de la Démonstration en Ligne

Pour tester l'application en direct, veuillez utiliser le lien suivant. Il n'y a **rien à installer**.

**Lien de la Démo :** **[http://ec2-13-38-128-242.eu-west-3.compute.amazonaws.com/](http://ec2-13-38-128-242.eu-west-3.compute.amazonaws.com/)**

### 1.2 Comptes de Démonstration

L'application utilise des portails basés sur les rôles. Veuillez utiliser les identifiants suivants pour tester.

**Mot de passe commun (provisoire) :** `Password123!`

---

### Portail 1 : Police Nationale (Rôle central)
* **Nom d'utilisateur :** `P007`
* **Mot de passe :** `Password123!`
* **Fonctionnalités à tester :**
    1.  **Rechercher** un véhicule (ex: `AW-1111-AW`).
    2.  **Consulter** les statuts de *tous* les autres services.
    3.  **Signaler** un véhicule ("EN FUITE" ou "VOLÉ") et **ajouter une description**.
    4.  **Consulter** la "Liste des Véhicules Activement Signalés" en bas de page.

---

### Portail 2 : État (Tableau de Bord)
* **Nom d'utilisateur :** `ETAT001`
* **Mot de passe :** `Password123!`
* **Fonctionnalités à tester :**
    1.  **Consulter** les graphiques de revenus en temps réel.
    2.  **Filtrer** les statistiques par date.
    3.  **Voir** les KPIs (Indicateurs Clés) sur la conformité et les véhicules signalés.

---

### Portail 3 : Douane (Point d'entrée)
* **Nom d'utilisateur :** `D001`
* **Mot de passe :** `Password123!`
* **Fonctionnalités à tester :**
    1.  **Enregistrer** un nouveau véhicule dans le système (ex: `YY-5678-ZZ`).

---

### Portail 4 : Mairie (Vignette)
* **Nom d'utilisateur :** `MAIRIE001`
* **Mot de passe :** `Password123!`
* **Test :** Rechercher un véhicule (ex: `AW-1111-AW`) et marquer la "Vignette" comme "VALIDE".

---

### Portail 5 : ONT (Carte Grise)
* **Nom d'utilisateur :** `ONT001`
* **Mot de passe :** `Password123!`
* **Test :** Rechercher un véhicule et marquer la "Carte Grise" comme "VALIDE".

---

### Portail 6 : MTS (Visite Technique)
* **Nom d'utilisateur :** `ONT001`
* **Mot de passe :** `Password123!`
* **Test :** Rechercher un véhicule et marquer la "Visite Technique" comme "VALIDE".

---

### Portail 7 : Assurance
* **Nom d'utilisateur :** `ASSUR001`
* **Mot de passe :** `Password123!`
* **Test :** Rechercher un véhicule et marquer "l'Assurance" comme "VALIDE".

---

## SECTION 2 : POUR LE JURY DU HACKATHON HEDERA (Technique)

### 2.1 Pitch Deck (Présentation du Projet)

Vous trouverez la présentation visuelle du projet, qui résume le problème, la solution et l'innovation (y compris notre usage de Hedera) sur le lien ci-dessous.

* **Lien vers le Pitch Deck :** `https://drive.google.com/drive/folders/1x8qeMZ7EsETjOzxKjv845FvPzQPvNbfA?usp=drive_link`

### 2.2 Liens de Certification:

Afin de valider l'expertise technique du porteur de projet, voici les liens vers les certifications pertinentes.

* **Lien Certification 1 :** `https://certs.hashgraphdev.com/a69b633f-ff0d-4bb4-8c09-68e3c9c28887.pdf`
* **Lien Certification 2 :** `https://certs.hashgraphdev.com/0a0f9fc6-e78d-45b5-9ac3-951eaef29f13.pdf`
* **Lien Certification 3 :** `https://certs.hashgraphdev.com/c8263c53-3e67-4bc1-93df-7ca658a9db48.pdf`


---

## 3. DESCRIPTION TECHNIQUE (POUR INFORMATION)

* **Audit Trail :** **Hedera Consensus Service (HCS)** - Chaque action critique est hachée et enregistrée sur Hedera pour une traçabilité immuable.
* **Frontend :** React.js (avec Vite)
* **Backend :** Node.js / Express.js
* **Base de Données :** PostgreSQL (hébergé sur AWS RDS)
* **Authentification :** AWS Cognito (gestion des rôles)
* **Infrastructure :** AWS EC2 (serveur), Nginx (reverse proxy)