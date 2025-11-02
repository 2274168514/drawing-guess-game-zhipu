# 你画我猜游戏 - 智谱清言AI版

一个基于HTML5 Canvas和智谱清言API的在线绘画猜测游戏。玩家可以绘制各种物品，让智谱清言AI来猜测画的是什么。

## 🎮 游戏特色

- **🎨 流畅绘画体验**：基于HTML5 Canvas的原生绘图功能
- **🧠 智谱AI猜测**：使用智谱清言AI智能分析画作并猜测
- **🎯 双重猜测模式**：支持用户输入和AI猜测两种方式
- **⏱️ 计时挑战**：60秒倒计时，支持暂停功能
- **🏆 积分系统**：正确答案获得10分，支持最高分记录
- **🎨 丰富工具**：多种颜色选择、画笔大小调节、橡皮擦、撤销功能

## 🛠️ 技术栈

- **前端**：HTML5, CSS3, JavaScript (ES6+)
- **绘画引擎**：HTML5 Canvas API
- **AI服务**：智谱清言 API (GLM-4-Flash)
- **样式设计**：现代化响应式设计，支持移动端

## 🎯 游戏玩法

1. **开始游戏**：点击"新词汇"按钮获取要画的词汇
2. **绘画创作**：使用画笔工具在画布上绘制词汇内容
3. **AI猜测**：点击"让智谱AI猜一猜"让AI分析你的画作
4. **用户猜测**：也可以自己输入答案进行验证
5. **获得积分**：猜对即可获得10分

## 🎨 功能特点

### 绘画工具
- ✏️ 画笔工具：支持多种颜色和粗细调节
- 🧹 橡皮擦：可调节大小的橡皮擦
- 🎨 12种预设颜色：黑、红、绿、蓝、黄、紫、橙、粉、棕等
- 📏 画笔大小：1-50像素可调
- ↩️ 撤销功能：支持撤销上一步操作
- 🗑️ 清空画布：一键清空所有内容

### AI智能分析
- 🔍 颜色分析：识别画作中使用的颜色
- 📊 笔画分析：统计笔画数量和复杂度
- 🧠 智能提示：基于物品分类给出相关提示
- 🎯 精准猜测：智谱清言AI的高准确率猜测

### 用户体验
- 📱 响应式设计：支持PC和移动设备
- ⌨️ 快捷键支持：Delete清空画布，Ctrl+Z撤销
- 🎵 视觉反馈：丰富的动画和交互效果
- 💾 本地存储：自动保存最高分记录

## 🚀 快速开始

### 在线体验
直接在浏览器中打开 `index.html` 文件即可开始游戏。

### 本地运行
1. 克隆或下载项目文件
2. 使用Python启动本地服务器：
   ```bash
   python -m http.server 8080
   ```
3. 在浏览器中访问 `http://localhost:8080`

## 📁 项目结构

```
drawing-guess-game-zhipu/
├── index.html          # 主页面
├── game.js            # 游戏核心逻辑
├── README.md          # 项目说明文档
└── .gitignore         # Git忽略文件
```

## 🔧 核心算法

### 画布分析算法
AI通过分析以下特征来猜测画作：
- **颜色特征**：统计使用的主要颜色和颜色数量
- **笔画特征**：分析笔画数量、线条粗细、绘画复杂度
- **分类提示**：基于词汇类别给出相关提示
- **智能推断**：结合多种特征进行综合判断

### 相似度计算
使用Levenshtein距离算法计算用户输入与正确答案的相似度：
```javascript
calculateSimilarity(str1, str2) {
    // 计算编辑距离并转换为相似度百分比
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}
```

## 🎯 词汇库

包含40+个常见物品词汇，分为以下类别：
- 🍎 水果食物：苹果、蛋糕、冰淇淋、汉堡
- 🐾 动物：小猫、鱼、鸟、兔子、蝴蝶、大象等
- 🚗 交通工具：汽车、飞机、船、自行车、火箭等
- 🌞 自然景物：太阳、月亮、星星、树木、花朵等
- 🏠 日常用品：房子、雨伞、眼镜、手机、电脑等

## ⚙️ 配置说明

### API配置
```javascript
// 智谱清言API配置
const API_CONFIG = {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-flash',
    apiKey: 'your-api-key-here'
};
```

### 游戏参数
```javascript
// 可自定义的游戏参数
const GAME_CONFIG = {
    canvasWidth: 1000,      // 画布宽度
    canvasHeight: 600,      // 画布高度
    roundTime: 60,          // 每轮时间（秒）
    scorePerCorrect: 10,    // 每次正确得分
    similarityThreshold: 0.6 // 相似度阈值
};
```

## 🐛 常见问题

**Q: AI猜测不准确怎么办？**
A: AI基于画作的视觉特征进行分析，建议使用合适的颜色和清晰的线条来表达主要特征。

**Q: 如何获得更高分数？**
A: 尽量让画作包含词汇的主要特征，使用相关颜色，这样AI更容易猜中。

**Q: 支持哪些浏览器？**
A: 支持所有现代浏览器，包括Chrome、Firefox、Safari、Edge等。

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进游戏！

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [智谱清言](https://zhipuai.cn/) - 提供强大的AI语言模型支持
- [HTML5 Canvas](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API) - 提供绘图能力
- [Google Fonts](https://fonts.google.com/) - 提供优雅的字体支持

---

**开发者**: [孙光宇](https://github.com/2274168514)
**项目地址**: https://github.com/2274168514/drawing-guess-game-zhipu
**在线体验**: [点击这里](https://2274168514.github.io/drawing-guess-game-zhipu/) 🎮