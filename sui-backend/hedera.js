// Importer les outils nécessaires du SDK Hedera
const { Client, TopicMessageSubmitTransaction, TopicId } = require("@hashgraph/sdk");
require('dotenv').config();

// L'ID du Topic HCS sur lequel nous allons écrire. Pour ce projet, nous allons en utiliser un seul.
// Tu peux trouver des Topic ID publics sur des explorateurs comme HashScan. Pour notre test, nous utilisons celui-ci.
const siuTopicId = TopicId.fromString("0.0.6881743");

// Fonction pour se connecter à Hedera et envoyer un message
async function logAction(actionMessage) {
    // Vérifier que les clés sont bien présentes dans le .env
    if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
        throw new Error("Les variables d'environnement HEDERA_ACCOUNT_ID et HEDERA_PRIVATE_KEY doivent être définies.");
    }

    // Créer une connexion au réseau de test (Testnet) d'Hedera
    const client = Client.forTestnet();

    // Définir quel compte va payer pour la transaction
    client.setOperator(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY);

    try {
        // Créer la transaction pour soumettre le message
        const transaction = new TopicMessageSubmitTransaction({
            topicId: siuTopicId,
            message: actionMessage,
        });

        // Envoyer la transaction au réseau Hedera
        const txResponse = await transaction.execute(client);

        // Obtenir la confirmation que la transaction a bien été enregistrée
        const receipt = await txResponse.getReceipt(client);

        console.log(`[HEDERA] Action enregistrée avec succès : "${actionMessage}". Statut : ${receipt.status}`);
        return receipt;
    } catch (error) {
        console.error(`[HEDERA] Erreur lors de l'enregistrement de l'action : ${error}`);
        // Ne pas bloquer l'API si Hedera échoue, juste logguer l'erreur
    }
}

// Exporter notre fonction pour qu'elle puisse être utilisée dans server.js
module.exports = { logAction };