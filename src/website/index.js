const express = require('express');
const app = express();
require('dotenv').config();

app.use('/', express.static(__dirname + '/public'));

app.listen(process.env.PORT);