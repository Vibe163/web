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
