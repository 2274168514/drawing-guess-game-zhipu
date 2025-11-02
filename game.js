class DrawingGame {
    constructor() {
        // 游戏状态
        this.currentScore = 0;
        this.highScore = parseInt(localStorage.getItem('drawingGame_highScore') || '0');
        this.round = 1;
        this.timeLeft = 60;
        this.timerInterval = null;
        this.isPaused = false;
        this.currentWord = '';
        this.hasGuessed = false;

        // 绘画状态
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.currentColor = '#000000';
        this.currentSize = 5;
        this.paths = [];
        this.currentPath = null;

        // 画布设置
        this.canvasWidth = 1000;
        this.canvasHeight = 600;
        this.canvas = null;
        this.ctx = null;

        // 词汇库
        this.words = [
            '苹果', '太阳', '房子', '小猫', '汽车', '树木', '花朵', '鱼',
            '鸟', '山', '河流', '月亮', '星星', '雨伞', '眼镜', '书本',
            '手机', '电脑', '飞机', '船', '自行车', '蛋糕', '冰淇淋', '汉堡',
            '足球', '篮球', '钢琴', '吉他', '帽子', '鞋子', '手表', '包',
            '兔子', '蝴蝶', '气球', '钟表', '爱心', '彩虹', '云朵', '烟花',
            '火箭', '火车', '大象', '长颈鹿', '企鹅', '熊猫'
        ];

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.updateUI();
        this.updateSizePreview();

        // 显示开始提示
        this.showMessage('欢迎来到你画我猜！点击"新词汇"开始游戏', 'info');
    }

    setupCanvas() {
        // 获取canvas元素
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');

        // 设置画布尺寸
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;

        // 设置画布样式
        this.canvas.style.background = 'white';
        this.canvas.style.border = '1px solid #e0e0e0';
        this.canvas.style.borderRadius = '4px';
        this.canvas.style.cursor = 'crosshair';

        // 设置默认绘图属性
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        console.log('Canvas setup completed:', this.canvasWidth, 'x', this.canvasHeight);
    }

    setupEventListeners() {
        // 绘画事件 - 使用原生canvas事件
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // 触摸事件支持
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        }, { passive: false });

        // 工具按钮
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.target.closest('.tool-btn').dataset.tool;
                this.setTool(tool);
            });
        });

        // 颜色选择
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setColor(e.target.dataset.color);
            });
        });

        // 画笔大小滑块
        const sizeSlider = document.getElementById('sizeSlider');
        sizeSlider.addEventListener('input', (e) => {
            this.setSize(parseInt(e.target.value));
        });

        // 暂停按钮
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());

        // 新词汇按钮
        document.getElementById('newWordBtn').addEventListener('click', () => this.generateNewWord());

        // 当前词汇显示区域点击事件
        document.getElementById('currentWordDisplay').addEventListener('click', () => this.generateNewWord());

        // 用户猜测输入
        const userGuessInput = document.getElementById('userGuessInput');
        const userGuessBtn = document.getElementById('userGuessBtn');

        userGuessBtn.addEventListener('click', () => this.makeUserGuess());
        userGuessInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.makeUserGuess();
            }
        });

        // AI猜测按钮
        document.getElementById('guessBtn').addEventListener('click', () => this.makeAIGuess());

        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    handleKeyboard(e) {
        // 防止在画布上操作时触发快捷键
        if (e.target.closest('#canvas')) return;

        switch(e.key.toLowerCase()) {
            case 'p':
                this.setTool('pen');
                break;
            case 'e':
                this.setTool('eraser');
                break;
            case 'delete':
            case 'backspace':
                if (!e.target.closest('input')) {
                    e.preventDefault();
                    this.clearCanvas();
                }
                break;
            case 'z':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.undo();
                } else {
                    this.setTool('undo');
                }
                break;
            case ' ':
                e.preventDefault();
                this.makeAIGuess();
                break;
        }
    }

    generateNewWord() {
        // 随机选择一个新词汇
        const randomIndex = Math.floor(Math.random() * this.words.length);
        this.currentWord = this.words[randomIndex];
        this.hasGuessed = false;

        // 更新显示
        const wordDisplay = document.getElementById('currentWordDisplay');
        wordDisplay.textContent = this.currentWord;

        // 清空画布
        this.clearCanvas();

        // 重置计时器并开始计时
        this.resetTimer();
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.startTimer();

        // 清空输入框和AI猜测
        document.getElementById('userGuessInput').value = '';
        document.getElementById('aiGuess').textContent = '等待你的画作...';

        this.showMessage(`新词汇: ${this.currentWord} - 开始绘画吧！`, 'success');
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');

        if (this.isPaused) {
            pauseBtn.textContent = '▶️ 继续';
            pauseBtn.style.background = 'var(--success)';
            pauseBtn.style.color = 'white';
            this.showMessage('游戏已暂停', 'info');
        } else {
            pauseBtn.textContent = '⏸️ 暂停';
            pauseBtn.style.background = '';
            pauseBtn.style.color = '';
            this.showMessage('游戏继续', 'info');
        }
    }

    resetTimer() {
        this.timeLeft = 60;
        this.isPaused = false;
        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.textContent = '⏸️ 暂停';
        pauseBtn.style.background = '';
        pauseBtn.style.color = '';
        this.updateTimer();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (!this.isPaused) {
                this.timeLeft--;
                this.updateTimer();

                if (this.timeLeft <= 0) {
                    this.endRound();
                }
            }
        }, 1000);
    }

    updateTimer() {
        const timerElement = document.getElementById('timer');
        timerElement.textContent = this.timeLeft;

        if (this.timeLeft <= 10) {
            timerElement.classList.add('warning');
        } else {
            timerElement.classList.remove('warning');
        }
    }

    endRound() {
        clearInterval(this.timerInterval);
        this.showMessage(`时间到！答案是: ${this.currentWord}`, 'warning');
        this.round++;
        this.updateUI();
    }

    makeUserGuess() {
        const guessInput = document.getElementById('userGuessInput');
        const guess = guessInput.value.trim();

        if (!guess) {
            this.showMessage('请输入你的答案', 'warning');
            return;
        }

        if (this.hasGuessed) {
            this.showMessage('已经有人答对了，请开始新词汇', 'warning');
            return;
        }

        // 检查答案是否正确
        if (this.checkGuess(guess)) {
            this.currentScore += 10;
            this.hasGuessed = true;
            this.updateUI();
            this.showScoreAnimation(10);
            this.showMessage(`答对了！"${guess}" 就是正确答案！+10分`, 'success');
            guessInput.value = '';
        } else {
            this.showMessage(`"${guess}" 不对，继续试试！`, 'warning');
        }
    }

    checkGuess(guess) {
        // 简单的相似度检查
        const similarity = this.calculateSimilarity(guess, this.currentWord);
        return similarity > 0.6; // 60%以上相似度认为正确
    }

    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    // 绘画功能
    startDrawing(e) {
        if (this.currentTool !== 'pen' && this.currentTool !== 'eraser') return;

        e.preventDefault();
        this.isDrawing = true;

        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        // 开始新的路径
        this.currentPath = {
            points: [{x, y}],
            color: this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor,
            size: this.currentTool === 'eraser' ? this.currentSize * 2 : this.currentSize,
            tool: this.currentTool
        };

        // 设置绘图样式
        this.ctx.strokeStyle = this.currentPath.color;
        this.ctx.lineWidth = this.currentPath.size;
        this.ctx.globalCompositeOperation = this.currentTool === 'eraser' ? 'destination-out' : 'source-over';

        // 开始绘制
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }

    draw(e) {
        if (!this.isDrawing || !this.currentPath) return;

        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        // 添加点到路径
        this.currentPath.points.push({x, y});

        // 绘制线条
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    stopDrawing() {
        if (!this.isDrawing) return;

        if (this.currentPath && this.currentPath.points.length > 1) {
            // 保存路径
            this.paths.push({...this.currentPath});
        }

        this.isDrawing = false;
        this.currentPath = null;
        this.ctx.beginPath();
    }

    setTool(tool) {
        // 清空和撤销工具立即执行
        if (tool === 'clear') {
            this.clearCanvas();
            return;
        } else if (tool === 'undo') {
            this.undo();
            return;
        }

        this.currentTool = tool;

        // 更新按钮状态
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');

        // 更新光标样式
        if (tool === 'pen') {
            this.canvas.style.cursor = 'crosshair';
        } else if (tool === 'eraser') {
            this.canvas.style.cursor = 'grab';
        }
    }

    setColor(color) {
        this.currentColor = color;

        // 更新按钮状态
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-color="${color}"]`).classList.add('active');

        // 如果正在使用橡皮，切换回画笔
        if (this.currentTool === 'eraser') {
            this.setTool('pen');
        }

        // 更新大小预览颜色
        this.updateSizePreview();
    }

    setSize(size) {
        this.currentSize = size;
        document.getElementById('sizeSlider').value = size;
        this.updateSizePreview();
    }

    updateSizePreview() {
        const preview = document.getElementById('sizePreview');
        preview.style.width = `${Math.min(this.currentSize, 40)}px`;
        preview.style.height = `${Math.min(this.currentSize, 40)}px`;
        preview.style.background = this.currentColor;
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.paths = [];
        this.showMessage('画布已清空', 'info');

        setTimeout(() => {
            document.getElementById('aiGuess').textContent = '画布已清空，开始新的创作吧！';
        }, 300);
    }

    undo() {
        if (this.paths.length === 0) {
            this.showMessage('没有可撤销的操作', 'warning');
            return;
        }

        this.paths.pop();
        this.redrawCanvas();
        this.showMessage('已撤销上一步操作', 'info');
    }

    redrawCanvas() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 重绘所有路径
        for (const path of this.paths) {
            if (path.points.length < 2) continue;

            this.ctx.strokeStyle = path.color;
            this.ctx.lineWidth = path.size;
            this.ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';

            this.ctx.beginPath();
            this.ctx.moveTo(path.points[0].x, path.points[0].y);

            for (let i = 1; i < path.points.length; i++) {
                this.ctx.lineTo(path.points[i].x, path.points[i].y);
            }

            this.ctx.stroke();
        }

        // 重置合成操作
        this.ctx.globalCompositeOperation = 'source-over';
    }

    async makeAIGuess() {
        if (!this.currentWord) {
            this.showMessage('请先开始游戏获取词汇', 'warning');
            return;
        }

        const guessBtn = document.getElementById('guessBtn');
        const aiGuessDisplay = document.getElementById('aiGuess');

        // 显示加载状态
        guessBtn.disabled = true;
        guessBtn.innerHTML = '<span class="loading"></span><span>AI思考中...</span>';
        aiGuessDisplay.textContent = 'AI正在分析你的画作...';

        try {
            // 分析画布内容来猜测
            const analysis = this.analyzeCanvas();

            // 调用智谱清言AI API
            const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer 22fc0be60e314d57a43449a79e8cc8a0.CaWMtILxRfAZmO14'
                },
                body: JSON.stringify({
                    model: 'glm-4-flash',
                    messages: [
                        {
                            role: 'system',
                            content: '你是一个你画我猜游戏的高手。根据玩家绘画的特征（颜色、形状、笔画数量等）来猜测画的是什么。请只回答一个具体的物品名称，不要有多余的解释。常见的答案包括：苹果、太阳、房子、小猫、汽车、树木、花朵、鱼、鸟、山、河流、月亮、星星、雨伞、眼镜、书本、手机、电脑、飞机、船、自行车、蛋糕、冰淇淋、汉堡、足球、篮球、钢琴、吉他、帽子、鞋子、手表、包、兔子、蝴蝶、气球、钟表、爱心、彩虹、云朵、烟花、火箭、火车、大象、长颈鹿、企鹅、熊猫等。'
                        },
                        {
                            role: 'user',
                            content: `根据以下绘画特征，猜猜画的是什么：${analysis}\n\n请直接给出最可能的物品名称（2-4个汉字）。`
                        }
                    ],
                    max_tokens: 50,
                    temperature: 0.8
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const aiGuess = data.choices[0].message.content.trim();

            // 显示AI的猜测
            aiGuessDisplay.textContent = `AI猜测: "${aiGuess}"`;

            // 检查AI是否猜对了
            if (this.checkGuess(aiGuess) && !this.hasGuessed) {
                this.currentScore += 10;
                this.hasGuessed = true;
                this.updateUI();
                this.showScoreAnimation(10);
                this.showMessage(`AI猜对了！就是"${aiGuess}"！AI获得10分`, 'success');
            } else if (!this.hasGuessed) {
                this.showMessage(`AI猜测"${aiGuess}"，继续加油！`, 'info');
            }

        } catch (error) {
            console.error('AI guess error:', error);
            // 如果API失败，使用简单的随机猜测
            const simpleGuess = this.makeRandomGuess();
            aiGuessDisplay.textContent = `AI猜测: "${simpleGuess}" (离线模式)`;

            if (this.checkGuess(simpleGuess) && !this.hasGuessed) {
                this.currentScore += 10;
                this.hasGuessed = true;
                this.updateUI();
                this.showScoreAnimation(10);
                this.showMessage(`AI猜对了！就是"${simpleGuess}"！AI获得10分`, 'success');
            } else {
                this.showMessage(`AI猜测"${simpleGuess}"，继续加油！`, 'info');
            }
        } finally {
            // 恢复按钮状态
            guessBtn.disabled = false;
            guessBtn.innerHTML = '<span>🎯</span><span>让智谱AI猜一猜</span>';
        }
    }

    analyzeCanvas() {
        // 分析画布内容
        const analysis = [];

        // 统计使用的颜色
        const colors = new Set();
        this.paths.forEach(path => {
            if (path.tool !== 'eraser') {
                colors.add(path.color);
            }
        });

        if (colors.size > 0) {
            analysis.push(`使用了${colors.size}种颜色`);
            const colorDescriptions = [];
            if (colors.has('#FF0000')) colorDescriptions.push('红色');
            if (colors.has('#0000FF')) colorDescriptions.push('蓝色');
            if (colors.has('#00FF00')) colorDescriptions.push('绿色');
            if (colors.has('#FFFF00')) colorDescriptions.push('黄色');
            if (colors.has('#FFA500')) colorDescriptions.push('橙色');
            if (colors.has('#800080')) colorDescriptions.push('紫色');
            if (colors.has('#FFC0CB')) colorDescriptions.push('粉色');
            if (colors.has('#A52A2A')) colorDescriptions.push('棕色');

            if (colorDescriptions.length > 0) {
                analysis.push(`主要颜色是${colorDescriptions.join('、')}`);
            }
        } else {
            analysis.push('使用黑色单色绘画');
        }

        // 统计笔画数量和复杂度
        const strokeCount = this.paths.filter(path => path.tool !== 'eraser').length;
        if (strokeCount > 0) {
            analysis.push(`${strokeCount}笔画`);

            // 根据笔画数量判断可能的物体类型
            if (strokeCount <= 3) {
                analysis.push('可能是简单图形如太阳、月亮');
            } else if (strokeCount <= 8) {
                analysis.push('可能是中等复杂物体如房子、水果');
            } else {
                analysis.push('可能是复杂物体如动物、交通工具');
            }
        }

        // 分析画笔大小和线条粗细
        const brushSizes = this.paths.filter(path => path.tool !== 'eraser').map(path => path.size);
        if (brushSizes.length > 0) {
            const avgSize = brushSizes.reduce((a, b) => a + b, 0) / brushSizes.length;
            if (avgSize > 10) {
                analysis.push('线条较粗，可能是轮廓绘画');
            } else if (avgSize < 3) {
                analysis.push('线条较细，可能是精细绘画');
            } else {
                analysis.push('线条适中');
            }
        }

        // 分析复杂度
        let totalPoints = 0;
        this.paths.forEach(path => {
            totalPoints += path.points.length;
        });

        if (totalPoints < 30) {
            analysis.push('图形非常简单');
        } else if (totalPoints < 100) {
            analysis.push('图形简单');
        } else if (totalPoints < 300) {
            analysis.push('图形中等复杂');
        } else {
            analysis.push('图形复杂详细');
        }

        // 根据当前词汇添加一些提示性描述
        if (this.currentWord) {
            const categoryHints = this.getCategoryHints(this.currentWord);
            if (categoryHints.length > 0 && Math.random() > 0.3) {
                analysis.push(categoryHints[Math.floor(Math.random() * categoryHints.length)]);
            }
        }

        return analysis.join('，');
    }

    getCategoryHints(word) {
        // 根据词汇分类给出提示
        const categories = {
            '水果': ['苹果', '蛋糕', '冰淇淋', '汉堡'],
            '动物': ['小猫', '鱼', '鸟', '兔子', '蝴蝶', '大象', '长颈鹿', '企鹅', '熊猫'],
            '交通工具': ['汽车', '飞机', '船', '自行车', '火箭', '火车'],
            '自然': ['太阳', '月亮', '星星', '树木', '花朵', '山', '河流', '云朵', '彩虹'],
            '物品': ['房子', '雨伞', '眼镜', '书本', '手机', '电脑', '帽子', '鞋子', '手表', '包', '气球', '钟表'],
            '食物': ['蛋糕', '冰淇淋', '汉堡'],
            '运动': ['足球', '篮球'],
            '乐器': ['钢琴', '吉他'],
            '情感': ['爱心'],
            '其他': ['烟花']
        };

        for (const [category, words] of Object.entries(categories)) {
            if (words.includes(word)) {
                switch (category) {
                    case '水果':
                        return ['可能是食物', '看起来能吃的东西'];
                    case '动物':
                        return ['有生命的感觉', '可能是生物'];
                    case '交通工具':
                        return ['可能和移动有关', '现代物品'];
                    case '自然':
                        return ['自然元素', '户外景物'];
                    case '物品':
                        return ['日常用品', '生活物品'];
                    case '食物':
                        return ['美味的', '可以吃的'];
                    case '运动':
                        return ['运动相关', '球类'];
                    case '乐器':
                        return ['能发出声音', '音乐相关'];
                    case '情感':
                        return ['表达情感', '抽象概念'];
                    case '其他':
                        return ['特殊物品', '节日相关'];
                }
            }
        }

        return [];
    }

    makeRandomGuess() {
        // 从词汇库中随机选择一个作为猜测
        return this.words[Math.floor(Math.random() * this.words.length)];
    }

    updateUI() {
        document.getElementById('currentScore').textContent = this.currentScore;
        document.getElementById('highScore').textContent = this.highScore;
        document.getElementById('round').textContent = this.round;

        // 更新最高分
        if (this.currentScore > this.highScore) {
            this.highScore = this.currentScore;
            localStorage.setItem('drawingGame_highScore', this.highScore.toString());
            document.getElementById('highScore').textContent = this.highScore;
        }
    }

    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageElement = document.createElement('div');
        messageElement.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FFA500' : type === 'error' ? '#EF4444' : '#2196F3'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        messageElement.textContent = message;

        document.body.appendChild(messageElement);

        // 显示消息
        setTimeout(() => {
            messageElement.style.opacity = '1';
        }, 100);

        // 3秒后隐藏消息
        setTimeout(() => {
            messageElement.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(messageElement);
            }, 300);
        }, 3000);
    }

    showScoreAnimation(points) {
        // 创建得分动画
        const scoreElement = document.createElement('div');
        scoreElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #4CAF50;
            font-size: 48px;
            font-weight: bold;
            z-index: 1001;
            opacity: 0;
            transition: all 0.5s ease;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        `;
        scoreElement.textContent = `+${points}`;

        document.body.appendChild(scoreElement);

        // 显示动画
        setTimeout(() => {
            scoreElement.style.opacity = '1';
            scoreElement.style.transform = 'translate(-50%, -70%) scale(1.2)';
        }, 100);

        // 1秒后隐藏
        setTimeout(() => {
            scoreElement.style.opacity = '0';
            scoreElement.style.transform = 'translate(-50%, -80%) scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(scoreElement);
            }, 500);
        }, 1000);
    }
}

// 当页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    new DrawingGame();
});