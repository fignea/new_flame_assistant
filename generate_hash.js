const bcrypt = require('bcrypt');

const password = 'flame123';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);
