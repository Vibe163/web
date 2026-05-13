// chat-service — 只负责聊天消息（端口 3002）
const express = require("express");
const app = express();
app.use(express.json());

const AUTH_SERVICE = "http://localhost:3001"; // auth-service 的地址

// 模拟消息数据库
const messages = [];

// 中间件：调用 auth-service 验证身份
async function checkAuth(req, res, next) {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: "未登录" });
    }

    // 关键：chat-service 自己不验证 token，而是调用 auth-service 去验证
    // 这就是微服务的核心：每个服务只做自己的事
    try {
        const response = await fetch(AUTH_SERVICE + "/verify", {
            headers: { authorization: token }
        });
        if (!response.ok) {
            return res.status(401).json({ error: "登录已过期" });
        }
        const user = await response.json();
        req.user = user; // 把用户信息挂到请求上
        next();
    } catch (e) {
        return res.status(500).json({ error: "auth-service 不可用" });
    }
}

// 发送消息（需要登录）
app.post("/send", checkAuth, function(req, res) {
    const { content } = req.body;
    const msg = {
        id: messages.length + 1,
        from: req.user.username,
        content: content,
        time: new Date().toISOString()
    };
    messages.push(msg);
    res.json(msg);
});

// 获取消息列表（需要登录）
app.get("/list", checkAuth, function(req, res) {
    res.json(messages);
});

app.listen(3002, function() {
    console.log("chat-service 启动在 3002 端口");
});
