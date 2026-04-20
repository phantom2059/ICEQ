/**
 * ICEQ (2025) - Страница создания теста
 */

// Заглушка для API если window.iceqBase не существует
if (!window.iceqBase) {
    window.iceqBase = {
        fetchAPI: async (url) => {
            console.log('Mock API call to:', url);
            if (url === '/premium/status') {
                return { premium_active: false }; // По умолчанию без премиума
            }
            return { status: 'success' };
        },
        showToast: (message, type = 'info') => {
            console.log(`[${type.toUpperCase()}] ${message}`);
            // Можно добавить простое отображение в DOM
            const existingToast = document.querySelector('.temp-toast');
            if (existingToast) existingToast.remove();
            
            const toast = document.createElement('div');
            toast.className = 'temp-toast';
            toast.style.cssText = `
                position: fixed; 
                top: 20px; 
                right: 20px; 
                background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : type === 'success' ? '#4caf50' : '#2196f3'}; 
                color: white; 
                padding: 12px 20px; 
                border-radius: 8px; 
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                max-width: 300px;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => toast.remove(), 3000);
        }
    };
    console.log('🔧 Mock iceqBase API created');
}

class CreateTestPage {
    constructor() {
        console.log('🏗️ [INIT] Создание экземпляра CreateTestPage...');
        
        this.sourceText = '';
        this.isPremium = false;
        this.isGenerating = false;
        this.maxQuestions = 10;
        this.selectedModel = 'iceq'; // По умолчанию ICEQ
        
        console.log('⚙️ [INIT] Начальные настройки:', {
            sourceText: this.sourceText,
            isPremium: this.isPremium,
            isGenerating: this.isGenerating,
            maxQuestions: this.maxQuestions,
            selectedModel: this.selectedModel
        });
        
        this.init();
    }
    
    init() {
        console.log('🚀 [INIT] Инициализация страницы создания тестов...');
        
        console.log('🔍 [INIT] Шаг 1: Поиск элементов DOM');
        this.initElements();
        
        console.log('🎯 [INIT] Шаг 2: Установка обработчиков событий');
        this.initEventListeners();
        
        console.log('🔍 [INIT] Шаг 3: Загрузка статуса премиума');
        this.loadPremiumStatus();
        
        console.log('✅ [INIT] Инициализация завершена');
    }
    
    initElements() {
        console.log('🔍 [INIT] Поиск элементов DOM...');
        
        // Элементы ввода текста
        this.textArea = document.getElementById('text-content');
        this.charCounter = document.getElementById('char-counter');
        this.fileInput = document.getElementById('file-upload');
        this.fileInfo = document.getElementById('file-info');
        
        // Элементы настроек
        this.questionsInput = document.getElementById('question-number');
        
        // Кнопки
        this.generateBtn = document.getElementById('generate-btn');
        
        // Панели
        this.estimationPanel = document.getElementById('estimation-panel');
        
        // Загрузочное окно
        this.loadingOverlay = document.getElementById('loading-overlay');
        
        // Подробное логирование найденных элементов
        console.log('📊 [INIT] Результаты поиска элементов:', {
            textArea: { found: !!this.textArea, id: 'text-content' },
            charCounter: { found: !!this.charCounter, id: 'char-counter' },
            fileInput: { found: !!this.fileInput, id: 'file-upload' },
            fileInfo: { found: !!this.fileInfo, id: 'file-info' },
            questionsInput: { found: !!this.questionsInput, id: 'question-number' },
            generateBtn: { found: !!this.generateBtn, id: 'generate-btn' },
            estimationPanel: { found: !!this.estimationPanel, id: 'estimation-panel' },
            loadingOverlay: { found: !!this.loadingOverlay, id: 'loading-overlay' }
        });
        
        // Проверяем критические элементы
        const criticalElements = [
            { name: 'textArea', element: this.textArea },
            { name: 'generateBtn', element: this.generateBtn },
            { name: 'questionsInput', element: this.questionsInput }
        ];
        
        criticalElements.forEach(({ name, element }) => {
            if (!element) {
                console.error(`❌ [INIT] КРИТИЧЕСКАЯ ОШИБКА: Элемент ${name} не найден!`);
            } else {
                console.log(`✅ [INIT] Критический элемент ${name} найден`);
            }
        });
    }
    
    initEventListeners() {
        console.log('🎯 [EVENT] Установка обработчиков событий...');
        
        // Обработчики текста
        console.log('📝 [EVENT] Настройка обработчиков текста...');
        if (this.textArea) {
            this.textArea.addEventListener('input', () => this.handleTextInput());
            console.log('✅ [EVENT] Обработчик ввода текста установлен');
        } else {
            console.log('❌ [EVENT] textArea не найден для обработчика');
        }
        
        // Обработчик загрузки файла
        console.log('📁 [EVENT] Настройка обработчиков файлов...');
        const fileUpload = document.getElementById('file-upload');
        if (fileUpload) {
            fileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
            console.log('✅ [EVENT] Обработчик загрузки файла установлен');
        } else {
            console.log('❌ [EVENT] fileUpload не найден');
        }
        
        // Обработчики drag&drop
        const dropArea = document.getElementById('drop-area');
        if (dropArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, this.preventDefaults, false);
                document.body.addEventListener(eventName, this.preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
            });

            dropArea.addEventListener('drop', (e) => this.handleDrop(e), false);
            console.log('✅ [EVENT] Обработчики drag&drop установлены');
        } else {
            console.log('❌ [EVENT] dropArea не найден');
        }
        
        // Обработчик удаления файла
        const fileRemove = document.getElementById('file-remove');
        if (fileRemove) {
            fileRemove.addEventListener('click', () => this.removeFile());
            console.log('✅ [EVENT] Обработчик удаления файла установлен');
        } else {
            console.log('❌ [EVENT] fileRemove не найден');
        }
        
        // Обработчики количества вопросов
        console.log('🔢 [EVENT] Настройка обработчиков количества вопросов...');
        const decreaseBtn = document.getElementById('decrease-questions');
        const increaseBtn = document.getElementById('increase-questions');
        
        if (decreaseBtn) {
            decreaseBtn.addEventListener('click', () => this.decreaseQuestions());
            console.log('✅ [EVENT] Обработчик уменьшения вопросов установлен');
        } else {
            console.log('❌ [EVENT] decreaseBtn не найден');
        }
        
        if (increaseBtn) {
            increaseBtn.addEventListener('click', () => this.increaseQuestions());
            console.log('✅ [EVENT] Обработчик увеличения вопросов установлен');
        } else {
            console.log('❌ [EVENT] increaseBtn не найден');
        }
        
        if (this.questionsInput) {
            this.questionsInput.addEventListener('change', () => this.validateQuestionsNumber());
            console.log('✅ [EVENT] Обработчик изменения количества вопросов установлен');
        } else {
            console.log('❌ [EVENT] questionsInput не найден');
        }
        
        // Обработчик слайдера
        const slider = document.getElementById('question-slider');
        if (slider) {
            slider.addEventListener('input', (e) => {
                this.questionsInput.value = e.target.value;
                this.validateQuestionsNumber();
            });
            console.log('✅ [EVENT] Обработчик слайдера установлен');
        } else {
            console.log('❌ [EVENT] slider не найден');
        }
        
        // Обработчики вкладок
        console.log('📋 [EVENT] Настройка обработчиков вкладок...');
        const tabBtns = document.querySelectorAll('.tab-btn');
        if (tabBtns.length > 0) {
            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
            });
            console.log(`✅ [EVENT] Обработчики вкладок установлены (${tabBtns.length} шт.)`);
        } else {
            console.log('❌ [EVENT] Кнопки вкладок не найдены');
        }
        
        // Обработчики кнопок действий
        console.log('🎯 [EVENT] Настройка обработчиков кнопок действий...');
        if (this.generateBtn) {
            this.generateBtn.addEventListener('click', () => this.startGeneration());
            console.log('✅ [EVENT] Обработчик кнопки генерации установлен');
        } else {
            console.log('❌ [EVENT] generateBtn не найден');
        }
        
        // Обработчики выбора модели
        console.log('🤖 [EVENT] Настройка обработчиков моделей...');
        const modelOptions = document.querySelectorAll('.model-option');
        if (modelOptions.length > 0) {
            modelOptions.forEach(option => {
                option.addEventListener('click', () => this.selectModel(option.dataset.model));
            });
            console.log(`✅ [EVENT] Обработчики моделей установлены (${modelOptions.length} шт.)`);
        } else {
            console.log('❌ [EVENT] Опции моделей не найдены');
        }
        
        console.log('✅ [EVENT] Все обработчики событий установлены');
    }
    
    async loadPremiumStatus() {
        console.log('🔍 [PREMIUM] Загрузка статуса премиума...');
        
        try {
            // Проверяем доступность API
            console.log('🔍 [PREMIUM] Проверка доступности API...');
            if (!window.iceqBase || !window.iceqBase.fetchAPI) {
                throw new Error('API не доступен');
            }
            console.log('✅ [PREMIUM] API доступен');
            
            console.log('📡 [PREMIUM] Отправляем запрос на сервер...');
            const response = await window.iceqBase.fetchAPI('/premium/status');
            console.log('📥 [PREMIUM] Получен ответ от сервера:', response);
            
            this.isPremium = response.premium_active;
            this.maxQuestions = this.isPremium ? 100 : 10; // БЕЗ ПРЕМИУМА: 5-10, С ПРЕМИУМОМ: 5-100
            
            console.log('✅ [PREMIUM] Статус премиума загружен:', {
                isPremium: this.isPremium,
                maxQuestions: this.maxQuestions
            });
            
        } catch (error) {
            console.error('❌ [PREMIUM] Ошибка загрузки статуса:', error);
            console.error('❌ [PREMIUM] Stack trace:', error.stack);
            
            // Устанавливаем значения по умолчанию при ошибке
            this.isPremium = false;
            this.maxQuestions = 10;
            console.log('🔄 [PREMIUM] Использование fallback статуса:', {
                isPremium: this.isPremium,
                maxQuestions: this.maxQuestions
            });
        }
        
        // Обновляем UI независимо от результата загрузки статуса
        console.log('🔄 [PREMIUM] Обновление UI...');
        this.updateUI();
        console.log('✅ [PREMIUM] UI обновлен');
    }
    
    updateUI() {
        // Обновляем слайдер
        const slider = document.getElementById('question-slider');
        if (slider) {
            slider.max = this.maxQuestions;
            slider.min = 5;
            
            // Обновляем подписи слайдера
            const sliderLabels = document.querySelector('.slider-labels');
            if (sliderLabels) {
                sliderLabels.innerHTML = `<span>5</span><span>${this.maxQuestions}</span>`;
            }
        }
        
        // Обновляем лимиты символов и файлов
        this.updateLimitsDisplay();
        
        // Обновляем счетчик символов для текущего текста
        if (this.textArea) {
            this.handleTextInput();
        }
        
        // Обновляем доступность моделей
        this.updateModelAvailability();
        
        // Обновляем состояние кнопок и полей
        this.validateQuestionsNumber();
        this.updateButtonsState();
        
        // Логируем статус только в консоль для разработки
        console.log('Status updated:', this.isPremium ? 'Premium' : 'Basic', `Max questions: ${this.maxQuestions}`);
    }
    
    updateLimitsDisplay() {
        // Обновляем подсказку о размере файлов
        const uploadHints = document.querySelector('.upload-hints p:last-child');
        if (uploadHints) {
            const maxFileSize = this.isPremium ? '50 МБ' : '50 КБ';
            const planText = this.isPremium ? 'Premium' : 'базовый план';
            uploadHints.innerHTML = `💡 Максимальный размер: ${maxFileSize} (${planText})`;
        }
        
        // Обновляем подсказку о символах  
        const inputHints = document.querySelector('.input-hints');
        if (inputHints) {
            const maxChars = this.isPremium ? '1 000 000' : '10 000';
            const planText = this.isPremium ? 'Premium' : 'базовый план';
            inputHints.innerHTML = `💡 Лимит символов: ${maxChars} (${planText})`;
        }
    }
    
    updateModelAvailability() {
        document.querySelectorAll('.model-option').forEach(option => {
            const model = option.dataset.model;
            
            if (model === 'deepseek' || model === 'qwen') {
                if (!this.isPremium) {
                    option.classList.add('model-locked');
                    option.setAttribute('title', 'Доступно только с Premium подпиской');
                } else {
                    option.classList.remove('model-locked');
                    option.removeAttribute('title');
                }
            }
        });
        
        // Если выбранная модель заблокирована, переключаем на ICEQ
        const selectedModel = document.querySelector('.model-option.selected');
        if (selectedModel && selectedModel.classList.contains('model-locked')) {
            this.selectModel('iceq');
        }
        
        // Если нет выбранной модели, выбираем ICEQ по умолчанию
        if (!document.querySelector('.model-option.selected')) {
            this.selectModel('iceq');
        }
    }
    
    selectModel(modelName) {
        // Проверяем доступность модели
        const modelElement = document.querySelector(`[data-model="${modelName}"]`);
        if (modelElement && modelElement.classList.contains('model-locked')) {
            window.iceqBase.showToast('Эта модель доступна только с Premium подпиской', 'warning');
            return;
        }
        
        // Убираем выделение с других моделей
        document.querySelectorAll('.model-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Выделяем выбранную модель
        if (modelElement) {
            modelElement.classList.add('selected');
            this.selectedModel = modelName;
        }
    }
    
    handleTextInput() {
        const text = this.textArea.value;
        const charCount = text.length;
        const maxChars = this.isPremium ? 1000000 : 10000; // С ПРЕМИУМОМ: 1 МИЛЛИОН символов
        
        // Обрезаем текст если превышен лимит
        if (charCount > maxChars) {
            this.textArea.value = text.substring(0, maxChars);
            return this.handleTextInput();
        }
        
        // Обновляем счетчик символов
        const currentSpan = this.charCounter.querySelector('.current');
        const maxSpan = this.charCounter.querySelector('.max');
        if (currentSpan) {
            currentSpan.textContent = charCount;
        }
        if (maxSpan) {
            maxSpan.textContent = maxChars.toLocaleString();
        }
        
        // Обновляем maxlength атрибут
        if (this.textArea) {
            this.textArea.setAttribute('maxlength', maxChars);
        }
        
        // Активируем/деактивируем кнопки
        this.updateButtonsState();
    }
    
    async pasteText() {
        try {
            const text = await navigator.clipboard.readText();
            this.textArea.value = text;
            this.handleTextInput();
        } catch (error) {
            window.iceqBase.showToast('Не удалось вставить текст из буфера обмена', 'error');
        }
    }
    
    clearText() {
        this.textArea.value = '';
        this.handleTextInput();
        this.hideFileInfo();
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }
    
    processFile(file) {
        // Создаем фейковый event объект для совместимости с handleFileUpload
        const fakeEvent = {
            target: {
                files: [file]
            }
        };
        this.handleFileUpload(fakeEvent);
    }
    
    showFileInfo(fileName, fileSize) {
        const fileInfo = document.getElementById('file-info');
        const fileNameElem = document.getElementById('file-name');
        const fileSizeElem = document.getElementById('file-size');
        
        if (fileInfo && fileNameElem && fileSizeElem) {
            fileNameElem.textContent = fileName;
            fileSizeElem.textContent = this.formatFileSize(fileSize);
            fileInfo.style.display = 'block';
        }
    }
    
    hideFileInfo() {
        const fileInfo = document.getElementById('file-info');
        if (fileInfo) {
            fileInfo.style.display = 'none';
        }
    }
    
    removeFile() {
        // Очищаем input файла
        const fileInput = document.getElementById('file-upload');
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Скрываем информацию о файле
        this.hideFileInfo();
        
        // Обновляем состояние кнопок
        this.updateButtonsState();
        
        window.iceqBase.showToast('Файл удален', 'info');
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'КБ', 'МБ', 'ГБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async handleFileUpload(event) {
        console.log('📁 [FILE] Начало загрузки файла...');
        
        const file = event.target.files[0];
        if (!file) {
            console.log('❌ [FILE] Файл не выбран');
            return;
        }
        
        console.log('📄 [FILE] Информация о файле:', {
            name: file.name,
            size: file.size,
            type: file.type,
            sizeFormatted: this.formatFileSize(file.size)
        });
        
        // Проверяем размер файла
        const maxSize = this.isPremium ? 50 * 1024 * 1024 : 50 * 1024; // С ПРЕМИУМОМ: 50 МБ, БЕЗ: 50 КБ
        console.log('📏 [FILE] Проверка размера:', {
            fileSize: file.size,
            maxSize: maxSize,
            isPremium: this.isPremium,
            isWithinLimit: file.size <= maxSize
        });
        
        if (file.size > maxSize) {
            const maxSizeText = this.isPremium ? '50 МБ' : '50 КБ';
            console.log('❌ [FILE] Файл слишком большой');
            window.iceqBase.showToast(`Файл слишком большой. Максимум: ${maxSizeText}`, 'error');
            return;
        }
        
        try {
            console.log('🔄 [FILE] Обработка файла...');
            let text = '';
            
            if (file.type === 'text/plain') {
                console.log('📝 [FILE] Чтение TXT файла...');
                text = await file.text();
                console.log('✅ [FILE] TXT файл прочитан, символов:', text.length);
            } else if (file.type.includes('pdf')) {
                console.log('📋 [FILE] Чтение PDF файла...');
                // Чтение PDF
                const arrayBuffer = await file.arrayBuffer();
                console.log('📦 [FILE] PDF arrayBuffer получен, размер:', arrayBuffer.byteLength);
                
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                console.log('📚 [FILE] PDF документ загружен, страниц:', pdf.numPages);
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    console.log(`📄 [FILE] Обработка страницы ${i}...`);
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map(item => item.str).join(' ') + '\n';
                }
                console.log('✅ [FILE] PDF файл прочитан, символов:', text.length);
            } else if (file.type.includes('word')) {
                console.log('📝 [FILE] Чтение Word файла...');
                // Чтение Word
                const arrayBuffer = await file.arrayBuffer();
                console.log('📦 [FILE] Word arrayBuffer получен, размер:', arrayBuffer.byteLength);
                
                const result = await mammoth.extractRawText({ arrayBuffer });
                text = result.value;
                console.log('✅ [FILE] Word файл прочитан, символов:', text.length);
            } else {
                console.log('❌ [FILE] Неподдерживаемый формат:', file.type);
                throw new Error('Неподдерживаемый формат файла');
            }
            
            console.log('📝 [FILE] Установка текста в textarea...');
            if (this.textArea) {
                this.textArea.value = text;
                this.handleTextInput();
                console.log('✅ [FILE] Текст установлен в textarea');
            } else {
                console.log('❌ [FILE] textArea не найден!');
            }
            
            console.log('📋 [FILE] Показ информации о файле...');
            this.showFileInfo(file.name, file.size);
            
            // Переключаемся на вкладку текста, чтобы показать загруженный контент
            console.log('🔄 [FILE] Переключение на вкладку текста...');
            this.switchTab('text');
            
            console.log('✅ [FILE] Файл успешно загружен');
            window.iceqBase.showToast(`Файл "${file.name}" успешно загружен`, 'success');
            
        } catch (error) {
            console.error('❌ [FILE] Ошибка загрузки файла:', error);
            console.error('❌ [FILE] Stack trace:', error.stack);
            
            this.hideFileInfo();
            window.iceqBase.showToast('Ошибка чтения файла: ' + error.message, 'error');
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
        
        this.updateButtonsState();
    }
    
    decreaseQuestions() {
        const current = parseInt(this.questionsInput.value);
        if (current > 5) {
            const newValue = current - 1;
            this.questionsInput.value = newValue;
            
            // Обновляем слайдер
            const slider = document.getElementById('question-slider');
            if (slider) {
                slider.value = newValue;
            }
            
            this.validateQuestionsNumber();
        }
    }
    
    increaseQuestions() {
        const current = parseInt(this.questionsInput.value);
        if (current < this.maxQuestions) {
            const newValue = current + 1;
            this.questionsInput.value = newValue;
            
            // Обновляем слайдер
            const slider = document.getElementById('question-slider');
            if (slider) {
                slider.value = newValue;
            }
            
            this.validateQuestionsNumber();
        }
    }
    
    validateQuestionsNumber() {
        let value = parseInt(this.questionsInput.value);
        
        if (isNaN(value) || value < 5) {
            value = 5;
        } else if (value > this.maxQuestions) {
            value = this.maxQuestions;
        }
        
        this.questionsInput.value = value;
        
        // Синхронизируем со слайдером
        const slider = document.getElementById('question-slider');
        if (slider) {
            slider.value = value;
        }
        
        this.updateEstimatedTime();
        this.updateButtonsState();
    }
    
    updateEstimatedTime() {
        const questionsCount = parseInt(this.questionsInput.value) || 5;
        const minutes = Math.max(1, Math.ceil(questionsCount / 5));
        
        const estimateElement = document.getElementById('time-estimate');
        if (estimateElement) {
            estimateElement.textContent = `~ ${minutes}-${minutes + 1} минут`;
        }
    }
    
    updateButtonsState() {
        console.log('🔄 [BUTTONS] Обновление состояния кнопок...');
        
        const hasText = this.textArea ? this.textArea.value.trim().length > 0 : false;
        const hasFile = this.fileInput && this.fileInput.files && this.fileInput.files.length > 0;
        const canGenerate = hasText || hasFile;
        
        console.log('📊 [BUTTONS] Состояние данных:', {
            hasText: hasText,
            textLength: this.textArea ? this.textArea.value.trim().length : 0,
            hasFile: hasFile,
            canGenerate: canGenerate,
            isGenerating: this.isGenerating
        });
        
        if (this.generateBtn) {
            const shouldDisable = !canGenerate || this.isGenerating;
            this.generateBtn.disabled = shouldDisable;
            console.log('🎯 [BUTTONS] Кнопка генерации:', {
                disabled: shouldDisable,
                canGenerate: canGenerate,
                isGenerating: this.isGenerating
            });
        } else {
            console.log('⚠️ [BUTTONS] Кнопка генерации не найдена');
        }
        
        if (this.estimationPanel) {
            if (canGenerate) {
                this.estimationPanel.style.display = 'block';
                console.log('✅ [BUTTONS] Панель времени показана');
            } else {
                this.estimationPanel.style.display = 'none';
                console.log('❌ [BUTTONS] Панель времени скрыта');
            }
        } else {
            console.log('⚠️ [BUTTONS] Панель времени не найдена');
        }
        
        console.log('✅ [BUTTONS] Состояние кнопок обновлено');
    }
    
    async startGeneration() {
        console.log('[GENERATION] Starting test generation');
        
        if (this.isGenerating) {
            console.log('[GENERATION] Generation already in progress');
            return;
        }

        // Проверяем, есть ли текст
        const text = this.textArea.value.trim();
        console.log('[GENERATION] Text validation - length:', text.length);
        
        if (!text) {
            console.log('[GENERATION] No text provided for generation');
            window.iceqBase.showToast('Введите текст для генерации теста', 'warning');
            return;
        }

        this.isGenerating = true;
        this.updateButtonsState();
        
        try {
            // Показываем загрузочный экран
            if (this.loadingOverlay) {
                this.loadingOverlay.style.display = 'flex';
            } else {
                console.warn('[GENERATION] Loading overlay not found');
            }
            
            // Получаем информацию о файле для статистики
            let fileSize = 0;
            let textType = 'text';
            
            if (this.fileInput && this.fileInput.files && this.fileInput.files.length > 0) {
                const file = this.fileInput.files[0];
                fileSize = file.size;
                const fileName = file.name.toLowerCase();
                
                if (fileName.endsWith('.pdf')) {
                    textType = 'pdf';
                } else if (fileName.endsWith('.docx')) {
                    textType = 'docx';
                } else if (fileName.endsWith('.txt')) {
                    textType = 'txt';
                } else {
                    textType = 'file';
                }
            }
            
            // Получаем настройки
            const settings = {
                text: text,
                questionNumber: parseInt(this.questionsInput.value) || 10,
                model: this.selectedModel || 'iceq',
                fileSize: fileSize,
                textType: textType
            };
            
            console.log('[GENERATION] Settings:', settings);
            
            window.iceqBase.showToast('Начинаем генерацию теста...', 'info');
            
            // Проверяем API
            if (!window.iceqBase || !window.iceqBase.fetchAPI) {
                throw new Error('API недоступен');
            }
            
            // Отправляем запрос на генерацию
            console.log('[GENERATION] Sending API request');
            const response = await window.iceqBase.fetchAPI('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            console.log('[GENERATION] API response received:', response.status);
            
            if (response.status === 'success') {
                console.log('[GENERATION] Test created successfully');
                console.log('[GENERATION] Questions generated:', response.questions.length);
                
                // Сохраняем тест в localStorage для предпросмотра и прохождения
                const testData = {
                    questions: response.questions,
                    settings: settings,
                    createdAt: new Date().toISOString(),
                    id: Date.now().toString()
                };
                
                // Сохраняем для предпросмотра
                localStorage.setItem('iceq_generated_test', JSON.stringify(testData));
                // Также сохраняем для прохождения (если пользователь решит пройти тест сразу)
                localStorage.setItem('iceq_current_test', JSON.stringify(testData));
                console.log('[GENERATION] Test data saved to localStorage');
                
                // Обновляем счетчик тестов
                this.decrementTestLimit();
                
                window.iceqBase.showToast('Тест успешно создан! Переходим к предпросмотру...', 'success');
                
                // Переходим к предпросмотру теста
                console.log('[GENERATION] Redirecting to preview');
                window.location.href = '/preview';
            } else {
                throw new Error(response.message || 'Неизвестная ошибка сервера');
            }

        } catch (error) {
            console.error('[GENERATION] Generation error:', error.message);
            window.iceqBase.showToast(error.message || 'Ошибка генерации теста', 'error');
        } finally {
            console.log('[GENERATION] Generation process finished');
            this.isGenerating = false;
            this.updateButtonsState();
            
            if (this.loadingOverlay) {
                this.loadingOverlay.style.display = 'none';
            }
        }
    }
    
    // Методы для тестирования (можно вызывать из консоли)
    togglePremium() {
        this.isPremium = !this.isPremium;
        console.log('Premium status toggled to:', this.isPremium);
        this.updateUI();
        
        // Тихо перезагружаем страницу для полного применения изменений
        setTimeout(() => {
            window.location.reload();
        }, 500);
        
        return this.isPremium;
    }
    
    setPremium(status) {
        const oldStatus = this.isPremium;
        this.isPremium = !!status;
        console.log('Premium status set to:', this.isPremium);
        this.updateUI();
        
        // Тихо перезагружаем только если статус действительно изменился
        if (oldStatus !== this.isPremium) {
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
        
        return this.isPremium;
    }



    /**
     * Уменьшение счетчика оставшихся тестов
     */
    decrementTestLimit() {
        try {
            const defaultStats = {
                testsCreated: 0,
                questionsGenerated: 0,
                testsRemaining: this.isPremium ? 50 : 5,
                isPremium: this.isPremium
            };

            const saved = localStorage.getItem('iceq_user_stats');
            const stats = saved ? { ...defaultStats, ...JSON.parse(saved) } : defaultStats;
            
            // Уменьшаем счетчик тестов
            if (stats.testsRemaining > 0) {
                stats.testsRemaining--;
            }
            
            // Увеличиваем счетчик созданных тестов
            stats.testsCreated = (stats.testsCreated || 0) + 1;
            
            // Обновляем статус премиума
            stats.isPremium = this.isPremium;
            
            // Сохраняем обновленную статистику
            localStorage.setItem('iceq_user_stats', JSON.stringify(stats));
            
            console.log('📊 [STATS] Обновлена статистика:', stats);
        } catch (error) {
            console.error('❌ [STATS] Ошибка обновления статистики:', error);
        }
    }
}

// Инициализация страницы при загрузке
window.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 [GLOBAL] DOM загружен, начинаем инициализацию...');
    
    try {
        console.log('🏗️ [GLOBAL] Создание экземпляра CreateTestPage...');
        window.createTestPage = new CreateTestPage();
        console.log('✅ [GLOBAL] CreateTestPage создан успешно');
        
        // Глобальные функции для тестирования (можно вызывать из консоли браузера)
        console.log('🔧 [GLOBAL] Установка глобальных функций тестирования...');
        window.togglePremium = () => window.createTestPage.togglePremium();
        window.setPremium = (status) => window.createTestPage.setPremium(status);
        
        console.log('🎯 [GLOBAL] Функции для тестирования в консоли:');
        console.log('  togglePremium() - переключить статус премиума');
        console.log('  setPremium(true/false) - установить статус премиума');
        
        console.log('🎉 [GLOBAL] Инициализация завершена успешно!');
        
    } catch (error) {
        console.error('💥 [GLOBAL] КРИТИЧЕСКАЯ ОШИБКА при инициализации:', error);
        console.error('💥 [GLOBAL] Stack trace:', error.stack);
    }
}); 