document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements - Main Screens
    const mainScreen = document.getElementById('main-screen');
    const createTestScreen = document.getElementById('create-test-screen');
    const loadTestScreen = document.getElementById('load-test-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const testPreviewScreen = document.getElementById('test-preview-screen');
    const editQuestionsScreen = document.getElementById('edit-questions-screen');
    const questionScreen = document.getElementById('question-screen');
    const explanationScreen = document.getElementById('explanation-screen');
    const resultsScreen = document.getElementById('results-screen');
    const reviewAnswersScreen = document.getElementById('review-answers-screen');

    // Main Screen Elements
    const createTestBtn = document.getElementById('create-test-btn');
    const loadTestBtn = document.getElementById('load-test-btn');

    // Create Test Screen Elements
    const backToMain = document.getElementById('back-to-main');
    const textInputTab = document.getElementById('text-input-tab');
    const fileInputTab = document.getElementById('file-input-tab');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const textContent = document.getElementById('text-content');
    const fileUpload = document.getElementById('file-upload');
    const fileName = document.getElementById('file-name');
    const dropArea = document.getElementById('drop-area');
    const generateBtn = document.getElementById('generate-btn');
    const questionNumber = document.getElementById('question-number');
    const questionSlider = document.getElementById('question-slider');

    // Character counter and file size elements
    const charCounter = document.getElementById('char-counter');
    const fileSize = document.getElementById('file-size');

    // Load Test Screen Elements
    const backToMainFromLoad = document.getElementById('back-to-main-from-load');
    const readyTestUpload = document.getElementById('ready-test-upload');
    const readyTestName = document.getElementById('ready-test-name');
    const readyTestDropArea = document.getElementById('ready-test-drop-area');
    const showExplanations = document.getElementById('show-explanations');
    const startLoadedTestBtn = document.getElementById('start-loaded-test-btn');
    const backBtn = document.getElementById('back-btn');

    // Loading Screen Elements
    const loaderProgress = document.querySelector('.loader-progress');
    const loadingLog = document.getElementById('loading-log');
    const adContainer = document.getElementById('ad-container');
    const adPremiumBtn = document.getElementById('ad-premium-btn');
    const loadingStages = document.querySelectorAll('.loading-stage');

    // Test Preview Screen Elements
    const backToCreateTest = document.getElementById('back-to-create-test');
    const previewQuestionCount = document.getElementById('preview-question-count');
    const questionsList = document.getElementById('questions-list');
    const downloadTestBtn = document.getElementById('download-test-btn');
    const startTestBtn = document.getElementById('start-test-btn');
    const qualityFill = document.getElementById('quality-fill');
    const qualityScore = document.getElementById('quality-score');
    const editQuestionsBtn = document.getElementById('edit-questions-btn');

    // Edit Questions Screen Elements
    const editQuestionsContainer = document.getElementById('edit-questions-container');
    const backToPreview = document.getElementById('back-to-preview');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const saveEditBtn = document.getElementById('save-edit-btn');

    // Question Screen Elements
    const questionCount = document.getElementById('question-count');
    const questionText = document.getElementById('question-text');
    const answersContainer = document.getElementById('answers-container');
    const answerBtn = document.getElementById('answer-btn');
    const skipBtn = document.getElementById('skip-btn');
    const progressFill = document.getElementById('progress-fill');

    // Explanation Screen Elements
    const userAnswerDisplay = document.getElementById('user-answer');
    const correctAnswerDisplay = document.getElementById('correct-answer');
    const explanationText = document.getElementById('explanation-text');
    const nextBtn = document.getElementById('next-btn');



    // Results Screen Elements
    const score = document.getElementById('score');
    const reviewAnswersBtn = document.getElementById('review-answers-btn');
    const exportResultsBtn = document.getElementById('export-results-btn');
    const restartBtn = document.getElementById('restart-btn');
    const backToMainBtn = document.getElementById('back-to-main-btn');

    // Review Answers Screen Elements
    const reviewContainer = document.getElementById('review-container');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchQuestions = document.getElementById('search-questions');
    const backToResultsBtn = document.getElementById('back-to-results-btn');
    const exportTxtBtn = document.getElementById('export-txt-btn');

    // Export Modal Elements
    const exportModal = document.getElementById('export-modal');
    const closeExportModal = document.querySelector('.close-export-modal');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportTxtResultsBtn = document.getElementById('export-txt-results-btn');

    // Theme Toggle
    const themeSwitch = document.getElementById('theme-switch');

    // Premium Mode Elements
    const premiumBtn = document.getElementById('premium-btn');
    const premiumModal = document.getElementById('premium-modal');
    const closeModal = document.querySelector('.close-modal');
    const freePlanBtn = document.getElementById('free-plan-btn');
    const premiumPlanBtn = document.getElementById('premium-plan-btn');
    const freeTestsLimit = document.getElementById('free-tests-limit');

    // Support Button
    const supportBtn = document.getElementById('support-btn');

    // Logo for navigation
    const logoHome = document.getElementById('logo-home');

    const searchCatalogBtn = document.getElementById('search-catalog-btn');
    if (searchCatalogBtn) {
        searchCatalogBtn.addEventListener('click', function() {
            window.location.href = '/books';
        });
    }

    // Quiz state
    let quizData = [];
    let currentQuestion = 0;
    let userAnswers = [];
    let selectedOption = null;
    let correctCount = 0;
    let showExplanationsMode = true;
    let testQuality = 85; // Default quality

    // Premium state
    let isPremiumMode = localStorage.getItem('premiumMode') === 'true';
    let testsCreatedToday = parseInt(localStorage.getItem('testsCreatedToday') || '0');
    let lastTestDate = localStorage.getItem('lastTestDate') || new Date().toDateString();

    // Убедимся, что все окна имеют одинаковую высоту для предотвращения скроллинга
    const appContainer = document.querySelector('.app-container');
    const scrollToActiveScreen = () => {
        if (document.querySelector('.screen.active')) {
            document.querySelector('.screen.active').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    };

    // Check if date changed and reset counter
    if (new Date().toDateString() !== lastTestDate) {
        testsCreatedToday = 0;
        localStorage.setItem('testsCreatedToday', '0');
        localStorage.setItem('lastTestDate', new Date().toDateString());
    }

    // Update UI based on premium status
    if (isPremiumMode) {
        document.body.classList.add('premium-mode');
        premiumBtn.textContent = 'Премиум активен';
    } else {
        updateFreeTestsLimit();
    }

    // Load theme from localStorage
    const savedTheme = localStorage.getItem('quizTheme');
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeSwitch.checked = true;
    }

    // Theme toggle
    themeSwitch.addEventListener('change', function () {
        if (this.checked) {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('quizTheme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('quizTheme', 'dark');
        }
    });

    // Character counter
    textContent.addEventListener('input', function() {
        const charCount = this.value.length;
        const charCounterSpan = charCounter.querySelector('span');
        charCounterSpan.textContent = charCount;

        if (!isPremiumMode && charCount > 10000) {
            charCounter.classList.add('limit-reached');
            generateBtn.disabled = true;
            charCounterSpan.textContent = `${charCount} (лимит превышен)`;
        } else {
            charCounter.classList.remove('limit-reached');
            generateBtn.disabled = false;
        }
    });

    // Logo navigation
    logoHome.addEventListener('click', function() {
        showScreen(mainScreen);
    });

    // Support button
    supportBtn.addEventListener('click', function() {
        window.open('https://t.me/phantom2059', '_blank');
    });

    // Premium modal
    premiumBtn.addEventListener('click', function() {
        premiumModal.classList.add('active');
    });

    closeModal.addEventListener('click', function() {
        premiumModal.classList.remove('active');
    });

    freePlanBtn.addEventListener('click', function() {
        isPremiumMode = false;
        localStorage.setItem('premiumMode', 'false');
        document.body.classList.remove('premium-mode');
        premiumBtn.textContent = 'Премиум';
        premiumModal.classList.remove('active');
        updateFreeTestsLimit();
    });

    premiumPlanBtn.addEventListener('click', function() {
        isPremiumMode = true;
        localStorage.setItem('premiumMode', 'true');
        document.body.classList.add('premium-mode');
        premiumBtn.textContent = 'Премиум активен';
        premiumModal.classList.remove('active');
    });

    // Ad premium button
    adPremiumBtn.addEventListener('click', function() {
        premiumModal.classList.add('active');
    });

    // Export modal actions
    exportResultsBtn.addEventListener('click', function() {
        exportModal.classList.add('active');
    });

    closeExportModal.addEventListener('click', function() {
        exportModal.classList.remove('active');
    });

    exportJsonBtn.addEventListener('click', function() {
        exportResults('json');
        exportModal.classList.remove('active');
    });

    exportCsvBtn.addEventListener('click', function() {
        exportResults('csv');
        exportModal.classList.remove('active');
    });

    exportTxtResultsBtn.addEventListener('click', function() {
        exportResults('txt');
        exportModal.classList.remove('active');
    });

    // Update free tests limit display
    function updateFreeTestsLimit() {
        const remainingTests = 5 - testsCreatedToday;
        freeTestsLimit.querySelector('b').textContent = remainingTests;
        if (remainingTests <= 1) {
            freeTestsLimit.style.borderColor = 'var(--incorrect-color)';
        } else {
            freeTestsLimit.style.borderColor = 'var(--premium-accent)';
        }
    }

    // ==== MAIN SCREEN EVENTS ====
    createTestBtn.addEventListener('click', () => showScreen(createTestScreen));
    loadTestBtn.addEventListener('click', () => showScreen(loadTestScreen));

    // ==== CREATE TEST SCREEN EVENTS ====
    backToMain.addEventListener('click', () => showScreen(mainScreen));

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const tabName = button.getAttribute('data-tab');

            [textInputTab, fileInputTab].forEach(tab => tab.classList.remove('active'));

            if (tabName === 'text') {
                textInputTab.classList.add('active');
            } else if (tabName === 'file') {
                fileInputTab.classList.add('active');
            }
        });
    });

    // Question number and slider sync
    questionNumber.addEventListener('input', function() {
        this.value = Math.min(Math.max(parseInt(this.value) || 5, 5), 50);
        questionSlider.value = this.value;
    });

    questionSlider.addEventListener('input', function() {
        questionNumber.value = this.value;
    });

    // File handling
    fileUpload.addEventListener('change', handleFile);

    // Drag and drop functionality for files
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.add('active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.remove('active');
        }, false);
    });

    dropArea.addEventListener('drop', handleDrop, false);

    generateBtn.addEventListener('click', startGeneration);

    // ==== LOAD TEST SCREEN EVENTS ====
    backToMainFromLoad.addEventListener('click', () => showScreen(mainScreen));
    backBtn.addEventListener('click', () => showScreen(mainScreen));

    // Ready test file handling
    readyTestUpload.addEventListener('change', handleReadyTestFile);

    // Drag and drop for ready tests
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        readyTestDropArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        readyTestDropArea.addEventListener(eventName, () => {
            readyTestDropArea.classList.add('active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        readyTestDropArea.addEventListener(eventName, () => {
            readyTestDropArea.classList.remove('active');
        }, false);
    });

    readyTestDropArea.addEventListener('drop', handleReadyTestDrop, false);

    showExplanations.addEventListener('change', function() {
        showExplanationsMode = this.checked;
        sessionStorage.setItem('showExplanationsMode', this.checked);
    });

    startLoadedTestBtn.addEventListener('click', function() {
        loadReadyTest();
    });

    // ==== TEST PREVIEW SCREEN EVENTS ====
    backToCreateTest.addEventListener('click', () => showScreen(createTestScreen));
    downloadTestBtn.addEventListener('click', downloadTest);
    startTestBtn.addEventListener('click', startQuiz);
    editQuestionsBtn.addEventListener('click', editQuestions);

    // ==== EDIT QUESTIONS SCREEN EVENTS ====
    backToPreview.addEventListener('click', () => showScreen(testPreviewScreen));
    cancelEditBtn.addEventListener('click', () => showScreen(testPreviewScreen));
    saveEditBtn.addEventListener('click', saveEditedQuestions);

    // ==== QUESTION SCREEN EVENTS ====
    answerBtn.addEventListener('click', submitAnswer);
    skipBtn.addEventListener('click', skipQuestion);

    // ==== EXPLANATION SCREEN EVENTS ====
    nextBtn.addEventListener('click', goToNextQuestion);

    // ==== RESULTS SCREEN EVENTS ====
    reviewAnswersBtn.addEventListener('click', reviewAnswers);
    exportResultsBtn.addEventListener('click', function() {
        exportModal.classList.add('active');
    });
    restartBtn.addEventListener('click', restartQuiz);
    backToMainBtn.addEventListener('click', function() {
        showScreen(mainScreen);
    });

    // ==== REVIEW ANSWERS SCREEN EVENTS ====
    backToResultsBtn.addEventListener('click', () => showScreen(resultsScreen));
    exportTxtBtn.addEventListener('click', function() {
        exportToTxt();
    });

    // Review filters
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterReviewItems(this.getAttribute('data-filter'));
        });
    });

    // Search functionality
    searchQuestions.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const activeFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');
        filterReviewItems(activeFilter, searchTerm);
    });

    // === FUNCTIONS ===

    // Prevent default actions for drag and drop
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Handle dropped files
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            fileUpload.files = files;
            handleFile();
        }
    }

    // Handle file selection
    function handleFile() {
        const file = fileUpload.files[0];
        if (file) {
            fileName.textContent = file.name;

            // File size check for free mode
            if (!isPremiumMode && file.size > 50 * 1024) { // 50 KB
                const fileSizeKB = Math.round(file.size / 1024);
                fileSize.querySelector('span').textContent = `${fileSizeKB} (лимит превышен)`;
                fileSize.classList.add('limit-reached');
                generateBtn.disabled = true;
                dropArea.classList.add('error');
                alert('В бесплатном режиме максимальный размер файла - 50 КБ. Перейдите на Премиум для загрузки файлов любого размера.');
            } else {
                if (fileSize) {
                    const fileSizeKB = Math.round(file.size / 1024);
                    fileSize.querySelector('span').textContent = fileSizeKB;
                    fileSize.classList.remove('limit-reached');
                }
                generateBtn.disabled = false;
                dropArea.classList.remove('error');
                processFile(file);
            }
        } else {
            fileName.textContent = "";
            if (fileSize) fileSize.querySelector('span').textContent = "0";
        }
    }

    // Handle dropped test files
    function handleReadyTestDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            readyTestUpload.files = files;
            handleReadyTestFile();
        }
    }

    // Handle ready test file selection
    function handleReadyTestFile() {
        const file = readyTestUpload.files[0];
        if (file) {
            readyTestName.textContent = file.name;

            // Validate the file before enabling the button
            validateTestFile(file);
        } else {
            readyTestName.textContent = "";
            startLoadedTestBtn.disabled = true;
            readyTestDropArea.classList.remove('error');
        }
    }

    // Validate test file format
    function validateTestFile(file) {
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const content = e.target.result;
                const testData = JSON.parse(content);

                if (!testData.questions || !Array.isArray(testData.questions)) {
                    throw new Error('Некорректная структура файла');
                }

                // Simple validation of first question
                if (testData.questions.length > 0) {
                    const firstQuestion = testData.questions[0];
                    if (!firstQuestion.question || !firstQuestion.answers ||
                        !Array.isArray(firstQuestion.answers)) {
                        throw new Error('Некорректная структура вопросов');
                    }
                } else {
                    throw new Error('Файл не содержит вопросов');
                }

                // File is valid
                readyTestDropArea.classList.remove('error');
                startLoadedTestBtn.disabled = false;
            } catch (error) {
                readyTestDropArea.classList.add('error');
                readyTestName.textContent = `Ошибка: ${error.message}`;
                startLoadedTestBtn.disabled = true;
            }
        };

        reader.onerror = function() {
            readyTestDropArea.classList.add('error');
            readyTestName.textContent = "Ошибка чтения файла";
            startLoadedTestBtn.disabled = true;
        };

        reader.readAsText(file);
    }

    // Process file based on type
    function processFile(file) {
        const extension = file.name.split('.').pop().toLowerCase();

        if (['txt'].includes(extension)) {
            // For text files
            const reader = new FileReader();
            reader.onload = function(e) {
                textContent.value = e.target.result;

                // Check character limit for free mode
                if (!isPremiumMode && e.target.result.length > 10000) {
                    charCounter.querySelector('span').textContent = `${e.target.result.length} (лимит превышен)`;
                    charCounter.classList.add('limit-reached');
                    generateBtn.disabled = true;
                    alert('В бесплатном режиме ограничение - 10 000 символов. Перейдите на Премиум для работы с текстами любой длины.');
                } else {
                    charCounter.querySelector('span').textContent = e.target.result.length;
                    charCounter.classList.remove('limit-reached');
                    generateBtn.disabled = false;
                }
            };
            reader.onerror = function() {
                alert("Ошибка чтения файла.");
            };
            reader.readAsText(file);
        }
        else if (['docx', 'doc'].includes(extension)) {
            // For DOCX files using mammoth.js
            if (typeof mammoth !== 'undefined') {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const arrayBuffer = e.target.result;
                    mammoth.extractRawText({arrayBuffer: arrayBuffer})
                        .then(function(result) {
                            textContent.value = result.value;

                            // Check character limit for free mode
                            if (!isPremiumMode && result.value.length > 10000) {
                                charCounter.querySelector('span').textContent = `${result.value.length} (лимит превышен)`;
                                charCounter.classList.add('limit-reached');
                                generateBtn.disabled = true;
                                alert('В бесплатном режиме ограничение - 10 000 символов. Перейдите на Премиум для работы с текстами любой длины.');
                            } else {
                                charCounter.querySelector('span').textContent = result.value.length;
                                charCounter.classList.remove('limit-reached');
                                generateBtn.disabled = false;
                            }
                        })
                        .catch(function(error) {
                            console.error(error);
                            alert("Ошибка при обработке DOCX файла: " + error.message);
                        });
                };
                reader.onerror = function() {
                    alert("Ошибка чтения файла.");
                };
                reader.readAsArrayBuffer(file);
            } else {
                alert("Не удалось загрузить библиотеку для работы с DOCX файлами.");
            }
        }
        else if (extension === 'pdf') {
            // For PDF files using pdf.js
            if (typeof pdfjsLib !== 'undefined') {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const arrayBuffer = e.target.result;
                    const loadingTask = pdfjsLib.getDocument({data: arrayBuffer});
                    loadingTask.promise.then(function(pdf) {
                        let allTextContent = '';
                        const maxPages = pdf.numPages;
                        let loadedPages = 0;

                        function processPDFPages(pageNumber) {
                            if (pageNumber > maxPages) {
                                textContent.value = allTextContent;

                                // Check character limit for free mode
                                if (!isPremiumMode && allTextContent.length > 10000) {
                                    charCounter.querySelector('span').textContent = `${allTextContent.length} (лимит превышен)`;
                                    charCounter.classList.add('limit-reached');
                                    generateBtn.disabled = true;
                                    alert('В бесплатном режиме ограничение - 10 000 символов. Перейдите на Премиум для работы с текстами любой длины.');
                                } else {
                                    charCounter.querySelector('span').textContent = allTextContent.length;
                                    charCounter.classList.remove('limit-reached');
                                    generateBtn.disabled = false;
                                }
                                return;
                            }

                            pdf.getPage(pageNumber).then(function(page) {
                                page.getTextContent().then(function(textContent) {
                                    const textItems = textContent.items.map(item => item.str);
                                    allTextContent += textItems.join(' ') + '\n\n';
                                    processPDFPages(pageNumber + 1);
                                });
                            });
                        }

                        processPDFPages(1);
                    });
                };
                reader.onerror = function() {
                    alert("Ошибка чтения файла.");
                };
                reader.readAsArrayBuffer(file);
            } else {
                alert("Не удалось загрузить библиотеку для работы с PDF файлами.");
            }
        }
        else {
            alert("Неподдерживаемый тип файла. Пожалуйста, выберите .txt, .docx или .pdf файл.");
            fileName.textContent = "";
            fileUpload.value = "";
        }
    }

    // Start the generation process
    function startGeneration() {
        const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');

        // Check if text is empty
        if (activeTab === 'text' && textContent.value.trim() === '') {
            alert('Пожалуйста, введите текст для генерации теста.');
            return;
        }

        // Check if file is selected
        if (activeTab === 'file' && !fileUpload.files[0]) {
            alert('Пожалуйста, выберите файл для генерации теста.');
            return;
        }

        // Check free mode tests limit
        if (!isPremiumMode && testsCreatedToday >= 5) {
            alert('Вы достигли лимита бесплатных тестов на сегодня (5/5). Перейдите на Премиум для неограниченного создания тестов.');
            premiumModal.classList.add('active');
            return;
        }

        // Check character limit for free mode
        if (!isPremiumMode && textContent.value.length > 10000) {
            alert('Превышен лимит в 10 000 символов. Перейдите на Премиум для работы с большими текстами.');
            return;
        }

        // Check file size for free mode
        if (activeTab === 'file' && !isPremiumMode && fileUpload.files[0].size > 50 * 1024) {
            alert('Превышен лимит размера файла (50 КБ). Перейдите на Премиум для работы с файлами любого размера.');
            return;
        }

        showScreen(loadingScreen);
        loadingLog.innerHTML = ''; // Clear previous logs
        loaderProgress.textContent = '0%';

        // Reset loading stages
        loadingStages.forEach(stage => {
            stage.classList.remove('active', 'completed');
        });

        // Activate the first stage
        activateLoadingStage('analyze');
        logMessage("Начинаем анализ текста...");

        // Update progress realistically
        startRealisticProgress();

        // Update tests created counter for free mode
        if (!isPremiumMode) {
            testsCreatedToday++;
            localStorage.setItem('testsCreatedToday', testsCreatedToday.toString());
            localStorage.setItem('lastTestDate', new Date().toDateString());
            updateFreeTestsLimit();
        }

        if (activeTab === 'text') {
            generateFromText(textContent.value);
        } else {
            const file = fileUpload.files[0];
            logMessage(`Обработка файла: ${file.name}`);
            generateFromText(textContent.value);
        }
    }

    // Realistic progress bar
    function startRealisticProgress() {
        let progress = 0;
        const totalStages = 5;
        let currentStage = 0;

        function updateStage() {
            const stageNames = ['analyze', 'concepts', 'questions', 'answers', 'quality'];
            const stageTimes = [1000, 1500, 3000, 2000, 1500]; // times in ms for each stage

            if (currentStage < totalStages) {
                // Complete previous stage if needed
                if (currentStage > 0) {
                    completeLoadingStage(stageNames[currentStage - 1]);
                }

                // Activate current stage
                activateLoadingStage(stageNames[currentStage]);

                // Update progress for this stage
                const baseProgress = (currentStage / totalStages) * 100;
                const stageProgress = (1 / totalStages) * 100;

                let stageTime = stageTimes[currentStage];
                let subProgress = 0;

                const stageInterval = setInterval(() => {
                    subProgress += (Math.random() * 1.5) + 0.5;
                    if (subProgress >= 100) {
                        subProgress = 100;
                        clearInterval(stageInterval);
                        currentStage++;

                        if (currentStage < totalStages) {
                            setTimeout(updateStage, 500);
                        } else {
                            // Complete the last stage
                            completeLoadingStage(stageNames[currentStage - 1]);
                        }
                    }

                    progress = baseProgress + (stageProgress * (subProgress / 100));
                    loaderProgress.textContent = `${Math.floor(progress)}%`;
                }, stageTime / 20);
            }
        }

        // Start the first stage
        updateStage();
    }

    // Activate a loading stage
    function activateLoadingStage(stageId) {
        loadingStages.forEach(stage => {
            if (stage.getAttribute('data-stage') === stageId) {
                stage.classList.add('active');

                // Log message based on stage
                switch(stageId) {
                    case 'analyze':
                        logMessage("Анализ текста и определение ключевых тем...");
                        break;
                    case 'concepts':
                        logMessage("Извлечение ключевых концепций и важных понятий...");
                        break;
                    case 'questions':
                        logMessage("Формирование вопросов разной сложности...");
                        break;
                    case 'answers':
                        logMessage("Генерация вариантов ответов и определение правильных...");
                        break;
                    case 'quality':
                        logMessage("Проверка качества теста и оптимизация...");
                        break;
                }
            }
        });
    }

    // Mark a loading stage as completed
    function completeLoadingStage(stageId) {
        loadingStages.forEach(stage => {
            if (stage.getAttribute('data-stage') === stageId) {
                stage.classList.remove('active');
                stage.classList.add('completed');

                // Log completion message
                switch(stageId) {
                    case 'analyze':
                        logMessage("✓ Анализ текста завершен");
                        break;
                    case 'concepts':
                        logMessage("✓ Ключевые концепции извлечены");
                        break;
                    case 'questions':
                        logMessage("✓ Вопросы сформированы");
                        break
                    case 'answers':
                        logMessage("✓ Варианты ответов созданы");
                        break;
                    case 'quality':
                        logMessage("✓ Проверка качества завершена");
                        break;
                }
            }
        });
    }

    // Generate questions from text
    function generateFromText(textContent) {
        // Show ad in free mode
        if (!isPremiumMode) {
            adContainer.style.display = 'block';
        } else {
            adContainer.style.display = 'none';
        }

        // In a real project, this would be an API request
        fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: textContent,
                questionNumber: parseInt(questionNumber.value) || 10
            }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка HTTP! Статус: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                if (data.questions && data.questions.length > 0) {
                    logMessage(`Успешно сгенерировано ${data.questions.length} вопросов`);

                    quizData = data.questions;
                    previewQuestionCount.textContent = quizData.length;
                    updateQualityIndicator(testQuality);

                    currentQuestion = 0;
                    userAnswers = Array(quizData.length).fill(null);
                    correctCount = 0;

                    setTimeout(() => {
                        prepareTestPreview();
                        showScreen(testPreviewScreen);
                    }, 1000);
                } else {
                    logMessage("Не удалось сгенерировать вопросы. Попробуйте другой текст.");
                    setTimeout(() => showScreen(createTestScreen), 2000);
                }
            } else {
                logMessage(`Ошибка: ${data.message}`);
                setTimeout(() => showScreen(createTestScreen), 2000);
            }
        })
        .catch(error => {
            logMessage(`Произошла ошибка: ${error.message}`);
            logMessage("Генерирую тестовые вопросы для демонстрации...");

            setTimeout(() => {
                // Mock data for demonstration
                const mockQuestions = [
                    {
                        question: "Какая планета самая большая в Солнечной системе?",
                        answers: [
                            { answer: "Земля", is_correct: false },
                            { answer: "Юпитер", is_correct: true },
                            { answer: "Сатурн", is_correct: false },
                            { answer: "Марс", is_correct: false }
                        ],
                        explanation: "Юпитер является самой большой планетой в Солнечной системе с массой, в 318 раз превышающей массу Земли."
                    },
                    {
                        question: "В каком году началась Первая мировая война?",
                        answers: [
                            { answer: "1914", is_correct: true },
                            { answer: "1918", is_correct: false },
                            { answer: "1939", is_correct: false },
                            { answer: "1912", is_correct: false }
                        ],
                        explanation: "Первая мировая война началась 28 июля 1914 года и продолжалась до 11 ноября 1918 года."
                    },
                    {
                        question: "Кто написал 'Война и мир'?",
                        answers: [
                            { answer: "Фёдор Достоевский", is_correct: false },
                            { answer: "Лев Толстой", is_correct: true },
                            { answer: "Антон Чехов", is_correct: false },
                            { answer: "Иван Тургенев", is_correct: false }
                        ],
                        explanation: "Роман 'Война и мир' был написан Львом Николаевичем Толстым и опубликован в 1865-1869 годах."
                    },
                    {
                        question: "Какой элемент имеет химический символ 'H'?",
                        answers: [
                            { answer: "Гелий", is_correct: false },
                            { answer: "Водород", is_correct: true },
                            { answer: "Ртуть", is_correct: false },
                            { answer: "Гафний", is_correct: false }
                        ],
                        explanation: "Химический символ 'H' соответствует водороду (от латинского 'hydrogenium')."
                    },
                    {
                        question: "Какой год считается годом основания Москвы?",
                        answers: [
                            { answer: "1147", is_correct: true },
                            { answer: "1703", is_correct: false },
                            { answer: "988", is_correct: false },
                            { answer: "1237", is_correct: false }
                        ],
                        explanation: "Первое упоминание о Москве в летописях относится к 1147 году, когда Юрий Долгорукий пригласил в Москву своего союзника князя Святослава Ольговича."
                    }
                ];

                logMessage("Создано 5 тестовых вопросов");

                quizData = mockQuestions;
                previewQuestionCount.textContent = quizData.length;
                updateQualityIndicator(testQuality);

                currentQuestion = 0;
                userAnswers = Array(quizData.length).fill(null);
                correctCount = 0;

                setTimeout(() => {
                    prepareTestPreview();
                    showScreen(testPreviewScreen);
                }, 1000);
            }, 2000);
        });
    }

    // Update quality indicator
    function updateQualityIndicator(quality) {
        qualityFill.style.width = `${quality}%`;
        qualityScore.textContent = `${quality}%`;
    }

    // Log messages in loading screen
    function logMessage(message) {
        const logItem = document.createElement('div');
        logItem.textContent = message;
        loadingLog.appendChild(logItem);
        loadingLog.scrollTop = loadingLog.scrollHeight;
    }

    // Prepare the test preview
    function prepareTestPreview() {
        questionsList.innerHTML = '';

        quizData.forEach((question, index) => {
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item';

            const heading = document.createElement('h4');
            heading.textContent = `Вопрос ${index + 1}`;
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

            questionsList.appendChild(questionItem);
        });
    }

    // Download the test as JSON
    function downloadTest() {
        const testData = {
            title: 'ICEQ Тест',
            dateCreated: new Date().toISOString(),
            questions: quizData
        };

        const json = JSON.stringify(testData, null, 2);
        const blob = new Blob([json], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ICEQ-Test_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Start the quiz
    function startQuiz() {
        userAnswers = Array(quizData.length).fill(null);
        currentQuestion = 0;
        correctCount = 0;
        showExplanationsMode = showExplanations.checked;
        displayQuestion();
        showScreen(questionScreen);
    }

    // Load ready test from file
    function loadReadyTest() {
        const file = readyTestUpload.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    const testData = JSON.parse(content);

                    if (testData.questions && Array.isArray(testData.questions) && testData.questions.length > 0) {
                        quizData = testData.questions;
                        userAnswers = Array(quizData.length).fill(null);
                        currentQuestion = 0;
                        correctCount = 0;
                        showExplanationsMode = showExplanations.checked;

                        displayQuestion();
                        showScreen(questionScreen);
                    } else {
                        alert('Файл не содержит корректных вопросов.');
                    }
                } catch (error) {
                    alert('Не удалось разобрать файл теста: ' + error.message);
                }
            };
            reader.onerror = function() {
                alert('Ошибка чтения файла.');
            };
            reader.readAsText(file);
        }
    }

    // Edit questions - Premium feature
    function editQuestions() {
        if (!isPremiumMode) {
            premiumModal.classList.add('active');
            return;
        }

        // Prepare edit screen
        buildEditQuestionsInterface();
        showScreen(editQuestionsScreen);
    }

    // Build interface for editing questions
    function buildEditQuestionsInterface() {
        editQuestionsContainer.innerHTML = '';

        quizData.forEach((question, questionIndex) => {
            const questionItem = document.createElement('div');
            questionItem.className = 'edit-question-item';
            questionItem.setAttribute('data-question-index', questionIndex);

            // Question header with remove button
            const header = document.createElement('div');
            header.className = 'edit-question-header';

            const questionNumber = document.createElement('span');
            questionNumber.className = 'edit-question-number';
            questionNumber.textContent = `Вопрос ${questionIndex + 1}`;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'edit-remove-btn';
            removeBtn.textContent = 'Удалить';
            removeBtn.addEventListener('click', () => {
                if (confirm('Вы уверены, что хотите удалить этот вопрос?')) {
                    questionItem.remove();
                    updateQuestionNumbers();
                }
            });

            header.appendChild(questionNumber);
            header.appendChild(removeBtn);
            questionItem.appendChild(header);

            // Question text textarea
            const questionText = document.createElement('textarea');
            questionText.className = 'edit-question-text';
            questionText.rows = 3;
            questionText.placeholder = 'Введите текст вопроса';
            questionText.value = question.question;
            questionItem.appendChild(questionText);

            // Answers container
            const answersContainer = document.createElement('div');
            answersContainer.className = 'edit-answers-container';

            // Add each answer
            question.answers.forEach((answer, answerIndex) => {
                const answerItem = createEditableAnswer(answer, answerIndex);
                answersContainer.appendChild(answerItem);
            });

            questionItem.appendChild(answersContainer);

            // Add new answer button
            const addAnswerBtn = document.createElement('div');
            addAnswerBtn.className = 'edit-add-answer';
            addAnswerBtn.textContent = '+ Добавить вариант ответа';
            addAnswerBtn.addEventListener('click', function() {
                const newAnswer = { answer: '', is_correct: false };
                const answerItem = createEditableAnswer(newAnswer, question.answers.length);
                answersContainer.appendChild(answerItem);
            });
            questionItem.appendChild(addAnswerBtn);

            // Explanation textarea
            const explanationLabel = document.createElement('div');
            explanationLabel.textContent = 'Объяснение:';
            explanationLabel.style.marginTop = '15px';
            explanationLabel.style.marginBottom = '5px';
            questionItem.appendChild(explanationLabel);

            const explanation = document.createElement('textarea');
            explanation.className = 'edit-explanation';
            explanation.rows = 3;
            explanation.placeholder = 'Введите объяснение (необязательно)';
            explanation.value = question.explanation || '';
            questionItem.appendChild(explanation);

            editQuestionsContainer.appendChild(questionItem);
        });

        // Add new question button
        const addQuestionBtn = document.createElement('div');
        addQuestionBtn.className = 'edit-add-question';
        addQuestionBtn.textContent = '+ Добавить новый вопрос';
        addQuestionBtn.addEventListener('click', addNewQuestion);
        editQuestionsContainer.appendChild(addQuestionBtn);
    }

    // Create an editable answer item
    function createEditableAnswer(answer, index) {
        const answerItem = document.createElement('div');
        answerItem.className = 'edit-answer-item';

        // Checkbox for correct answer
        const correctCheckbox = document.createElement('input');
        correctCheckbox.className = 'edit-answer-correct';
        correctCheckbox.type = 'radio';
        correctCheckbox.name = `correct-answer-${Date.now()}`;
        correctCheckbox.checked = answer.is_correct;
        correctCheckbox.addEventListener('change', function() {
            // When a radio button is checked, uncheck all others in the same question
            const questionItem = answerItem.closest('.edit-question-item');
            questionItem.querySelectorAll('.edit-answer-correct').forEach(checkbox => {
                if (checkbox !== correctCheckbox) {
                    checkbox.checked = false;
                }
            });
        });

        // Text input for answer
        const answerText = document.createElement('input');
        answerText.className = 'edit-answer-text';
        answerText.type = 'text';
        answerText.placeholder = 'Введите вариант ответа';
        answerText.value = answer.answer;

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'edit-answer-remove';
        removeBtn.textContent = 'x';
        removeBtn.addEventListener('click', function() {
            answerItem.remove();
        });

        answerItem.appendChild(correctCheckbox);
        answerItem.appendChild(answerText);
        answerItem.appendChild(removeBtn);

        return answerItem;
    }

    // Add a new question
    function addNewQuestion() {
        const newQuestion = {
            question: '',
            answers: [
                { answer: '', is_correct: true },
                { answer: '', is_correct: false },
                { answer: '', is_correct: false },
                { answer: '', is_correct: false }
            ],
            explanation: ''
        };

        const questionIndex = document.querySelectorAll('.edit-question-item').length;
        const questionItem = document.createElement('div');
        questionItem.className = 'edit-question-item';
        questionItem.setAttribute('data-question-index', questionIndex);

        // Question header with remove button
        const header = document.createElement('div');
        header.className = 'edit-question-header';

        const questionNumber = document.createElement('span');
        questionNumber.className = 'edit-question-number';
        questionNumber.textContent = `Вопрос ${questionIndex + 1}`;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'edit-remove-btn';
        removeBtn.textContent = 'Удалить';
        removeBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите удалить этот вопрос?')) {
                questionItem.remove();
                updateQuestionNumbers();
            }
        });

        header.appendChild(questionNumber);
        header.appendChild(removeBtn);
        questionItem.appendChild(header);

        // Question text textarea
        const questionText = document.createElement('textarea');
        questionText.className = 'edit-question-text';
        questionText.rows = 3;
        questionText.placeholder = 'Введите текст вопроса';
        questionText.value = newQuestion.question;
        questionItem.appendChild(questionText);

        // Answers container
        const answersContainer = document.createElement('div');
        answersContainer.className = 'edit-answers-container';

        // Add each answer
        newQuestion.answers.forEach((answer, answerIndex) => {
            const answerItem = createEditableAnswer(answer, answerIndex);
            answersContainer.appendChild(answerItem);
        });

        questionItem.appendChild(answersContainer);

        // Add new answer button
        const addAnswerBtn = document.createElement('div');
        addAnswerBtn.className = 'edit-add-answer';
        addAnswerBtn.textContent = '+ Добавить вариант ответа';
        addAnswerBtn.addEventListener('click', function() {
            const newAnswer = { answer: '', is_correct: false };
            const answerItem = createEditableAnswer(newAnswer, newQuestion.answers.length);
            answersContainer.appendChild(answerItem);
        });
        questionItem.appendChild(addAnswerBtn);

        // Explanation textarea
        const explanationLabel = document.createElement('div');
        explanationLabel.textContent = 'Объяснение:';
        explanationLabel.style.marginTop = '15px';
        explanationLabel.style.marginBottom = '5px';
        questionItem.appendChild(explanationLabel);

        const explanation = document.createElement('textarea');
        explanation.className = 'edit-explanation';
        explanation.rows = 3;
        explanation.placeholder = 'Введите объяснение (необязательно)';
        explanation.value = newQuestion.explanation || '';
        questionItem.appendChild(explanation);

        // Insert before the "Add new question" button
        editQuestionsContainer.insertBefore(questionItem, document.querySelector('.edit-add-question'));
        updateQuestionNumbers();

        // Scroll to the new question
        questionItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Update question numbers after editing
    function updateQuestionNumbers() {
        document.querySelectorAll('.edit-question-item').forEach((item, index) => {
            item.setAttribute('data-question-index', index);
            item.querySelector('.edit-question-number').textContent = `Вопрос ${index + 1}`;
        });
    }

    // Save edited questions
    function saveEditedQuestions() {
        const updatedQuestions = [];
        let hasErrors = false;

        document.querySelectorAll('.edit-question-item').forEach((item, questionIndex) => {
            const questionText = item.querySelector('.edit-question-text').value.trim();
            if (!questionText) {
                alert(`Пожалуйста, заполните текст вопроса ${questionIndex + 1}`);
                hasErrors = true;
                return;
            }

            const answers = [];
            let hasCorrectAnswer = false;

            item.querySelectorAll('.edit-answer-item').forEach((answerItem) => {
                const answerText = answerItem.querySelector('.edit-answer-text').value.trim();
                const isCorrect = answerItem.querySelector('.edit-answer-correct').checked;

                if (!answerText) return; // Skip empty answers

                if (isCorrect) hasCorrectAnswer = true;

                answers.push({
                    answer: answerText,
                    is_correct: isCorrect
                });
            });

            if (answers.length < 2) {
                alert(`Вопрос ${questionIndex + 1} должен иметь как минимум 2 варианта ответа`);
                hasErrors = true;
                return;
            }

            if (!hasCorrectAnswer) {
                alert(`Пожалуйста, отметьте правильный ответ для вопроса ${questionIndex + 1}`);
                hasErrors = true;
                return;
            }

            const explanation = item.querySelector('.edit-explanation').value.trim();

            updatedQuestions.push({
                question: questionText,
                answers: answers,
                explanation: explanation
            });
        });

        if (hasErrors) return;

        if (updatedQuestions.length === 0) {
            alert('Невозможно сохранить тест без вопросов');
            return;
        }

        // Update quiz data
        quizData = updatedQuestions;
        previewQuestionCount.textContent = quizData.length;

        // Update preview
        prepareTestPreview();
        showScreen(testPreviewScreen);

        alert('Изменения успешно сохранены!');
    }

    // Display the current question
    function displayQuestion() {
        const question = quizData[currentQuestion];
        questionCount.textContent = `Вопрос ${currentQuestion + 1} из ${quizData.length}`;
        questionText.textContent = question.question;
        selectedOption = null;
        answerBtn.disabled = true;

        // Update progress bar
        const progressPercentage = (currentQuestion / quizData.length) * 100;
        progressFill.style.width = `${progressPercentage}%`;

        // Clear and build answers
        answersContainer.innerHTML = '';
        question.answers.forEach((answer, index) => {
            const answerOption = document.createElement('div');
            answerOption.className = 'answer-option';
            answerOption.textContent = answer.answer;
            answerOption.setAttribute('data-index', index);

            answerOption.addEventListener('click', selectAnswer);
            answersContainer.appendChild(answerOption);
        });
    }

    // Handle answer selection
    function selectAnswer() {
        // Remove selection from other options
        document.querySelectorAll('.answer-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Add selection to this option
        this.classList.add('selected');

        selectedOption = parseInt(this.getAttribute('data-index'));
        answerBtn.disabled = false;
    }

    // Submit an answer
    function submitAnswer() {
        if (selectedOption === null) return;

        const question = quizData[currentQuestion];
        const selectedAnswer = question.answers[selectedOption];

        userAnswers[currentQuestion] = selectedAnswer.answer;

        // Check if answer is correct
        const isCorrect = selectedAnswer.is_correct;

        if (isCorrect) {
            correctCount++;
        }

        if (showExplanationsMode) {
            // Show explanation screen
            userAnswerDisplay.textContent = `Ваш ответ: ${selectedAnswer.answer}`;
            userAnswerDisplay.className = isCorrect ? 'user-answer correct' : 'user-answer incorrect';

            // Find the correct answer
            const correctAnswer = question.answers.find(answer => answer.is_correct);
            correctAnswerDisplay.textContent = `Правильный ответ: ${correctAnswer.answer}`;

            explanationText.textContent = question.explanation || 'Объяснение не предоставлено.';

            showScreen(explanationScreen);
        } else {
            // Go directly to next question
            goToNextQuestion();
        }
    }

    // Skip the current question
    function skipQuestion() {
        userAnswers[currentQuestion] = null;
        goToNextQuestion();
    }

    // Go to the next question or finish the quiz
    function goToNextQuestion() {
        currentQuestion++;

        if (currentQuestion < quizData.length) {
            displayQuestion();
            showScreen(questionScreen);
        } else {
            // Quiz finished
            showResults();
        }
    }

    // Show quiz results
    function showResults() {
        score.textContent = `${correctCount}/${quizData.length} (${Math.round((correctCount/quizData.length)*100)}%)`;
        showScreen(resultsScreen);
    }

    // Review all answers
    function reviewAnswers() {
        reviewContainer.innerHTML = '';
        const activeFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');
        filterReviewItems(activeFilter);
        showScreen(reviewAnswersScreen);
    }

    // Filter review items
    function filterReviewItems(filter, searchTerm = '') {
        reviewContainer.innerHTML = '';

        quizData.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            const correctAnswer = question.answers.find(answer => answer.is_correct);

            // Check if it matches filter
            let showItem = false;

            if (filter === 'all') {
                showItem = true;
            } else if (filter === 'incorrect' && userAnswer !== null && userAnswer !== correctAnswer.answer) {
                showItem = true;
            } else if (filter === 'skipped' && userAnswer === null) {
                showItem = true;
            }

            // Apply search term if provided
            if (searchTerm && showItem) {
                const questionText = question.question.toLowerCase();
                const correctText = correctAnswer.answer.toLowerCase();
                const userText = userAnswer ? userAnswer.toLowerCase() : '';

                showItem = questionText.includes(searchTerm) ||
                          correctText.includes(searchTerm) ||
                          userText.includes(searchTerm);
            }

            if (showItem) {
                const reviewItem = document.createElement('div');
                reviewItem.className = 'review-item';

                // Determine status icon
                let statusIcon = '';
                let statusClass = '';

                if (userAnswer === null) {
                    statusIcon = '⚠️';
                    statusClass = 'skipped';
                } else if (userAnswer === correctAnswer.answer) {
                    statusIcon = '✓';
                    statusClass = 'correct';
                } else {
                    statusIcon = '✗';
                    statusClass = 'incorrect';
                }

                reviewItem.innerHTML = `
                    <h3><span class="status-icon ${statusClass}">${statusIcon}</span> Вопрос ${index + 1}</h3>
                    <p>${question.question}</p>
                    ${userAnswer !== null ? 
                        `<div class="review-user-answer ${userAnswer === correctAnswer.answer ? 'correct' : 'incorrect'}">
                            Ваш ответ: ${userAnswer}
                        </div>` :
                        '<div class="review-user-answer skipped">Вы пропустили этот вопрос</div>'
                    }
                    <div class="review-correct-answer">
                        Правильный ответ: ${correctAnswer.answer}
                    </div>
                    ${question.explanation ? 
                        `<div class="review-explanation">
                            Объяснение: ${question.explanation}
                        </div>` : ''
                    }
                `;

                reviewContainer.appendChild(reviewItem);
            }
        });

        // Show message if no items match filter
        if (reviewContainer.children.length === 0) {
            const noItems = document.createElement('div');
            noItems.className = 'no-items';
            noItems.textContent = 'Нет вопросов, соответствующих выбранным критериям';
            reviewContainer.appendChild(noItems);
        }
    }

    // Restart quiz
    function restartQuiz() {
        userAnswers = Array(quizData.length).fill(null);
        currentQuestion = 0;
        correctCount = 0;
        displayQuestion();
        showScreen(questionScreen);
    }

    // Export test results
    function exportResults(format) {
        fetch('/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                format: format,
                questions: quizData,
                userAnswers: userAnswers
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка HTTP! Статус: ${response.status}`);
            }
            return response.blob();
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ICEQ-Test_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Ошибка экспорта:', error);
            alert('Не удалось экспортировать тест: ' + error.message);
        });
    }

    // Export directly to TXT
    function exportToTxt() {
        exportResults('txt');
    }

    // Show specific screen and hide others
    function showScreen(screen) {
        // Hide all screensa
        [
            mainScreen, createTestScreen, loadTestScreen,
            loadingScreen, testPreviewScreen, editQuestionsScreen, questionScreen,
            explanationScreen, resultsScreen, reviewAnswersScreen
        ].forEach(s => {
            s.classList.remove('active');
        });

        // Show selected screen
        screen.classList.add('active');

        // Scroll to top of the visible screen
        appContainer.scrollTop = 0;
        scrollToActiveScreen();
    }
});
