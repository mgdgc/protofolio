drop database protofolio;

create database protofolio character set utf8mb4 collate utf8mb4_unicode_ci;

create table protofolio.user(
    userId varchar(20) not null primary key,
    userPw varchar(64) not null,
    salt varchar(8) not null,
    username varchar(10) not null
);

create table protofolio.file(
    fileId integer unsigned not null primary key auto_increment,
    type varchar(10) not null,
    userId varchar(20) not null,
    Foreign Key (userId) REFERENCES protofolio.user(userId)
);

create table protofolio.profile(
    userId varchar(20) not null primary key,
    introduce varchar(100),
    profileImg integer unsigned,
    specialty varchar(20),
    Foreign Key (userId) REFERENCES protofolio.user(userId)
);

create table protofolio.portfolio(
    docId integer unsigned not null primary key auto_increment,
    title varchar(50) not null,
    content varchar(2000) not null,
    coverImg integer unsigned not null,
    Foreign Key (coverImg) REFERENCES protofolio.file(fileId)
);

create table protofolio.activity(
    activityId integer unsigned not null primary key auto_increment,
    activityName varchar(20) not null,
    activityDetail varchar(50) not null,
    prize varchar(10) not null,
    userId varchar(20) not null,
    Foreign Key (userId) REFERENCES protofolio.user(userId)
);