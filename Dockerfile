# 第一步：选一个基础镜像（就像选食材）
# alpine 是精简版 Linux，体积小
FROM node:18-alpine

# 第二步：在容器里创建工作目录（就像准备案板）
WORKDIR /app

# 第三步：先复制 package.json（先装依赖，利用缓存）
# 只要 package.json 不变，这一层就不用重新构建
COPY package*.json ./

# 第四步：安装依赖（npm install）
RUN npm install --production

# 第五步：复制剩下的代码（代码经常改，放最后能利用缓存）
COPY . .

# 第六步：暴露端口（容器内部用 3000）
EXPOSE 3000

# 第七步：启动命令（盒子拆封后运行什么）
CMD ["node", "app.js"]
