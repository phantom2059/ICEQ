"""
API модуль для генерации вопросов через DeepSeek и Qwen

Этот модуль содержит асинхронные функции для взаимодействия с внешними API:
- generate_questions_deepseek: использует DeepSeek API для генерации вопросов
- generate_questions_qwen: использует Qwen API для генерации вопросов
- test_question_generation: тестовая функция для проверки работоспособности API

Требует настройки переменных окружения:
- DEEPSEEK_API_KEY: ключ для DeepSeek API
- CHUTES_API_KEY: ключ для Qwen API
"""

import aiohttp
import asyncio
import json
import os
import re
from dotenv import load_dotenv

# Загружаем переменные окружения с обработкой кодировок
try:
    # Явно указываем путь к .env в корневой директории
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    env_path = os.path.join(project_root, '.env')

    if os.path.exists(env_path):
        loaded_successfully = False
        # Пробуем разные кодировки, чтобы справиться с BOM в Windows
        for encoding in ['utf-8-sig', 'utf-16', 'utf-8', 'cp1251']:
            try:
                # override=True чтобы новые значения заменили старые, если они есть
                if load_dotenv(dotenv_path=env_path, encoding=encoding, override=True):
                    loaded_successfully = True
                    break  # Выходим из цикла при успехе
            except Exception:
                continue # Пробуем следующую кодировку

        if not loaded_successfully:
            print("⚠️ Не удалось загрузить .env файл. Пожалуйста, сохраните его в кодировке UTF-8.")
    else:
        # Fallback, если .env не найден в корне
        if load_dotenv(override=True):
            print("ℹ️ .env файл в корне не найден, используется стандартный поиск.")
        else:
            print("⚠️ .env файл не найден ни в одном из стандартных мест.")

except Exception as e:
    print(f"⚠️ Критическая ошибка при загрузке .env: {e}")


def analyze_text_sufficiency(text: str, num_questions: int) -> dict:
    """
    Анализирует достаточность текста для генерации заданного количества вопросов
    
    Args:
        text (str): Входной текст для анализа
        num_questions (int): Желаемое количество вопросов
    
    Returns:
        dict: Словарь с результатами анализа:
            - is_sufficient (bool): Достаточно ли текста
            - recommended_questions (int): Рекомендуемое количество вопросов
            - text_stats (dict): Статистика текста
            - warnings (list): Список предупреждений
    """
    warnings = []
    text_stats = {}
    
    # Базовая статистика текста
    words = text.split()
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    paragraphs = text.split('\n\n')
    paragraphs = [p.strip() for p in paragraphs if p.strip()]
    
    text_stats = {
        'characters': len(text),
        'words': len(words),
        'sentences': len(sentences),
        'paragraphs': len(paragraphs)
    }
    
    # Эвристические правила для оценки достаточности
    # Минимум ~100-150 слов на вопрос для качественной генерации
    min_words_per_question = 100
    optimal_words_per_question = 150
    
    # Оценка достаточности по словам
    min_words_needed = num_questions * min_words_per_question
    optimal_words_needed = num_questions * optimal_words_per_question
    
    is_sufficient = text_stats['words'] >= min_words_needed
    
    # Рекомендуемое количество вопросов на основе объема текста
    recommended_questions = max(1, text_stats['words'] // optimal_words_per_question)
    
    # Проверки и предупреждения
    if text_stats['words'] < min_words_needed:
        if text_stats['words'] < 100:  # Блокируем только критически маленькие тексты
            warnings.append(f"Критически мало текста ({text_stats['words']} слов). Минимум для качественной генерации: 100 слов.")
        elif text_stats['words'] < 200:
            warnings.append(f"Мало текста ({text_stats['words']} слов). Рекомендуется добавить больше информации для лучшего качества.")
        else:
            warnings.append(f"Недостаточно текста для {num_questions} вопросов. Рекомендуется не более {recommended_questions} вопросов.")
    
    if text_stats['sentences'] < num_questions * 2:
        warnings.append(f"Мало предложений ({text_stats['sentences']}) для генерации {num_questions} разнообразных вопросов.")
    
    if text_stats['paragraphs'] < 2 and num_questions > 5:
        warnings.append("Текст состоит из одного абзаца. Для большого количества вопросов рекомендуется структурированный текст.")
    
    # Проверка на повторяющиеся фразы (может указывать на низкое качество)
    word_freq = {}
    for word in words:
        word_lower = word.lower().strip('.,!?;:')
        if len(word_lower) > 3:  # Игнорируем короткие слова
            word_freq[word_lower] = word_freq.get(word_lower, 0) + 1
    
    # Если слишком много повторений одних и тех же слов
    max_repetitions = max(word_freq.values()) if word_freq else 0
    if max_repetitions > len(words) * 0.1:  # Если какое-то слово встречается более чем в 10% текста
        warnings.append("В тексте много повторений. Это может снизить качество генерируемых вопросов.")
    
    return {
        'is_sufficient': is_sufficient,
        'recommended_questions': recommended_questions,
        'text_stats': text_stats,
        'warnings': warnings,
        'severity': 'error' if text_stats['words'] < 100 else 'warning' if warnings else 'ok'
    }


async def generate_questions_deepseek(text: str, num_questions: int = 5):
    """
    Генерирует вопросы по тексту используя DeepSeek API
    
    Args:
        text (str): Текст для генерации вопросов
        num_questions (int): Количество вопросов для генерации (по умолчанию 5)
    
    Returns:
        str: Сгенерированные вопросы в текстовом формате
        
    Raises:
        ValueError: Если не найден API ключ DeepSeek
        Exception: При ошибках API запроса
    """
    api_token = os.getenv('DEEPSEEK_API_KEY')
    
    if not api_token:
        raise ValueError("DEEPSEEK_API_KEY не найден в переменных окружения")

    headers = {
        "Authorization": "Bearer " + api_token,
        "Content-Type": "application/json"
    }

    # Загружаем промпты из файлов
    try:
        # Определяем текущую директорию для поиска файлов промптов
        current_dir = os.path.dirname(os.path.abspath(__file__))
        system_prompt_path = os.path.join(current_dir, 'system_prompt.txt')
        user_prompt_path = os.path.join(current_dir, 'user_prompt.txt')
        
        # Читаем системный и пользовательский промпты
        with open(system_prompt_path, 'r', encoding='utf8') as f:
            system_prompt = f.read()
        with open(user_prompt_path, 'r', encoding='utf8') as f:
            user_prompt_template = f.read()
            
        
    except FileNotFoundError as e:
        print(f"Ошибка загрузки промптов: {e}")
        # Fallback промпты на случай отсутствия файлов
        system_prompt = "Ты - эксперт по созданию образовательных тестов."
        user_prompt_template = "Создай [QUESTIONS_NUM] вопросов по тексту: [CHUNKS]"
    
    # Формируем пользовательский промпт, заменяя плейсхолдеры
    user_prompt = user_prompt_template.replace('[QUESTIONS_NUM]', str(num_questions))
    user_prompt = user_prompt.replace('[CHUNKS]', text)
    
    # Формируем тело запроса к API
    body = {
        "model": "deepseek-ai/DeepSeek-V3-0324",
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],
        "stream": True,  # Включаем потоковую передачу
        "temperature": 0.3  # Низкая температура для более предсказуемых результатов
    }

    full_response = ""
    response_chunks = 0
    
    # Выполняем асинхронный запрос к API
    async with aiohttp.ClientSession() as session:
        async with session.post(
                "https://llm.chutes.ai/v1/chat/completions",
                headers=headers,
                json=body
        ) as response:
            # Проверяем статус ответа
            if response.status != 200:
                error_text = await response.text()
                print(f"Ошибка API: {response.status} - {error_text}")
                raise Exception(f"Ошибка API DeepSeek: {response.status} - {error_text}")
                
            # Обрабатываем потоковый ответ
            async for line in response.content:
                line = line.decode("utf-8").strip()
                if line.startswith("data: "):
                    data = line[6:]  # Убираем префикс "data: "
                    if data == "[DONE]":
                        break
                    try:
                        # Парсим JSON чанк
                        chunk_json = json.loads(data)
                        if 'choices' in chunk_json and len(chunk_json['choices']) > 0:
                            delta = chunk_json['choices'][0].get('delta', {})
                            if 'content' in delta and delta['content']:
                                content = delta['content']
                                full_response += content
                                response_chunks += 1
                    except json.JSONDecodeError:
                        # Пропускаем некорректные JSON чанки
                        continue
    
    if not full_response.strip():
        print("Получен пустой ответ от API")
    
    return full_response


async def generate_questions_qwen(text: str, num_questions: int = 5):
    """
    Генерирует вопросы по тексту используя Qwen API
    
    Args:
        text (str): Текст для генерации вопросов
        num_questions (int): Количество вопросов для генерации (по умолчанию 5)
    
    Returns:
        str: Сгенерированные вопросы в текстовом формате
        
    Raises:
        ValueError: Если не найден API ключ Qwen
        Exception: При ошибках API запроса
    """
    api_token = os.getenv('CHUTES_API_KEY')
    
    if not api_token:
        raise ValueError("CHUTES_API_KEY не найден в переменных окружения")

    headers = {
        "Authorization": "Bearer " + api_token,
        "Content-Type": "application/json"
    }

    # Загружаем промпты из файлов
    try:
        # Определяем текущую директорию для поиска файлов промптов
        current_dir = os.path.dirname(os.path.abspath(__file__))
        system_prompt_path = os.path.join(current_dir, 'system_prompt.txt')
        user_prompt_path = os.path.join(current_dir, 'user_prompt.txt')
        
        # Читаем системный и пользовательский промпты
        with open(system_prompt_path, 'r', encoding='utf8') as f:
            system_prompt = f.read()
        with open(user_prompt_path, 'r', encoding='utf8') as f:
            user_prompt_template = f.read()
            
        
    except FileNotFoundError as e:
        print(f"Ошибка загрузки промптов: {e}")
        # Fallback промпты на случай отсутствия файлов
        system_prompt = "Ты - эксперт по созданию образовательных тестов."
        user_prompt_template = "Создай [QUESTIONS_NUM] вопросов по тексту: [CHUNKS]"
    
    # Формируем пользовательский промпт
    user_prompt = user_prompt_template.replace('[QUESTIONS_NUM]', str(num_questions))
    user_prompt = user_prompt.replace('[CHUNKS]', text)
    
    # Формируем тело запроса к API
    body = {
        "model": "Qwen/Qwen3-235B-A22B",
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],
        "stream": True,  # Включаем потоковую передачу
        "temperature": 0.3  # Низкая температура для более предсказуемых результатов
    }

    full_response = ""
    response_chunks = 0
    
    # Выполняем асинхронный запрос к API
    async with aiohttp.ClientSession() as session:
        async with session.post(
                "https://llm.chutes.ai/v1/chat/completions",
                headers=headers,
                json=body
        ) as response:
            # Проверяем статус ответа
            if response.status != 200:
                error_text = await response.text()
                print(f"Ошибка API: {response.status} - {error_text}")
                raise Exception(f"Ошибка API Qwen: {response.status} - {error_text}")
                
            # Обрабатываем потоковый ответ
            async for line in response.content:
                line = line.decode("utf-8").strip()
                if line.startswith("data: "):
                    data = line[6:]  # Убираем префикс "data: "
                    if data == "[DONE]":
                        break
                    try:
                        # Парсим JSON чанк
                        chunk_json = json.loads(data)
                        if 'choices' in chunk_json and len(chunk_json['choices']) > 0:
                            delta = chunk_json['choices'][0].get('delta', {})
                            if 'content' in delta and delta['content']:
                                content = delta['content']
                                full_response += content
                                response_chunks += 1
                    except json.JSONDecodeError:
                        # Пропускаем некорректные JSON чанки
                        continue
    
    if not full_response.strip():
        print("Получен пустой ответ от API")
    
    return full_response


async def test_question_generation():
    """
    Тестовая функция для проверки генерации вопросов
    
    Генерирует 3 вопроса по тестовому тексту об искусственном интеллекте
    для проверки работоспособности API DeepSeek и Qwen
    """
    test_text = """
    Искусственный интеллект (ИИ) — это область информатики, которая занимается созданием 
    интеллектуальных машин, способных работать и реагировать как люди. ИИ включает в себя 
    машинное обучение, обработку естественного языка, компьютерное зрение и многие другие 
    технологии. Современные системы ИИ используются в различных областях: от медицины и 
    финансов до транспорта и развлечений.
    """
    
    print("🚀 Запуск тестовой генерации вопросов...")
    
    # Тестируем DeepSeek
    try:
        print("\n📋 Тестирование DeepSeek...")
        questions_deepseek = await generate_questions_deepseek(test_text, 3)
        print("✅ DeepSeek тест успешно завершен!")
        print(f"📋 Результат DeepSeek:\n{questions_deepseek}")
    except Exception as e:
        print(f"❌ Ошибка тестирования DeepSeek: {e}")
    
    # Тестируем Qwen
    try:
        print("\n🧠 Тестирование Qwen...")
        questions_qwen = await generate_questions_qwen(test_text, 3)
        print("✅ Qwen тест успешно завершен!")
        print(f"📋 Результат Qwen:\n{questions_qwen}")
    except Exception as e:
        print(f"❌ Ошибка тестирования Qwen: {e}")


if __name__ == "__main__":
    asyncio.run(test_question_generation()) 