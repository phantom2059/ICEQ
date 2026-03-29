# ICEQ

**Автоматическая генерация вопросов по тексту с помощью LLM**

![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat-square&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=flat-square&logo=flask&logoColor=white)
![FAISS](https://img.shields.io/badge/FAISS-0866FF?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## Overview

Приложение для автоматической генерации вопросов с вариантами ответов на основе произвольного текста. На вход подаётся документ любого размера — на выходе набор вопросов с 4 вариантами ответов и пояснениями.

Проект использует кластеризацию эмбеддингов чанков через FAISS для отбора наиболее репрезентативных фрагментов, которые затем передаются на вход LLM для генерации вопросов.

---

## Algorithm

1. Текст разбивается на чанки по абзацам
2. Чанки фильтруются и векторизуются (эмбеддинги)
3. Эмбеддинги кластеризуются через FAISS (`n_clusters = n_chunks * 0.01`)
4. Из каждого кластера выбирается ближайший к центроиду объект
5. Центральные чанки передаются в LLM для генерации вопросов с вариантами ответов

---

## Models

Поддерживается три бэкенда для генерации:

| Модель | Тип | Описание |
|-------|------|----------|
| DeepSeek API | Внешний API | Мощная языковая модель, используется по умолчанию |
| Qwen API | Внешний API | Альтернативный бэкенд (Chutes) |
| ICEQ (T-lite-it-1.0) | Локальная | Дообученная на QA-датасете, работает без API |

В рамках проекта была дообучена модель [T-lite-it-1.0](https://huggingface.co/t-tech/T-lite-it-1.0) на генерацию вопросов по фрагментам текста.

---

## Project structure

```
├── src/
│   ├── app.py                   # Flask веб-сервер
│   ├── generation.py            # QuestionsGenerator — основной класс
│   ├── question_generator_api.py # API-обёртки для LLM
│   ├── system_prompt.txt        # Системный промпт
│   ├── user_prompt.txt          # Пользовательский промпт
│   ├── templates/               # HTML-шаблоны
│   └── static/                  # CSS / JS
├── img/                         # Изображения для README
├── requirements.txt
└── LICENSE
```

---

## Quick start

### Установка

```bash
git clone https://github.com/phantom2059/ICEQ.git
cd ICEQ
pip install -r requirements.txt
```

Создайте файл `.env` в папке `src/` с API-ключами (нужен хотя бы один):

```
DEEPSEEK_API_KEY=<your key>
CHUTES_API_KEY=<your key>
```

### Python API

```python
from generation import QuestionsGenerator

with open("text.txt", "r", encoding="utf8") as f:
    text = f.read()

generator = QuestionsGenerator()

# DeepSeek API (по умолчанию)
questions = generator.generate(text, 10, llm="deepseek")

# Qwen API
questions = generator.generate(text, 10, llm="qwen")

# Локальная модель ICEQ
questions = generator.generate(text, 10, llm="iceq")
```

Метод `generate()` возвращает `list[dict]` — каждый словарь содержит `question`, `answers` (с полем `is_correct`) и `explanation`.

### Web-интерфейс

```bash
cd src
python app.py
```

Откройте `http://127.0.0.1:8080/` в браузере.

---

## Авторы

- [Сергей Катцын](https://github.com/phantom2059)
- [Никита Бакутов](https://github.com/bakutov)

---

## License

MIT
