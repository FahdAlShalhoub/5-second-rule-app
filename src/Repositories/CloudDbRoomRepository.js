const clouddb = require('@agconnect/database-server/dist/index.js');
const agconnect = require('@agconnect/common-server');
const QuestionsList = require("./QuestionsList");

agconnect.AGCClient.initialize(agconnect.CredentialParser.toCredentialWithContents(process.env.CloudDBConfig), "clientCN");
const agcClient = agconnect.AGCClient.getInstance("clientCN");

clouddb.AGConnectCloudDB.initialize(agcClient);

const cloudDBZoneConfig = new clouddb.CloudDBZoneConfig("FiveSecondsRuleDB");
const mCloudDBZone = clouddb.AGConnectCloudDB.getInstance(agcClient).openCloudDBZone(cloudDBZoneConfig);

module.exports = {
    getQuestions: () => new Promise(((resolve, reject) => {
        mCloudDBZone.executeQuery(clouddb.CloudDBZoneQuery.where(QuestionsList))
            .then(response =>
                resolve(response.getSnapshotObjects().map(question => ({
                    question: question.question,
                    category: question.categoryId
                })))
            )
            .catch(reject);
    }))
}


