const express = require("express");
const router = express.Router();
const db = require("../db/database");

// POST /api/auth/register - 注册
router.post("/register", function(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "用户名和密码不能为空" });
    }

    if (username.length < 2 || username.length > 20) {
        return res.status(400).json({ error: "用户名长度 2-20 个字符" });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: "密码至少 6 位" });
    }

    // 检查用户名是否已存在
    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (existing) {
        return res.status(400).json({ error: "用户名已存在" });
    }

    // 创建用户（简单存储，生产环境应该加密）
    const result = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, password);

    res.json({
        id: result.lastInsertRowid,
        username: username,
        message: "注册成功"
    });
});

// POST /api/auth/login - 登录
router.post("/login", function(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "用户名和密码不能为空" });
    }

    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);

    if (!user) {
        return res.status(401).json({ error: "用户名或密码错误" });
    }

    res.json({
        id: user.id,
        username: user.username,
        message: "登录成功"
    });
});

// GET /api/auth/users - 搜索用户
router.get("/users", function(req, res) {
    const { search } = req.query;

    if (!search) {
        return res.json([]);
    }

    const users = db.prepare("SELECT id, username FROM users WHERE username LIKE ? LIMIT 20").all("%" + search + "%");
    res.json(users);
});

// GET /api/auth/verify/:id - 验证用户是否存在
router.get("/verify/:id", function(req, res) {
    const user = db.prepare("SELECT id FROM users WHERE id = ?").get(req.params.id);
    if (user) {
        res.json({ valid: true });
    } else {
        res.status(404).json({ valid: false });
    }
});

module.exports = router;
