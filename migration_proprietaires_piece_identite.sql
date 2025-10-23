-- =====================================================
-- Script de migration pour ajouter les colonnes de pièce d'identité
-- à la table proprietaires
-- =====================================================

-- 1. Création du type ENUM pour les types de pièces d'identité
-- Cette commande crée un nouveau type énuméré qui définit les valeurs possibles
-- pour le type de pièce d'identité (Passeport, Carte biométrique, etc.)
CREATE TYPE type_piece_enum AS ENUM (
    'Passeport',
    'Carte biometrique', 
    'Carte d''identite',
    'Fiche individuelle'
);

-- 2. Ajout de la colonne type_piece_identite à la table proprietaires
-- Cette colonne utilise le type ENUM créé précédemment et peut être NULL
-- pour ne pas affecter les enregistrements existants
ALTER TABLE proprietaires 
ADD COLUMN type_piece_identite type_piece_enum NULL;

-- 3. Ajout de la colonne numero_piece_identite à la table proprietaires  
-- Cette colonne stocke le numéro de la pièce d'identité sous forme de texte
-- avec une limite de 255 caractères et peut être NULL
ALTER TABLE proprietaires 
ADD COLUMN numero_piece_identite VARCHAR(255) NULL;

-- =====================================================
-- Fin du script de migration
-- =====================================================
