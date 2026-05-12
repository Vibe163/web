// 主入口文件：启动服务器，加载路由

require("dotenv").config();  // 加载 .env 文件
const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const { initCache } = require("./cache");
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));  // 提供 public 文件夹里的静态文件

// 跨域
app.use(function(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// 加载路由
const todosRouter = require("./routes/todos");
app.use("/api/todos", todosRouter);

// 首页
app.get("/", function(req, res) {
    res.send("<h1>项目运行中</h1><p>API 地址：<a href='/api/todos'>/api/todos</a></p><p><a href='/chat.html'>进入聊天室</a></p>");
});

// WebSocket 聊天室
let userCount = 0;

wss.on("connection", function(ws) {
    userCount++;
    const userName = "用户" + userCount;

    // 通知所有人
    broadcast({ type: "system", text: userName + " 加入了聊天室" });

    // 收到消息
    ws.on("message", function(data) {
        const msg = JSON.parse(data);
        broadcast({ type: "chat", name: userName, text: msg.text });
    });

    // 断开连接
    ws.on("close", function() {
        userCount--;
        broadcast({ type: "system", text: userName + " 离开了聊天室" });
    });
});

// 广播消息给所有人
function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(function(client) {
        client.send(msg);
    });
}

// 启动
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

// 先初始化 Redis，再启动服务器
initCache().then(function() {
    server.listen(PORT, HOST, function() {
        console.log("项目已启动：http://" + HOST + ":" + PORT);
        console.log("API 地址：http://" + HOST + ":" + PORT + "/api/todos");
        console.log("聊天室：http://" + HOST + ":" + PORT + "/chat.html");
        console.log("运行环境：" + (process.env.NODE_ENV || "未设置"));
    });
});
