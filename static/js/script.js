document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const startScreen = document.getElementById('start-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const questionScreen = document.getElementById('question-screen');
    const explanationScreen = document.getElementById('explanation-screen');
    const resultsScreen = document.getElementById('results-screen');
    const reviewAnswersScreen = document.getElementById('review-answers-screen');

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

    const userAnswerDisplay = document.getElementById('user-answer');
    const correctAnswerDisplay = document.getElementById('correct-answer');
    const explanationText = document.getElementById('explanation-text');
    const nextBtn = document.getElementById('next-btn');

    const score = document.getElementById('score');
    const reviewAnswersBtn = document.getElementById('review-answers-btn');
    const restartBtn = document.getElementById('restart-btn');

    const reviewContainer = document.getElementById('review-container');
    const backToResultsBtn = document.getElementById('back-to-results-btn');

    const themeSwitch = document.getElementById('theme-switch');
    const questionNumber = document.getElementById('question-number');
    const loadingLog = document.getElementById('loading-log');

    // Quiz state
    let quizData = [];
    let currentQuestion = 0;
    let userAnswers = [];
    let selectedOption = null;
    let correctCount = 0;

    // Load theme from localStorage
    const savedTheme = localStorage.getItem('quizTheme');
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeSwitch.checked = true;
    }

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
    backToResultsBtn.addEventListener('click', () => showScreen(resultsScreen));

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

        // В реальном проекте здесь будет запрос к API
        // Для примера используем моковые данные
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

            // Пример данных для отладки
            console.log("Проблема с сервером, использую тестовые данные для демо");

            setTimeout(() => {
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
                    }
                ];

                logMessage("Демо-режим: загружаю тестовые вопросы");
                quizData = mockQuestions;
                currentQuestion = 0;
                userAnswers = Array(quizData.length).fill(null);
                correctCount = 0;
                startQuiz();
            }, 2000);
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
        const isCorrect = selectedOption === correctAnswerObj.answer;

        if (isCorrect) {
            correctCount++;
        }

        showAnswerExplanation(correctAnswerObj.answer, isCorrect);
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
        reviewContainer.innerHTML = '';

        quizData.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            const correctAnswer = question.answers.find(answer => answer.is_correct).answer;
            const isCorrect = userAnswer === correctAnswer;
            const isSkipped = userAnswer === null;

            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';

            const questionTitle = document.createElement('h3');
            questionTitle.textContent = `Вопрос ${index + 1}`;
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

    // Restart the quiz
    function restartQuiz() {
        currentQuestion = 0;
        userAnswers = [];
        correctCount = 0;
        showScreen(startScreen);
    }

    // Show specific screen and hide others
    function showScreen(screenToShow) {
        [startScreen, loadingScreen, questionScreen, explanationScreen, resultsScreen, reviewAnswersScreen].forEach(screen => {
            screen.classList.remove('active');
        });
        screenToShow.classList.add('active');
    }
});
