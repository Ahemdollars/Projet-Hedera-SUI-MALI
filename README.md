# Projet SIU-Mali (Système d'Information Unifié)

> **Candidature au Concours d'HEDERA**

Ce dépôt contient le code source d'un prototype fonctionnel (Proof-of-Concept) du SIU-Mali.

## 1. LIEN DE LA DÉMONSTRATION EN LIGNE (Test du Jury)

Pour tester l'application en direct, veuillez utiliser le lien suivant. Il n'y a **rien à installer**.

**Lien de la Démo :** **[http://ec2-13-38-128-242.eu-west-3.compute.amazonaws.com/](http://ec2-13-38-128-242.eu-west-3.compute.amazonaws.com/)**

## 2. COMPTES DE DÉMONSTRATION

L'application utilise une authentification sécurisée (AWS Cognito) avec des portails basés sur les rôles. Veuillez utiliser les identifiants suivants pour tester chaque portail.

**Mot de passe commun (provisoire) :** `Password123!`

---

### Portail 1 : Police Nationale
* **Nom d'utilisateur :** `P007`
* **Mot de passe :** `Password123!`
* **Fonctionnalités à tester :**
    1.  **Rechercher** un véhicule (ex: `AW-1111-AW`).
    2.  **Consulter** les statuts de tous les services (Vignette, Assurance, etc.).
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

### Portail 3 : Douane
* **Nom d'utilisateur :** `D001`
* **Mot de passe :** `Password123!`
* **Fonctionnalités à tester :**
    1.  **Enregistrer** un nouveau véhicule dans le système (ex: `XX-1234-XX`).

---

### Portail 4 : Services (Mairie, ONT, etc.)
* **Nom d'utilisateur :** `MAIRIE001`
* **Mot de passe :** `Password123!`
* **Fonctionnalités à tester :**
    1.  **Rechercher** un véhicule.
    2.  **Mettre à jour** le statut d'un document (ex: marquer la "Vignette" comme "VALIDE").

## 3. DESCRIPTION DU PROJET

Le SIU-Mali est un système d'information centralisé conçu pour résoudre la fragmentation des données des véhicules au Mali. Il connecte plus de 6 agences (Police, Douane, Mairie, ONT, MTS, Assurances) sur une plateforme unique, sécurisée et en temps réel.

## 4. OBJECTIFS CLÉS

* **Réduire la fraude documentaire** (fausses cartes grises, assurances).
* **Améliorer la sécurité routière** (alertes "EN FUITE" en temps réel).
* **Augmenter et sécuriser les revenus de l'État** (traçabilité des paiements).
* **Garantir la transparence** grâce à une piste d'audit immuable (Hedera Hashgraph).

## 5. STACK TECHNIQUE (POUR INFORMATION)

* **Audit Trail :** Hedera Consensus Service (HCS)
* **Frontend :** React.js (avec Vite)
* **Backend :** Node.js / Express.js
* **Base de Données :** PostgreSQL (hébergé sur AWS RDS)
* **Authentification :** AWS Cognito (gestion des rôles)
* **Infrastructure :** AWS EC2 (serveur), Nginx (reverse proxy)