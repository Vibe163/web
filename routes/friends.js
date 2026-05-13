const express = require("express");
const router = express.Router();
const db = require("../db/database");

// POST /api/friends/add - 添加好友
router.post("/add", function(req, res) {
    const { userId, friendId } = req.body;

    if (!userId || !friendId) {
        return res.status(400).json({ error: "参数不完整" });
    }

    if (userId === friendId) {
        return res.status(400).json({ error: "不能添加自己为好友" });
    }

    // 检查好友是否存在
    const friend = db.prepare("SELECT id, username FROM users WHERE id = ?").get(friendId);
    if (!friend) {
        return res.status(404).json({ error: "用户不存在" });
    }

    // 检查是否已经是好友
    const existing = db.prepare("SELECT id FROM friends WHERE user_id = ? AND friend_id = ?").get(userId, friendId);
    if (existing) {
        return res.status(400).json({ error: "已经是好友了" });
    }

    // 双向添加好友关系
    db.prepare("INSERT INTO friends (user_id, friend_id) VALUES (?, ?)").run(userId, friendId);
    db.prepare("INSERT INTO friends (user_id, friend_id) VALUES (?, ?)").run(friendId, userId);

    res.json({ message: "添加成功", friend: friend });
});

// GET /api/friends/:userId - 获取好友列表
router.get("/:userId", function(req, res) {
    const userId = req.params.userId;

    const friends = db.prepare(`
        SELECT u.id, u.username
        FROM friends f
        JOIN users u ON f.friend_id = u.id
        WHERE f.user_id = ?
        ORDER BY u.username
    `).all(userId);

    res.json(friends);
});

// GET /api/messages/:userId/:friendId - 获取聊天记录
router.get("/messages/:userId/:friendId", function(req, res) {
    const { userId, friendId } = req.params;

    const messages = db.prepare(`
        SELECT m.*, u.username as from_name
        FROM messages m
        JOIN users u ON m.from_user = u.id
        WHERE (m.from_user = ? AND m.to_user = ?) OR (m.from_user = ? AND m.to_user = ?)
        ORDER BY m.created_at ASC
        LIMIT 100
    `).all(userId, friendId, friendId, userId);

    res.json(messages);
});

// POST /api/messages - 发送消息
router.post("/messages", function(req, res) {
    const { fromUser, toUser, content } = req.body;

    if (!fromUser || !toUser || !content) {
        return res.status(400).json({ error: "参数不完整" });
    }

    const result = db.prepare("INSERT INTO messages (from_user, to_user, content) VALUES (?, ?, ?)").run(fromUser, toUser, content);

    res.json({
        id: result.lastInsertRowid,
        from_user: fromUser,
        to_user: toUser,
        content: content
    });
});

module.exports = router;
