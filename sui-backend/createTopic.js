const { Client, TopicCreateTransaction } = require("@hashgraph/sdk");
require('dotenv').config();

async function main() {
    if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
        throw new Error("Les variables d'environnement HEDERA_ACCOUNT_ID et HEDERA_PRIVATE_KEY doivent être définies.");
    }

    const client = Client.forTestnet();
    client.setOperator(process.env.HEDERA_ACCOUNT_ID, process.env.HEDERA_PRIVATE_KEY);

    // Créer une transaction pour un nouveau topic
    const transaction = new TopicCreateTransaction();

    console.log("Création du topic sur le réseau Hedera... Veuillez patienter.");

    // Exécuter la transaction
    const txResponse = await transaction.execute(client);

    // Obtenir le reçu et l'ID du nouveau topic
    const receipt = await txResponse.getReceipt(client);
    const newTopicId = receipt.topicId;

    console.log("=====================================================");
    console.log("✅ Topic créé avec succès !");
    console.log(`➡️  Ton nouvel ID de Topic est : ${newTopicId}`);
    console.log("=====================================================");
    console.log("Copie cet ID et colle-le dans ton fichier hedera.js");
}

main().catch(err => {
    console.error("Erreur lors de la création du topic :", err);
    process.exit(1);
});