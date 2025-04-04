document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements - Main Screens
    const mainScreen = document.getElementById('main-screen');
    const createTestScreen = document.getElementById('create-test-screen');
    const loadTestScreen = document.getElementById('load-test-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const testPreviewScreen = document.getElementById('test-preview-screen');
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

    // Test Preview Screen Elements
    const backToCreateTest = document.getElementById('back-to-create-test');
    const previewQuestionCount = document.getElementById('preview-question-count');
    const previewNumber = document.getElementById('preview-number');
    const previewQuestionText = document.getElementById('preview-question-text');
    const previewAnswers = document.getElementById('preview-answers');
    const questionsAccordion = document.getElementById('questions-accordion');
    const downloadTestBtn = document.getElementById('download-test-btn');
    const startTestBtn = document.getElementById('start-test-btn');

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

    // Review Answers Screen Elements
    const reviewContainer = document.getElementById('review-container');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchQuestions = document.getElementById('search-questions');
    const backToResultsBtn = document.getElementById('back-to-results-btn');

    // Theme Toggle
    const themeSwitch = document.getElementById('theme-switch');

    // Quiz state
    let quizData = [];
    let currentQuestion = 0;
    let userAnswers = [];
    let selectedOption = null;
    let correctCount = 0;
    let showExplanationsMode = true;

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

    // ==== QUESTION SCREEN EVENTS ====
    answerBtn.addEventListener('click', submitAnswer);
    skipBtn.addEventListener('click', skipQuestion);

    // ==== EXPLANATION SCREEN EVENTS ====
    nextBtn.addEventListener('click', goToNextQuestion);

    // ==== RESULTS SCREEN EVENTS ====
    reviewAnswersBtn.addEventListener('click', reviewAnswers);
    exportResultsBtn.addEventListener('click', exportResults);
    restartBtn.addEventListener('click', restartQuiz);

    // ==== REVIEW ANSWERS SCREEN EVENTS ====
    backToResultsBtn.addEventListener('click', () => showScreen(resultsScreen));

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
            processFile(file);
        } else {
            fileName.textContent = "";
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

        if (activeTab === 'text' && textContent.value.trim() === '') {
            alert('Пожалуйста, введите текст для генерации теста.');
            return;
        }

        if (activeTab === 'file' && !fileUpload.files[0]) {
            alert('Пожалуйста, выберите файл для генерации теста.');
            return;
        }

        showScreen(loadingScreen);
        loadingLog.innerHTML = ''; // Clear previous logs
        loaderProgress.textContent = '0%';
        logMessage("Начинаем обработку...");

        // Simulate progress
        simulateGenerationProgress();

        if (activeTab === 'text') {
            generateFromText(textContent.value);
        } else {
            const file = fileUpload.files[0];
            logMessage(`Обработка файла: ${file.name}`);
            generateFromText(textContent.value);
        }
    }

    // Simulate generation progress
    function simulateGenerationProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.floor(Math.random() * 5) + 1;
            if (progress > 100) progress = 100;
            loaderProgress.textContent = `${progress}%`;

            if (progress === 100) clearInterval(interval);
        }, 300);
    }

    // Generate questions from text
    function generateFromText(textContent) {
        logMessage("Анализ текста...");

        setTimeout(() => {
            logMessage("Извлечение ключевых концепций...");
        }, 1000);

        setTimeout(() => {
            logMessage("Формирование вопросов...");
        }, 2000);

        setTimeout(() => {
            logMessage("Генерация вариантов ответов...");
        }, 3000);

        setTimeout(() => {
            logMessage("Проверка качества теста...");
        }, 4000);

        // В реальном проекте здесь будет запрос к API
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

    // Load ready test from file
    function loadReadyTest() {
        if (!readyTestUpload.files.length) {
            alert('Пожалуйста, выберите файл теста для загрузки.');
            return;
        }

        const file = readyTestUpload.files[0];
        const reader = new FileReader();

        showScreen(loadingScreen);
        loadingLog.innerHTML = '';
        logMessage(`Загрузка готового теста: ${file.name}`);

        reader.onload = function(e) {
            try {
                const content = e.target.result;
                const testData = JSON.parse(content);

                if (!testData.questions || !Array.isArray(testData.questions)) {
                    throw new Error('Некорректный формат файла теста');
                }

                logMessage('Проверка структуры теста...');

                setTimeout(() => {
                    logMessage('Тест успешно загружен');
                    quizData = testData.questions;
                    showExplanationsMode = showExplanations.checked;
                    sessionStorage.setItem('showExplanationsMode', showExplanationsMode);

                    currentQuestion = 0;
                    userAnswers = Array(quizData.length).fill(null);
                    correctCount = 0;

                    setTimeout(() => {
                        startQuiz();
                    }, 1000);
                }, 1500);
            } catch (error) {
                logMessage(`Ошибка загрузки теста: ${error.message}`);
                setTimeout(() => showScreen(loadTestScreen), 2000);
            }
        };

        reader.onerror = function() {
            logMessage('Ошибка при чтении файла');
            setTimeout(() => showScreen(loadTestScreen), 2000);
        };

        reader.readAsText(file);
    }

    // Prepare the test preview screen
    function prepareTestPreview() {
        // Display first question
        showPreviewQuestion(0);

        // Create accordion list
        createQuestionsAccordion();
    }

    // Show preview of a question
    function showPreviewQuestion(index) {
        if (!quizData[index]) return;

        const question = quizData[index];
        previewNumber.textContent = (index + 1);
        previewQuestionText.textContent = question.question;

        previewAnswers.innerHTML = '';

        question.answers.forEach(answer => {
            const answerElement = document.createElement('div');
            answerElement.className = 'preview-answer';
            if (answer.is_correct) {
                answerElement.classList.add('correct');
            }
            answerElement.textContent = answer.answer;
            previewAnswers.appendChild(answerElement);
        });
    }

    // Create accordion list of questions
    function createQuestionsAccordion() {
        questionsAccordion.innerHTML = '';

        quizData.forEach((question, index) => {
            const accordionItem = document.createElement('div');
            accordionItem.className = 'accordion-item';

            const header = document.createElement('div');
            header.className = 'accordion-header';
            header.textContent = `Вопрос ${index + 1}`;
            if (index === 0) header.classList.add('active');

            const content = document.createElement('div');
            content.className = 'accordion-content';
            if (index === 0) content.classList.add('active');

            const questionPreview = document.createElement('p');
            questionPreview.textContent = question.question;
            content.appendChild(questionPreview);

            // Event for clicking on accordion header
            header.addEventListener('click', () => {
                document.querySelectorAll('.accordion-header').forEach(h => h.classList.remove('active'));
                document.querySelectorAll('.accordion-content').forEach(c => c.classList.remove('active'));
                header.classList.add('active');
                content.classList.add('active');
                showPreviewQuestion(index);
            });

            accordionItem.appendChild(header);
            accordionItem.appendChild(content);
            questionsAccordion.appendChild(accordionItem);
        });
    }

    // Download test as JSON file
    function downloadTest() {
        if (!quizData || quizData.length === 0) {
            alert("Нет данных для скачивания.");
            return;
        }

        const testData = {
            title: "ICEQ Тест",
            dateCreated: new Date().toISOString(),
            questions: quizData
        };

        const jsonData = JSON.stringify(testData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `ICEQ-Test_${new Date().toLocaleDateString().replace(/\./g, '-')}.json`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    // Export results as PDF or CSV
    function exportResults() {
        // This would be implemented with a library like jsPDF or a CSV generator
        alert("Экспорт результатов будет доступен в следующих версиях");
    }

    // Display logging message in the loading screen
    function logMessage(message) {
        const logEntry = document.createElement('div');
        logEntry.textContent = message;
        loadingLog.appendChild(logEntry);
        loadingLog.scrollTop = loadingLog.scrollHeight;
    }

    // Start the quiz
    function startQuiz() {
        currentQuestion = 0;
        userAnswers = Array(quizData.length).fill(null);
        correctCount = 0;

        // Check if explanations mode is set
        showExplanationsMode = sessionStorage.getItem('showExplanationsMode') === 'false' ? false : true;

        showScreen(questionScreen);
        displayQuestion();
    }

    // Display current question
    function displayQuestion() {
        if (!quizData || !quizData[currentQuestion]) {
            console.error("Invalid question data", quizData, currentQuestion);
            logMessage("Ошибка данных вопроса");
            showScreen(mainScreen);
            return;
        }

        const question = quizData[currentQuestion];

        questionCount.textContent = `Вопрос ${currentQuestion + 1} из ${quizData.length}`;
        questionText.textContent = question.question;

        const progressPercentage = ((currentQuestion + 1) / quizData.length) * 100;
        progressFill.style.width = `${progressPercentage}%`;

        answersContainer.innerHTML = '';
        selectedOption = null;

        question.answers.forEach((option, index) => {
            const answerElement = document.createElement('div');
            answerElement.className = 'answer-option';
            answerElement.textContent = option.answer;
            answerElement.dataset.index = index;

            answerElement.addEventListener('click', () => {
                document.querySelectorAll('.answer-option').forEach(el => {
                    el.classList.remove('selected');
                });

                answerElement.classList.add('selected');
                selectedOption = option.answer;

                answerBtn.disabled = false;
            });

            answersContainer.appendChild(answerElement);
        });

        answerBtn.disabled = true;
    }

    // Submit the answer
    function submitAnswer() {
        if (!selectedOption) return;

        const question = quizData[currentQuestion];
        const correctAnswerObj = question.answers.find(option => option.is_correct);

        userAnswers[currentQuestion] = selectedOption;
        const isCorrect = selectedOption === correctAnswerObj.answer;

        if (isCorrect) {
            correctCount++;
        }

        // If explanations are disabled, go to next question directly
        if (!showExplanationsMode) {
            if (currentQuestion < quizData.length - 1) {
                currentQuestion++;
                displayQuestion();
            } else {
                showResults();
            }
        } else {
            showAnswerExplanation(correctAnswerObj.answer, isCorrect);
        }
    }

    // Skip the current question
    function skipQuestion() {
        userAnswers[currentQuestion] = null;

        if (currentQuestion < quizData.length - 1) {
            currentQuestion++;
            displayQuestion();
        } else {
            showResults();
        }
    }

    // Show explanation for the current answer
    function showAnswerExplanation(correctAnswer, isCorrect) {
        const question = quizData[currentQuestion];

        showScreen(explanationScreen);

        // Показываем ответ пользователя с соответствующим цветом
        userAnswerDisplay.textContent = `Ваш ответ: ${selectedOption}`;
        userAnswerDisplay.className = 'user-answer';
        userAnswerDisplay.classList.add(isCorrect ? 'correct' : 'incorrect');

        correctAnswerDisplay.textContent = `Правильный ответ: ${correctAnswer}`;
        explanationText.textContent = question.explanation || "Объяснение отсутствует.";

        if (currentQuestion === quizData.length - 1) {
            nextBtn.textContent = 'Посмотреть результаты';
        } else {
            nextBtn.textContent = 'Далее';
        }
    }

    // Go to the next question or results
    function goToNextQuestion() {
        if (currentQuestion < quizData.length - 1) {
            currentQuestion++;
            showScreen(questionScreen);
            displayQuestion();
        } else {
            showResults();
        }
    }

    // Show quiz results
    function showResults() {
        showScreen(resultsScreen);
        score.textContent = `${correctCount}/${quizData.length}`;
    }

    // Review answers
    function reviewAnswers() {
        showScreen(reviewAnswersScreen);

        // Reset filters and search
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
        searchQuestions.value = '';

        createReviewItems();
    }

    // Create review items
    function createReviewItems() {
        reviewContainer.innerHTML = '';

        quizData.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            const correctAnswer = question.answers.find(answer => answer.is_correct).answer;
            const isCorrect = userAnswer === correctAnswer;
            const isSkipped = userAnswer === null;

            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            reviewItem.dataset.status = isSkipped ? 'skipped' : (isCorrect ? 'correct' : 'incorrect');

            const questionTitle = document.createElement('h3');

            // Add status icon
            const statusIcon = document.createElement('span');
            statusIcon.className = 'status-icon';
            if (isSkipped) {
                statusIcon.textContent = '⚠️';
                statusIcon.classList.add('skipped');
                statusIcon.title = 'Пропущено';
            } else if (isCorrect) {
                statusIcon.textContent = '✓';
                statusIcon.classList.add('correct');
                statusIcon.title = 'Верно';
            } else {
                statusIcon.textContent = '✗';
                statusIcon.classList.add('incorrect');
                statusIcon.title = 'Неверно';
            }

            questionTitle.appendChild(statusIcon);
            questionTitle.appendChild(document.createTextNode(` Вопрос ${index + 1}`));
            reviewItem.appendChild(questionTitle);

            const questionContent = document.createElement('p');
            questionContent.textContent = question.question;
            reviewItem.appendChild(questionContent);

            // User Answer
            const userAnswerElement = document.createElement('div');

            if (isSkipped) {
                userAnswerElement.className = 'skipped';
                userAnswerElement.textContent = 'Вопрос был пропущен';
            } else {
                userAnswerElement.className = 'review-user-answer';
                userAnswerElement.classList.add(isCorrect ? 'correct' : 'incorrect');
                userAnswerElement.textContent = `Ваш ответ: ${userAnswer}`;
            }

            reviewItem.appendChild(userAnswerElement);

            // Correct Answer
            const correctAnswerElement = document.createElement('div');
            correctAnswerElement.className = 'review-correct-answer';
            correctAnswerElement.textContent = `Правильный ответ: ${correctAnswer}`;
            reviewItem.appendChild(correctAnswerElement);

            // Explanation
            if (question.explanation) {
                const explanationElement = document.createElement('div');
                explanationElement.className = 'review-explanation';
                explanationElement.textContent = question.explanation;
                reviewItem.appendChild(explanationElement);
            }

            reviewContainer.appendChild(reviewItem);
        });
    }

    // Filter review items by status and search term
    function filterReviewItems(filter, searchTerm = '') {
        const reviewItems = document.querySelectorAll('.review-item');

        reviewItems.forEach(item => {
            const itemStatus = item.dataset.status;
            const questionText = item.querySelector('p').textContent.toLowerCase();
            const matchesSearch = !searchTerm || questionText.includes(searchTerm);

            if ((filter === 'all' || filter === itemStatus) && matchesSearch) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Restart the quiz
    function restartQuiz() {
        currentQuestion = 0;
        userAnswers = [];
        correctCount = 0;
        showScreen(mainScreen);
    }

    // Show specific screen and hide others
    function showScreen(screenToShow) {
        [
            mainScreen,
            createTestScreen,
            loadTestScreen,
            loadingScreen,
            testPreviewScreen,
            questionScreen,
            explanationScreen,
            resultsScreen,
            reviewAnswersScreen
        ].forEach(screen => {
            screen.classList.remove('active');
        });

        screenToShow.classList.add('active');
    }
});
