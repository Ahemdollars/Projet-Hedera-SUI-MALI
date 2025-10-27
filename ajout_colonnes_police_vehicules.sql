-- =====================================================
-- Script pour ajouter les colonnes de gestion des signalements police
-- à la table vehicules existante
-- =====================================================

-- 1. Ajout de la colonne date_statut_police
-- Cette colonne stocke la date et l'heure exactes de la dernière modification du statut_police
-- Type : TIMESTAMP WITH TIME ZONE pour gérer les fuseaux horaires
-- Peut être nulle (NULL) car tous les véhicules n'ont pas forcément été signalés par la police
ALTER TABLE vehicules 
ADD COLUMN date_statut_police TIMESTAMP WITH TIME ZONE;

-- Ajout du commentaire en français pour la colonne date_statut_police
COMMENT ON COLUMN vehicules.date_statut_police IS 'Date et heure exactes de la dernière modification du statut police. Stocke le moment précis où un officier a modifié le statut du véhicule (VOLÉ, EN FUITE, INTERCEPTÉ, etc.).';

-- 2. Ajout de la colonne description_police
-- Cette colonne stocke une description optionnelle ajoutée par l'officier lors du signalement
-- Type : TEXT pour permettre des descriptions longues et détaillées
-- Peut être nulle (NULL) car la description est optionnelle
ALTER TABLE vehicules 
ADD COLUMN description_police TEXT;

-- Ajout du commentaire en français pour la colonne description_police
COMMENT ON COLUMN vehicules.description_police IS 'Description optionnelle ajoutée par l''officier lors du signalement du véhicule. Peut contenir des détails sur les circonstances, les motifs du signalement, ou toute information pertinente pour les forces de l''ordre.';

-- =====================================================
-- Fin du script d'ajout des colonnes police
-- =====================================================
