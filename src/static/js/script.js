document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const startScreen = document.getElementById('start-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const questionScreen = document.getElementById('question-screen');
    const explanationScreen = document.getElementById('explanation-screen');
    const resultsScreen = document.getElementById('results-screen');

    const textInputTab = document.getElementById('text-input-tab');
    const fileInputTab = document.getElementById('file-input-tab');
    const tabButtons = document.querySelectorAll('.tab-btn');

    const textContent = document.getElementById('text-content');
    const fileUpload = document.getElementById('file-upload');
    const fileName = document.getElementById('file-name');
    const dropArea = document.getElementById('drop-area');
    const generateBtn = document.getElementById('generate-btn');

    const questionCount = document.getElementById('question-count');
    const questionText = document.getElementById('question-text');
    const answersContainer = document.getElementById('answers-container');
    const answerBtn = document.getElementById('answer-btn');
    const skipBtn = document.getElementById('skip-btn');
    const progressFill = document.getElementById('progress-fill');

    const correctAnswerDisplay = document.getElementById('correct-answer');
    const explanationText = document.getElementById('explanation-text');
    const nextBtn = document.getElementById('next-btn');

    const score = document.getElementById('score');
    const reviewAnswersBtn = document.getElementById('review-answers-btn');
    const restartBtn = document.getElementById('restart-btn');

    const themeSwitch = document.getElementById('theme-switch');
    const questionNumber = document.getElementById('question-number');
    const loadingLog = document.getElementById('loading-log');

    // Quiz state
    let quizData = [];
    let currentQuestion = 0;
    let userAnswers = [];
    let selectedOption = null;
    let correctCount = 0;

    // Ensure quiz state is reset
    showScreen(startScreen);

    // Event Listeners

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const tabName = button.getAttribute('data-tab');
            if (tabName === 'text') {
                textInputTab.classList.add('active');
                fileInputTab.classList.remove('active');
            } else {
                textInputTab.classList.remove('active');
                fileInputTab.classList.add('active');
            }
        });
    });

    // File handling
    fileUpload.addEventListener('change', handleFile);

    // Update the file input accept attribute
    fileUpload.setAttribute('accept', '.txt,.pdf,.docx,.doc');

    // Drag and drop functionality
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

    // Button actions
    generateBtn.addEventListener('click', startGeneration);
    answerBtn.addEventListener('click', submitAnswer);
    skipBtn.addEventListener('click', skipQuestion);
    nextBtn.addEventListener('click', goToNextQuestion);

    reviewAnswersBtn.addEventListener('click', reviewAnswers);
    restartBtn.addEventListener('click', restartQuiz);

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

    // Functions

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
            const reader = new FileReader();

            reader.onload = function (e) {
                textContent.value = e.target.result;
            };

            reader.onerror = function () {
                alert("Ошибка чтения файла.");
            };

            reader.readAsText(file);
        } else {
            fileName.textContent = "";
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
        logMessage("Начинаем обработку...");

        if (activeTab === 'text') {
            generateFromText(textContent.value);
        } else {
            const file = fileUpload.files[0];
            const reader = new FileReader();

            logMessage(`Чтение файла: ${file.name}`);
            reader.onload = function (e) {
                logMessage("Файл успешно прочитан");
                generateFromText(e.target.result);
            };

            reader.onerror = function () {
                logMessage("Ошибка чтения файла");
                setTimeout(() => showScreen(startScreen), 2000);
            };

            reader.readAsText(file);
        }
    }

    // Generate questions from text
    function generateFromText(textContent) {
        logMessage("Анализ текста...");
        logMessage("Начинаем генерацию вопросов...");

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

                    currentQuestion = 0;
                    userAnswers = Array(quizData.length).fill(null);
                    correctCount = 0;

                    setTimeout(() => {
                        startQuiz();
                    }, 1000);
                } else {
                    logMessage("Не удалось сгенерировать вопросы. Попробуйте другой текст.");
                    setTimeout(() => showScreen(startScreen), 2000);
                }
            } else {
                logMessage(`Ошибка: ${data.message}`);
                setTimeout(() => showScreen(startScreen), 2000);
            }
        })
        .catch(error => {
            logMessage(`Произошла ошибка: ${error.message}`);
            setTimeout(() => showScreen(startScreen), 2000);
        });
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
        showScreen(questionScreen);
        displayQuestion();
    }

    // Display current question
    function displayQuestion() {
        if (!quizData || !quizData[currentQuestion]) {
            console.error("Invalid question data", quizData, currentQuestion);
            logMessage("Ошибка данных вопроса");
            showScreen(startScreen);
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
        if (selectedOption === correctAnswerObj.answer) {
            correctCount++;
        }

        showAnswerExplanation(correctAnswerObj.answer);
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
    function showAnswerExplanation(correctAnswer) {
        const question = quizData[currentQuestion];

        showScreen(explanationScreen);

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
        alert("Функция просмотра ответов будет доступна в следующей версии");
    }

    // Restart the quiz
    function restartQuiz() {
        currentQuestion = 0;
        userAnswers = [];
        correctCount = 0;
        showScreen(startScreen);
    }

    // Show specific screen and hide others
    function showScreen(screenToShow) {
        [startScreen, loadingScreen, questionScreen, explanationScreen, resultsScreen].forEach(screen => {
            screen.classList.remove('active');
        });
        screenToShow.classList.add('active');
    }
});