// 数据库模块：负责数据库连接和表创建

const Database = require("better-sqlite3");
const db = new Database("app.db");

// 创建表
db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        done INTEGER DEFAULT 0
    )
`);

module.exports = db;
