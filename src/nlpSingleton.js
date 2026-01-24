// nlpSingleton.js
// Singleton for wink-nlp instance
let nlpInstance = null;

export async function getNLP() {
  if (!nlpInstance) {
    const winkNLP = (await import('wink-nlp')).default;
    const model = (await import('wink-eng-lite-web-model')).default;
    nlpInstance = winkNLP(model);
  }
  return nlpInstance;
}

export function cleanupNLP() {
  nlpInstance = null;
}
