/**
 * ICEQ (2025) - Страница предпросмотра теста
 */

class PreviewTestPage {
    constructor() {
        this.testData = null;
        this.isPremium = false;
        
        this.init();
    }
    
    init() {
        console.log('🏗️ [PREVIEW] Инициализация страницы предпросмотра...');
        
        this.initElements();
        this.checkPremiumStatus();
        this.loadTestData();
        this.initEventListeners();
        
        console.log('✅ [PREVIEW] Инициализация завершена');
    }
    
    initElements() {
        // Элементы информации о тесте
        this.questionsCountEl = document.getElementById('questions-count');
        this.usedModelEl = document.getElementById('used-model');
        this.creationTimeEl = document.getElementById('creation-time');
        
        // Кнопки действий
        this.startTestBtn = document.getElementById('start-test-btn');
        this.editTestBtn = document.getElementById('edit-test-btn');
        this.exportTestBtn = document.getElementById('export-test-btn');
        this.createNewBtn = document.getElementById('create-new-btn');
        
        // Элементы предпросмотра
        this.questionsPreview = document.getElementById('questions-preview');
        this.questionsList = document.getElementById('questions-list');
        
        // Индикатор загрузки
        this.loadingIndicator = document.getElementById('loading-indicator');
    }
    
    loadTestData() {
        console.log('📊 [PREVIEW] Загрузка данных теста...');
        
        try {
            const savedData = localStorage.getItem('iceq_generated_test');
            if (!savedData) {
                console.error('❌ [PREVIEW] Нет сохраненных данных теста');
                this.showError('Данные теста не найдены', 'Вернитесь к созданию теста');
                return;
            }
            
            this.testData = JSON.parse(savedData);
            console.log('✅ [PREVIEW] Данные теста загружены:', this.testData);
            
            this.fillTestInfo();
            this.showPreview(); // Сразу показываем предпросмотр
            
        } catch (error) {
            console.error('❌ [PREVIEW] Ошибка загрузки данных:', error);
            this.showError('Ошибка загрузки данных', 'Попробуйте создать тест заново');
        }
    }
    
    fillTestInfo() {
        console.log('📝 [PREVIEW] Заполнение информации о тесте...');
        
        if (!this.testData || !this.testData.questions) {
            console.error('❌ [PREVIEW] Некорректные данные теста');
            return;
        }
        
        // Количество вопросов
        if (this.questionsCountEl) {
            this.questionsCountEl.textContent = this.testData.questions.length;
        }
        
        // Модель
        if (this.usedModelEl && this.testData.settings) {
            const modelNames = {
                'deepseek': 'DeepSeek',
                'qwen': 'Qwen',
                'iceq': 'ICEQ'
            };
            this.usedModelEl.textContent = modelNames[this.testData.settings.model] || this.testData.settings.model;
        }
        
        // Время создания
        if (this.creationTimeEl) {
            const createdAt = new Date(this.testData.createdAt);
            const now = new Date();
            const diffMinutes = Math.floor((now - createdAt) / (1000 * 60));
            
            if (diffMinutes < 1) {
                this.creationTimeEl.textContent = 'Только что';
            } else if (diffMinutes < 60) {
                this.creationTimeEl.textContent = `${diffMinutes} мин назад`;
            } else {
                this.creationTimeEl.textContent = createdAt.toLocaleDateString();
            }
        }
        
        console.log('✅ [PREVIEW] Информация о тесте заполнена');
    }
    
    initEventListeners() {
        // Кнопки действий
        if (this.startTestBtn) {
            this.startTestBtn.addEventListener('click', () => this.startTest());
        }
        
        if (this.editTestBtn) {
            this.editTestBtn.addEventListener('click', () => this.editTest());
        }
        
        if (this.exportTestBtn) {
            this.exportTestBtn.addEventListener('click', () => this.exportTest());
        }
        
        if (this.createNewBtn) {
            this.createNewBtn.addEventListener('click', () => this.createNewTest());
        }
    }
    
    showPreview() {
        console.log('👁️ [PREVIEW] Показываем предпросмотр вопросов...');
        
        if (!this.testData || !this.testData.questions) {
            console.error('❌ [PREVIEW] Нет данных для предпросмотра');
            return;
        }
        
        // Показываем индикатор загрузки
        this.showLoading();
        
        setTimeout(() => {
            try {
                // Очищаем предыдущий контент
                this.questionsList.innerHTML = '';
                
                // Добавляем вопросы
                this.testData.questions.forEach((question, index) => {
                    const questionEl = this.createQuestionElement(question, index + 1);
                    this.questionsList.appendChild(questionEl);
                });
                
                // Показываем предпросмотр
                this.questionsPreview.style.display = 'block';
                
                this.hideLoading();
                console.log('✅ [PREVIEW] Предпросмотр показан');
                
            } catch (error) {
                console.error('❌ [PREVIEW] Ошибка отображения предпросмотра:', error);
                this.hideLoading();
                if (window.iceqBase) {
                    window.iceqBase.showToast('Ошибка отображения вопросов', 'error');
                }
            }
        }, 500);
    }
    
    createQuestionElement(question, index) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        
        // Заголовок вопроса
        const questionTitle = document.createElement('h4');
        questionTitle.textContent = `Вопрос ${index}`;
        questionDiv.appendChild(questionTitle);
        
        // Текст вопроса
        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.textContent = question.question;
        questionDiv.appendChild(questionText);
        
        // Список ответов
        const answersList = document.createElement('div');
        answersList.className = 'answers-list';
        
        question.answers.forEach((answer, answerIndex) => {
            const answerItem = document.createElement('div');
            answerItem.className = 'answer-item';
            
            // Проверяем правильность ответа
            if (answer.correct || answer.is_correct) {
                answerItem.classList.add('correct-answer');
            }
            
            const marker = document.createElement('span');
            marker.className = 'answer-marker';
            marker.textContent = String.fromCharCode(65 + answerIndex); // A, B, C, D
            
            const answerText = document.createElement('span');
            answerText.className = 'answer-text';
            answerText.textContent = answer.text || answer.answer;
            
            answerItem.appendChild(marker);
            answerItem.appendChild(answerText);
            answersList.appendChild(answerItem);
        });
        
        questionDiv.appendChild(answersList);
        
        // Объяснение (если есть)
        if (question.explanation) {
            const explanation = document.createElement('div');
            explanation.className = 'explanation';
            explanation.textContent = `Объяснение: ${question.explanation}`;
            questionDiv.appendChild(explanation);
        }
        
        return questionDiv;
    }
    
    startTest() {
        console.log('🚀 [PREVIEW] Запуск теста...');
        
        if (!this.testData) {
            if (window.iceqBase) {
                window.iceqBase.showToast('Данные теста не найдены', 'error');
            }
            return;
        }
        
        // Сохраняем данные в localStorage и перенаправляем на страницу прохождения теста
        try {
            localStorage.setItem('iceq_current_test', JSON.stringify(this.testData));
            window.location.href = '/take';
        } catch (error) {
            console.error('❌ [PREVIEW] Ошибка сохранения данных для теста:', error);
            if (window.iceqBase) {
                window.iceqBase.showToast('Ошибка запуска теста', 'error');
            }
        }
    }
    
    editTest() {
        console.log('✏️ [PREVIEW] Редактирование теста...');
        
        if (!this.isPremium) {
            if (window.iceqBase) {
                window.iceqBase.showToast('Редактирование вопросов доступно только с премиум подпиской', 'warning');
            }
            return;
        }
        
        // Если у пользователя премиум - открываем редактор
        this.openTestEditor();
    }
    
    exportTest() {
        console.log('📁 [PREVIEW] Экспорт теста...');
        
        if (!this.testData) {
            if (window.iceqBase) {
                window.iceqBase.showToast('Нет данных для экспорта', 'error');
            }
            return;
        }
        
        // Создаем JSON для экспорта
        const exportData = {
            title: this.testData.title || 'Тест ICEQ',
            questions: this.testData.questions,
            createdAt: this.testData.createdAt,
            settings: this.testData.settings
        };
        
        // Создаем файл для скачивания
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iceq-test-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (window.iceqBase) {
            window.iceqBase.showToast('Тест успешно экспортирован', 'success');
        }
    }
    
    createNewTest() {
        console.log('✨ [PREVIEW] Создание нового теста...');
        
        // Очищаем сохраненные данные и переходим к созданию
        localStorage.removeItem('iceq_generated_test');
        window.location.href = '/create';
    }
    
    showError(title, message) {
        console.error(`❌ [PREVIEW] ${title}: ${message}`);
        
        const container = document.querySelector('.preview-container');
        container.innerHTML = `
            <div class="error-container">
                <div class="error-icon">😞</div>
                <h2>${title}</h2>
                <p>${message}</p>
                <button class="btn primary-btn" onclick="window.location.href='/create'">
                    Создать новый тест
                </button>
            </div>
        `;
    }
    
    showLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'block';
        }
    }
    
    hideLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }
    }
    
    async checkPremiumStatus() {
        try {
            const response = await fetch('/api/premium_status', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.isPremium = data.premium_active || false;
                this.updateUIForPremiumStatus();
            } else {
                this.isPremium = false;
            }
        } catch (error) {
            console.error('❌ [PREVIEW] Ошибка проверки премиум статуса:', error);
            this.isPremium = false;
        }
    }
    
    updateUIForPremiumStatus() {
        if (this.editTestBtn) {
            if (!this.isPremium) {
                // Добавляем класс для отображения как премиум функция
                this.editTestBtn.classList.add('premium-feature');
                
                // Добавляем иконку премиума
                const icon = this.editTestBtn.querySelector('.btn-icon');
                if (icon && !icon.querySelector('.premium-indicator')) {
                    const premiumIndicator = document.createElement('span');
                    premiumIndicator.className = 'premium-indicator';
                    premiumIndicator.innerHTML = '⭐';
                    premiumIndicator.title = 'Премиум функция';
                    icon.appendChild(premiumIndicator);
                }
            }
        }
    }
    
    openTestEditor() {
        console.log('🛠️ [PREVIEW] Открытие редактора теста...');
        
        if (!this.testData) {
            if (window.iceqBase) {
                window.iceqBase.showToast('Данные теста не найдены', 'error');
            }
            return;
        }
        
        // Сохраняем данные для редактирования
        localStorage.setItem('iceq_test_for_edit', JSON.stringify(this.testData));
        
        // Перенаправляем на страницу редактирования
        window.location.href = '/edit';
    }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    new PreviewTestPage();
});
