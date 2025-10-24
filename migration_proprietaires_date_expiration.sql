-- =====================================================
-- Script de migration pour ajouter la colonne de date d'expiration
-- de la pièce d'identité à la table proprietaires
-- =====================================================

-- 1. Ajout de la colonne date_expiration_piece à la table proprietaires
-- Cette colonne stocke la date d'expiration de la pièce d'identité du propriétaire
-- Le type DATE permet de stocker uniquement la date sans l'heure
-- La colonne peut être NULL car cette information n'est pas disponible pour tous les propriétaires
ALTER TABLE proprietaires 
ADD COLUMN date_expiration_piece DATE NULL;

-- =====================================================
-- Fin du script de migration
-- =====================================================
