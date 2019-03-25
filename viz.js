const madge = require('madge');

madge('./infra/secrets_scanner/index.js')
    .then(res => res.image('graph.png'))
    .then(writtenImagePath => {
        console.log('Image written to ' + writtenImagePath);
    });
