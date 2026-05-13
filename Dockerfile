# 用 Node 20（better-sqlite3@12 需要 Node 20+）
FROM node:20-alpine

# 安装编译工具（better-sqlite3 是 C++ 原生模块，需要编译）
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 先复制 package.json，利用缓存
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制代码
COPY . .

EXPOSE 3000

CMD ["node", "app.js"]
