const WordPOS = require('wordpos');
const wordpos = new WordPOS({ stopwords: false });

wordpos.rand({ count: 1 }, (words) => {
  console.log('RANDOM WORD:', words);
  const word = words[0];
  wordpos.lookup(word, (results) => {
    console.log('LOOKUP RESULT COUNT:', results.length);
    console.log(JSON.stringify(results.slice(0,1), null, 2));
    process.exit(0);
  });
});
