-- =====================================================
-- Script de migration pour ajouter la gestion du statut police
-- à la table vehicules
-- =====================================================

-- 1. Création du type ENUM pour les statuts police
-- Cette commande crée un nouveau type énuméré qui définit les valeurs possibles
-- pour le statut police des véhicules (NORMAL, VOLÉ, EN FUITE, INTERCEPTÉ)
CREATE TYPE statut_police_enum AS ENUM (
    'NORMAL',
    'VOLÉ',
    'EN FUITE',
    'INTERCEPTÉ'
);

-- 2. Ajout de la colonne statut_police à la table vehicules
-- Cette colonne utilise le type ENUM créé précédemment avec une valeur par défaut
-- 'NORMAL' et ne peut pas être NULL pour garantir la cohérence des données
ALTER TABLE vehicules 
ADD COLUMN statut_police statut_police_enum NOT NULL DEFAULT 'NORMAL';

-- =====================================================
-- Fin du script de migration
-- =====================================================
