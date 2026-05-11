// 待办事项路由：处理所有 /api/todos 相关的请求

const express = require("express");
const router = express.Router();
const db = require("../db/database");

// GET /api/todos — 获取所有待办
router.get("/", function(req, res) {
    const todos = db.prepare("SELECT * FROM todos").all();
    res.json(todos);
});

// POST /api/todos — 添加待办
router.post("/", function(req, res) {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "内容不能为空" });
    const result = db.prepare("INSERT INTO todos (text) VALUES (?)").run(text);
    res.json({ id: result.lastInsertRowid, text: text, done: 0 });
});

// PUT /api/todos/:id — 切换完成状态
router.put("/:id", function(req, res) {
    const todo = db.prepare("SELECT * FROM todos WHERE id = ?").get(req.params.id);
    if (!todo) return res.status(404).json({ error: "不存在" });
    const newDone = todo.done ? 0 : 1;
    db.prepare("UPDATE todos SET done = ? WHERE id = ?").run(newDone, req.params.id);
    res.json({ id: todo.id, text: todo.text, done: newDone });
});

// DELETE /api/todos/:id — 删除待办
router.delete("/:id", function(req, res) {
    db.prepare("DELETE FROM todos WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

module.exports = router;
