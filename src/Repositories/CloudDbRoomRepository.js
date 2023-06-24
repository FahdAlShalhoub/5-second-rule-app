const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const data = process.env.CloudDBConfig;
const buff = new Buffer(data, 'base64');
const config = buff.toString('ascii');

initializeApp({
    credential: cert(JSON.parse(config))
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
    })),
    getCategories: () => new Promise((resolve, reject) => {
        getFirestore().collection("Categories").get()
            .then(categories => resolve(categories.docs.map(categories => categories.data())))
            .catch(reject);    
    })
}


