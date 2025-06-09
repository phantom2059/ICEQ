'''
ICEQ (2025) - Модуль генерации вопросов

Основной функционал:
- Класс QuestionsGenerator для создания вопросов по тексту
- Постобработка и форматирование результатов

Пример использования:
    >>> generator = QuestionsGenerator()
    >>> questions = generator.generate(text, 10)
'''

from typing import Literal, List, Dict

import re
import os
import json

import torch
import faiss
import numpy as np
from dotenv import load_dotenv
from openai import OpenAI
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
from question_generator_api import generate_questions_deepseek, generate_questions_qwen
import asyncio

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

# Часть данных для кластеризации
DATA_PART = 0.01
# Минимальное количество кластеров
MIN_CLUSTERS_NUM = 10
# Максимальное количество кластеров
MAX_CLUSTERS_NUM = 500

# Тег в тексте промпта, который нужно заменить на количество вопросов
QUESTIONS_NUM_PROMPT_TAG = '[QUESTIONS_NUM]'
# Тег в тексте промпта, который нужно заменить на извлечённые чанки
CHUNKS_PROMPT_TAG = '[CHUNKS]'

ICEQ_MODEL_NAME = 'iceq_model'


def parse_questions(text_questions: str) -> list[dict]:
    """
    Парсит JSON с вопросами и возвращает структурированный список
    
    Args:
        text_questions (str): JSON текст с вопросами
    
    Returns:
        list[dict]: Список структурированных вопросов
    """
    print("🔍 === НАЧАЛО ПАРСИНГА ВОПРОСОВ ===")
    print(f"📝 Длина входного текста: {len(text_questions)} символов")
    print(f"📄 Первые 300 символов текста: {text_questions[:300]}...")
    
    # Извлекаем JSON из markdown блоков если есть
    json_text = text_questions.strip()
    if json_text.startswith('```json'):
        print("🔍 Обнаружен JSON в markdown блоке, извлекаем...")
        # Ищем начало и конец JSON блока
        start_marker = '```json'
        end_marker = '```'
        
        start_idx = json_text.find(start_marker) + len(start_marker)
        end_idx = json_text.find(end_marker, start_idx)
        
        if end_idx != -1:
            json_text = json_text[start_idx:end_idx].strip()
            print(f"✅ JSON извлечен из markdown, длина: {len(json_text)} символов")
            print(f"📄 Извлеченный JSON: {json_text[:200]}...")
        else:
            print("⚠️ Не найден закрывающий маркер для JSON блока")
    elif '```json' in json_text:
        print("🔍 JSON блок найден не в начале, извлекаем...")
        # Ищем JSON блок в любом месте текста
        start_marker = '```json'
        end_marker = '```'
        
        start_idx = json_text.find(start_marker)
        if start_idx != -1:
            start_idx += len(start_marker)
            end_idx = json_text.find(end_marker, start_idx)
            
            if end_idx != -1:
                json_text = json_text[start_idx:end_idx].strip()
                print(f"✅ JSON извлечен из середины текста, длина: {len(json_text)} символов")
                print(f"📄 Извлеченный JSON: {json_text[:200]}...")
            else:
                print("⚠️ Не найден закрывающий маркер для JSON блока")
    else:
        print("🔍 Markdown блоки не обнаружены, используем текст как есть")
    
    try:
        # Пытаемся распарсить как JSON
        print("🔍 Попытка парсинга как JSON...")
        json_data = json.loads(json_text)
        print("✅ JSON успешно распарсен!")
        
        questions = []
        
        # Обрабатываем разные форматы JSON
        if isinstance(json_data, dict) and 'questions' in json_data:
            print(f"📊 Найден объект с полем 'questions', содержит {len(json_data['questions'])} элементов")
            items = json_data['questions']
        elif isinstance(json_data, list):
            print(f"📊 Найден список из {len(json_data)} элементов")
            items = json_data
        else:
            print(f"⚠️ Неожиданный формат JSON: {type(json_data)}")
            items = []
        
        for i, item in enumerate(items):
            print(f"🔍 Обработка элемента {i+1}: {item}")
            
            # Проверяем наличие необходимых полей
            if not isinstance(item, dict):
                print(f"⚠️ Элемент {i+1} не является объектом: {type(item)}")
                continue
                
            question_text = item.get('question', '')
            if not question_text:
                print(f"⚠️ Элемент {i+1} не содержит вопроса")
                continue
            
            # Обрабатываем варианты ответов
            options = item.get('options', item.get('answers', []))
            if not options:
                print(f"⚠️ Элемент {i+1} не содержит вариантов ответов")
                continue
            
            # Определяем правильный ответ
            correct_answer = item.get('correct_answer', '')
            
            print(f"❓ Вопрос: {question_text}")
            print(f"📋 Варианты: {options}")
            print(f"✅ Правильный ответ: {correct_answer}")
            
            # Создаем список ответов в нужном формате
            answers = []
            for j, option in enumerate(options):
                # Правильный ответ может быть строкой (текст ответа) или номером
                is_correct = False
                
                if isinstance(correct_answer, str):
                    # Если correct_answer - строка, сравниваем с текстом варианта
                    is_correct = (option.strip() == correct_answer.strip())
                elif isinstance(correct_answer, int):
                    # Если correct_answer - номер (1-based)
                    is_correct = (j + 1 == correct_answer)
                
                answers.append({
                    'answer': option.strip(),
                    'is_correct': is_correct
                })
                
                print(f"  {j+1}. {option} {'✅' if is_correct else '❌'}")
            
            # Проверяем что есть хотя бы один правильный ответ
            correct_count = sum(1 for ans in answers if ans['is_correct'])
            if correct_count == 0:
                print(f"⚠️ Не найден правильный ответ для вопроса {i+1}, пытаемся исправить...")
                # Если не нашли точного соответствия, пробуем частичное
                for j, option in enumerate(options):
                    if correct_answer.lower() in option.lower() or option.lower() in correct_answer.lower():
                        answers[j]['is_correct'] = True
                        print(f"🔧 Установлен правильный ответ по частичному совпадению: {option}")
                        break
                else:
                    # Если все еще не найден, делаем первый вариант правильным
                    if answers:
                        answers[0]['is_correct'] = True
                        print(f"🔧 Установлен первый вариант как правильный по умолчанию")
            
            questions.append({
                'question': question_text,
                'answers': answers,
                'explanation': item.get('explanation', '')
            })
            print(f"✅ Вопрос {i+1} успешно добавлен")
        
        print(f"✅ JSON парсинг завершен, получено {len(questions)} вопросов")
        if questions:
            print("🔍 === РЕЗУЛЬТАТ ПАРСИНГА ===")
            for i, q in enumerate(questions):
                print(f"  {i+1}. {q['question'][:50]}... ({len(q['answers'])} ответов)")
            print("=== КОНЕЦ ПАРСИНГА ВОПРОСОВ ===")
            return questions
            
    except json.JSONDecodeError as e:
        print(f"❌ Ошибка парсинга JSON: {e}")
        print("🔍 Переходим к парсингу в старом формате...")
    
    # Если JSON не парсится, пробуем старый формат
    print("🔍 Применяем регулярные выражения для старого формата...")
    question_block_pattern = re.compile(r'(?ms)^\s*(\d+)\.\s*(.+?)(?=^\s*\d+\.\s|\Z)')
    answer_line_pattern = re.compile(r'^\s*([+-])\s*(.+)')
    explanation_line_pattern = re.compile(r'^\s*!\s*(.+)')

    questions = []
    blocks = question_block_pattern.findall(text_questions)
    print(f"📊 Найдено {len(blocks)} блоков вопросов")
    
    for i, (number, block) in enumerate(blocks):
        lines = block.splitlines()
        if not lines:
            continue
        
        question_text = lines[0].strip()
        answers = []
        explanation = ""

        for j, line in enumerate(lines[1:], 1):
            line = line.strip()
            if not line:
                continue
            
            answer_match = answer_line_pattern.match(line)
            explanation_match = explanation_line_pattern.match(line)

            if answer_match:
                sign, answer_text = answer_match.groups()
                is_correct = (sign == '+')
                answers.append({
                    'answer': answer_text.strip(),
                    'is_correct': is_correct
                })
            elif explanation_match:
                explanation = explanation_match.group(1).strip()

        if answers:
            questions.append({
                'question': question_text,
                'answers': answers,
                'explanation': explanation
            })
        else:
            print(f"⚠️ Блок {i+1} не содержит валидных ответов, пропускаем")
    
    print(f"🔍 === РЕЗУЛЬТАТ ПАРСИНГА ===")
    print(f"📊 Итого найдено вопросов: {len(questions)}")
    for i, q in enumerate(questions):
        print(f"  {i+1}. {q['question'][:50]}... ({len(q['answers'])} ответов)")
    
    if not questions:
        print("❌ ВНИМАНИЕ: Не удалось распарсить ни одного вопроса!")
        print("📄 Попытка найти любые паттерны в тексте:")
        # Ищем числа в начале строк
        numbered_lines = re.findall(r'^\d+\..*', text_questions, re.MULTILINE)
        print(f"🔍 Найдено строк с номерами: {len(numbered_lines)}")
        for line in numbered_lines[:5]:  # Показываем первые 5
            print(f"  - {line}")
        
        # Ищем знаки + и -
        plus_minus_lines = re.findall(r'^[+-].*', text_questions, re.MULTILINE)
        print(f"🔍 Найдено строк с +/-: {len(plus_minus_lines)}")
        for line in plus_minus_lines[:5]:  # Показываем первые 5
            print(f"  - {line}")
    
    print("=== КОНЕЦ ПАРСИНГА ВОПРОСОВ ===")
    return questions


class QuestionsGenerator:
    """
    Генератор вопросов на основе текста с использованием различных языковых моделей
    
    Класс реализует паттерн Singleton и предоставляет функциональность для:
    - Анализа и кластеризации входного текста
    - Генерации вопросов с помощью DeepSeek API или локальной модели ICEQ
    - Добавления объяснений через семантический поиск
    - Постобработки и структурирования результатов
    
    Attributes:
        device (str): Устройство для вычислений ('cuda' или 'cpu')
        deepseek_client (OpenAI): Клиент для работы с DeepSeek API
        iceq_model (dict): Локальная модель ICEQ с токенизатором
    
    Examples:
        >>> # Инициализация только с DeepSeek
        >>> generator = QuestionsGenerator(init_llms=['deepseek'])
        >>> 
        >>> # Генерация 5 вопросов
        >>> with open('text.txt', 'r', encoding='utf8') as f:
        >>>     text = f.read()
        >>> questions = generator.generate(text, 5, llm='deepseek')
        >>> 
        >>> # Вывод результатов
        >>> for i, q in enumerate(questions, 1):
        >>>     print(f"Вопрос {i}: {q['question']}")
        >>>     for ans in q['answers']:
        >>>         mark = '✓' if ans['is_correct'] else '✗'
        >>>         print(f"  {mark} {ans['answer']}")
    """

    _instance = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        """Реализация паттерна Singleton"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, init_llms: list = []):
        """
        Инициализирует генератор вопросов
        
        Args:
            init_llms (list): Список моделей для инициализации.
                Доступные значения: ['deepseek', 'iceq']
                По умолчанию модели загружаются лениво при первом использовании
        """
        # Предотвращаем повторную инициализацию Singleton
        if QuestionsGenerator._initialized:
            return None
        QuestionsGenerator._initialized = True

        # Определение и настройка вычислительного устройства
        if torch.cuda.is_available():
            self.device = 'cuda'
            torch.cuda.empty_cache()
            # Освобождаем неиспользуемую память
            if hasattr(torch.cuda, 'reset_peak_memory_stats'):
                torch.cuda.reset_peak_memory_stats()
        else:
            print('ВНИМАНИЕ: CUDA недоступна, используется CPU')
            self.device = 'cpu'
        print(f'Используемое устройство: {self.device}')

        # Ленивая инициализация языковых моделей
        self.deepseek_available = self.__init_deepseek() if 'deepseek' in init_llms else False
        # Клиент DeepSeek будет инициализирован при первом обращении
        self.deepseek_client = None
        self.iceq_model = self.__init_iceq() if 'iceq' in init_llms else None

        # Загрузка моделей для обработки текста и эмбеддингов
        print('Загрузка моделей для обработки текста...')
        self.__clustering_model = SentenceTransformer(
            'intfloat/multilingual-e5-large-instruct',  # Модель для кластеризации
            device=self.device
        )
        self.__search_model = SentenceTransformer(
            'ai-forever/FRIDA',  # Модель для семантического поиска
            device=self.device
        )
        print('Модели для обработки текста загружены.')

        # Загрузка промптов из файлов
        print('Загрузка промптов...')
        import os
        script_dir = os.path.dirname(os.path.abspath(__file__))
        self.__user_prompt_template = self.__load_prompt(os.path.join(script_dir, 'user_prompt.txt'))
        self.__system_prompt = self.__load_prompt(os.path.join(script_dir, 'system_prompt.txt'))
        print('Промпты загружены.')
        print('Инициализация генератора завершена.')

    def __init_deepseek(self) -> bool:
        """
        Проверяет наличие API ключа для DeepSeek
        
        Returns:
            bool: True если ключ найден, False если нет
        """
        api_key = os.getenv('DEEPSEEK_API_KEY')
        if not api_key:
            print("⚠️ DEEPSEEK_API_KEY не найден в переменных окружения для DeepSeek")
            return False
        
        print('DeepSeek API ключ найден.')
        return True

    def __init_iceq(self) -> None:
        """
        Инициализирует модель ICEQ с максимальной оптимизацией памяти
        
        Пытается загрузить модель с различными уровнями квантизации:
        1. 4-bit квантизация (минимальное потребление памяти)
        2. 8-bit квантизация (fallback)
        3. CPU загрузка (последний fallback)
        
        Returns:
            dict: словарь с токенизатором и моделью или None при ошибке
        """
        try:
            print('Загрузка ICEQ с МАКСИМАЛЬНОЙ квантизацией (4-bit)...')
            tokenizer = AutoTokenizer.from_pretrained('t-tech/T-lite-it-1.0')
            
            # Настройки для минимального использования памяти
            if self.device == 'cuda':
                try:
                    print('Попытка загрузки модели ICEQ на GPU с квантизацией...')
                    model = AutoModelForCausalLM.from_pretrained(
                        'droyti/ICEQ', 
                        torch_dtype=torch.float16,
                        device_map='auto',
                        low_cpu_mem_usage=True,
                        load_in_8bit=True,  # Квантизация в 8 бит
                        trust_remote_code=True
                    )
                    print('Модель ICEQ успешно загружена на GPU с квантизацией')
                except Exception as e:
                    print(f'Ошибка загрузки 4-bit: {e}')
                    try:
                        print('Fallback: попытка загрузки с 8-bit квантизацией...')
                        model = AutoModelForCausalLM.from_pretrained(
                            'droyti/ICEQ', 
                            load_in_8bit=True,
                            torch_dtype=torch.float16,
                            device_map="auto",
                            low_cpu_mem_usage=True,
                            trust_remote_code=True,
                            max_memory={0: "6GB", "cpu": "2GB"}
                        )
                        print('✅ ICEQ загружена с 8-bit квантизацией')
                        
                    except Exception as e2:
                        print(f'Ошибка 8-bit: {e2}. Загрузка на CPU...')
                        torch.cuda.empty_cache()
                        model = AutoModelForCausalLM.from_pretrained(
                            'droyti/ICEQ', 
                            torch_dtype=torch.float16,
                            device_map="cpu",
                            low_cpu_mem_usage=True,
                            trust_remote_code=True
                        )
                        print('⚠️ ICEQ загружена на CPU (без квантизации)')
            else:
                print('CUDA недоступна, загрузка на CPU...')
                model = AutoModelForCausalLM.from_pretrained(
                    'droyti/ICEQ', 
                    torch_dtype=torch.float16,
                    device_map="cpu",
                    low_cpu_mem_usage=True,
                    trust_remote_code=True
                )
                print('⚠️ ICEQ загружена на CPU')

            return {
                'tokenizer': tokenizer,
                'model': model
            }
            
        except Exception as e:
            print(f'❌ Критическая ошибка при загрузке ICEQ: {e}')
            print('ICEQ модель недоступна, будет использоваться только DeepSeek')
            return None

    def __load_prompt(self, filename: str) -> str:
        """
        Загружает промпт из файла
        
        Args:
            filename (str): название файла с промптом
            
        Returns:
            str: содержимое промпта
        """
        with open(filename, 'r', encoding='utf8') as f:
            return f.read()

    def __filter_chunks(self, chunk: str, min_words_in_chunk: int) -> bool:
        """
        Фильтрует чанки текста по минимальному количеству слов
        
        Args:
            chunk (str): фрагмент текста для проверки
            min_words_in_chunk (int): минимальное количество слов
            
        Returns:
            bool: True, если чанк подходит, False - если нет
        """
        result = chunk and len(chunk.split()) > min_words_in_chunk
        return result

    def __get_central_objects(
            self,
            kmeans: KMeans,
            embeddings: np.ndarray,
            objects: np.ndarray
    ) -> np.ndarray:
        
        '''
        Находит самые центральные объекты в каждом кластере

        Параметры:
            kmeans (sklearn.KMeans): обученный объект типа sklearn.KMeans
            embeddings (np.ndarray): векторное представление объектов
            objects (np.ndarray): сами объекты

        Возвращаемое значение:
            central_objects: центральные объекты из objects в каждом кластере
        '''
        
        print('Поиск центральных объектов для кластеров...')
        centroids = kmeans.cluster_centers_
        labels = kmeans.labels_
        distances = np.linalg.norm(embeddings - centroids[labels], axis=1)

        central_indices = [
            np.where(labels == i)[0][np.argmin(distances[labels == i])]
            for i in range(kmeans.n_clusters)
        ]

        return objects[central_indices]

    def __get_questions(self, llm: str, text_content: str, questions_num: int) -> list[dict]:

        '''
        Отправляет запрос LLM и возвращает вопросы

        Параметры:
            llm (str): LLM для генерация вопросов
            text_content (str): Текст для генерации
            questions_num (int): Количество вопросов

        Возвращаемое значение (list[dict]): извлечённые вопросы
        '''

        print(f"🔍 === НАЧАЛО ЛОГИРОВАНИЯ ДЛЯ МОДЕЛИ {llm.upper()} ===")
        print(f"📊 Запрошено вопросов: {questions_num}")
        print(f"📝 Длина входного контента: {len(text_content)} символов")
        print(f"📄 Начало контента: {text_content[:200]}...")

        match llm:
            case 'deepseek':
                print('🤖 Генерация вопросов с помощью Deepseek API...')
                try:
                    # Используем асинхронную функцию
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        print("⚡ Запуск асинхронного генератора...")
                        response_text = loop.run_until_complete(
                            generate_questions_deepseek(text_content, questions_num)
                        )
                        print("📥 Асинхронный генератор завершен, начинаем парсинг...")
                    finally:
                        loop.close()
                    
                    print(f"📋 Ответ от DeepSeek API получен (длина: {len(response_text)} символов).")
                    
                    # Логируем перед парсингом
                    print("🔍 Отправляем ответ в parse_questions...")
                    parsed_questions = parse_questions(response_text)
                    print(f"✅ Парсинг завершен, получено {len(parsed_questions)} вопросов")
                    
                    if not parsed_questions:
                        print("⚠️ ВНИМАНИЕ: parse_questions вернул пустой список!")
                        print(f"📄 Сырой ответ для анализа: {response_text[:1000]}...")
                    
                    return parsed_questions
                except Exception as e:
                    print(f'❌ Ошибка при работе с DeepSeek API: {e}')
                    print(f"🔍 Тип ошибки: {type(e).__name__}")
                    import traceback
                    print(f"📋 Стек вызовов: {traceback.format_exc()}")
                    return []
            
            case 'qwen':
                print('🤖 Генерация вопросов с помощью Qwen API...')
                try:
                    # Используем асинхронную функцию
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        print("⚡ Запуск асинхронного генератора...")
                        response_text = loop.run_until_complete(
                            generate_questions_qwen(text_content, questions_num)
                        )
                        print("📥 Асинхронный генератор завершен, начинаем парсинг...")
                    finally:
                        loop.close()
                    
                    print(f"📋 Ответ от Qwen API получен (длина: {len(response_text)} символов).")
                    
                    # Логируем перед парсингом
                    print("🔍 Отправляем ответ в parse_questions...")
                    parsed_questions = parse_questions(response_text)
                    print(f"✅ Парсинг завершен, получено {len(parsed_questions)} вопросов")
                    
                    if not parsed_questions:
                        print("⚠️ ВНИМАНИЕ: parse_questions вернул пустой список!")
                        print(f"📄 Сырой ответ для анализа: {response_text[:1000]}...")
                    
                    return parsed_questions
                except Exception as e:
                    print(f'❌ Ошибка при работе с Qwen API: {e}')
                    print(f"🔍 Тип ошибки: {type(e).__name__}")
                    import traceback
                    print(f"📋 Стек вызовов: {traceback.format_exc()}")
                    return []
            
            case 'iceq':
                print('🤖 Использование квантованной ICEQ Model...')
                if self.iceq_model is None:
                    raise ValueError("Модель ICEQ не загружена")
                
                user_prompt = self.__user_prompt_template \
                    .replace(QUESTIONS_NUM_PROMPT_TAG, str(questions_num)) \
                    .replace(CHUNKS_PROMPT_TAG, text_content)

                prompt = self.__system_prompt + '\n' + user_prompt
                
                print(f"📄 Сформированный промпт (длина: {len(prompt)} символов)")
                print(f"📄 Первые 300 символов промпта: {prompt[:300]}...")
                
                messages = [
                    {'role': 'user', 'content': prompt}
                ]

                # Использование Chat Template
                print("🔄 Применение chat template...")
                text = self.iceq_model['tokenizer'].apply_chat_template(
                    messages,
                    tokenize=False,
                    add_generation_prompt=True
                )
                
                print(f"📄 Финальный текст после template (длина: {len(text)} символов)")
                print(f"📄 Первые 200 символов: {text[:200]}...")
                
                # Определяем устройство модели
                model_device = next(self.iceq_model['model'].parameters()).device
                print(f"🖥️ Устройство модели: {model_device}")
                
                print("🔤 Токенизация...")
                model_inputs = self.iceq_model['tokenizer']([text], return_tensors='pt').to(model_device)
                print(f"📊 Количество токенов в запросе: {model_inputs.input_ids.shape[1]}")

                # Генерация вопросов
                print("🎯 Запуск генерации модели...")
                generated_ids = self.iceq_model['model'].generate(
                    **model_inputs,
                    max_new_tokens=32_000
                )
                generated_ids = [
                    output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
                ]

                print("🔤 Декодирование ответа...")
                response = self.iceq_model['tokenizer'].batch_decode(generated_ids, skip_special_tokens=True)[0]
                print(f'📋 Ответ от ICEQ Model получен (длина: {len(response)} символов).')
                print(f"📄 Первые 500 символов ответа: {response[:500]}...")
                
                # Логируем перед парсингом
                print("🔍 Отправляем ответ в parse_questions...")
                parsed_questions = parse_questions(response)
                print(f"✅ Парсинг завершен, получено {len(parsed_questions)} вопросов")
                
                if not parsed_questions:
                    print("⚠️ ВНИМАНИЕ: parse_questions вернул пустой список!")
                    print(f"📄 Полный ответ для анализа: {response}")

                return parsed_questions
        
        print("=== КОНЕЦ ЛОГИРОВАНИЯ ===")

    def __generate_iceq(self, text: str, num_questions: int) -> List[Dict]:
        if not self.iceq_model:
            return []
        
        tokenizer = self.iceq_model['tokenizer']
        model = self.iceq_model['model']
        
        # Улучшенный промпт для более детальных вопросов
        prompt = f"""Создай {num_questions} сложных вопроса с 4 вариантами ответов по тексту. 
Каждый вопрос должен быть разного типа: на понимание фактов, на анализ причинно-следственных связей, 
и на применение знаний.

Текст:
{text[:1500]} 

Формат ответа:
1. Вопрос: [вопрос]
Варианты: A) [вариант] B) [вариант] C) [вариант] D) [вариант]
Ответ: [буква]

2. Вопрос: [вопрос]
Варианты: A) [вариант] B) [вариант] C) [вариант] D) [вариант]
Ответ: [буква]"""

        try:
            inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1024)
            
            # Отправляем на то же устройство, что и модель
            device = next(model.parameters()).device
            inputs = {k: v.to(device) for k, v in inputs.items()}
            
            # Улучшенные параметры генерации для 8-битного квантования
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=600,  # Увеличиваем для более подробных ответов
                    do_sample=True,      # Включаем семплирование для более разнообразных ответов
                    temperature=0.7,     # Умеренная температура
                    top_p=0.9,           # Высокий top_p для большего разнообразия
                    top_k=50,            # Умеренный top_k
                    num_beams=2,         # Небольшое количество лучей для улучшения качества
                    pad_token_id=tokenizer.eos_token_id,
                    eos_token_id=tokenizer.eos_token_id,
                    early_stopping=True
                )
            
            generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
            response = generated_text[len(prompt):].strip()
            
            return self.__parse_iceq_response(response, num_questions)
            
        except Exception as e:
            print(f"Ошибка при генерации с ICEQ: {e}")
            return []

    def __parse_iceq_response(self, response: str, num_questions: int) -> List[Dict]:
        """Парсит ответ от модели ICEQ в упрощенном формате"""
        questions = []
        
        # Ищем паттерны вопросов
        question_pattern = r'(\d+)\.\s*Вопрос:\s*(.+?)(?=\d+\.\s*Вопрос:|$)'
        matches = re.findall(question_pattern, response, re.DOTALL | re.IGNORECASE)
        
        for match in matches:
            question_num, question_block = match
            
            # Извлекаем текст вопроса
            lines = question_block.strip().split('\n')
            question_text = lines[0].strip()
            
            # Ищем варианты ответов
            answers = []
            correct_answer = None
            
            for line in lines[1:]:
                line = line.strip()
                
                # Варианты A), B), C), D)
                variant_match = re.match(r'([ABCD])\)\s*(.+)', line)
                if variant_match:
                    letter, text = variant_match.groups()
                    answers.append({
                        'answer': text.strip(),
                        'is_correct': False,
                        'letter': letter
                    })
                
                # Правильный ответ
                answer_match = re.match(r'Ответ:\s*([ABCD])', line)
                if answer_match:
                    correct_answer = answer_match.group(1)
            
            # Отмечаем правильный ответ
            if correct_answer and answers:
                for answer in answers:
                    if answer['letter'] == correct_answer:
                        answer['is_correct'] = True
                        break
                
                # Удаляем служебное поле letter
                for answer in answers:
                    del answer['letter']
                
                questions.append({
                    'question': question_text,
                    'answers': answers
                })
            
            if len(questions) >= num_questions:
                break
        
        return questions

    def generate(
            self, 
            text: str, 
            questions_num: int,
            llm: Literal['deepseek', 'qwen', 'iceq'] = 'iceq'
    ) -> list[dict]:

        '''
        Генерирует и возвращает вопросы по тексту

        Параметры:
            text (str): текст, по которому надо задать вопросы
            questions_num (int): количество вопросов
            llm (Literal['deepseek', 'qwen', 'iceq']), optional:
                языковая модель, используемая для генерации вопросов
                    - deepseek: использование DeepSeek API
                    - qwen: использование Qwen API
                    - iceq: использование локальной предобученной модели

        Возвращаемое значение:
            questions (list[dict]): список вопросов
        '''

        if llm == 'deepseek' and self.deepseek_client is None:
            self.deepseek_client = self.__init_deepseek()
        
        if llm == 'iceq' and self.iceq_model is None:
            self.iceq_model = self.__init_iceq()
            if self.iceq_model is None:
                raise ValueError("Не удалось загрузить модель ICEQ. Попробуйте использовать 'deepseek' или 'qwen' вместо 'iceq'.")

        print(f'Начало генерации {questions_num} вопросов...')
        
        # Простая проверка: разделяем текст на параграфы и смотрим, хватит ли для вопросов
        initial_chunks = text.split('\n\n')  # Разделяем по двойным переносам (параграфы)
        initial_chunks = [chunk.strip() for chunk in initial_chunks if chunk.strip()]
        
        # Проверяем, что есть достаточно смысловых блоков для генерации вопросов
        if len(initial_chunks) < questions_num:
            # Пробуем разделить по одинарным переносам
            backup_chunks = text.split('\n')
            backup_chunks = [chunk.strip() for chunk in backup_chunks if chunk.strip() and len(chunk.split()) > 5]
            
            if len(backup_chunks) < questions_num:
                raise ValueError(
                    f"Недостаточно информационных блоков в тексте для генерации {questions_num} вопросов. "
                    f"Найдено {len(backup_chunks)} блоков. Попробуйте уменьшить количество вопросов до {len(backup_chunks)} "
                    f"или добавить больше структурированного текста."
                )
        
        # Запускаем таймер
        import time
        start_time = time.time()
        
        # Получаем оценку времени
        time_estimate = self.estimate_generation_time(text, questions_num, llm)

        # Разделение текста на чанки и фильтрация
        chunks = text.split('\n')
        # Вычисляем среднюю длину чанка для определения минимального порога
        mean_chunk_len = np.array([len(chunk) for chunk in chunks]).mean()
        min_words_in_chunk = mean_chunk_len * 0.15

        # Фильтруем слишком короткие чанки
        chunks = list(filter(lambda chunk: self.__filter_chunks(chunk, min_words_in_chunk), chunks))
        chunks = np.array(chunks)
        print(f'Получено {len(chunks)} чанков после фильтрации.')

        # Если чанков слишком мало, используем упрощенную генерацию
        if len(chunks) < MIN_CLUSTERS_NUM:
            print(f'Чанков слишком мало ({len(chunks)}), используем упрощенную генерацию...')
            # Используем оптимизированный метод для ICEQ
            if llm == 'iceq':
                questions = self.__generate_iceq(text, questions_num)
            else:
                # Для других LLM используем весь текст с ограничением длины
                prompt = self.__user_prompt_template \
                    .replace(QUESTIONS_NUM_PROMPT_TAG, str(questions_num)) \
                    .replace(CHUNKS_PROMPT_TAG, text[:2000])  # Ограничиваем длину
                return self.__get_questions(llm, prompt, questions_num)

        # Вычисление эмбеддингов для кластеризации чанков
        print('Вычисление эмбеддингов для кластеризации...')
        clustering_embeddings = self.__clustering_model.encode(
            chunks,
            convert_to_tensor=True,
            normalize_embeddings=True,
            device=self.device
        ).cpu().numpy()
        print('Эмбеддинги для кластеризации вычислены.')

        # Определение оптимального количества кластеров
        paragraph_num = len(text.split('\n'))
        clusters_num = min(
            MAX_CLUSTERS_NUM,
            max(MIN_CLUSTERS_NUM, int(paragraph_num * DATA_PART))
        )
        print(f'Количество кластеров: {clusters_num}')

        # Выполнение K-means кластеризации
        print('Запуск K-means кластеризации...')
        kmeans = KMeans(n_clusters=clusters_num, random_state=42)
        kmeans.fit(clustering_embeddings)
        print('Кластеризация завершена.')

        # Поиск центральных объектов в каждом кластере
        target_chunks = self.__get_central_objects(kmeans, clustering_embeddings, chunks)
        print('Поиск центральных объектов для кластеров...')
        print(f"📊 Найдено {len(target_chunks)} центральных чанков")
        
        # Логируем отобранные чанки
        for i, chunk in enumerate(target_chunks):
            print(f"🔍 Чанк {i+1}: {chunk[:100]}...")
        
        print('Передача чанков для генерации...')
        
        # Объединяем отобранные чанки для генерации
        text_for_generation = '\n\n'.join(target_chunks)
        print(f"📝 Итоговый текст для генерации (длина: {len(text_for_generation)} символов)")
        print(f"📄 Первые 500 символов текста для генерации: {text_for_generation[:500]}...")
        
        print("🎯 КРИТИЧЕСКАЯ ТОЧКА: Вызываем __get_questions")
        questions = self.__get_questions(llm, text_for_generation, questions_num)
        print(f"📋 Результат от __get_questions: {len(questions) if questions else 0} вопросов")

        # Если вопросы не были сгенерированы, возвращаем пустой список
        if not questions:
            print('❌ КРИТИЧНО: Вопросы не были сгенерированы!')
            print("🔍 Попытка диагностики проблемы:")
            print(f"  - Модель: {llm}")
            print(f"  - Длина текста: {len(text_for_generation)}")
            print(f"  - Количество чанков: {len(target_chunks)}")
            print(f"  - Запрошено вопросов: {questions_num}")
            return []
        else:
            print(f"✅ Успешно получены вопросы: {len(questions)}")
            # Кратко показываем что получили
            for i, q in enumerate(questions[:3]):  # Показываем первые 3
                print(f"  {i+1}. {q.get('question', 'NO_QUESTION')[:50]}...")

        try:
            # Добавление объяснений через семантический поиск
            print('Вычисление эмбеддингов для поиска...')
            doc_embeddings = self.__search_model.encode(
                target_chunks,
                prompt_name='search_document',
                device=self.device
            )
            query_embeddings = self.__search_model.encode(
                [q['question'] for q in questions],
                prompt_name='search_query',
                device=self.device
            )
            print('Эмбеддинги для поиска вычислены.')

            # Проверка корректности эмбеддингов
            if query_embeddings is None or len(query_embeddings.shape) < 2 or query_embeddings.shape[0] == 0:
                print("⚠️ Не удалось создать эмбеддинги для вопросов. Объяснения будут пропущены.")
                raise ValueError("Некорректные эмбеддинги для запроса")

            # Создание FAISS индекса для быстрого поиска похожих чанков
            print('Настройка FAISS индекса...')
            index = faiss.IndexFlatIP(doc_embeddings.shape[1])  # Косинусное расстояние
            index.add(doc_embeddings)
            print('FAISS индекс готов.')

            # Поиск наиболее релевантных чанков для каждого вопроса
            print('Поиск соответствий вопросов и чанков...')
            _, indices = index.search(query_embeddings, 1)

            # Добавление объяснений к вопросам
            for question, explanation_chunk in zip(questions, target_chunks[indices]):
                # Если модель не предоставила объяснение, используем релевантный чанк
                if not question.get('explanation'):
                    question['explanation'] = str(explanation_chunk[0])
                
        except Exception as e:
            print(f'⚠️ Ошибка при добавлении объяснений из контекста: {e}')
            # Возвращаем вопросы без объяснений при ошибке
            for q in questions:
                if not q.get('explanation'):
                    q['explanation'] = 'Объяснение не найдено из-за ошибки.'

        # Финальная статистика по времени
        actual_time = time.time() - start_time
        
        # Определяем полное название модели для красивого вывода
        model_names = {
            'deepseek': 'DeepSeek-V3',
            'qwen': 'Qwen-3-235B',
            'iceq': 'ICEQ (локальная)'
        }
        model_display = model_names.get(llm, llm.upper())
        
        print()
        print(f'🎉 ГЕНЕРАЦИЯ ЗАВЕРШЕНА!')
        print(f'   🤖 Модель: {model_display}')
        print(f'   ⏱️  Фактическое время: {actual_time:.1f} сек ({actual_time/60:.1f} мин)')
        print(f'   📈 Ожидалось: {time_estimate["estimated_seconds"]} сек')
        print(f'   📊 Разница: {actual_time - time_estimate["estimated_seconds"]:.1f} сек')
        print(f'   📝 Результат: {len(questions)} вопросов')
        print()

        # КРИТИЧЕСКАЯ ОТЛАДКА: проверяем структуру данных перед возвратом
        print(f"🔍 === ФИНАЛЬНАЯ ПРОВЕРКА СТРУКТУРЫ ДАННЫХ ===")
        print(f"📊 Тип возвращаемых данных: {type(questions)}")
        print(f"📊 Количество элементов: {len(questions) if questions else 0}")
        
        if questions:
            print(f"🔍 Структура первого вопроса:")
            first_q = questions[0]
            print(f"  - Тип: {type(first_q)}")
            print(f"  - Ключи: {list(first_q.keys()) if isinstance(first_q, dict) else 'NOT_DICT'}")
            if isinstance(first_q, dict):
                print(f"  - question: {first_q.get('question', 'MISSING')[:50]}...")
                print(f"  - answers: {len(first_q.get('answers', []))} ответов")
                print(f"  - explanation: {'да' if first_q.get('explanation') else 'нет'}")
                
                if first_q.get('answers'):
                    first_answer = first_q['answers'][0]
                    print(f"  - Структура первого ответа: {first_answer}")
        else:
            print("❌ КРИТИЧНО: Возвращается пустой список!")
        
        print("=== КОНЕЦ ФИНАЛЬНОЙ ПРОВЕРКИ ===")
        
        return questions

    def estimate_generation_time(self, text: str, questions_num: int, llm: str = 'iceq') -> dict:
        """
        Оценивает примерное время генерации вопросов
        
        Параметры:
            text (str): текст для анализа
            questions_num (int): количество вопросов
            llm (str): используемая модель
            
        Возвращает:
            dict: информация о времени генерации
        """
        text_length = len(text)
        word_count = len(text.split())
        
        if llm == 'iceq':
            # Базовое время для ICEQ модели с 8-битным квантованием
            base_time_per_question = 3.5  # секунд на вопрос
            text_factor = min(text_length / 1000, 3.0)  # до 3x за длинный текст
            complexity_factor = 1 + (questions_num * 0.1)  # усложнение с количеством
            
            estimated_time = (base_time_per_question * questions_num * text_factor * complexity_factor)
        else:
            # Для DeepSeek API
            base_time_per_question = 2.0  # быстрее через API
            text_factor = min(text_length / 1500, 2.0)
            estimated_time = base_time_per_question * questions_num * text_factor
        
        return {
            'estimated_seconds': int(estimated_time),
            'estimated_minutes': round(estimated_time / 60, 1),
            'text_length': text_length,
            'word_count': word_count,
            'questions_count': questions_num,
            'model': llm
        }


if __name__ == '__main__':
    print('Запуск тестового сценария...')
    with open('test_data/markdown.md', 'r', encoding='utf8') as f:
        text = f.read()

    generator = QuestionsGenerator()
    questions = generator.generate(text, 10)

    print('Результат:')
    for i, q in enumerate(questions, 1):
        print(f'\nВопрос {i}: {q["question"]}')
        print('Варианты ответов:')
        for ans in q['answers']:
            mark = '[+]' if ans["is_correct"] else '[ ]'
            print(f'  {mark} {ans["answer"]}')
        print(f'Объяснение: {q["explanation"]}')
