drop database protofolio;

create database protofolio default character set utf8mb4 collate utf8mb4_unicode_ci;

create table protofolio.user(
    userId varchar(20) not null primary key,
    userPw varchar(64) not null,
    salt varchar(8) not null,
    introduce varchar(100),
    specialty varchar(20),
    username varchar(10) not null
);

create table protofolio.portfolio(
    docId integer unsigned not null primary key auto_increment,
    title varchar(50) not null,
    content varchar(2000) not null,
    userId varchar(20) not null,
    Foreign Key (userId) REFERENCES protofolio.user(userId)
);

create table protofolio.activity(
    activityId integer unsigned not null primary key auto_increment,
    activityName varchar(20) not null,
    activityDetail varchar(50),
    startDate varchar(10) not null,
    endDate varchar(10),
    userId varchar(20) not null,
    Foreign Key (userId) REFERENCES protofolio.user(userId)
);

create table protofolio.award(
    awardId integer unsigned not null primary key auto_increment,
    awardName varchar(20) not null,
    prizeIcon varchar(5) not null,
    prizeName varchar(10) not null,
    `date` varchar(10) not null,
    userId varchar(20) not null,
    Foreign Key (userId) REFERENCES protofolio.user(userId)
)