/**
 * ICEQ (2025) - Страница прохождения теста
 */

class TakeTestPage {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.timeStarted = null;
        this.testId = null;
        this.timerInterval = null;
        this.currentScreen = 'upload'; // upload, test, results
        
        this.init();
    }
    
    init() {
        this.initElements();
        this.initEventListeners();
        this.checkForTestId();
    }
    
    initElements() {
        // Экраны
        this.uploadScreen = document.getElementById('upload-screen');
        this.testScreen = document.getElementById('test-screen');
        this.resultsScreen = document.getElementById('results-screen');
        
        // Элементы загрузки
        this.fileUpload = document.getElementById('file-upload');
        this.dropArea = document.getElementById('drop-area');
        this.fileInfo = document.getElementById('file-info');
        this.testIdInput = document.getElementById('test-id');
        this.loadTestBtn = document.getElementById('load-test-btn');
        
        // Элементы теста
        this.questionContainer = document.getElementById('question-container');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.testTimer = document.getElementById('test-timer');
        this.questionDots = document.getElementById('question-dots');
        
        // Кнопки навигации
        this.prevBtn = document.getElementById('prev-question');
        this.nextBtn = document.getElementById('next-question');
        this.finishBtn = document.getElementById('finish-test');
    }
    
    initEventListeners() {
        // Переключение вкладок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        
        // Загрузка файла
        this.fileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        this.dropArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropArea.addEventListener('drop', (e) => this.handleFileDrop(e));
        
        // Удаление файла
        document.getElementById('file-remove').addEventListener('click', () => this.removeFile());
        
        // Ввод ID теста
        this.testIdInput.addEventListener('input', () => this.validateInput());
        
        // Кнопка загрузки теста
        this.loadTestBtn.addEventListener('click', () => this.loadTest());
        
        // Кнопка назад
        document.getElementById('back-btn').addEventListener('click', () => this.goBack());
        
        // Навигация по тесту
        this.prevBtn.addEventListener('click', () => this.prevQuestion());
        this.nextBtn.addEventListener('click', () => this.nextQuestion());
        this.finishBtn.addEventListener('click', () => this.finishTest());
        
        // Обработчик ответов (делегирование событий)
        this.questionContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('answer-option')) {
                this.selectAnswer(e.target.dataset.answer);
            }
        });
    }
    
    checkForTestId() {
        // Проверяем URL на наличие ID теста
        const urlParams = new URLSearchParams(window.location.search);
        const testId = urlParams.get('id');
        
        if (testId) {
            this.testIdInput.value = testId;
            this.switchTab('id');
            this.validateInput();
        }
    }
    
    switchTab(tabName) {
        // Переключение активной вкладки
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-input-tab`);
        });
        
        this.validateInput();
    }
    
    handleDragOver(e) {
        e.preventDefault();
        this.dropArea.classList.add('dragover');
    }
    
    handleFileDrop(e) {
        e.preventDefault();
        this.dropArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }
    
    handleFileUpload(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }
    
    async processFile(file) {
        // Проверка размера файла (1 МБ)
        if (file.size > 1024 * 1024) {
            window.iceqBase.showToast('Файл слишком большой. Максимум 1 МБ', 'error');
            return;
        }
        
        // Проверка типа файла
        const allowedTypes = ['application/json', 'text/plain'];
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(json|txt)$/)) {
            window.iceqBase.showToast('Поддерживаются только JSON и TXT файлы', 'error');
            return;
        }
        
        try {
            const content = await file.text();
            let testData;
            
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                testData = JSON.parse(content);
            } else {
                // Простой парсинг TXT файла
                testData = this.parseTxtFile(content);
            }
            
            // Валидация структуры теста
            if (!this.validateTestData(testData)) {
                throw new Error('Неверный формат файла теста');
            }
            
            this.questions = testData.questions || testData;
            this.showFileInfo(file);
            this.validateInput();
            
        } catch (error) {
            window.iceqBase.showToast('Ошибка чтения файла: ' + error.message, 'error');
        }
    }
    
    parseTxtFile(content) {
        // Простой парсер TXT файла
        const lines = content.split('\n').filter(line => line.trim());
        const questions = [];
        let currentQuestion = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.match(/^\d+\./)) {
                // Новый вопрос
                if (currentQuestion) {
                    questions.push(currentQuestion);
                }
                currentQuestion = {
                    question: trimmed.replace(/^\d+\.\s*/, ''),
                    answers: []
                };
            } else if (trimmed.match(/^[а-я]\)|^[a-z]\)/i)) {
                // Вариант ответа
                if (currentQuestion) {
                    const isCorrect = trimmed.includes('*') || trimmed.includes('+');
                    currentQuestion.answers.push({
                        answer: trimmed.replace(/^[а-я]\)\s*|^[a-z]\)\s*/i, '').replace(/[\*\+]/g, ''),
                        correct: isCorrect
                    });
                }
            }
        }
        
        if (currentQuestion) {
            questions.push(currentQuestion);
        }
        
        return { questions };
    }
    
    validateTestData(data) {
        // Проверка структуры данных теста
        const questions = data.questions || data;
        
        if (!Array.isArray(questions) || questions.length === 0) {
            return false;
        }
        
        return questions.every(q => 
            q.question && 
            Array.isArray(q.answers) && 
            q.answers.length > 0 &&
            q.answers.some(a => a.correct || a.is_correct)
        );
    }
    
    showFileInfo(file) {
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-size').textContent = window.iceqBase.formatFileSize(file.size);
        this.fileInfo.style.display = 'block';
    }
    
    removeFile() {
        this.fileUpload.value = '';
        this.fileInfo.style.display = 'none';
        this.questions = [];
        this.validateInput();
    }
    
    validateInput() {
        const currentTab = document.querySelector('.tab-btn.active').dataset.tab;
        let isValid = false;
        
        if (currentTab === 'file') {
            isValid = this.questions.length > 0;
        } else if (currentTab === 'id') {
            isValid = this.testIdInput.value.trim().length > 0;
        }
        
        this.loadTestBtn.disabled = !isValid;
    }
    
    async loadTest() {
        const currentTab = document.querySelector('.tab-btn.active').dataset.tab;
        
        try {
            if (currentTab === 'file') {
                // Файл уже загружен
                this.startTest();
            } else {
                // Загрузка по ID
                const testId = this.testIdInput.value.trim();
                const response = await window.iceqBase.fetchAPI(`/test/${testId}`);
                
                if (response.status === 'success') {
                    this.questions = response.questions;
                    this.testId = testId;
                    this.startTest();
                } else {
                    throw new Error(response.message || 'Тест не найден');
                }
            }
        } catch (error) {
            window.iceqBase.showToast(error.message, 'error');
        }
    }
    
    startTest() {
        this.currentScreen = 'test';
        this.uploadScreen.style.display = 'none';
        this.testScreen.style.display = 'block';
        
        // Инициализация состояния теста
        this.currentQuestionIndex = 0;
        this.userAnswers = new Array(this.questions.length).fill(null);
        this.timeStarted = new Date();
        
        // Блокируем возможность перезагрузить страницу случайно
        window.onbeforeunload = () => {
            return 'Вы уверены, что хотите покинуть страницу? Прогресс прохождения теста будет утерян.';
        };
        
        // Создание индикаторов вопросов
        this.createQuestionDots();
        
        // Отображение первого вопроса
        this.renderQuestion();
        
        // Запуск таймера
        this.startTimer();
    }
    
    createQuestionDots() {
        this.questionDots.innerHTML = '';
        
        for (let i = 0; i < this.questions.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'question-dot';
            dot.dataset.index = i;
            dot.title = `Вопрос ${i + 1}`;
            
            if (i === 0) {
                dot.classList.add('current');
            }
            
            dot.addEventListener('click', () => this.goToQuestion(i));
            this.questionDots.appendChild(dot);
        }
    }
    
    startTimer() {
        let seconds = 0;
        
        this.timerInterval = setInterval(() => {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            
            this.testTimer.textContent = 
                `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    renderQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        
        // Обновление прогресса
        const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = `Вопрос ${this.currentQuestionIndex + 1} из ${this.questions.length}`;
        
        // Обновление индикаторов
        document.querySelectorAll('.question-dot').forEach((dot, index) => {
            dot.classList.remove('current');
            dot.classList.toggle('answered', this.userAnswers[index] !== null);
            
            if (index === this.currentQuestionIndex) {
                dot.classList.add('current');
            }
        });
        
        // Отображение вопроса
        this.questionContainer.innerHTML = `
            <div class="question">
                <h3>${question.question}</h3>
                <div class="answers">
                    ${question.answers.map((answer, index) => `
                        <div class="answer-option ${this.userAnswers[this.currentQuestionIndex] === answer.answer ? 'selected' : ''}"
                             data-answer="${answer.answer}">
                            ${answer.answer}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Обновление кнопок навигации
        this.prevBtn.disabled = this.currentQuestionIndex === 0;
        this.nextBtn.disabled = this.currentQuestionIndex === this.questions.length - 1;
        this.finishBtn.style.display = this.currentQuestionIndex === this.questions.length - 1 ? 'block' : 'none';
    }
    
    selectAnswer(answer) {
        this.userAnswers[this.currentQuestionIndex] = answer;
        this.renderQuestion();
    }
    
    goToQuestion(index) {
        this.currentQuestionIndex = index;
        this.renderQuestion();
    }
    
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.renderQuestion();
        }
    }
    
    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.renderQuestion();
        }
    }
    
    async finishTest() {
        // Проверка неотвеченных вопросов
        const unanswered = this.userAnswers.filter(answer => answer === null).length;
            
            if (unanswered > 0) {
            const confirm = await this.showConfirmDialog(
                `У вас ${unanswered} неотвеченных вопросов. Завершить тест?`
            );
            if (!confirm) return;
        }
        
        // Остановка таймера
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Вычисление результатов
        this.calculateResults();
    }
    
    calculateResults() {
        const totalSeconds = Math.round((new Date() - this.timeStarted) / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        const results = {
            total_questions: this.questions.length,
            correct_answers: 0,
            results: [],
            time_spent_seconds: totalSeconds,
            time_spent_formatted: `${minutes} мин ${seconds} сек`
        };
        
        this.questions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index];
            const correctAnswer = question.answers.find(a => a.correct || a.is_correct);
            const isCorrect = userAnswer === correctAnswer?.answer;
            
            if (isCorrect) {
                results.correct_answers++;
            }
            
            results.results.push({
                question: question.question,
                user_answer: userAnswer,
                correct_answer: correctAnswer?.answer,
                is_correct: isCorrect,
                explanation: question.explanation || correctAnswer?.explanation
            });
        });
        
        results.score_percentage = Math.round((results.correct_answers / results.total_questions) * 100);
        
        this.showResults(results);
    }
    
    showResults(results) {
        this.currentScreen = 'results';
        this.testScreen.style.display = 'none';
        this.resultsScreen.style.display = 'block';
        
        const resultsHtml = `
            <div class="test-results">
                <h2>🎉 Результаты теста</h2>
                
                <div class="results-summary">
                    <div class="result-item">
                        <span class="label">Правильных ответов:</span>
                        <span class="value">${results.correct_answers} из ${results.total_questions}</span>
                    </div>
                    <div class="result-item">
                        <span class="label">Процент выполнения:</span>
                        <span class="value">${results.score_percentage}%</span>
                    </div>
                    <div class="result-item">
                        <span class="label">Затраченное время: </span>
                        <span class="value">${results.time_spent_formatted}</span>
                    </div>
                </div>

                <div class="results-details">
                    <h3>Детальный разбор</h3>
                    ${results.results.map((result, index) => `
                        <div class="question-result ${result.is_correct ? 'correct' : 'incorrect'}">
                            <div class="question-text">
                                <span class="question-number">${index + 1}.</span>
                                ${result.question}
                            </div>
                            <div class="answer-details">
                                <div class="user-answer">
                                    Ваш ответ: ${result.user_answer || 'Не отвечено'}
                                </div>
                                <div class="correct-answer">
                                    Правильный ответ: ${result.correct_answer}
                                </div>
                                ${result.explanation ? `
                                    <div class="explanation">
                                        <strong>Объяснение:</strong> ${result.explanation}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="results-actions">
                    <button onclick="window.location.href='/'" class="btn primary-btn">
                        На главную
                    </button>
                    <button onclick="window.takeTestPage.retakeTest()" class="btn secondary-btn">
                        Пройти заново
                    </button>
                    <div class="download-dropdown">
                        <button class="btn secondary-btn dropdown-btn" id="download-btn">
                            📥 Скачать результаты
                        </button>
                        <div class="dropdown-menu" id="download-menu">
                            <button onclick="window.takeTestPage.downloadResults('json')" class="dropdown-item">
                                📄 JSON файл
                            </button>
                            <button onclick="window.takeTestPage.downloadResults('txt')" class="dropdown-item">
                                📝 TXT файл
                            </button>
                            <button onclick="window.takeTestPage.downloadResults('csv')" class="dropdown-item">
                                📊 CSV файл
                            </button>
                        </div>
                    </div>
                    <button onclick="window.print()" class="btn secondary-btn">
                        🖨️ Печать
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('results-content').innerHTML = resultsHtml;
        
        // Снимаем блокировку перезагрузки страницы
        window.onbeforeunload = null;
        
        // Инициализируем dropdown для скачивания
        this.initDownloadDropdown();
        
        // Сохранение результатов в статистику
        this.saveResults(results);
        
        // Сохраняем результаты для скачивания
        this.lastResults = results;
    }
    
    saveResults(results) {
        try {
            // Сохранение в localStorage для статистики
            const stats = JSON.parse(localStorage.getItem('iceq_user_stats')) || {};
            stats.testsCompleted = (stats.testsCompleted || 0) + 1;
            stats.averageScore = stats.averageScore ? 
                Math.round((stats.averageScore + results.score_percentage) / 2) : 
                results.score_percentage;
            
            localStorage.setItem('iceq_user_stats', JSON.stringify(stats));
        } catch (error) {
            console.warn('Не удалось сохранить статистику:', error);
        }
    }
    
    showConfirmDialog(message) {
        return new Promise((resolve) => {
            const result = confirm(message);
            resolve(result);
        });
    }
    
    goBack() {
        if (this.currentScreen === 'test') {
            if (confirm('Вы уверены, что хотите прервать тест? Прогресс будет утерян.')) {
                if (this.timerInterval) {
                    clearInterval(this.timerInterval);
                }
                window.onbeforeunload = null;
                this.testScreen.style.display = 'none';
                this.uploadScreen.style.display = 'block';
                this.currentScreen = 'upload';
            }
        } else {
            window.location.href = '/';
        }
    }
    
    /**
     * Перепрохождение того же теста
     */
    retakeTest() {
        if (confirm('Вы уверены, что хотите пройти тест заново?')) {
            // Скрываем результаты
            this.resultsScreen.style.display = 'none';
            
            // Перезапускаем тест с теми же вопросами
            this.startTest();
        }
    }
    
    /**
     * Инициализация dropdown для скачивания
     */
    initDownloadDropdown() {
        const downloadBtn = document.getElementById('download-btn');
        const downloadMenu = document.getElementById('download-menu');
        
        if (downloadBtn && downloadMenu) {
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadMenu.classList.toggle('show');
            });
            
            // Закрытие dropdown при клике вне его
            document.addEventListener('click', () => {
                downloadMenu.classList.remove('show');
            });
        }
    }
    
    /**
     * Скачивание результатов в различных форматах
     */
    downloadResults(format) {
        if (!this.lastResults) {
            window.iceqBase.showToast('Результаты не найдены', 'error');
            return;
        }
        
        const results = this.lastResults;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        let content, filename, mimeType;
        
        switch (format) {
            case 'json':
                content = JSON.stringify({
                    test_title: 'Результаты теста ICEQ',
                    completed_at: new Date().toISOString(),
                    summary: {
                        total_questions: results.total_questions,
                        correct_answers: results.correct_answers,
                        score_percentage: results.score_percentage,
                        time_spent_seconds: results.time_spent_seconds,
                        time_spent_formatted: results.time_spent_formatted
                    },
                    questions: this.questions,
                    user_answers: this.userAnswers,
                    detailed_results: results.results
                }, null, 2);
                filename = `test_results_${timestamp}.json`;
                mimeType = 'application/json';
                break;
                
            case 'txt':
                content = this.generateTxtReport(results);
                filename = `test_results_${timestamp}.txt`;
                mimeType = 'text/plain';
                break;
                
            case 'csv':
                content = this.generateCsvReport(results);
                filename = `test_results_${timestamp}.csv`;
                mimeType = 'text/csv';
                break;
                
            default:
                window.iceqBase.showToast('Неподдерживаемый формат', 'error');
                return;
        }
        
        // Создание и скачивание файла
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.iceqBase.showToast(`Файл ${filename} скачан`, 'success');
    }
    
    /**
     * Генерация отчета в TXT формате
     */
    generateTxtReport(results) {
        let report = '='.repeat(60) + '\n';
        report += '           РЕЗУЛЬТАТЫ ТЕСТА ICEQ\n';
        report += '='.repeat(60) + '\n\n';
        
        report += `Дата прохождения: ${new Date().toLocaleString('ru-RU')}\n`;
        report += `Общее количество вопросов: ${results.total_questions}\n`;
        report += `Правильных ответов: ${results.correct_answers}\n`;
        report += `Процент выполнения: ${results.score_percentage}%\n`;
        report += `Затраченное время: ${results.time_spent_formatted}\n\n`;
        
        report += 'ДЕТАЛЬНЫЙ РАЗБОР:\n';
        report += '-'.repeat(40) + '\n\n';
        
        results.results.forEach((result, index) => {
            report += `${index + 1}. ${result.question}\n`;
            report += `   Ваш ответ: ${result.user_answer || 'Не отвечено'}\n`;
            report += `   Правильный ответ: ${result.correct_answer}\n`;
            report += `   Результат: ${result.is_correct ? '✓ Правильно' : '✗ Неправильно'}\n`;
            if (result.explanation) {
                report += `   Объяснение: ${result.explanation}\n`;
            }
            report += '\n';
        });
        
        return report;
    }
    
    /**
     * Генерация отчета в CSV формате
     */
    generateCsvReport(results) {
        let csv = 'Номер,Вопрос,Ваш ответ,Правильный ответ,Результат,Объяснение\n';
        
        results.results.forEach((result, index) => {
            const question = `"${result.question.replace(/"/g, '""')}"`;
            const userAnswer = `"${(result.user_answer || 'Не отвечено').replace(/"/g, '""')}"`;
            const correctAnswer = `"${result.correct_answer.replace(/"/g, '""')}"`;
            const isCorrect = result.is_correct ? 'Правильно' : 'Неправильно';
            const explanation = `"${(result.explanation || '').replace(/"/g, '""')}"`;
            
            csv += `${index + 1},${question},${userAnswer},${correctAnswer},${isCorrect},${explanation}\n`;
        });
        
        return csv;
    }
}

// Инициализация страницы при загрузке
window.addEventListener('DOMContentLoaded', () => {
    window.takeTestPage = new TakeTestPage();
});