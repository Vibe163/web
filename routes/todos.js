// 待办事项路由：处理所有 /api/todos 相关的请求

const express = require("express");
const router = express.Router();
const db = require("../db/database");
const { getCache, setCache, delCache } = require("../cache");

const CACHE_KEY = "todos:all";

// GET /api/todos — 获取所有待办（带缓存）
router.get("/", async function(req, res) {
    // 先查缓存
    const cached = await getCache(CACHE_KEY);
    if (cached) {
        return res.json({ data: cached, fromCache: true });
    }
    // 缓存没有，查数据库
    const todos = db.prepare("SELECT * FROM todos").all();
    // 存入缓存，60秒过期
    await setCache(CACHE_KEY, todos, 60);
    res.json({ data: todos, fromCache: false });
});

// POST /api/todos — 添加待办
router.post("/", async function(req, res) {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "内容不能为空" });
    const result = db.prepare("INSERT INTO todos (text) VALUES (?)").run(text);
    // 数据变了，清除缓存
    await delCache(CACHE_KEY);
    res.json({ id: result.lastInsertRowid, text: text, done: 0 });
});

// PUT /api/todos/:id — 切换完成状态
router.put("/:id", async function(req, res) {
    const todo = db.prepare("SELECT * FROM todos WHERE id = ?").get(req.params.id);
    if (!todo) return res.status(404).json({ error: "不存在" });
    const newDone = todo.done ? 0 : 1;
    db.prepare("UPDATE todos SET done = ? WHERE id = ?").run(newDone, req.params.id);
    // 数据变了，清除缓存
    await delCache(CACHE_KEY);
    res.json({ id: todo.id, text: todo.text, done: newDone });
});

// DELETE /api/todos/:id — 删除待办
router.delete("/:id", async function(req, res) {
    db.prepare("DELETE FROM todos WHERE id = ?").run(req.params.id);
    // 数据变了，清除缓存
    await delCache(CACHE_KEY);
    res.json({ success: true });
});

module.exports = router;
