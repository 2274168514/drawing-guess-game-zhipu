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
                            content: `你是一个专业的你画我猜游戏AI形状识别专家。你需要根据绘画的形状特征来精确猜测画的是什么物品。

形状识别优先级：
1. 🎯 主要形状：圆形、矩形、三角形、线条、螺旋、不规则
2. 📐 比例特征：宽高比、横向/纵向/正方形
3. 🔧 结构特征：轮廓线、内部细节、对称性、闭合图形
4. 🧭 方向特征：水平、垂直、对角线方向
5. 🎨 颜色信息：次要参考，辅助形状判断

形状与物品关联规则：
- 圆形/椭圆 → 太阳、月亮、苹果、篮球、钟表、气球、花朵、爱心
- 矩形/方形 → 房子、窗户、书本、手机、电视、桌子、门
- 三角形 → 三角旗、屋顶、三角尺、松树、金字塔
- 线条形状 → 河流、道路、电线、树枝、雨伞
- 对称形状 → 蝴蝶、飞机、人脸、叶子
- 不规则形状 → 云朵、树木、山脉、动物

重要：优先根据形状特征进行判断，颜色只是辅助参考。必须基于实际绘制的几何形状来推理物品。只回答具体物品名称，2-4个汉字。`
                        },
                        {
                            role: 'user',
                            content: `形状分析结果：${analysis}\n\n根据形状特征优先判断，给出最可能的物品名称。请只回答物品名称。`
                        }
                    ],
                    max_tokens: 20,
                    temperature: 0.1
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
            guessBtn.innerHTML = '<span>🎯</span><span>让AI猜一猜</span>';
        }
    }

    analyzeCanvas() {
        // 高级形状分析系统
        const features = {
            colors: new Set(),
            strokeCount: 0,
            totalPoints: 0,
            avgBrushSize: 0,
            coverage: 0,
            complexity: 'simple',

            // 形状特征
            shapes: {
                circular: false,        // 圆形
                rectangular: false,      // 矩形
                triangular: false,       // 三角形
                linear: false,           // 线条
                spiral: false,           // 螺旋
                irregular: false,        // 不规则形状
                symmetric: false,        // 对称性
                closed: false            // 闭合图形
            },

            // 结构特征
            structure: {
                hasOutline: false,      // 有轮廓
                hasFill: false,          // 有填充
                hasDetails: false,      // 有细节
                hasTexture: false,      // 有纹理
                multipleParts: false,   // 多部分组成
                connected: true         // 连通性
            },

            // 比例特征
            proportions: {
                width: 0,
                height: 0,
                aspectRatio: 1,         // 宽高比
                centerX: 0,
                centerY: 0
            },

            // 方向特征
            orientation: {
                horizontal: false,      // 水平主导
                vertical: false,        // 垂直主导
                diagonal: false,        // 对角线
                radial: false           // 放射状
            }
        };

        // 分析每个路径
        const brushSizes = [];
        let minX = this.canvasWidth, maxX = 0, minY = this.canvasHeight, maxY = 0;
        const allPoints = [];

        this.paths.forEach(path => {
            if (path.tool === 'eraser') return;

            features.strokeCount++;
            features.colors.add(path.color);
            brushSizes.push(path.size);

            // 收集所有点用于形状分析
            path.points.forEach(point => {
                allPoints.push(point);
                features.totalPoints++;
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minY = Math.min(minY, point.y);
                maxY = Math.max(maxY, point.y);
            });
        });

        // 计算基本比例信息
        features.proportions.width = maxX - minX;
        features.proportions.height = maxY - minY;
        features.proportions.aspectRatio = features.proportions.width / features.proportions.height;
        features.proportions.centerX = (minX + maxX) / 2;
        features.proportions.centerY = (minY + maxY) / 2;
        features.coverage = (features.proportions.width * features.proportions.height) / (this.canvasWidth * this.canvasHeight);

        // 核心形状分析
        this.analyzeShapes(features, allPoints);

        // 结构分析
        this.analyzeStructure(features);

        // 方向分析
        this.analyzeOrientation(features, allPoints);

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

        // 生成基于形状的详细描述
        return this.generateShapeBasedDescription(features);
    }

    analyzeShapes(features, points) {
        if (points.length < 3) return;

        // 1. 圆形检测
        const circleScore = this.detectCircle(points, features.proportions);
        if (circleScore > 0.6) {
            features.shapes.circular = true;
            features.shapes.closed = true;
        }

        // 2. 矩形检测
        const rectangleScore = this.detectRectangle(points, features.proportions);
        if (rectangleScore > 0.6) {
            features.shapes.rectangular = true;
            features.shapes.closed = true;
        }

        // 3. 三角形检测
        const triangleScore = this.detectTriangle(points, features.proportions);
        if (triangleScore > 0.6) {
            features.shapes.triangular = true;
            features.shapes.closed = true;
        }

        // 4. 直线检测
        const lineScore = this.detectLine(points);
        if (lineScore > 0.7) {
            features.shapes.linear = true;
        }

        // 5. 对称性检测
        const symmetryScore = this.detectSymmetry(points, features.proportions);
        if (symmetryScore > 0.5) {
            features.shapes.symmetric = true;
        }

        // 6. 螺旋检测
        const spiralScore = this.detectSpiral(points, features.proportions);
        if (spiralScore > 0.5) {
            features.shapes.spiral = true;
        }

        // 7. 如果没有检测到规则形状，标记为不规则
        if (!features.shapes.circular && !features.shapes.rectangular &&
            !features.shapes.triangular && !features.shapes.linear) {
            features.shapes.irregular = true;
        }
    }

    detectCircle(points, proportions) {
        if (points.length < 8) return 0;

        // 计算圆形度：宽高比接近1且形状闭合
        const aspectRatio = Math.min(proportions.width / proportions.height,
                                     proportions.height / proportions.width);

        // 计算点到中心的距离变化
        const centerX = proportions.centerX;
        const centerY = proportions.centerY;
        const distances = points.map(p =>
            Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))
        );

        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        const distanceVariance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
        const distanceStdDev = Math.sqrt(distanceVariance);

        // 圆形得分：基于宽高比和距离标准差
        const aspectScore = aspectRatio;
        const uniformityScore = 1 - Math.min(distanceStdDev / avgDistance, 1);

        return (aspectScore * 0.3 + uniformityScore * 0.7);
    }

    detectRectangle(points, proportions) {
        if (points.length < 4) return 0;

        // 计算矩形的四个角
        const corners = this.findCorners(points);
        if (corners.length !== 4) return 0.3;

        // 检查角度是否接近90度
        let angleScore = 0;
        for (let i = 0; i < 4; i++) {
            const p1 = corners[i];
            const p2 = corners[(i + 1) % 4];
            const p3 = corners[(i + 2) % 4];

            const angle = this.calculateAngle(p1, p2, p3);
            const rightAngleScore = 1 - Math.abs(angle - Math.PI / 2) / (Math.PI / 2);
            angleScore += rightAngleScore;
        }
        angleScore /= 4;

        // 检查对边是否平行且相等
        const parallelScore = this.checkParallelism(corners);

        return (angleScore * 0.6 + parallelScore * 0.4);
    }

    detectTriangle(points, proportions) {
        if (points.length < 3) return 0;

        // 找到三角形的三个顶点
        const corners = this.findCorners(points);
        if (corners.length !== 3) return 0.2;

        // 检查是否能形成有效的三角形
        const area = this.calculateTriangleArea(corners[0], corners[1], corners[2]);
        if (area < 100) return 0; // 面积太小

        // 计算三角形的规整度
        const sides = [
            this.distance(corners[0], corners[1]),
            this.distance(corners[1], corners[2]),
            this.distance(corners[2], corners[0])
        ];

        const perimeter = sides.reduce((a, b) => a + b, 0);
        const regularityScore = 1 - (Math.max(...sides) - Math.min(...sides)) / perimeter;

        return regularityScore * 0.8;
    }

    detectLine(points) {
        if (points.length < 2) return 0;

        // 计算点的线性拟合度
        const lineFit = this.calculateLinearFit(points);

        // 检查主要方向
        const orientation = this.calculateLineOrientation(points);
        const orientationScore = Math.max(Math.abs(orientation.x), Math.abs(orientation.y));

        return lineFit * 0.7 + orientationScore * 0.3;
    }

    detectSymmetry(points, proportions) {
        const centerX = proportions.centerX;
        const centerY = proportions.centerY;

        // 检查水平对称性
        const horizontalSymmetry = this.checkSymmetry(points, centerX, 'horizontal');

        // 检查垂直对称性
        const verticalSymmetry = this.checkSymmetry(points, centerY, 'vertical');

        return Math.max(horizontalSymmetry, verticalSymmetry);
    }

    detectSpiral(points, proportions) {
        if (points.length < 10) return 0;

        const centerX = proportions.centerX;
        const centerY = proportions.centerY;

        // 计算距离中心的距离变化模式
        const distances = points.map(p =>
            Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))
        );

        // 检查距离是否呈现递增或递减趋势
        let spiralScore = 0;
        let increasingCount = 0;
        let decreasingCount = 0;

        for (let i = 1; i < distances.length; i++) {
            if (distances[i] > distances[i-1]) increasingCount++;
            else if (distances[i] < distances[i-1]) decreasingCount++;
        }

        const trendScore = Math.max(increasingCount, decreasingCount) / (distances.length - 1);

        // 检查角度变化（螺旋应该有持续的角度变化）
        const angleVariation = this.calculateAngleVariation(points, centerX, centerY);

        return (trendScore * 0.6 + angleVariation * 0.4);
    }

    analyzeStructure(features) {
        // 检测是否有轮廓（通常是外部的大路径）
        if (features.strokeCount > 1) {
            features.structure.hasOutline = true;
        }

        // 检测是否有内部细节
        if (features.strokeCount > 3 || features.complexity === 'complex') {
            features.structure.hasDetails = true;
        }

        // 检测是否是多部分组成
        if (features.strokeCount > 5) {
            features.structure.multipleParts = true;
        }
    }

    analyzeOrientation(features, points) {
        if (points.length < 2) return;

        // 计算主要方向向量
        let totalDx = 0, totalDy = 0;
        for (let i = 1; i < points.length; i++) {
            totalDx += points[i].x - points[i-1].x;
            totalDy += points[i].y - points[i-1].y;
        }

        const avgDx = totalDx / (points.length - 1);
        const avgDy = totalDy / (points.length - 1);

        // 判断主导方向
        const angle = Math.atan2(avgDy, avgDx);

        if (Math.abs(angle) < Math.PI / 8 || Math.abs(angle - Math.PI) < Math.PI / 8) {
            features.orientation.horizontal = true;
        } else if (Math.abs(angle - Math.PI / 2) < Math.PI / 8 || Math.abs(angle + Math.PI / 2) < Math.PI / 8) {
            features.orientation.vertical = true;
        } else {
            features.orientation.diagonal = true;
        }
    }

    // 辅助数学函数
    findCorners(points) {
        if (points.length < 3) return [];

        // 使用凸包算法找到角点
        const convexHull = this.convexHull(points);
        return convexHull;
    }

    convexHull(points) {
        // Graham扫描算法实现凸包
        if (points.length < 3) return points;

        // 找到最下面的点（y最小，如果相同则x最小）
        let start = points[0];
        for (let i = 1; i < points.length; i++) {
            if (points[i].y < start.y || (points[i].y === start.y && points[i].x < start.x)) {
                start = points[i];
            }
        }

        // 按极角排序
        const sorted = points.filter(p => p !== start).sort((a, b) => {
            const angleA = Math.atan2(a.y - start.y, a.x - start.x);
            const angleB = Math.atan2(b.y - start.y, b.x - start.x);
            return angleA - angleB;
        });

        const hull = [start];
        for (const point of sorted) {
            while (hull.length > 1 && this.crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
                hull.pop();
            }
            hull.push(point);
        }

        return hull;
    }

    crossProduct(o, a, b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }

    calculateAngle(p1, p2, p3) {
        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

        const dot = v1.x * v2.x + v1.y * v2.y;
        const det = v1.x * v2.y - v1.y * v2.x;

        return Math.atan2(det, dot);
    }

    calculateTriangleArea(p1, p2, p3) {
        return Math.abs((p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2);
    }

    distance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    calculateLinearFit(points) {
        if (points.length < 2) return 0;

        const n = points.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        points.forEach(p => {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumX2 += p.x * p.x;
        });

        const denominator = n * sumX2 - sumX * sumX;
        if (Math.abs(denominator) < 0.001) return 1; // 垂直线

        const slope = (n * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / n;

        // 计算R²
        const meanY = sumY / n;
        let ssTotal = 0, ssResidual = 0;

        points.forEach(p => {
            const predicted = slope * p.x + intercept;
            ssTotal += Math.pow(p.y - meanY, 2);
            ssResidual += Math.pow(p.y - predicted, 2);
        });

        return ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
    }

    calculateLineOrientation(points) {
        if (points.length < 2) return { x: 0, y: 0 };

        let dx = 0, dy = 0;
        for (let i = 1; i < points.length; i++) {
            dx += points[i].x - points[i-1].x;
            dy += points[i].y - points[i-1].y;
        }

        const length = Math.sqrt(dx * dx + dy * dy);
        return length > 0 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
    }

    checkParallelism(corners) {
        if (corners.length !== 4) return 0;

        const sides = [
            { start: corners[0], end: corners[1] },
            { start: corners[1], end: corners[2] },
            { start: corners[2], end: corners[3] },
            { start: corners[3], end: corners[0] }
        ];

        const vectors = sides.map(side => ({
            x: side.end.x - side.start.x,
            y: side.end.y - side.start.y
        }));

        // 检查对边是否平行
        const parallel1 = this.areVectorsParallel(vectors[0], vectors[2]);
        const parallel2 = this.areVectorsParallel(vectors[1], vectors[3]);

        return (parallel1 + parallel2) / 2;
    }

    areVectorsParallel(v1, v2) {
        const cross = v1.x * v2.y - v1.y * v2.x;
        return 1 - Math.min(Math.abs(cross) / (Math.sqrt(v1.x * v1.x + v1.y * v1.y) * Math.sqrt(v2.x * v2.x + v2.y * v2.y) + 0.001), 1);
    }

    checkSymmetry(points, centerLine, axis) {
        let symmetricPoints = 0;
        const tolerance = 20; // 对称容差

        points.forEach(point => {
            if (axis === 'horizontal') {
                const mirrorX = 2 * centerLine - point.x;
                const hasMirror = points.some(p =>
                    Math.abs(p.x - mirrorX) < tolerance && Math.abs(p.y - point.y) < tolerance
                );
                if (hasMirror) symmetricPoints++;
            } else {
                const mirrorY = 2 * centerLine - point.y;
                const hasMirror = points.some(p =>
                    Math.abs(p.x - point.x) < tolerance && Math.abs(p.y - mirrorY) < tolerance
                );
                if (hasMirror) symmetricPoints++;
            }
        });

        return points.length > 0 ? symmetricPoints / points.length : 0;
    }

    calculateAngleVariation(points, centerX, centerY) {
        if (points.length < 3) return 0;

        const angles = points.map(p => Math.atan2(p.y - centerY, p.x - centerX));
        let totalVariation = 0;

        for (let i = 1; i < angles.length; i++) {
            let diff = angles[i] - angles[i-1];
            // 处理角度跨越-π到π的情况
            if (diff > Math.PI) diff -= 2 * Math.PI;
            if (diff < -Math.PI) diff += 2 * Math.PI;
            totalVariation += Math.abs(diff);
        }

        return Math.min(totalVariation / (angles.length - 1) / Math.PI, 1);
    }

    generateShapeBasedDescription(features) {
        const description = [];

        // 1. 首先报告形状特征（最重要）
        const shapeDescriptions = [];

        if (features.shapes.circular) {
            shapeDescriptions.push('圆形或椭圆形');
        }
        if (features.shapes.rectangular) {
            shapeDescriptions.push('矩形或方形');
        }
        if (features.shapes.triangular) {
            shapeDescriptions.push('三角形');
        }
        if (features.shapes.linear) {
            shapeDescriptions.push('线条形状');
        }
        if (features.shapes.spiral) {
            shapeDescriptions.push('螺旋形状');
        }
        if (features.shapes.irregular) {
            shapeDescriptions.push('不规则形状');
        }

        if (shapeDescriptions.length > 0) {
            description.push(`画的是${shapeDescriptions.join('或')}`);
        }

        // 2. 比例信息
        const aspectRatio = features.proportions.aspectRatio;
        if (aspectRatio > 1.5) {
            description.push('横向较宽的形状');
        } else if (aspectRatio < 0.7) {
            description.push('纵向较高的形状');
        } else {
            description.push('接近正方形的形状');
        }

        // 3. 结构特征
        if (features.structure.hasOutline) {
            description.push('有明确的轮廓线');
        }
        if (features.structure.hasDetails) {
            description.push('包含内部细节');
        }
        if (features.structure.multipleParts) {
            description.push('由多个部分组成');
        }

        // 4. 对称性
        if (features.shapes.symmetric) {
            description.push('具有对称性');
        }
        if (features.shapes.closed) {
            description.push('是闭合的图形');
        }

        // 5. 方向信息
        if (features.orientation.horizontal) {
            description.push('水平方向为主');
        } else if (features.orientation.vertical) {
            description.push('垂直方向为主');
        } else if (features.orientation.diagonal) {
            description.push('对角线方向');
        }

        // 6. 复杂度
        description.push(`绘画${features.complexity === 'very-simple' ? '极其简单' : features.complexity === 'simple' ? '简单' : features.complexity === 'medium' ? '中等复杂' : '复杂'}`);

        // 7. 颜色信息（次要）
        if (features.colors.size > 0) {
            const colorList = Array.from(features.colors).map(color => {
                const colorNames = {
                    '#FF0000': '红色', '#0000FF': '蓝色', '#00FF00': '绿色',
                    '#FFFF00': '黄色', '#FFA500': '橙色', '#800080': '紫色',
                    '#FFC0CB': '粉色', '#A52A2A': '棕色', '#000000': '黑色'
                };
                return colorNames[color] || '其他颜色';
            }).filter(Boolean);

            if (colorList.length > 0) {
                description.push(`使用${colorList.join('、')}`);
            }
        }

        // 8. 线条特征
        if (features.avgBrushSize > 8) {
            description.push('粗线条风格');
        } else if (features.avgBrushSize < 4) {
            description.push('细线条风格');
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
        // 基于形状的智能猜测算法
        const features = this.extractShapeFeaturesFromAnalysis(analysis);
        const candidates = [];

        // 优先根据形状特征筛选候选词汇（最重要）
        candidates.push(...this.getCandidatesByShape(features));

        // 次要根据比例特征筛选候选词汇
        candidates.push(...this.getCandidatesByProportions(features));

        // 根据结构特征筛选候选词汇
        candidates.push(...this.getCandidatesByStructure(features));

        // 根据方向特征筛选候选词汇
        candidates.push(...this.getCandidatesByOrientation(features));

        // 根据颜色特征筛选候选词汇（次要）
        candidates.push(...this.getCandidatesByColor(features));

        // 根据复杂度筛选候选词汇
        candidates.push(...this.getCandidatesByComplexity(features));

        // 新增：基于对称性的候选选择
        candidates.push(...this.getCandidatesBySymmetry(features));

        // 新增：基于闭合特征的候选选择
        candidates.push(...this.getCandidatesByClosedShape(features));

        // 新增：基于特殊形状组合的候选选择（优先级较高）
        candidates.push(...this.getCandidatesByShapeCombinations(features));

        // 新增：基于生活常识的形状推理
        candidates.push(...this.getCandidatesByCommonSense(features));

        // 统计候选频率并加权评分
        const score = {};
        candidates.forEach((word, index) => {
            // 根据候选来源的不同给予不同权重
            let weight = 1;

            // 形状特征的权重最高
            if (index < this.getCandidatesByShape(features).length) {
                weight = 3;
            }
            // 特殊形状组合的权重也很高
            else if (index >= candidates.length - this.getCandidatesByShapeCombinations(features).length - this.getCandidatesByCommonSense(features).length) {
                weight = 2.5;
            }
            // 颜色特征权重最低
            else if (index >= candidates.length - this.getCandidatesByColor(features).length) {
                weight = 0.5;
            }

            score[word] = (score[word] || 0) + weight;
        });

        // 按分数排序，选择得分最高的
        const sortedCandidates = Object.entries(score)
            .sort(([,a], [,b]) => b - a)
            .map(([word]) => word);

        // 如果有明确的候选选择，返回最高分；否则随机选择
        if (sortedCandidates.length > 0 && score[sortedCandidates[0]] > 2) {
            return sortedCandidates[0];
        } else {
            // 如果没有明确的形状特征，根据复杂度进行随机选择
            const reasonableCandidates = this.getCandidatesByComplexity(features);
            return reasonableCandidates[Math.floor(Math.random() * reasonableCandidates.length)];
        }
    }

    extractShapeFeaturesFromAnalysis(analysis) {
        const features = {
            // 形状特征
            shapes: {
                circular: false,
                rectangular: false,
                triangular: false,
                linear: false,
                spiral: false,
                irregular: false
            },
            // 结构特征
            structure: {
                hasOutline: false,
                hasDetails: false,
                multipleParts: false,
                symmetric: false,
                closed: false
            },
            // 比例特征
            proportions: {
                wide: false,
                tall: false,
                square: false
            },
            // 方向特征
            orientation: {
                horizontal: false,
                vertical: false,
                diagonal: false
            },
            // 其他特征
            colors: [],
            complexity: 'medium',
            strokeCount: 0,
            coverage: 0.3
        };

        // 解析形状特征
        if (analysis.includes('圆形') || analysis.includes('椭圆形')) features.shapes.circular = true;
        if (analysis.includes('矩形') || analysis.includes('方形')) features.shapes.rectangular = true;
        if (analysis.includes('三角形')) features.shapes.triangular = true;
        if (analysis.includes('线条形状')) features.shapes.linear = true;
        if (analysis.includes('螺旋形状')) features.shapes.spiral = true;
        if (analysis.includes('不规则形状')) features.shapes.irregular = true;

        // 解析比例特征
        if (analysis.includes('横向较宽')) features.proportions.wide = true;
        if (analysis.includes('纵向较高')) features.proportions.tall = true;
        if (analysis.includes('接近正方形')) features.proportions.square = true;

        // 解析结构特征
        if (analysis.includes('明确的轮廓线')) features.structure.hasOutline = true;
        if (analysis.includes('内部细节')) features.structure.hasDetails = true;
        if (analysis.includes('多个部分组成')) features.structure.multipleParts = true;
        if (analysis.includes('具有对称性')) features.shapes.symmetric = true;
        if (analysis.includes('闭合的图形')) features.shapes.closed = true;

        // 解析方向特征
        if (analysis.includes('水平方向为主')) features.orientation.horizontal = true;
        if (analysis.includes('垂直方向为主')) features.orientation.vertical = true;
        if (analysis.includes('对角线方向')) features.orientation.diagonal = true;

        // 解析颜色特征
        if (analysis.includes('红色')) features.colors.push('red');
        if (analysis.includes('蓝色')) features.colors.push('blue');
        if (analysis.includes('绿色')) features.colors.push('green');
        if (analysis.includes('黄色')) features.colors.push('yellow');
        if (analysis.includes('橙色')) features.colors.push('orange');
        if (analysis.includes('紫色')) features.colors.push('purple');
        if (analysis.includes('粉色')) features.colors.push('pink');
        if (analysis.includes('棕色')) features.colors.push('brown');

        // 解析复杂度
        if (analysis.includes('极其简单') || analysis.includes('简单')) features.complexity = 'simple';
        if (analysis.includes('中等复杂')) features.complexity = 'medium';
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

        // 基于主要形状选择候选词
        if (features.shapes.circular) {
            candidates.push('太阳', '月亮', '苹果', '篮球', '钟表', '气球', '花朵', '爱心', '足球', '轮子');
        }
        if (features.shapes.rectangular) {
            candidates.push('房子', '窗户', '书本', '手机', '电视', '桌子', '门', '电脑', '画框');
        }
        if (features.shapes.triangular) {
            candidates.push('三角旗', '屋顶', '三角尺', '松树', '金字塔', '箭头');
        }
        if (features.shapes.linear) {
            candidates.push('河流', '道路', '电线', '树枝', '雨伞', '旗杆', '铅笔');
        }
        if (features.shapes.spiral) {
            candidates.push('螺旋', '海螺', '弹簧', '旋涡');
        }
        if (features.shapes.irregular) {
            candidates.push('云朵', '树木', '山脉', '火焰', '水滴', '石头');
        }

        return candidates.filter(word => this.words.includes(word));
    }

    getCandidatesByProportions(features) {
        const candidates = [];

        if (features.proportions.wide) {
            candidates.push('河流', '道路', '桥', '桌子', '床', '汽车');
        }
        if (features.proportions.tall) {
            candidates.push('树', '房子', '塔', '火箭', '烟囱', '旗杆');
        }
        if (features.proportions.square) {
            candidates.push('窗户', '画框', '电视', '手机', '书籍', '镜子');
        }

        return candidates.filter(word => this.words.includes(word));
    }

    getCandidatesByStructure(features) {
        const candidates = [];

        if (features.structure.hasOutline && features.structure.hasDetails) {
            candidates.push('人脸', '动物', '花朵', '汽车', '房子');
        } else if (features.structure.hasOutline && !features.hasDetails) {
            candidates.push('太阳', '月亮', '心形', '星形', '圆形');
        } else if (features.structure.multipleParts) {
            candidates.push('汽车', '自行车', '飞机', '火车', '花束');
        }

        return candidates.filter(word => this.words.includes(word));
    }

    getCandidatesByOrientation(features) {
        const candidates = [];

        if (features.orientation.horizontal) {
            candidates.push('地平线', '河流', '道路', '桥', '桌子');
        }
        if (features.orientation.vertical) {
            candidates.push('树干', '旗杆', '烟囱', '电线杆', '塔');
        }
        if (features.orientation.diagonal) {
            candidates.push('楼梯', '斜坡', '山坡', '屋顶');
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

    // 新增：基于对称性的候选选择
    getCandidatesBySymmetry(features) {
        const candidates = [];

        if (features.shapes.symmetric) {
            if (features.shapes.circular) {
                candidates.push('太阳', '月亮', '时钟', '球类', '花朵', '车轮');
            } else if (features.shapes.rectangular) {
                candidates.push('窗户', '门', '电视', '画框', '镜子');
            } else {
                candidates.push('蝴蝶', '飞机', '人脸', '叶子', '雪花');
            }
        }

        return candidates.filter(word => this.words.includes(word));
    }

    // 新增：基于闭合特征的候选选择
    getCandidatesByClosedShape(features) {
        const candidates = [];

        if (features.shapes.closed) {
            if (features.shapes.circular) {
                candidates.push('太阳', '月亮', '苹果', '篮球', '气球', '花朵', '时钟', '轮子');
            } else if (features.shapes.rectangular) {
                candidates.push('房子', '窗户', '书本', '手机', '电视', '桌子', '门');
            } else if (features.shapes.triangular) {
                candidates.push('屋顶', '三角旗', '松树', '金字塔');
            }
        } else {
            // 非闭合图形
            candidates.push('河流', '道路', '树枝', '电线', '旗杆', '铅笔', '线条');
        }

        return candidates.filter(word => this.words.includes(word));
    }

    // 新增：基于特殊形状组合的候选选择
    getCandidatesByShapeCombinations(features) {
        const candidates = [];

        // 圆形 + 对称 = 太阳、月亮、时钟
        if (features.shapes.circular && features.shapes.symmetric) {
            candidates.push('太阳', '月亮', '时钟', '球类', '花朵');
        }

        // 矩形 + 有细节 = 房子、手机、电视
        if (features.shapes.rectangular && features.structure.hasDetails) {
            candidates.push('房子', '手机', '电视', '电脑', '窗户');
        }

        // 不规则 + 多部分 = 树木、动物、云朵
        if (features.shapes.irregular && features.structure.multipleParts) {
            candidates.push('树木', '云朵', '山脉', '动物', '火焰');
        }

        // 线条 + 水平 = 河流、道路、地平线
        if (features.shapes.linear && features.orientation.horizontal) {
            candidates.push('河流', '道路', '桥', '地平线');
        }

        // 螺旋 + 闭合 = 海螺、旋涡
        if (features.shapes.spiral && features.shapes.closed) {
            candidates.push('海螺', '旋涡', '弹簧', '螺旋');
        }

        return candidates.filter(word => this.words.includes(word));
    }

    // 新增：基于生活常识的形状推理
    getCandidatesByCommonSense(features) {
        const candidates = [];

        // 基于常见形状-物品关联
        if (features.shapes.circular && features.proportions.wide) {
            candidates.push('太阳', '月亮', '车轮');
        }

        if (features.shapes.rectangular && features.proportions.tall) {
            candidates.push('房子', '建筑', '塔');
        }

        if (features.shapes.triangular && features.orientation.vertical) {
            candidates.push('松树', '屋顶', '箭头');
        }

        // 基于颜色和形状的组合
        if (features.colors.includes('red') && features.shapes.circular) {
            candidates.push('太阳', '苹果');
        }

        if (features.colors.includes('green') && features.shapes.irregular) {
            candidates.push('树木', '树叶');
        }

        if (features.colors.includes('blue') && features.shapes.linear) {
            candidates.push('河流', '天空');
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