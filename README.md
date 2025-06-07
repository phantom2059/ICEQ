<p align="center"><img src=img/logo.png width=450px></p>
<p align="center"><b>ICEQ</b> (Input, Chunks, Embeddings, Questions) — это умное приложение для автоматической генерации вопросов по тексту с использованием передовых технологий ИИ. Превращайте любой текст в интерактивные тесты и викторины!</p>

<div align="center">
  <h3>🧠 Core ML & NLP</h3>
  <p>
    <img src="https://img.shields.io/badge/PyTorch-2.6.0+cu118-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" alt="PyTorch">
    <img src="https://img.shields.io/badge/Transformers-4.50.3-FFD43B?style=for-the-badge&logo=huggingface&logoColor=black" alt="Transformers">
    <img src="https://img.shields.io/badge/Sentence%20Transformers-4.0.1-FF6F00?style=for-the-badge&logo=huggingface&logoColor=white" alt="SentenceTransformers">
  </p>
  
  <h3>📊 Data & Math</h3>
  <p>
    <img src="https://img.shields.io/badge/Numpy-2.2.4-013243?style=for-the-badge&logo=numpy&logoColor=white" alt="NumPy">
    <img src="https://img.shields.io/badge/SciPy-1.15.2-8CAAE6?style=for-the-badge&logo=scipy&logoColor=white" alt="SciPy">
    <img src="https://img.shields.io/badge/scikit--learn-1.6.1-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" alt="Scikit-learn">
    <img src="https://img.shields.io/badge/FAISS-1.10.0-00D2FF?style=for-the-badge&logo=meta&logoColor=white" alt="FAISS">
  </p>
  
  <h3>🌐 Web & API</h3>
  <p>
    <img src="https://img.shields.io/badge/Flask-2.2.2-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask">
    <img src="https://img.shields.io/badge/DeepSeek-API-8A2BE2?style=for-the-badge&logo=openai&logoColor=white" alt="DeepSeek">
    <img src="https://img.shields.io/badge/HTTPX-0.28.1-5A9FD4?style=for-the-badge&logo=python&logoColor=white" alt="HTTPX">
    <img src="https://img.shields.io/badge/aiohttp-3.9.1-2C5AA0?style=for-the-badge&logo=aiohttp&logoColor=white" alt="aiohttp">
  </p>
  
  <h3>🛠 Utilities & Tools</h3>
  <p>
    <img src="https://img.shields.io/badge/tqdm-4.67.1-FFC107?style=for-the-badge&logo=python&logoColor=black" alt="tqdm">
    <img src="https://img.shields.io/badge/HuggingFace%20Hub-0.30.1-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black" alt="HuggingFace Hub">
    <img src="https://img.shields.io/badge/PyYAML-6.0.2-FF0000?style=for-the-badge&logo=yaml&logoColor=white" alt="PyYAML">
    <img src="https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  </p>
</div>

## Как работает алгоритм?

1. Текст по абзацам разбивается на ```чанки```. Чанки фильтруются и векторизуются.

<p align="center"><img src=img/chunk_split.png width=400px></p>

2. Эмбеддинги чанков кластеризуется на ```количество_чанков * 0.01``` кластеров. Из каждого кластера берётся ближайший к центру кластера объект.
<p align="center"><img src=img/clustering.png width=400px></p>

3. Центральные объекты каждого кластера передаются на вход ```LLM```.

## Обучение модели

<p align="center"><a href="https://www.kaggle.com/datasets/nikitabakutov/iceq-dataset">
  <img src="https://img.shields.io/badge/Kaggle_Dataset-ICEQ-20BEFF?style=for-the-badge&logo=databricks&logoColor=white" alt="Dataset">
</a></p>

В рамках проекта была дообучена языковая модель [t-tech/T-lite-it-1.0](https://huggingface.co/t-tech/T-lite-it-1.0) на генерацию вопросов по фрагментам текста

## Возможности
- Обработка длинных текстов
- Генерация вопросов на основе содержимого

## Установка

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/phantom2059/ICEQ.git
   ```
2. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```

## Использование
Перейдите в папку ```src```
```bash
cd src
```
Создайте файл ```.env``` и добавьте в него свой ключ DeepSeek API

```
DEEPSEEK_API_KEY=<Your API key>
```

### Python интерфейс

```python
from generation import QuestionsGenerator

with open('text.txt', 'r', encoding='utf8') as f:
    text = f.read()

# Генерация 10 вопросов по тексту
generator = QuestionsGenerator()
questions = generator.generate(text, 10)
```

```QuestionsGenerator.generate(text: str, questions_num: int) -> list[dict]``` возвращает список со словарями. Каждый словарь представляет из себя описание вопроса. Пример словаря:

```json
{
   "question": "Кто является автором романа «Евгений Онегин»?",
   "answers": [
      {
         "answer": "Александр Пушкин",
         "is_correct": true
      },
      {
         "answer": "Лев Толстой",
         "is_correct": false
      },
      {
         "answer": "Фёдор Достоевский",
         "is_correct": false
      },
      {
         "answer": "Николай Гоголь",
         "is_correct": false
      }
   ],
   "explanation": "Роман в стихах «Евгений Онегин» написан Александром Сергеевичем Пушкиным и является одним из ключевых произведений русской литературы."
}
```

### Графический Web интерфейс
1. Запустите сервер
   ```bash
   python app.py
   ```
2. Перейдите на запущенный локальный сервер ```http://127.0.0.1:8080/```
<p align="center">
  <img src="img/image_main.png" width="45%">
  <img src="img/web2.png" width="45%">
</p>

## Авторы
- [Сергей Катцын](https://github.com/phantom2059)
- [Никита Бакутов](https://github.com/droyti46)
```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                    ⭐ ICEQ ⭐                               ║
║                        Создаём будущее образования с ИИ                      ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
