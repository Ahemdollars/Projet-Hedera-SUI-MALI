-- =====================================================
-- Script pour ajouter les paramètres de prix Assurance et MTS
-- à la table parametres existante
-- =====================================================

-- 1. Ajout du paramètre de prix pour l'Assurance
-- Ce paramètre stocke le tarif de l'assurance automobile en FCFA
-- Il permet de gérer dynamiquement le prix sans modification du code
INSERT INTO parametres (param_nom, param_valeur) VALUES 
    ('prix_assurance', '10000');

-- 2. Ajout du paramètre de prix pour le MTS (Mise en circulation)
-- Ce paramètre stocke le tarif de la mise en circulation en FCFA
-- Il permet de gérer dynamiquement le prix sans modification du code
INSERT INTO parametres (param_nom, param_valeur) VALUES 
    ('prix_mts', '10000');

-- =====================================================
-- Fin du script d'ajout des paramètres
-- =====================================================
