// Express
const http = require('http');
const express = require('express');

// Session
const session = require('express-session');
const MemoryStore = require('memorystore')(session);

// Template Engine
const ejs = require('ejs');

// Database
const mysql = require('mysql');
const fs = require('fs');
const db_auth = JSON.parse(fs.readFileSync(__dirname + '/db_auth.json'));

// DB Initialzation
const db = mysql.createConnection({
    host: 'localhost',
    user: db_auth.user,
    password: db_auth.password,
    database: 'protofolio'
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
    res.sendFile(__dirname + "/index.html");
});

// 에러 페이지로 이동
function sendError(res, message, redirect) {
    res.redirect('/error?message=' + message + '&redirect=' + redirect);
}

// 에러 페이지
app.get('/error', function (req, res) {
    const message = req.query.message;
    const redirect = req.query.redirect;
    res.render('alert', { message: message, redirect: redirect });
});

// favicon
app.get('/favicon', function (req, res) {

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

    var sql = 'select * from user where userId = ?;';
    db.query(sql, [userId], function (error, result) {
        if (error) throw error;

        if (result == null || result.length <= 0) {
            // 미가입된 아이디 처리
            sendError(res, "회원가입을 해주세요.", "/login");
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
                res.redirect('/u/' + userId);
            })
        } else {
            res.send('wrong pw');
        }

    });
});

// 로그인 테스트
app.get('/login-info', function (req, res) {
    const user = req.session.user;
    if (user != null) {
        res.send('logged in to ' + user.username);
    } else {
        res.send('not logged in');
    }
});

// 로그아웃
app.get('/logout', function (req, res) {
    req.session.destroy(function (error) {
        if (error) throw error;
        res.send('logged out');
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

    // DB에 회원정보 삽입
    var sql = 'insert into user(userId, userPw, salt, username) values (?, ?, ?, ?);';
    db.query(sql, [userId, encrypted, salt, username], function (error, result) {
        if (error) throw error;
        res.redirect('/login');
    });
});

//
//
// 프로필 설정
//
//
// 프로필 설정 페이지
app.get('/u/:userId/profile', function (req, res) {
    const sUser = req.session.user;
    const userId = req.params.userId;

    if (sUser == undefined || userId != sUser.userId) {
        sendError(res, '로그인해주세요', '/login');
        return;
    }

    const sql = 'select username, introduce, specialty from user where userId = ?;';
    db.query(sql, [userId], function (error, result) {
        if (error) throw error;
        res.render('edit_profile', {
            userId: userId,
            username: result[0].username,
            introduce: result[0].introduce,
            specialty: result[0].specialty
        });
    });
});

// 프로필 설정
app.post('/u/:userId/profile', function (req, res) {
    const sUser = req.session.user;
    const userId = req.params.userId;

    if (sUser == undefined || userId != sUser.userId) {
        sendError(res, '로그인해주세요', '/login');
        return;
    }

    // request body에서 데이터 가져오기
    const username = req.body.username;
    const introduce = req.body.introduce;
    const specialty = req.body.specialty;

    const sql = "update user set username = ?, introduce = ?, specialty = ? where userId = ?;";
    db.query(sql, [username, introduce, specialty, userId], function (error, result) {
        if (error) throw error;
        res.redirect('/u/' + userId);
    });
});

//
//
// 포트폴리오 페이지
//
//
// 개인 페이지
app.get('/u/:userId', function (req, res) {
    const sUser = req.session.user;
    const userId = req.params.userId;

    const isEditable = sUser != undefined && userId == sUser.userId;

    const userSql = 'select username, introduce, specialty from user where userId = ?;';
    db.query(userSql, [userId], function (e, users) {
        if (e) throw e;

        const username = users[0].username;
        const introduce = users[0].introduce;
        const specialty = users[0].specialty;

        res.render('portfolio', {
            isEditable: isEditable,
            userId: userId,
            username: username,
            introduce: introduce,
            specialty: specialty
        });
    });

});

// project get api
app.get('/u/:userId/project', function (req, res) {
    const userId = req.params.userId;

    const sql = 'select * from portfolio where userId = ?;';
    db.query(sql, [userId], function (error, result) {
        if (error) throw error;
        res.send(result);
    });
});

// activity get api
app.get('/u/:userId/project/:portfolioId', function (req, res) {
    const userId = req.params.userId;
    const portfolioId = req.params.portfolioId;

    const sql = 'select * from portfolio where docId = ?;';
    db.query(sql, [portfolioId], function (error, result) {
        if (error) throw error;
        res.send(result[0]);
    });
});

// 개인 포트폴리오 작성
app.get('/u/:userId/write', function (req, res) {
    const sUser = req.session.user;
    const userId = req.params.userId;

    if (sUser != undefined && userId == sUser.userId) {
        res.render('write_project', { userId: userId });
    } else {
        sendError(res, '로그인해주세요', '/login');
    }
});

// 개인 포트폴리오 작성 요청 처리
app.post('/u/:userId/write', function (req, res) {
    const sUser = req.session.user;
    const userId = req.params.userId;

    if (sUser == undefined || userId != sUser.userId) {
        sendError(res, '로그인해주세요', '/login');
        return;
    }

    // request body에서 글쓰기 정보 가져오기
    const title = req.body.title;
    const content = req.body.content;

    var sql = 'insert into portfolio(userId, title, content) values (?, ?, ?);';
    db.query(sql, [userId, title, content], function (error, result) {
        if (error) throw error;
        res.redirect('/u/' + userId);
    });
});

//
//
// Activity
//
//
// activity get api
app.get('/u/:userId/activity', function (req, res) {
    const userId = req.params.userId;

    const sql = 'select * from activity where userId = ?;';
    db.query(sql, [userId], function (error, result) {
        if (error) throw error;
        res.send(result);
    });
});

// activity get api
app.get('/u/:userId/activity/:activityId', function (req, res) {
    const userId = req.params.userId;
    const activityId = req.params.activityId;

    const sql = 'select * from activity where activityId = ?;';
    db.query(sql, [activityId], function (error, result) {
        if (error) throw error;
        res.send(result[0]);
    });
});

// 활동 작성 페이지
app.get('/u/:userId/write/activity', function (req, res) {
    const sUser = req.session.user;
    const userId = req.params.userId;

    if (sUser != undefined && userId == sUser.userId) {
        res.render('write_activity', { userId: userId });
    } else {
        sendError(res, '로그인해주세요', '/login');
    }
});

// 활동 작성 요청 처리
app.post('/u/:userId/write/activity', function (req, res) {
    const sUser = req.session.user;
    const userId = req.params.userId;

    if (sUser == undefined || userId != sUser.userId) {
        sendError(res, '로그인해주세요', '/login');
        return;
    }

    // 활동 내용
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const activityName = req.body.activityName;
    const activityDetail = req.body.activityDetail;

    const sql = 'insert into activity (startDate, endDate, activityName, activityDetail, userId) values (?, ?, ?, ?, ?);';
    db.query(sql, [startDate, endDate, activityName, activityDetail, userId], function (error, result) {
        if (error) throw error;
        res.redirect('/u/' + userId);
    });
});

// 활동 수정 페이지
app.get('/u/:userId/activity/:activityId/edit', function (req, res) {
    const sUser = req.session.user;
    const userId = req.params.userId;
    const activityId = req.params.activityId;

    if (sUser == undefined || userId != sUser.userId) {
        sendError(res, '로그인해주세요', '/login');
        return;
    }

    const sql = 'select * from activity where activityId = ?;';
    db.query(sql, [activityId], function (error, result) {
        if (error) throw error;
        res.render("edit_activity", { userId: userId, activityId: activityId, data: result[0] });
    });
});

// 활동 수정 요청 처리
app.post('/u/:userId/activity/:activityId/edit', function (req, res) {
    const sUser = req.session.user;
    const userId = req.params.userId;
    const activityId = req.params.activityId;

    if (sUser == undefined || userId != sUser.userId) {
        sendError(res, '로그인해주세요', '/login');
        return;
    }

    // 활동 정보 가져오기
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const activityName = req.body.activityName;
    const activityDetail = req.body.activityDetail;

    const sql = 'update activity set startDate = ?, endDate = ?, activityName = ?, activityDetail = ? where activityId = ?;';
    db.query(sql, [startDate, endDate, activityName, activityDetail, activityId], function (error, result) {
        if (error) throw error;
        res.redirect('/u/' + userId);
    });
});

// 활동 삭제 요청 처리
app.post('/u/:userId/activity/:activityId/delete', function (req, res) {
    const sUser = req.session.user;
    const userId = req.params.userId;
    const activityId = req.params.activityId;

    if (sUser == undefined || userId != sUser.userId) {
        sendError(res, '로그인해주세요', '/login');
        return;
    }

    const sql = "delete from activity where activityId = ?;";
    db.query(sql, [activityId], function (error, result) {
        if (error) throw error;
        res.redirect('/u/' + userId);
    })
});

//
//
// Awards
//
//
// awards get api
app.get('/u/:userId/award', function (req, res) {
    const userId = req.params.userId;

    const sql = 'select * from award where userId = ?;';
    db.query(sql, [userId], function (error, result) {
        if (error) throw error;
        res.send(result);
    });
});

// award get api
app.get('/u/:userId/activity/:awardId', function (req, res) {
    const userId = req.params.userId;
    const awardId = req.params.awardId;

    const sql = 'select * from award where awardId = ?;';
    db.query(sql, [awardId], function (error, result) {
        if (error) throw error;
        res.send(result[0]);
    });
});

// 수상기록 작성 요청 처리
app.post('/u/:userId/write/award', function (req, res) {
    const sUser = req.session.user;
    const userId = req.params.userId;

    if (sUser == undefined || userId != sUser.userId) {
        sendError(res, '로그인해주세요', '/login');
        return;
    }

    // 수상 내용 가져오기
    const date = req.body.date;
    const awardName = req.body.awardName;
    const prizeName = req.body.prizeName;
    const prizeIcon = req.body.prizeIcon;

    const sql = 'insert into award(date, awardName, prizeName, prizeIcon, userId) values (?, ?, ?, ?, ?);'
    db.query(sql, [date, awardName, prizeName, prizeIcon, userId], function (error, result) {
        if (error) throw error;
        res.redirect('/u/' + userId);
    });
});

// 수상기록 수정 페이지
app.get('/u/:userId/award/:awardId/edit', function (req, res) {
    const sUser = req.session.user;
    const userId = req.params.userId;
    const awardId = req.params.awardId;

    if (sUser == undefined || userId != sUser.userId) {
        sendError(res, '로그인해주세요', '/login');
        return;
    }

    const sql = 'select * from award where awardId = ?;';
    db.query(sql, [awardId], function (error, result) {
        if (error) throw error;
        res.render("edit_award", { userId: userId, awardId: awardId, data: result[0] });
    });
});

// 수상기록 수정 요청 처리
app.post('/u/:userId/award/:awardId/edit', function (req, res) {
    const sUser = req.session.user;
    const userId = req.params.userId;
    const awardId = req.params.awardId;

    if (sUser == undefined || userId != sUser.userId) {
        sendError(res, '로그인해주세요', '/login');
        return;
    }

    // 수정된 정보 가져오기
    const date = req.body.date;
    const awardName = req.body.awardName;
    const prizeIcon = req.body.prizeIcon;
    const prizeName = req.body.prizeName;

    const sql = 'update award set date = ?, awardName = ?, prizeIcon = ?, prizeName = ? where awardId = ?;'
    db.query(sql, [date, awardName, prizeIcon, prizeName, awardId], function (error, result) {
        if (error) throw error;
        res.redirect('/u/' + userId);
    });
});

// 수상기록 삭제 요청 처리
app.post('/u/:userId/award/:awardId/delete', function (req, res) {
    const sUser = req.session.user;
    const userId = req.params.userId;
    const awardId = req.params.awardId;

    if (sUser == undefined || userId != sUser.userId) {
        sendError(res, '로그인해주세요', '/login');
        return;
    }

    const sql = "delete from award where awardId = ?;";
    db.query(sql, [awardId], function (error, result) {
        if (error) throw error;
        res.redirect('/u/' + userId);
    })
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
    console.log('Server is listening on port 8080');
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