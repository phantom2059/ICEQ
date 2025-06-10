/**
 * ICEQ (2025) - Страница редактирования теста
 */

class EditTestPage {
    constructor() {
        this.testData = null;
        this.originalTestData = null;
        this.isPremium = false;
        this.hasUnsavedChanges = false;
        this.questionErrors = {};
        
        this.init();
    }
    
    init() {
        console.log('[EDIT] Initializing edit page');
        
        this.initElements();
        this.checkPremiumStatus();
        this.loadTestData();
        this.initEventListeners();
        this.setupBeforeUnloadWarning();
        
        console.log('[EDIT] Edit page initialized');
    }
    
    initElements() {
        // Элементы информации о тесте
        this.questionsCountEl = document.getElementById('questions-count');
        this.usedModelEl = document.getElementById('used-model');
        this.saveStatusEl = document.getElementById('save-status');
        
        // Кнопки действий
        this.saveTestBtn = document.getElementById('save-test-btn');
        this.previewTestBtn = document.getElementById('preview-test-btn');
        this.startTestBtn = document.getElementById('start-test-btn');
        this.addQuestionBtn = document.getElementById('add-question-btn');
        this.importQuestionBtn = document.getElementById('import-question-btn');
        
        // Кнопки панели инструментов
        this.expandAllBtn = document.getElementById('expand-all-btn');
        this.collapseAllBtn = document.getElementById('collapse-all-btn');
        this.validateAllBtn = document.getElementById('validate-all-btn');
        this.autoFixBtn = document.getElementById('auto-fix-btn');
        
        // Области редактирования
        this.questionsEditList = document.getElementById('questions-edit-list');
        
        // Модальное окно
        this.confirmModal = document.getElementById('confirm-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalMessage = document.getElementById('modal-message');
        this.modalClose = document.getElementById('modal-close');
        this.modalCancel = document.getElementById('modal-cancel');
        this.modalConfirm = document.getElementById('modal-confirm');
        
        // Индикатор загрузки
        this.loadingIndicator = document.getElementById('loading-indicator');
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
            } else {
                this.isPremium = false;
            }
        } catch (error) {
            console.error('[EDIT] Premium status check error:', error);
            this.isPremium = false;
        }
        
        // Проверяем доступ к редактированию
        if (!this.isPremium) {
            this.showAccessDenied();
            return;
        }
    }
    
    showAccessDenied() {
        const container = document.querySelector('.edit-container');
        container.innerHTML = `
            <div class="access-denied-container" style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px;">🔒</div>
                <h2 style="color: #1e293b; margin-bottom: 16px;">Премиум функция</h2>
                <p style="color: #64748b; margin-bottom: 32px; max-width: 400px; margin-left: auto; margin-right: auto;">
                    Редактирование вопросов доступно только пользователям с премиум подпиской.
                </p>
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <button class="btn action-btn" onclick="window.location.href='/preview'">
                        <span class="btn-icon">👁️</span>
                        <span class="btn-text">Вернуться к предпросмотру</span>
                    </button>
                    <button class="btn tertiary-btn" onclick="window.location.href='/create'">
                        <span class="btn-icon">✨</span>
                        <span class="btn-text">Создать новый тест</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    loadTestData() {
        console.log('[EDIT] Loading test data');
        
        try {
            // Сначала пробуем загрузить данные для редактирования
            let savedData = localStorage.getItem('iceq_test_for_edit');
            if (!savedData) {
                // Если нет специальных данных для редактирования, берем общие
                savedData = localStorage.getItem('iceq_generated_test');
            }
            
            if (!savedData) {
                console.error('[EDIT] No test data found');
                this.showError('Данные теста не найдены', 'Вернитесь к созданию теста');
                return;
            }
            
            this.testData = JSON.parse(savedData);
            this.originalTestData = JSON.parse(JSON.stringify(this.testData)); // Deep copy
            console.log('[EDIT] Test data loaded, questions:', this.testData.questions.length);
            
            this.fillTestInfo();
            this.renderQuestions();
            this.updateSaveStatus(false);
            
        } catch (error) {
            console.error('[EDIT] Data loading error:', error);
            this.showError('Ошибка загрузки данных', 'Попробуйте создать тест заново');
        }
    }
    
    fillTestInfo() {
        if (!this.testData || !this.testData.questions) {
            console.error('[EDIT] Invalid test data');
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
    }
    
    initEventListeners() {
        // Основные кнопки действий
        if (this.saveTestBtn) {
            this.saveTestBtn.addEventListener('click', () => this.saveTestAndReturn());
        }
        
        if (this.previewTestBtn) {
            this.previewTestBtn.addEventListener('click', () => this.goToPreview());
        }
        
        if (this.addQuestionBtn) {
            this.addQuestionBtn.addEventListener('click', () => this.addNewQuestion());
        }
        
        if (this.importQuestionBtn) {
            this.importQuestionBtn.addEventListener('click', () => this.importQuestions());
        }
        
        // Кнопки панели инструментов
        if (this.expandAllBtn) {
            this.expandAllBtn.addEventListener('click', () => this.expandAllQuestions());
        }
        
        if (this.collapseAllBtn) {
            this.collapseAllBtn.addEventListener('click', () => this.collapseAllQuestions());
        }
        
        // Модальное окно
        if (this.modalClose) {
            this.modalClose.addEventListener('click', () => this.hideModal());
        }
        
        if (this.modalCancel) {
            this.modalCancel.addEventListener('click', () => this.hideModal());
        }
        
        // Закрытие модального окна по клику вне его
        if (this.confirmModal) {
            this.confirmModal.addEventListener('click', (e) => {
                if (e.target === this.confirmModal) {
                    this.hideModal();
                }
            });
        }
    }
    
    setupBeforeUnloadWarning() {
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?';
                return e.returnValue;
            }
        });
    }
    
    renderQuestions() {
        if (!this.testData || !this.testData.questions) {
            console.error('[EDIT] No questions data to render');
            return;
        }
        
        this.questionsEditList.innerHTML = '';
        
        this.testData.questions.forEach((question, index) => {
            const questionElement = this.createQuestionEditElement(question, index);
            this.questionsEditList.appendChild(questionElement);
        });
        
        console.log('[EDIT] Rendered', this.testData.questions.length, 'questions');
    }
    
    createQuestionEditElement(question, index) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-edit-item';
        questionDiv.dataset.questionIndex = index;
        
        // Заголовок с управлением
        const header = document.createElement('div');
        header.className = 'question-header';
        header.onclick = () => this.toggleQuestion(index);
        
        const questionNumber = document.createElement('div');
        questionNumber.className = 'question-number';
        questionNumber.textContent = `Вопрос ${index + 1}`;
        
        const controls = document.createElement('div');
        controls.className = 'question-controls';
        
        const expandIcon = document.createElement('span');
        expandIcon.className = 'expand-icon';
        expandIcon.innerHTML = '▼';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'control-btn delete';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Удалить вопрос';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.deleteQuestion(index);
        };
        
        const duplicateBtn = document.createElement('button');
        duplicateBtn.className = 'control-btn';
        duplicateBtn.innerHTML = '📋';
        duplicateBtn.title = 'Дублировать вопрос';
        duplicateBtn.onclick = (e) => {
            e.stopPropagation();
            this.duplicateQuestion(index);
        };
        
        controls.appendChild(duplicateBtn);
        controls.appendChild(deleteBtn);
        controls.appendChild(expandIcon);
        
        header.appendChild(questionNumber);
        header.appendChild(controls);
        
        // Контент для редактирования
        const content = document.createElement('div');
        content.className = 'question-content';
        
        // Ошибки валидации
        const errorsDiv = document.createElement('div');
        errorsDiv.className = 'question-errors';
        errorsDiv.style.display = 'none';
        content.appendChild(errorsDiv);
        
        // Поле для вопроса
        const questionField = document.createElement('div');
        questionField.className = 'edit-field question-text-field';
        
        const questionLabel = document.createElement('label');
        questionLabel.textContent = 'Текст вопроса';
        
        const questionTextarea = document.createElement('textarea');
        questionTextarea.value = question.question || '';
        questionTextarea.placeholder = 'Введите текст вопроса...';
        questionTextarea.addEventListener('input', () => {
            this.updateQuestion(index, 'question', questionTextarea.value);
        });
        
        questionField.appendChild(questionLabel);
        questionField.appendChild(questionTextarea);
        content.appendChild(questionField);
        
        // Поле для ответов
        const answersField = document.createElement('div');
        answersField.className = 'answers-edit';
        
        const answersLabel = document.createElement('label');
        answersLabel.textContent = 'Варианты ответов';
        answersField.appendChild(answersLabel);
        
        const answersContainer = document.createElement('div');
        answersContainer.className = 'answers-container';
        
        // Добавляем существующие ответы
        question.answers.forEach((answer, answerIndex) => {
            const answerElement = this.createAnswerEditElement(answer, index, answerIndex);
            answersContainer.appendChild(answerElement);
        });
        
        // Кнопка добавления ответа
        const addAnswerBtn = document.createElement('button');
        addAnswerBtn.className = 'add-answer-btn';
        addAnswerBtn.innerHTML = '➕ Добавить вариант ответа';
        addAnswerBtn.onclick = () => this.addAnswer(index);
        
        answersField.appendChild(answersContainer);
        answersField.appendChild(addAnswerBtn);
        content.appendChild(answersField);
        
        // Поле для объяснения
        const explanationField = document.createElement('div');
        explanationField.className = 'edit-field explanation-field';
        
        const explanationLabel = document.createElement('label');
        explanationLabel.textContent = 'Объяснение (необязательно)';
        
        const explanationTextarea = document.createElement('textarea');
        explanationTextarea.value = question.explanation || '';
        explanationTextarea.placeholder = 'Добавьте объяснение правильного ответа...';
        explanationTextarea.addEventListener('input', () => {
            this.updateQuestion(index, 'explanation', explanationTextarea.value);
        });
        
        explanationField.appendChild(explanationLabel);
        explanationField.appendChild(explanationTextarea);
        content.appendChild(explanationField);
        
        questionDiv.appendChild(header);
        questionDiv.appendChild(content);
        
        return questionDiv;
    }
    
    createAnswerEditElement(answer, questionIndex, answerIndex) {
        const answerDiv = document.createElement('div');
        answerDiv.className = 'answer-item';
        answerDiv.dataset.answerIndex = answerIndex;
        
        if (answer.correct || answer.is_correct) {
            answerDiv.classList.add('correct');
        }
        
        // Маркер ответа
        const marker = document.createElement('div');
        marker.className = 'answer-marker';
        marker.textContent = String.fromCharCode(65 + answerIndex); // A, B, C, D
        
        // Поле ввода ответа
        const input = document.createElement('input');
        input.className = 'answer-input';
        input.type = 'text';
        input.value = answer.text || answer.answer || '';
        input.placeholder = `Вариант ${marker.textContent}`;
        input.addEventListener('input', () => {
            this.updateAnswer(questionIndex, answerIndex, 'text', input.value);
        });
        
        // Переключатель правильности
        const correctToggle = document.createElement('button');
        correctToggle.className = 'correct-toggle';
        correctToggle.type = 'button';
        if (answer.correct || answer.is_correct) {
            correctToggle.classList.add('active');
        }
        correctToggle.onclick = () => {
            this.toggleCorrectAnswer(questionIndex, answerIndex);
        };
        
        // Кнопка удаления
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'answer-delete';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Удалить вариант';
        deleteBtn.onclick = () => {
            this.deleteAnswer(questionIndex, answerIndex);
        };
        
        answerDiv.appendChild(marker);
        answerDiv.appendChild(input);
        answerDiv.appendChild(correctToggle);
        answerDiv.appendChild(deleteBtn);
        
        return answerDiv;
    }
    
    // Методы управления вопросами
    toggleQuestion(index) {
        const questionElement = this.questionsEditList.children[index];
        questionElement.classList.toggle('expanded');
    }
    
    expandAllQuestions() {
        const questions = this.questionsEditList.querySelectorAll('.question-edit-item');
        questions.forEach(q => q.classList.add('expanded'));
    }
    
    collapseAllQuestions() {
        const questions = this.questionsEditList.querySelectorAll('.question-edit-item');
        questions.forEach(q => q.classList.remove('expanded'));
    }
    
    addNewQuestion() {
        const newQuestion = {
            question: '',
            answers: [
                { text: '', correct: true },
                { text: '', correct: false },
                { text: '', correct: false },
                { text: '', correct: false }
            ],
            explanation: ''
        };
        
        this.testData.questions.push(newQuestion);
        this.markAsUnsaved();
        this.updateQuestionCount();
        this.renderQuestions();
        
        // Автоматически раскрываем новый вопрос и скроллим к нему
        const newIndex = this.testData.questions.length - 1;
        setTimeout(() => {
            this.toggleQuestion(newIndex);
            const questionElement = this.questionsEditList.children[newIndex];
            questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        
        if (window.iceqBase) {
            window.iceqBase.showToast('Новый вопрос добавлен', 'success');
        }
    }
    
    deleteQuestion(index) {
        this.showModal(
            'Удалить вопрос?',
            `Вы уверены, что хотите удалить вопрос ${index + 1}? Это действие нельзя отменить.`,
            () => {
                this.testData.questions.splice(index, 1);
                this.markAsUnsaved();
                this.updateQuestionCount();
                this.renderQuestions();
                
                if (window.iceqBase) {
                    window.iceqBase.showToast('Вопрос удален', 'info');
                }
            }
        );
    }
    
    duplicateQuestion(index) {
        const originalQuestion = this.testData.questions[index];
        const duplicatedQuestion = JSON.parse(JSON.stringify(originalQuestion));
        
        this.testData.questions.splice(index + 1, 0, duplicatedQuestion);
        this.markAsUnsaved();
        this.updateQuestionCount();
        this.renderQuestions();
        
        if (window.iceqBase) {
            window.iceqBase.showToast('Вопрос продублирован', 'success');
        }
    }
    
    updateQuestion(index, field, value) {
        this.testData.questions[index][field] = value;
        this.markAsUnsaved();
        
        // Очищаем ошибки для этого вопроса
        if (this.questionErrors[index]) {
            delete this.questionErrors[index];
            this.updateQuestionErrorDisplay(index);
        }
    }
    
    // Методы управления ответами
    addAnswer(questionIndex) {
        const question = this.testData.questions[questionIndex];
        if (question.answers.length >= 6) {
            if (window.iceqBase) {
                window.iceqBase.showToast('Максимум 6 вариантов ответа', 'warning');
            }
            return;
        }
        
        question.answers.push({
            text: '',
            correct: false
        });
        
        this.markAsUnsaved();
        this.renderQuestions();
        
        // Раскрываем вопрос если он был свернут
        const questionElement = this.questionsEditList.children[questionIndex];
        if (!questionElement.classList.contains('expanded')) {
            questionElement.classList.add('expanded');
        }
    }
    
    deleteAnswer(questionIndex, answerIndex) {
        const question = this.testData.questions[questionIndex];
        
        if (question.answers.length <= 2) {
            if (window.iceqBase) {
                window.iceqBase.showToast('Минимум 2 варианта ответа', 'warning');
            }
            return;
        }
        
        question.answers.splice(answerIndex, 1);
        this.markAsUnsaved();
        this.renderQuestions();
    }
    
    updateAnswer(questionIndex, answerIndex, field, value) {
        this.testData.questions[questionIndex].answers[answerIndex][field] = value;
        this.markAsUnsaved();
    }
    
    toggleCorrectAnswer(questionIndex, answerIndex) {
        const question = this.testData.questions[questionIndex];
        const answer = question.answers[answerIndex];
        
        // Если делаем ответ правильным, сначала делаем все остальные неправильными
        if (!answer.correct && !answer.is_correct) {
            question.answers.forEach(a => {
                a.correct = false;
                a.is_correct = false;
            });
        }
        
        // Переключаем текущий ответ
        answer.correct = !answer.correct;
        answer.is_correct = answer.correct;
        
        this.markAsUnsaved();
        this.renderQuestions();
    }
    
    // Валидация
    validateAllQuestions() {
        console.log('🔍 [EDIT] Валидация всех вопросов...');
        
        this.questionErrors = {};
        let hasErrors = false;
        
        this.testData.questions.forEach((question, index) => {
            const errors = this.validateQuestion(question, index);
            if (errors.length > 0) {
                this.questionErrors[index] = errors;
                hasErrors = true;
            }
        });
        
        // Обновляем отображение ошибок
        this.updateAllQuestionErrorDisplays();
        
        if (hasErrors) {
            if (window.iceqBase) {
                window.iceqBase.showToast('Найдены ошибки в вопросах', 'error');
            }
        } else {
            if (window.iceqBase) {
                window.iceqBase.showToast('Все вопросы корректны', 'success');
            }
        }
        
        console.log('✅ [EDIT] Валидация завершена');
        return !hasErrors;
    }
    
    validateQuestion(question, index) {
        const errors = [];
        
        // Проверка текста вопроса
        if (!question.question || question.question.trim().length < 10) {
            errors.push('Текст вопроса должен содержать минимум 10 символов');
        }
        
        // Проверка ответов
        if (!question.answers || question.answers.length < 2) {
            errors.push('Должно быть минимум 2 варианта ответа');
        } else {
            // Проверка на пустые ответы
            const emptyAnswers = question.answers.filter(a => !a.text || a.text.trim().length === 0);
            if (emptyAnswers.length > 0) {
                errors.push('Все варианты ответов должны быть заполнены');
            }
            
            // Проверка правильного ответа
            const correctAnswers = question.answers.filter(a => a.correct || a.is_correct);
            if (correctAnswers.length === 0) {
                errors.push('Должен быть выбран хотя бы один правильный ответ');
            } else if (correctAnswers.length > 1) {
                errors.push('Должен быть выбран только один правильный ответ');
            }
            
            // Проверка на дублирующиеся ответы
            const answerTexts = question.answers.map(a => a.text.trim().toLowerCase());
            const uniqueTexts = [...new Set(answerTexts)];
            if (answerTexts.length !== uniqueTexts.length) {
                errors.push('Варианты ответов не должны дублироваться');
            }
        }
        
        return errors;
    }
    
    updateAllQuestionErrorDisplays() {
        this.testData.questions.forEach((_, index) => {
            this.updateQuestionErrorDisplay(index);
        });
    }
    
    updateQuestionErrorDisplay(index) {
        const questionElement = this.questionsEditList.children[index];
        if (!questionElement) return;
        
        const errorsDiv = questionElement.querySelector('.question-errors');
        const errors = this.questionErrors[index];
        
        if (errors && errors.length > 0) {
            questionElement.classList.add('has-errors');
            errorsDiv.style.display = 'block';
            errorsDiv.innerHTML = `
                <h4>Ошибки в вопросе:</h4>
                <ul>
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            `;
        } else {
            questionElement.classList.remove('has-errors');
            errorsDiv.style.display = 'none';
        }
    }
    
    autoFixQuestions() {
        console.log('🔧 [EDIT] Автоисправление вопросов...');
        
        let fixedCount = 0;
        
        this.testData.questions.forEach((question, index) => {
            let wasFixed = false;
            
            // Исправляем отсутствие правильного ответа
            const correctAnswers = question.answers.filter(a => a.correct || a.is_correct);
            if (correctAnswers.length === 0 && question.answers.length > 0) {
                question.answers[0].correct = true;
                question.answers[0].is_correct = true;
                wasFixed = true;
            }
            
            // Исправляем множественные правильные ответы
            if (correctAnswers.length > 1) {
                question.answers.forEach((a, i) => {
                    a.correct = i === 0 && (a.correct || a.is_correct);
                    a.is_correct = a.correct;
                });
                wasFixed = true;
            }
            
            // Добавляем недостающие ответы
            while (question.answers.length < 2) {
                question.answers.push({
                    text: `Вариант ${question.answers.length + 1}`,
                    correct: false
                });
                wasFixed = true;
            }
            
            if (wasFixed) {
                fixedCount++;
            }
        });
        
        if (fixedCount > 0) {
            this.markAsUnsaved();
            this.renderQuestions();
            
            if (window.iceqBase) {
                window.iceqBase.showToast(`Исправлено ${fixedCount} вопросов`, 'success');
            }
        } else {
            if (window.iceqBase) {
                window.iceqBase.showToast('Исправления не требуются', 'info');
            }
        }
        
        console.log('✅ [EDIT] Автоисправление завершено');
    }
    
    // Сохранение и навигация
    saveTestAndReturn() {
        console.log('[EDIT] Saving test and returning to preview');
        
        // Простая валидация
        if (!this.testData || !this.testData.questions || this.testData.questions.length === 0) {
            if (window.iceqBase) {
                window.iceqBase.showToast('Нет вопросов для сохранения', 'error');
            }
            return;
        }
        
        this.showLoading();
        
        try {
            // Обновляем время изменения
            this.testData.modifiedAt = new Date().toISOString();
            
            // Сохраняем в localStorage
            localStorage.setItem('iceq_generated_test', JSON.stringify(this.testData));
            localStorage.setItem('iceq_current_test', JSON.stringify(this.testData));
            localStorage.setItem('iceq_test_for_edit', JSON.stringify(this.testData));
            
            if (window.iceqBase) {
                window.iceqBase.showToast('Изменения сохранены', 'success');
            }
            
            console.log('[EDIT] Test saved successfully');
            
            // Перенаправляем обратно к предпросмотру
            setTimeout(() => {
                window.location.href = '/preview';
            }, 500);
            
        } catch (error) {
            console.error('[EDIT] Save error:', error);
            if (window.iceqBase) {
                window.iceqBase.showToast('Ошибка сохранения', 'error');
            }
            this.hideLoading();
        }
    }
    
    goToPreview() {
        if (this.hasUnsavedChanges) {
            this.showModal(
                'Несохраненные изменения',
                'У вас есть несохраненные изменения. Сохранить перед переходом к предпросмотру?',
                () => {
                    this.saveTest();
                    setTimeout(() => {
                        window.location.href = '/preview';
                    }, 500);
                },
                () => {
                    window.location.href = '/preview';
                }
            );
        } else {
            window.location.href = '/preview';
        }
    }
    
    startTest() {
        if (this.hasUnsavedChanges) {
            this.showModal(
                'Несохраненные изменения',
                'У вас есть несохраненные изменения. Сохранить перед запуском теста?',
                () => {
                    this.saveTest();
                    setTimeout(() => {
                        window.location.href = '/take';
                    }, 500);
                },
                () => {
                    window.location.href = '/take';
                }
            );
        } else {
            window.location.href = '/take';
        }
    }
    
    importQuestions() {
        // Создаем временный input для выбора файла
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImportFile(file);
            }
        };
        input.click();
    }
    
    async handleImportFile(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (importData.questions && Array.isArray(importData.questions)) {
                this.showModal(
                    'Импорт вопросов',
                    `Найдено ${importData.questions.length} вопросов. Добавить их к существующим?`,
                    () => {
                        this.testData.questions = [...this.testData.questions, ...importData.questions];
                        this.markAsUnsaved();
                        this.updateQuestionCount();
                        this.renderQuestions();
                        
                        if (window.iceqBase) {
                            window.iceqBase.showToast(`Импортировано ${importData.questions.length} вопросов`, 'success');
                        }
                    }
                );
            } else {
                throw new Error('Неверный формат файла');
            }
        } catch (error) {
            console.error('❌ [EDIT] Ошибка импорта:', error);
            if (window.iceqBase) {
                window.iceqBase.showToast('Ошибка импорта файла', 'error');
            }
        }
    }
    
    // Служебные методы
    markAsUnsaved() {
        this.hasUnsavedChanges = true;
        this.updateSaveStatus(true);
    }
    
    updateSaveStatus(hasChanges) {
        this.hasUnsavedChanges = hasChanges;
        
        if (this.saveStatusEl) {
            if (hasChanges) {
                this.saveStatusEl.textContent = 'Не сохранено';
                this.saveStatusEl.className = 'meta-value unsaved';
            } else {
                this.saveStatusEl.textContent = 'Сохранено';
                this.saveStatusEl.className = 'meta-value saved';
            }
        }
        
        if (this.saveTestBtn) {
            this.saveTestBtn.disabled = !hasChanges;
        }
    }
    
    updateQuestionCount() {
        if (this.questionsCountEl) {
            this.questionsCountEl.textContent = this.testData.questions.length;
        }
    }
    
    showModal(title, message, onConfirm, onCancel = null) {
        if (this.modalTitle) this.modalTitle.textContent = title;
        if (this.modalMessage) this.modalMessage.textContent = message;
        
        // Удаляем старые обработчики
        const newConfirmBtn = this.modalConfirm.cloneNode(true);
        this.modalConfirm.parentNode.replaceChild(newConfirmBtn, this.modalConfirm);
        this.modalConfirm = newConfirmBtn;
        
        // Добавляем новые обработчики
        this.modalConfirm.onclick = () => {
            this.hideModal();
            if (onConfirm) onConfirm();
        };
        
        if (onCancel) {
            this.modalCancel.onclick = () => {
                this.hideModal();
                onCancel();
            };
            this.modalCancel.style.display = 'inline-flex';
        } else {
            this.modalCancel.style.display = 'none';
        }
        
        if (this.confirmModal) {
            this.confirmModal.style.display = 'flex';
        }
    }
    
    hideModal() {
        if (this.confirmModal) {
            this.confirmModal.style.display = 'none';
        }
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
    
    showError(title, message) {
        console.error('[EDIT] Error:', title, message);
        
        const container = document.querySelector('.edit-container');
        container.innerHTML = `
            <div class="error-container" style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px;">😞</div>
                <h2 style="color: #1e293b; margin-bottom: 16px;">${title}</h2>
                <p style="color: #64748b; margin-bottom: 32px;">${message}</p>
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <button class="btn action-btn" onclick="window.location.href='/create'">
                        <span class="btn-icon">✨</span>
                        <span class="btn-text">Создать новый тест</span>
                    </button>
                    <button class="btn tertiary-btn" onclick="window.location.href='/preview'">
                        <span class="btn-icon">👁️</span>
                        <span class="btn-text">К предпросмотру</span>
                    </button>
                </div>
            </div>
        `;
    }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('Edit page initialized');
    new EditTestPage();
}); 