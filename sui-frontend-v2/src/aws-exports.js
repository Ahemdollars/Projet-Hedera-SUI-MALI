// src/aws-exports.js

const awsConfig = {
    Auth: {
        Cognito: {
            userPoolId: 'eu-west-3_4mfCvePQE',       // Ton ID de groupe d'utilisateurs
            userPoolClientId: '1oaeje00rrjg7vjl9gimo4d0i0', // Ton ID client
            region: 'eu-west-3'
        }
    }
};

export default awsConfig;