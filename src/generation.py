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
import asyncio

import torch
import faiss
import numpy as np
from dotenv import load_dotenv
from openai import OpenAI
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

# Импортируем функцию из нашего нового модуля
from question_generator_api import generate_questions_deepseek

load_dotenv()

# Часть данных для кластеризации
DATA_PART = 0.01
# Минимальное количество кластеров
MIN_CLUSTERS_NUM = 5
# Максимальное количество кластеров
MAX_CLUSTERS_NUM = 500

# Тег в тексте промпта, который нужно заменить на количество вопросов
QUESTIONS_NUM_PROMPT_TAG = '[QUESTIONS_NUM]'
# Тег в тексте промпта, который нужно заменить на извлечённые чанки
CHUNKS_PROMPT_TAG = '[CHUNKS]'

ICEQ_MODEL_NAME = 'iceq_model'


def parse_questions(text_questions: str) -> list[dict]:
    """
    Парсит текст с вопросами и ответами, возвращая структурированный список
    
    Функция анализирует текст в специальном формате и извлекает из него вопросы,
    варианты ответов и объяснения для дальнейшего использования в тестах.
    
    Args:
        text_questions (str): Текст с вопросами в формате:
            1. Текст вопроса?
            + Правильный вариант ответа
            - Неправильный вариант ответа 1
            - Неправильный вариант ответа 2
            - Неправильный вариант ответа 3
            ! Объяснение (опционально)
            
            2. Следующий вопрос?
            ...
    
    Returns:
        list[dict]: Список структурированных вопросов в формате:
            [
                {
                    'question': 'Текст вопроса?',
                    'answers': [
                        {'answer': 'Правильный ответ', 'is_correct': True},
                        {'answer': 'Неправильный ответ', 'is_correct': False},
                        ...
                    ],
                    'explanation': 'Объяснение к вопросу'
                },
                ...
            ]
    
    Example:
        >>> text = "1. Кто написал 'Войну и мир'?\\n+ Толстой\\n- Пушкин\\n- Достоевский"
        >>> questions = parse_questions(text)
        >>> print(questions[0]['question'])
        'Кто написал 'Войну и мир'?'
    """

    # Регулярные выражения для парсинга различных элементов
    question_block_pattern = re.compile(r'(?ms)^\s*(\d+)\.\s*(.+?)(?=^\s*\d+\.\s|\Z)')
    answer_line_pattern = re.compile(r'^\s*([+-])\s*(.+)')
    explanation_line_pattern = re.compile(r'^\s*!\s*(.+)')

    questions = []
    blocks = question_block_pattern.findall(text_questions)
    
    for number, block in blocks:
        lines = block.splitlines()
        if not lines:
            continue
        
        # Первая строка - текст вопроса
        question_text = lines[0].strip()
        answers = []
        explanation = ""

        # Обрабатываем остальные строки для поиска ответов и объяснений
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue
            
            answer_match = answer_line_pattern.match(line)
            explanation_match = explanation_line_pattern.match(line)

            if answer_match:
                # Обрабатываем вариант ответа
                sign, answer_text = answer_match.groups()
                answers.append({
                    'answer': answer_text.strip(),
                    'is_correct': (sign == '+')  # '+' означает правильный ответ
                })
            elif explanation_match:
                # Обрабатываем объяснение
                explanation = explanation_match.group(1).strip()

        # Добавляем вопрос в результат только если есть варианты ответов
        if answers:
            questions.append({
                'question': question_text,
                'answers': answers,
                'explanation': explanation
            })
            
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
        self.deepseek_client = self.__init_deepseek() if 'deepseek' in init_llms else None
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
        self.__user_prompt_template = self.__load_prompt('user_prompt.txt')
        self.__system_prompt = self.__load_prompt('system_prompt.txt')
        print('Промпты загружены.')
        print('Инициализация генератора завершена.')

    def __init_deepseek(self) -> OpenAI:
        """
        Инициализирует клиент DeepSeek API
        
        Returns:
            OpenAI: настроенный клиент для работы с DeepSeek API
        """
        api_key = os.getenv('DEEPSEEK_API_KEY')
        self.deepseek_client = OpenAI(
            api_key=api_key, base_url='https://api.deepseek.com'
        )
        print('Deepseek клиент инициализирован.')

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
                    print('Попытка загрузки ICEQ с 4-bit квантизацией...')
                    
                    # Максимальная квантизация для минимального потребления памяти
                    model = AutoModelForCausalLM.from_pretrained(
                        'droyti/ICEQ', 
                        load_in_4bit=True,  # 4-bit квантизация (самая агрессивная)
                        bnb_4bit_compute_dtype=torch.float16,  # Вычисления в float16
                        bnb_4bit_use_double_quant=True,  # Двойная квантизация для экономии памяти
                        bnb_4bit_quant_type="nf4",  # Нормализованная 4-bit квантизация
                        torch_dtype=torch.float16,
                        device_map="auto",  # Автоматическое распределение по устройствам
                        low_cpu_mem_usage=True,  # Экономия CPU памяти
                        trust_remote_code=True,
                        max_memory={0: "4GB", "cpu": "2GB"}  # Ограничение памяти
                    )
                    print('✅ ICEQ успешно загружена с 4-bit квантизацией (~4-6 ГБ)')
                    
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

        match llm:
            case 'deepseek':
                print('Генерация вопросов с помощью Deepseek API...')
                try:
                    # Используем асинхронную функцию
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        response_text = loop.run_until_complete(
                            generate_questions_deepseek(text_content, questions_num)
                        )
                    finally:
                        loop.close()
                    
                    print('Ответ от DeepSeek API получен.')
                    return parse_questions(response_text)
                except Exception as e:
                    print(f'Ошибка при работе с DeepSeek API: {e}')
                    return []
            
            case 'iceq':
                print('Использование квантованной ICEQ Model...')
                if self.iceq_model is None:
                    raise ValueError("Модель ICEQ не загружена")
                
                user_prompt = self.__user_prompt_template \
                    .replace(QUESTIONS_NUM_PROMPT_TAG, str(questions_num)) \
                    .replace(CHUNKS_PROMPT_TAG, text_content)

                prompt = self.__system_prompt + '\n' + user_prompt
                messages = [
                    {'role': 'user', 'content': prompt}
                ]

                # Использование Chat Template
                text = self.iceq_model['tokenizer'].apply_chat_template(
                    messages,
                    tokenize=False,
                    add_generation_prompt=True
                )
                
                # Определяем устройство модели
                model_device = next(self.iceq_model['model'].parameters()).device
                
                model_inputs = self.iceq_model['tokenizer']([text], return_tensors='pt').to(model_device)

                # Генерация вопросов
                generated_ids = self.iceq_model['model'].generate(
                    **model_inputs,
                    max_new_tokens=32_000
                )
                generated_ids = [
                    output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
                ]

                response = self.iceq_model['tokenizer'].batch_decode(generated_ids, skip_special_tokens=True)[0]
                print('Ответ от ICEQ Model получен.')

                return parse_questions(response)

    def __generate_iceq(self, text: str, num_questions: int) -> List[Dict]:
        if not self.iceq_model:
            return []
        
        tokenizer = self.iceq_model['tokenizer']
        model = self.iceq_model['model']
        
        # Сокращенный промпт для ускорения
        prompt = f"""Создай {num_questions} тестовых вопроса по тексту:

{text[:800]}  # Ограничиваем длину текста

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
            
            # Оптимизированные параметры генерации
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=300,  # Уменьшено с 500
                    do_sample=False,     # Детерминированная генерация (быстрее)
                    pad_token_id=tokenizer.eos_token_id,
                    eos_token_id=tokenizer.eos_token_id,
                    num_beams=1,         # Без beam search (быстрее)
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
            llm: Literal['deepseek', 'iceq'] = 'iceq'
    ) -> list[dict]:
        """
        Генерирует и возвращает вопросы по тексту с использованием выбранной языковой модели
        
        Алгоритм работы:
        1. Разделение текста на чанки и их фильтрация
        2. Кластеризация чанков для выбора наиболее репрезентативных
        3. Генерация вопросов с помощью выбранной модели
        4. Добавление объяснений через семантический поиск
        
        Args:
            text (str): исходный текст для генерации вопросов
            questions_num (int): количество генерируемых вопросов
            llm (Literal['deepseek', 'iceq']): языковая модель для генерации
                - 'deepseek': использование DeepSeek API (рекомендуется)
                - 'iceq': использование локальной предобученной модели ICEQ
                
        Returns:
            list[dict]: список сгенерированных вопросов в формате:
                [
                    {
                        'question': 'Текст вопроса?',
                        'answers': [
                            {'answer': 'Вариант 1', 'is_correct': True},
                            {'answer': 'Вариант 2', 'is_correct': False},
                            ...
                        ],
                        'explanation': 'Объяснение к вопросу'
                    },
                    ...
                ]
                
        Raises:
            ValueError: если не удается загрузить выбранную модель
        """

        # Инициализация моделей при необходимости
        if llm == 'deepseek' and self.deepseek_client is None:
            self.deepseek_client = self.__init_deepseek()
        
        if llm == 'iceq' and self.iceq_model is None:
            self.iceq_model = self.__init_iceq()
            if self.iceq_model is None:
                raise ValueError("Не удалось загрузить модель ICEQ. Попробуйте использовать 'deepseek' вместо 'iceq'.")

        print(f'🔥 ВЫЗОВ generate() для {questions_num} вопросов, LLM: {llm}')
        print(f'📍 Стек вызовов: {len(text)} символов текста')
        print(f'Начало генерации {questions_num} вопросов...')

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
                return self.__generate_iceq(text, questions_num)
            else:
                # Для других LLM используем весь текст с ограничением длины
                prompt = self.__user_prompt_template \
                    .replace(QUESTIONS_NUM_PROMPT_TAG, str(questions_num)) \
                    .replace(CHUNKS_PROMPT_TAG, text[:2000])  # Ограничиваем длину для экономии токенов
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
        print('Передача чанков для генерации...')
        
        # Объединяем отобранные чанки для генерации
        text_for_generation = '\n\n'.join(target_chunks)
        questions = self.__get_questions(llm, text_for_generation, questions_num)

        # Если вопросы не были сгенерированы, возвращаем пустой список
        if not questions:
            print('Вопросы не были сгенерированы.')
            return []

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

        print('Генерация вопросов завершена.\n')
        return questions


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
