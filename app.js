const http = require('http');
const express = require('express');
const ejs = require('ejs');

const app = express()
const server = http.createServer(app)

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/'));

app.get('/', function(req, res) {
    res.send("Hello, world!");
});

const hostname = '127.0.0.1';
const port = 8080;

server.listen(port, hostname, function() {
    console.log("Server is listening on port 8080");
});