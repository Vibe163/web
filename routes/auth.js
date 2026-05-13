const express = require("express");
const router = express.Router();
const db = require("../db/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const JWT_EXPIRES = "7d"; // token 有效期 7 天

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

    // bcrypt 加密密码：hashSync(密码, 加密轮数)
    // 轮数越大越安全但越慢，10 是标准值
    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, hashedPassword);

    // 注册成功直接返回 token，用户不用再登录一次
    const token = jwt.sign({ id: result.lastInsertRowid, username: username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
        id: result.lastInsertRowid,
        username: username,
        avatar: "",
        token: token,
        message: "注册成功"
    });
});

// POST /api/auth/login - 登录
router.post("/login", function(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "用户名和密码不能为空" });
    }

    // 先根据用户名找用户（不能用密码直接查，因为密码已加密）
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

    if (!user) {
        return res.status(401).json({ error: "用户名或密码错误" });
    }

    // bcrypt.compareSync(输入的密码, 数据库里加密后的密码)
    // 返回 true 或 false
    if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "用户名或密码错误" });
    }

    // 签发 JWT token
    // sign(载荷, 密钥, 选项) — 载荷里放用户信息，有效期 7 天
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
        id: user.id,
        username: user.username,
        avatar: user.avatar || "",
        token: token,
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

// GET /api/auth/verify - 验证 token 是否有效（需要登录）
router.get("/verify", authMiddleware, function(req, res) {
    const user = db.prepare("SELECT id, username, avatar FROM users WHERE id = ?").get(req.user.id);
    if (user) {
        res.json({ valid: true, username: user.username, avatar: user.avatar || "" });
    } else {
        res.status(404).json({ valid: false });
    }
});

// GET /api/auth/profile - 获取个人资料（需要登录）
router.get("/profile", authMiddleware, function(req, res) {
    const user = db.prepare("SELECT id, username, avatar, created_at FROM users WHERE id = ?").get(req.user.id);
    if (!user) {
        return res.status(404).json({ error: "用户不存在" });
    }

    const friendsCount = db.prepare("SELECT COUNT(*) as count FROM friends WHERE user_id = ?").get(req.user.id);
    const messagesCount = db.prepare("SELECT COUNT(*) as count FROM messages WHERE from_user = ?").get(req.user.id);

    res.json({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        created_at: user.created_at,
        friendsCount: friendsCount.count,
        messagesCount: messagesCount.count
    });
});

// POST /api/auth/update-username - 修改用户名（需要登录）
router.post("/update-username", authMiddleware, function(req, res) {
    const { username } = req.body;
    const userId = req.user.id; // 从 token 取，不信任前端

    if (!username) {
        return res.status(400).json({ error: "参数不完整" });
    }

    if (username.length < 2 || username.length > 20) {
        return res.status(400).json({ error: "用户名长度 2-20 个字符" });
    }

    const existing = db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(username, userId);
    if (existing) {
        return res.status(400).json({ error: "用户名已存在" });
    }

    db.prepare("UPDATE users SET username = ? WHERE id = ?").run(username, userId);
    res.json({ message: "修改成功", username: username });
});

// POST /api/auth/update-password - 修改密码（需要登录）
router.post("/update-password", authMiddleware, function(req, res) {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: "参数不完整" });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: "新密码至少 6 位" });
    }

    const user = db.prepare("SELECT password FROM users WHERE id = ?").get(userId);
    if (!user || !bcrypt.compareSync(oldPassword, user.password)) {
        return res.status(400).json({ error: "当前密码错误" });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, userId);
    res.json({ message: "密码修改成功" });
});

// POST /api/auth/update-avatar - 修改头像（需要登录）
router.post("/update-avatar", authMiddleware, function(req, res) {
    const { avatar } = req.body;
    const userId = req.user.id;

    db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(avatar || "", userId);
    res.json({ message: "修改成功", avatar: avatar });
});

// JWT 验证中间件 — 保护需要登录才能访问的路由
// 前端在请求头里放：Authorization: Bearer <token>
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "未登录" });
    }

    const token = authHeader.split(" ")[1]; // 取出 token 部分

    try {
        const decoded = jwt.verify(token, JWT_SECRET); // 验证并解码
        req.user = decoded; // 把用户信息挂到 req 上，后续路由可以用
        next(); // 验证通过，放行
    } catch (e) {
        return res.status(401).json({ error: "登录已过期，请重新登录" });
    }
}

module.exports = router;
module.exports.authMiddleware = authMiddleware;
