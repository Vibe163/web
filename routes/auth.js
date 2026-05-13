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
        avatar: "",
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
        avatar: user.avatar || "",
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
    const user = db.prepare("SELECT id, username, avatar FROM users WHERE id = ?").get(req.params.id);
    if (user) {
        res.json({ valid: true, username: user.username, avatar: user.avatar || "" });
    } else {
        res.status(404).json({ valid: false });
    }
});

// GET /api/auth/profile/:id - 获取个人资料和统计
router.get("/profile/:id", function(req, res) {
    const user = db.prepare("SELECT id, username, avatar, created_at FROM users WHERE id = ?").get(req.params.id);
    if (!user) {
        return res.status(404).json({ error: "用户不存在" });
    }

    const friendsCount = db.prepare("SELECT COUNT(*) as count FROM friends WHERE user_id = ?").get(req.params.id);
    const messagesCount = db.prepare("SELECT COUNT(*) as count FROM messages WHERE from_user = ?").get(req.params.id);

    res.json({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        created_at: user.created_at,
        friendsCount: friendsCount.count,
        messagesCount: messagesCount.count
    });
});

// POST /api/auth/update-username - 修改用户名
router.post("/update-username", function(req, res) {
    const { userId, username } = req.body;

    if (!userId || !username) {
        return res.status(400).json({ error: "参数不完整" });
    }

    if (username.length < 2 || username.length > 20) {
        return res.status(400).json({ error: "用户名长度 2-20 个字符" });
    }

    // 检查用户名是否已被占用
    const existing = db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(username, userId);
    if (existing) {
        return res.status(400).json({ error: "用户名已存在" });
    }

    db.prepare("UPDATE users SET username = ? WHERE id = ?").run(username, userId);
    res.json({ message: "修改成功", username: username });
});

// POST /api/auth/update-password - 修改密码
router.post("/update-password", function(req, res) {
    const { userId, oldPassword, newPassword } = req.body;

    if (!userId || !oldPassword || !newPassword) {
        return res.status(400).json({ error: "参数不完整" });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: "新密码至少 6 位" });
    }

    // 验证旧密码
    const user = db.prepare("SELECT id FROM users WHERE id = ? AND password = ?").get(userId, oldPassword);
    if (!user) {
        return res.status(400).json({ error: "当前密码错误" });
    }

    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(newPassword, userId);
    res.json({ message: "密码修改成功" });
});

// POST /api/auth/update-avatar - 修改头像
router.post("/update-avatar", function(req, res) {
    const { userId, avatar } = req.body;

    if (!userId) {
        return res.status(400).json({ error: "参数不完整" });
    }

    db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(avatar || "", userId);
    res.json({ message: "修改成功", avatar: avatar });
});

module.exports = router;
