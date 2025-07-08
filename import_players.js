const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Player = require('./models/Player');
const dataPath = path.join(__dirname, '../data/data.json');
const rawData = fs.readFileSync(dataPath, 'utf-8');
const data = JSON.parse(rawData);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('Conectado a MongoDB');
  await Player.deleteMany({});
  await Player.insertMany(data.players);
  console.log('Datos importados correctamente');
  process.exit();
})
.catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
