// Express
const http = require('http');
const express = require('express');

// Session
const session = require('express-session');
const MemoryStore = require('memorystore')(session);

// Multer(파일 업로드)
const path = require("path");
const multer = require("multer");
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + "/uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, new Date().valueOf() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Template Engine
const ejs = require('ejs');

// Database
const mysql = require('mysql');
const fs = require('fs');
const db_auth = JSON.parse(fs.readFileSync(__dirname + "/db_auth.json"));

// DB Initialzation
const db = mysql.createConnection({
    host: "localhost",
    user: db_auth.user,
    password: db_auth.password,
    database: "protofolio"
});

const app = express();
const server = http.createServer(app);

// HTML, Views, EJS
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/static'));
// post body-parser 사용
app.use(express.urlencoded({ extended: true }));
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
// session 사용 및 환경설정
const maxAge = 1000 * 60 * 30;
app.use(session({
    secret: 'BRG7t7^68GJ@',
    resave: false,
    saveUninitialized: true,
    store: new MemoryStore({ checkPeriod: maxAge }),
    cookie: {
        maxAge,
    },
}));

// 
//
// index
//
//
// 랜딩 페이지
app.get('/', function (req, res) {
    res.send("Hello, world!");
});

// 에러 페이지로 이동
function sendError(res, message, redirect) {
    res.redirect("/error?message=" + message + "&redirect=" + redirect);
}

// 에러 페이지
app.get('/error', function (req, res) {
    const message = req.query.message;
    const redirect = req.query.redirect;
    res.render("alert", { message: message, redirect: redirect });
});

// favicon
app.get('/favicon', function(req, res) {

});

//
//
// 로그인
//
//
// 로그인 페이지
app.get('/login', function (req, res) {
    res.sendFile(__dirname + '/static/login.html');
});

// 로그인 요청
app.post('/login', function (req, res) {
    // post body에서 회원 정보 가져오기
    var userId = req.body.userId;
    var userPw = req.body.userPw;

    var sql = "select * from user where userId = ?;";
    db.query(sql, [userId], function (error, result) {
        if (error) throw error;

        if (result == null || result.length <= 0) {
            // TODO: 미가입된 아이디 처리
            res.send("no user");
            return;
        }

        // 요청된 비밀번호를 salt로 암호화 후 db의 해싱된 암호화 비교
        var encrypted = encrypt(userPw, result[0].salt);
        var userPwFromDB = result[0].userPw;

        if (userPwFromDB == encrypted) {
            // 세션에 유저 정보 저장
            req.session.user = {};
            req.session.user.userId = result[0].userId;
            req.session.user.userPw = result[0].userPw;
            req.session.user.salt = result[0].salt;
            req.session.user.username = result[0].username;
            req.session.save(function (error) {
                if (error) throw error;
                res.send("logged in");
            })
        } else {
            res.send("wrong pw");
        }

    });
});

// 로그인 테스트
app.get("/login-info", function (req, res) {
    const user = req.session.user;
    if (user != null) {
        res.send("logged in to " + user.username);
    } else {
        res.send("not logged in");
    }
});

// 로그아웃
app.get("/logout", function (req, res) {
    req.session.destroy(function (error) {
        if (error) throw error;
        res.send("logged out");
    });
});

// 회원가입 요청
app.post('/register', function (req, res) {
    // post body에서 회원 정보 가져오기
    var userId = req.body.userId;
    var userPw = req.body.userPw;
    var username = req.body.username;
    // 비밀번호 해싱할 때 사용할 salt 생성
    var salt = generateSalt();
    // 비밀번호 SHA-256으로 해싱
    var encrypted = encrypt(userPw, salt);

    // DB에 삽입
    var sql = "insert into user(userId, userPw, salt, username) values (?, ?, ?, ?);";
    db.query(sql, [userId, encrypted, salt, username], function (error, result) {
        if (error) throw error;
        res.redirect("/login");
    });
});

//
//
// 프로필 설정
//
//
// 프로필 설정 페이지
app.get("/u/:userId/profile", function (req, res) {
    const sUserId = req.session.user.userId;
    const userId = req.params.userId;

    console.log("sUserId: " + sUserId + ", userId: " + userId);
    
    if (sUserId != undefined && userId == sUserId) {
        res.sendFile(__dirname + "/static/edit_profile.html");
    } else {
        sendError(res, "로그인해주세요", "/login");
    }
});

// 프로필 설정
app.post("/u/:userId/profile", function (req, res) {
    const sUserId = req.session.user.userId;
    const userId = req.params.userId;

    if (sUserId != undefined && userId == sUserId) {
        res.sendFile("/static/edit_profile.html");
    } else {
        sendError(res, "로그인해주세요", "/login");
    }

});

//
//
// 포트폴리오 페이지
//
//
// 개인 페이지
app.get('/u/:userId', function (req, res) {
    var sUserId = req.session.user.userId;
    var userId = req.params.userId;

    var isEditable = sUserId != undefined && userId == sUserId;

    var sql = "select * from portfolio where userId = ?;";
    db.query(sql, [userId], function (error, result) {
        if (error) throw error;
    });
});

// 개인 페이지의 포트폴리오 상세보기
app.get('/u/:userId/:portfolioId', function (req, res) {
    var userId = req.params.userId;
    var portfolioId = req.params.portfolioId;

    var sql = "select * from user where userId = ?;";
    db.query(sql, [userId], function (error, result) {
        if (error) throw error;
    });
});

// 개인 포트폴리오 작성
app.get('/u/:userId/write', function (req, res) {
    var userId = req.params.userId;
    var portfolioId = req.params.portfolioId;

    var sql = "select * from user where userId = ?;";
    db.query(sql, [userId], function (error, result) {
        if (error) throw error;
    });
});

//
//
// 서버 실행
//
//
// hostname 및 port 설정
const hostname = '127.0.0.1';
const port = 8080;

// 서버 생성
server.listen(port, hostname, function () {
    console.log("Server is listening on port 8080");
});

//
//
// 암호화
//
//
// SHA-256 암호화 사용을 위한 crypto 설치
const crypto = require('crypto');

// 비밀번호 암호화
function encrypt(password, salt) {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// 암호화에 사용되는 Salt 생성기
function generateSalt() {
    const length = 8;
    var result = '';
    var characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()?';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        const random = Math.floor(Math.random() * charactersLength);
        result += characters.charAt(random);
    }
    return result;
}