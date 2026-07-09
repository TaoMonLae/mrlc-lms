const WordPOS = require('wordpos');
const wordpos = new WordPOS();
wordpos.lookup('dog', (results) => {
  console.log(JSON.stringify(results, null, 2).slice(0, 3000));
});
