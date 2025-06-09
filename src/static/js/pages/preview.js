/**
 * ICEQ (2025) - Страница предпросмотра теста
 */

class PreviewTestPage {
    constructor() {
        this.testData = null;
        this.isPreviewVisible = false;
        
        this.init();
    }
    
    init() {
        console.log('🏗️ [PREVIEW] Инициализация страницы предпросмотра...');
        
        this.initElements();
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
        this.togglePreviewBtn = document.getElementById('toggle-preview-btn');
        this.editTestBtn = document.getElementById('edit-test-btn');
        this.exportTestBtn = document.getElementById('export-test-btn');
        this.createNewBtn = document.getElementById('create-new-btn');
        
        // Элементы предпросмотра
        this.questionsPreview = document.getElementById('questions-preview');
        this.hidePreviewBtn = document.getElementById('hide-preview-btn');
        this.questionsList = document.getElementById('questions-list');
        this.collapseAllBtn = document.getElementById('collapse-all-btn');
        this.expandAllBtn = document.getElementById('expand-all-btn');
        

        
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
        
        if (this.togglePreviewBtn) {
            this.togglePreviewBtn.addEventListener('click', () => this.togglePreview());
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
        
        // Предпросмотр
        if (this.hidePreviewBtn) {
            this.hidePreviewBtn.addEventListener('click', () => this.hidePreview());
        }
        
        if (this.collapseAllBtn) {
            this.collapseAllBtn.addEventListener('click', () => this.collapseAllQuestions());
        }
        
        if (this.expandAllBtn) {
            this.expandAllBtn.addEventListener('click', () => this.expandAllQuestions());
        }
        

    }
    
    togglePreview() {
        console.log('👁️ [PREVIEW] Переключение предпросмотра...');
        
        if (this.isPreviewVisible) {
            this.hidePreview();
        } else {
            this.showPreview();
        }
    }
    
    showPreview() {
        console.log('👁️ [PREVIEW] Показываем предпросмотр вопросов...');
        
        if (!this.testData || !this.testData.questions) {
            window.iceqBase.showToast('Нет данных для предпросмотра', 'error');
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
                this.isPreviewVisible = true;
                
                // Обновляем кнопку
                this.togglePreviewBtn.querySelector('.btn-text').textContent = 'Скрыть вопросы';
                this.togglePreviewBtn.querySelector('.btn-icon').textContent = '🙈';
                
                // Плавная прокрутка к предпросмотру
                this.questionsPreview.scrollIntoView({ behavior: 'smooth' });
                
                this.hideLoading();
                console.log('✅ [PREVIEW] Предпросмотр показан');
                
            } catch (error) {
                console.error('❌ [PREVIEW] Ошибка отображения предпросмотра:', error);
                this.hideLoading();
                window.iceqBase.showToast('Ошибка отображения вопросов', 'error');
            }
        }, 500); // Небольшая задержка для демонстрации загрузки
    }
    
    hidePreview() {
        console.log('🙈 [PREVIEW] Скрываем предпросмотр...');
        
        this.questionsPreview.style.display = 'none';
        this.isPreviewVisible = false;
        
        // Обновляем кнопку
        this.togglePreviewBtn.querySelector('.btn-text').textContent = 'Показать вопросы';
        this.togglePreviewBtn.querySelector('.btn-icon').textContent = '👁️';
    }
    
    createQuestionElement(question, index) {
        // Создаем в стиле оригинального ICEQ
        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';

        const heading = document.createElement('h4');
        heading.textContent = `Вопрос ${index}`;
        questionItem.appendChild(heading);

        const questionContent = document.createElement('div');
        questionContent.className = 'question-content';
        questionContent.textContent = question.question;
        questionItem.appendChild(questionContent);

        const answersList = document.createElement('ul');
        answersList.className = 'answers-list';

        question.answers.forEach(answer => {
            const answerItem = document.createElement('li');
            answerItem.className = `answer-item ${answer.is_correct ? 'correct-answer' : ''}`;

            const answerMarker = document.createElement('span');
            answerMarker.className = `answer-marker ${answer.is_correct ? 'correct-marker' : ''}`;
            answerMarker.textContent = answer.is_correct ? '✓' : '';
            answerItem.appendChild(answerMarker);

            const answerText = document.createElement('span');
            answerText.textContent = answer.answer;
            answerItem.appendChild(answerText);

            answersList.appendChild(answerItem);
        });
        questionItem.appendChild(answersList);

        if (question.explanation) {
            const explanation = document.createElement('div');
            explanation.className = 'explanation';
            explanation.textContent = `Объяснение: ${question.explanation}`;
            questionItem.appendChild(explanation);
        }

        return questionItem;
    }
    
    collapseAllQuestions() {
        document.querySelectorAll('.question-item').forEach(item => {
            item.classList.remove('expanded');
        });
    }
    
    expandAllQuestions() {
        document.querySelectorAll('.question-item').forEach(item => {
            item.classList.add('expanded');
        });
    }
    
    startTest() {
        console.log('🚀 [PREVIEW] Запуск прохождения теста...');
        
        if (!this.testData) {
            window.iceqBase.showToast('Нет данных теста для прохождения', 'error');
            return;
        }
        
        // Сохраняем данные для страницы прохождения теста
        localStorage.setItem('iceq_test_to_take', JSON.stringify(this.testData));
        
        // Переходим на страницу прохождения
        window.location.href = '/take';
    }
    
    editTest() {
        console.log('✏️ [PREVIEW] Переход к редактированию теста...');
        
        // Функция редактирования пока не реализована
        window.iceqBase.showToast('Функция редактирования в разработке', 'info');
    }
    

    
    exportTest() {
        console.log('💾 [PREVIEW] Экспорт теста в JSON...');
        
        if (!this.testData) {
            window.iceqBase.showToast('Нет данных для экспорта', 'error');
            return;
        }
        
        // Создаем JSON как в оригинале
        const testDataToExport = {
            title: 'ICEQ Тест',
            dateCreated: new Date().toISOString(),
            questions: this.testData.questions
        };

        const json = JSON.stringify(testDataToExport, null, 2);
        const blob = new Blob([json], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ICEQ-Test_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.iceqBase.showToast('Тест скачан в формате JSON!', 'success');
    }
    
    createNewTest() {
        console.log('✨ [PREVIEW] Создание нового теста...');
        
        // Очищаем сохраненные данные
        localStorage.removeItem('iceq_generated_test');
        
        // Переходим на страницу создания
        window.location.href = '/create';
    }
    
    showError(title, message) {
        // Показываем ошибку вместо контента
        document.querySelector('.preview-container').innerHTML = `
            <div class="error-container">
                <div class="error-icon">❌</div>
                <h2>${title}</h2>
                <p>${message}</p>
                <a href="/create" class="btn primary-btn">
                    <span class="btn-icon">✨</span>
                    <span class="btn-text">Создать тест</span>
                </a>
            </div>
        `;
    }
    
    showLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'flex';
        }
    }
    
    hideLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }
    }
}

// Инициализация страницы при загрузке
window.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 [GLOBAL] DOM загружен, начинаем инициализацию страницы предпросмотра...');
    
    try {
        window.previewTestPage = new PreviewTestPage();
        console.log('🎉 [GLOBAL] Страница предпросмотра инициализирована успешно!');
        
    } catch (error) {
        console.error('💥 [GLOBAL] КРИТИЧЕСКАЯ ОШИБКА при инициализации:', error);
        console.error('💥 [GLOBAL] Stack trace:', error.stack);
    }
});
