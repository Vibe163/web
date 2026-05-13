require("dotenv").config();
const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 维护模式开关：环境变量 MAINTENANCE=1 时关站
app.use(function(req, res, next) {
    if (process.env.MAINTENANCE === "1") {
        return res.status(503).send('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>无法访问此网站</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0e1621;font-family:-apple-system,sans-serif}.box{text-align:center;color:#f5f5f5;max-width:400px;padding:20px}.icon{font-size:56px;margin-bottom:24px;opacity:0.6}.title{font-size:20px;font-weight:600;margin-bottom:10px}.desc{color:#708499;font-size:14px;line-height:1.6}.code{color:#4a5568;font-size:12px;margin-top:20px;padding:12px;background:#17212b;border-radius:8px;font-family:monospace}</style></head><body><div class="box"><div class="icon">⚠️</div><div class="title">无法连接</div><div class="desc">此网站暂时无法访问，请检查您的网络连接是否正常，或稍后再试。</div><div class="code">ERR_CONNECTION_FAILED</div></div></body></html>');
    }
    next();
});

app.use(express.static("public"));

// 跨域
app.use(function(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// 加载路由
const todosRouter = require("./routes/todos");
const authRouter = require("./routes/auth");
const friendsRouter = require("./routes/friends");

app.use("/api/todos", todosRouter);
app.use("/api/auth", authRouter);
app.use("/api/friends", friendsRouter);

// 首页
app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// WebSocket 私聊系统
const onlineUsers = new Map(); // userId -> ws

wss.on("connection", function(ws) {
    let currentUserId = null;

    ws.on("message", function(data) {
        try {
            const msg = JSON.parse(data);

            if (msg.type === "login") {
                // 用户登录
                currentUserId = msg.userId;
                onlineUsers.set(msg.userId, ws);
                broadcastOnlineStatus();
            } else if (msg.type === "chat") {
                // 私聊消息
                const targetWs = onlineUsers.get(msg.to);
                if (targetWs && targetWs.readyState === 1) {
                    targetWs.send(JSON.stringify({
                        type: "chat",
                        from: msg.from,
                        fromName: msg.fromName,
                        content: msg.content,
                        time: new Date().toISOString()
                    }));
                }
                // 保存消息到数据库
                const db = require("./db/database");
                db.prepare("INSERT INTO messages (from_user, to_user, content) VALUES (?, ?, ?)").run(msg.from, msg.to, msg.content);
            } else if (msg.type === "call-offer" || msg.type === "call-answer" || msg.type === "call-candidate" || msg.type === "call-end") {
                // WebRTC 信令：转发给目标用户
                const targetWs = onlineUsers.get(msg.to);
                if (targetWs && targetWs.readyState === 1) {
                    targetWs.send(JSON.stringify(msg));
                }
            } else if (msg.type === "friend-added") {
                // 好友添加通知：转发给目标用户
                const targetWs = onlineUsers.get(msg.to);
                if (targetWs && targetWs.readyState === 1) {
                    targetWs.send(JSON.stringify({
                        type: "friend-added",
                        from: msg.from,
                        fromName: msg.fromName
                    }));
                }
            }
        } catch (e) {
            console.error("消息处理错误:", e);
        }
    });

    ws.on("close", function() {
        if (currentUserId) {
            onlineUsers.delete(currentUserId);
            broadcastOnlineStatus();
        }
    });
});

// 广播在线状态
function broadcastOnlineStatus() {
    const onlineList = Array.from(onlineUsers.keys());
    const msg = JSON.stringify({ type: "online", users: onlineList });

    wss.clients.forEach(function(client) {
        if (client.readyState === 1) {
            client.send(msg);
        }
    });
}

// 启动
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

server.listen(PORT, HOST, function() {
    console.log("项目已启动：http://" + HOST + ":" + PORT);
    console.log("运行环境：" + (process.env.NODE_ENV || "未设置"));
});
