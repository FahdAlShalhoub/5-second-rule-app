const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
    credential: cert(JSON.parse(process.env.CloudDBConfig))
})

module.exports = {
    getQuestions: () => new Promise(((resolve, reject) => {
        getFirestore().collection("Questions").get()
            .then(Questions => {
                const questions = Questions.docs.map(question => {
                    return {
                        question: question.data().question,
                        category: question.data().categoryId,
                    }
                })
                
                resolve(questions)
            })
            .catch(reject);
    }))
}


