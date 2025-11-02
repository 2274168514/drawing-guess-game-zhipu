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
                            content: `你是一个专业的你画我猜游戏AI分析师。你需要根据绘画的视觉特征来准确猜测画的是什么物品。

分析规则：
1. 仔细分析颜色组合和绘画特征
2. 基于笔画数量、复杂度、覆盖率等数据推理
3. 考虑线条特征（曲线、直线）与物品类型的关联
4. 优先选择最符合视觉特征的答案
5. 只回答具体的物品名称，2-4个汉字

常见物品分类：
🍎 食物水果：苹果、香蕉、葡萄、西瓜、蛋糕、冰淇淋、汉堡、披萨
🐾 动物：猫、狗、鸟、鱼、兔子、蝴蝶、大象、狮子、熊猫、企鹅
🚗 交通：汽车、火车、飞机、轮船、自行车、摩托车、火箭
🏠 建筑：房子、城堡、桥、塔、学校、医院
🌞 自然：太阳、月亮、星星、云、雨、彩虹、山、树、花、草
📱 用品：手机、电脑、电视、书、笔、眼镜、帽子、鞋子、包
⚽ 运动：足球、篮球、网球、球拍、自行车
🎵 艺术：钢琴、吉他、音符、画笔、颜料

记住：要基于实际的绘画特征进行逻辑推理，而不是随机猜测。`
                        },
                        {
                            role: 'user',
                            content: `绘画特征分析：${analysis}\n\n请基于这些特征进行逻辑推理，给出最可能的物品名称。只需要回答物品名称，不要解释推理过程。`
                        }
                    ],
                    max_tokens: 20,
                    temperature: 0.3
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
            // 如果API失败，使用基于画布分析的智能猜测
            const smartGuess = this.makeSmartGuess(analysis);
            aiGuessDisplay.textContent = `AI猜测: "${smartGuess}" (离线模式)`;

            if (this.checkGuess(smartGuess) && !this.hasGuessed) {
                this.currentScore += 10;
                this.hasGuessed = true;
                this.updateUI();
                this.showScoreAnimation(10);
                this.showMessage(`AI猜对了！就是"${smartGuess}"！AI获得10分`, 'success');
            } else {
                this.showMessage(`AI猜测"${smartGuess}"，继续加油！`, 'info');
            }
        } finally {
            // 恢复按钮状态
            guessBtn.disabled = false;
            guessBtn.innerHTML = '<span>🎯</span><span>让智谱AI猜一猜</span>';
        }
    }

    analyzeCanvas() {
        // 高级画布分析
        const features = {
            colors: new Set(),
            strokeCount: 0,
            totalPoints: 0,
            avgBrushSize: 0,
            hasCurves: false,
            hasStraightLines: false,
            coverage: 0,
            complexity: 'simple',
            dominantRegions: [],
            patterns: []
        };

        // 分析每个路径
        const brushSizes = [];
        let minX = this.canvasWidth, maxX = 0, minY = this.canvasHeight, maxY = 0;

        this.paths.forEach(path => {
            if (path.tool === 'eraser') return;

            features.strokeCount++;
            features.colors.add(path.color);
            brushSizes.push(path.size);

            // 分析路径点
            path.points.forEach((point, index) => {
                features.totalPoints++;
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minY = Math.min(minY, point.y);
                maxY = Math.max(maxY, point.y);

                // 检测曲线和直线
                if (index > 0) {
                    const prevPoint = path.points[index - 1];
                    const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x);

                    if (index > 1) {
                        const prevAngle = Math.atan2(
                            prevPoint.y - path.points[index - 2].y,
                            prevPoint.x - path.points[index - 2].x
                        );
                        const angleDiff = Math.abs(angle - prevAngle);

                        if (angleDiff > Math.PI / 6) { // 30度以上变化认为是曲线
                            features.hasCurves = true;
                        } else {
                            features.hasStraightLines = true;
                        }
                    }
                }
            });
        });

        // 计算覆盖区域
        const coveredArea = (maxX - minX) * (maxY - minY);
        features.coverage = coveredArea / (this.canvasWidth * this.canvasHeight);

        // 计算平均画笔大小
        if (brushSizes.length > 0) {
            features.avgBrushSize = brushSizes.reduce((a, b) => a + b, 0) / brushSizes.length;
        }

        // 分析复杂度
        if (features.totalPoints < 50) {
            features.complexity = 'very-simple';
        } else if (features.totalPoints < 150) {
            features.complexity = 'simple';
        } else if (features.totalPoints < 400) {
            features.complexity = 'medium';
        } else {
            features.complexity = 'complex';
        }

        // 分析绘画模式
        features.patterns = this.analyzePatterns(features);

        // 生成详细描述
        return this.generateDetailedDescription(features);
    }

    analyzePatterns(features) {
        const patterns = [];

        // 颜色模式分析
        if (features.colors.has('#FF0000') || features.colors.has('#FFA500')) {
            patterns.push('暖色调，可能是食物或太阳');
        }
        if (features.colors.has('#0000FF') || features.colors.has('#00FFFF')) {
            patterns.push('冷色调，可能是天空或水');
        }
        if (features.colors.has('#00FF00') || features.colors.has('#8B4513')) {
            patterns.push('自然色调，可能是植物或土地');
        }

        // 笔画模式分析
        if (features.strokeCount <= 2 && features.hasCurves) {
            patterns.push('简单曲线，可能是圆形物体');
        } else if (features.strokeCount >= 5 && features.avgBrushSize < 5) {
            patterns.push('精细描绘，可能是复杂物体');
        }

        // 覆盖率分析
        if (features.coverage > 0.6) {
            patterns.push('画面饱满，可能是大型物体');
        } else if (features.coverage < 0.2) {
            patterns.push('画面简洁，可能是小物体');
        }

        // 形状特征分析
        if (features.hasCurves && !features.hasStraightLines) {
            patterns.push('主要是曲线，可能是自然物体');
        } else if (features.hasStraightLines && !features.hasCurves) {
            patterns.push('主要是直线，可能是人造物体');
        } else {
            patterns.push('混合线条，可能是复合物体');
        }

        return patterns;
    }

    generateDetailedDescription(features) {
        const description = [];

        // 基础信息
        description.push(`绘画使用了${features.colors.size}种颜色`);

        // 颜色详情
        const colorList = Array.from(features.colors).map(color => {
            const colorNames = {
                '#FF0000': '红色', '#0000FF': '蓝色', '#00FF00': '绿色',
                '#FFFF00': '黄色', '#FFA500': '橙色', '#800080': '紫色',
                '#FFC0CB': '粉色', '#A52A2A': '棕色', '#000000': '黑色'
            };
            return colorNames[color] || '其他颜色';
        }).filter(Boolean);

        if (colorList.length > 0) {
            description.push(`主要颜色是${colorList.join('、')}`);
        }

        // 笔画和复杂度
        description.push(`${features.strokeCount}笔画，${features.complexity === 'very-simple' ? '极其简单' : features.complexity === 'simple' ? '简单' : features.complexity === 'medium' ? '中等复杂' : '复杂'}的绘画`);

        // 线条特征
        if (features.avgBrushSize > 8) {
            description.push('使用粗线条，可能是轮廓画');
        } else if (features.avgBrushSize < 4) {
            description.push('使用细线条，注重细节');
        }

        // 添加识别到的模式
        if (features.patterns.length > 0) {
            description.push(...features.patterns.slice(0, 3)); // 最多3个模式
        }

        // 智能推断 - 基于常见的绘画特征
        const intelligentHints = this.generateIntelligentHints(features);
        if (intelligentHints.length > 0) {
            description.push(...intelligentHints);
        }

        return description.join('，');
    }

    generateIntelligentHints(features) {
        const hints = [];

        // 基于颜色组合的智能推断
        const colors = Array.from(features.colors);

        // 红色 + 黄色 + 圆形 → 可能是太阳或水果
        if (colors.includes('#FF0000') && colors.includes('#FFFF00') && features.hasCurves) {
            hints.push('可能是太阳或苹果类圆形物体');
        }

        // 蓝色 + 白色 → 可能是天空或水相关
        if (colors.includes('#0000FF') && features.coverage > 0.3) {
            hints.push('可能是天空或水相关场景');
        }

        // 绿色 + 棕色 → 可能是植物
        if (colors.includes('#00FF00') || colors.includes('#8B4513')) {
            hints.push('可能是植物或自然景物');
        }

        // 黑色轮廓 + 内部填充 → 可能是具体物体
        if (colors.includes('#000000') && colors.length > 1) {
            hints.push('有明确轮廓的具体物体');
        }

        // 基于笔画数量的推断
        if (features.strokeCount === 1 && features.hasCurves) {
            hints.push('单个连续线条，可能是太阳、月亮等简单图形');
        } else if (features.strokeCount >= 8 && features.complexity === 'complex') {
            hints.push('多笔画复杂图形，可能是动物或交通工具');
        }

        // 基于覆盖率的推断
        if (features.coverage > 0.5) {
            hints.push('占据画面主要位置的大型物体');
        } else if (features.coverage < 0.1) {
            hints.push('画面中的小物体');
        }

        return hints;
    }

    getCategoryHints(word) {
        // 移除基于正确答案的提示，让AI完全基于画布分析
        return [];
    }

    makeSmartGuess(analysis) {
        // 基于画布分析的智能猜测算法
        const features = this.extractFeaturesFromAnalysis(analysis);
        const candidates = [];

        // 根据颜色特征筛选候选词汇
        candidates.push(...this.getCandidatesByColor(features));

        // 根据形状特征筛选候选词汇
        candidates.push(...this.getCandidatesByShape(features));

        // 根据复杂度筛选候选词汇
        candidates.push(...this.getCandidatesByComplexity(features));

        // 统计候选频率并选择最可能的
        const frequency = {};
        candidates.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });

        // 按频率排序，选择最常出现的
        const sortedCandidates = Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .map(([word]) => word);

        return sortedCandidates.length > 0 ? sortedCandidates[0] : this.words[Math.floor(Math.random() * this.words.length)];
    }

    extractFeaturesFromAnalysis(analysis) {
        const features = {
            colors: [],
            hasCurves: false,
            hasStraightLines: false,
            complexity: 'medium',
            strokeCount: 0,
            coverage: 0.3,
            patterns: []
        };

        // 解析分析文本
        if (analysis.includes('红色')) features.colors.push('red');
        if (analysis.includes('蓝色')) features.colors.push('blue');
        if (analysis.includes('绿色')) features.colors.push('green');
        if (analysis.includes('黄色')) features.colors.push('yellow');
        if (analysis.includes('橙色')) features.colors.push('orange');
        if (analysis.includes('紫色')) features.colors.push('purple');
        if (analysis.includes('粉色')) features.colors.push('pink');
        if (analysis.includes('棕色')) features.colors.push('brown');

        if (analysis.includes('曲线')) features.hasCurves = true;
        if (analysis.includes('直线')) features.hasStraightLines = true;
        if (analysis.includes('极其简单') || analysis.includes('简单')) features.complexity = 'simple';
        if (analysis.includes('复杂')) features.complexity = 'complex';

        // 提取笔画数量
        const strokeMatch = analysis.match(/(\d+)笔画/);
        if (strokeMatch) features.strokeCount = parseInt(strokeMatch[1]);

        return features;
    }

    getCandidatesByColor(features) {
        const colorMap = {
            red: ['苹果', '太阳', '汽车', '爱心', '花朵'],
            blue: ['天空', '海洋', '汽车', '眼镜', '书包'],
            green: ['树木', '树叶', '青蛙', '苹果', '草地'],
            yellow: ['太阳', '月亮', '香蕉', '柠檬', '星星'],
            orange: ['橙子', '胡萝卜', '太阳', '花朵'],
            purple: ['葡萄', '茄子', '花朵', '气球'],
            pink: ['花朵', '爱心', '气球', '彩虹'],
            brown: ['树干', '土地', '面包', '书包']
        };

        const candidates = [];
        features.colors.forEach(color => {
            if (colorMap[color]) {
                candidates.push(...colorMap[color]);
            }
        });
        return candidates.filter(word => this.words.includes(word));
    }

    getCandidatesByShape(features) {
        const candidates = [];

        if (features.hasCurves && !features.hasStraightLines) {
            candidates.push('太阳', '月亮', '苹果', '爱心', '气球', '花朵');
        } else if (features.hasStraightLines && !features.hasCurves) {
            candidates.push('房子', '汽车', '书本', '手机', '电视', '桌子');
        } else {
            candidates.push('小猫', '小狗', '自行车', '飞机', '蝴蝶');
        }

        return candidates.filter(word => this.words.includes(word));
    }

    getCandidatesByComplexity(features) {
        let candidates = [];

        if (features.complexity === 'simple' || features.strokeCount <= 3) {
            candidates = ['太阳', '月亮', '星星', '苹果', '爱心'];
        } else if (features.complexity === 'complex' || features.strokeCount >= 8) {
            candidates = ['小猫', '汽车', '飞机', '房子', '自行车', '钢琴'];
        } else {
            candidates = ['树木', '花朵', '气球', '书包', '帽子'];
        }

        return candidates.filter(word => this.words.includes(word));
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