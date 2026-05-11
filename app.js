// 主入口文件：启动服务器，加载路由

const express = require("express");
const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    res.send("<h1>项目运行中</h1><p>API 地址：<a href='/api/todos'>/api/todos</a></p>");
});

// 启动
app.listen(3000, function() {
    console.log("项目已启动：http://localhost:3000");
    console.log("API 地址：http://localhost:3000/api/todos");
});
