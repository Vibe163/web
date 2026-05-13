// auth-service — 只负责登录认证（端口 3001）
const express = require("express");
const app = express();
app.use(express.json());

// 模拟用户数据库
const users = [
    { id: 1, username: "alice", password: "123456" },
    { id: 2, username: "bob", password: "123456" }
];

// 登录接口
app.post("/login", function(req, res) {
    const { username, password } = req.body;
    const user = users.find(function(u) {
        return u.username === username && u.password === password;
    });
    if (!user) {
        return res.status(401).json({ error: "登录失败" });
    }
    // 简单返回 token（实际用 JWT）
    res.json({ token: "token-" + user.id, userId: user.id, username: user.username });
});

// 验证 token 接口 — 其他服务会调用这个
app.get("/verify", function(req, res) {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: "无 token" });
    }
    // 简单验证（实际用 JWT verify）
    const userId = parseInt(token.replace("token-", ""));
    const user = users.find(function(u) { return u.id === userId; });
    if (!user) {
        return res.status(401).json({ error: "无效 token" });
    }
    res.json({ userId: user.id, username: user.username });
});

app.listen(3001, function() {
    console.log("auth-service 启动在 3001 端口");
});
