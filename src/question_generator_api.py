import aiohttp
import asyncio
import json
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()


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
            
        print("✅ Промпты загружены из файлов")
        
    except FileNotFoundError as e:
        print(f"❌ Ошибка загрузки промптов: {e}")
        # Fallback промпты на случай отсутствия файлов
        system_prompt = "Ты - эксперт по созданию образовательных тестов."
        user_prompt_template = "Создай [QUESTIONS_NUM] вопросов по тексту: [CHUNKS]"
        print("⚠️ Используются fallback промпты")
    
    # Формируем пользовательский промпт, заменяя плейсхолдеры
    user_prompt = user_prompt_template.replace('[QUESTIONS_NUM]', str(num_questions))
    user_prompt = user_prompt.replace('[CHUNKS]', text)
    
    print("📝 Отправляемые промпты")

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
        "max_tokens": 4000,  # Максимальное количество токенов в ответе
        "temperature": 0.3  # Низкая температура для более предсказуемых результатов
    }

    full_response = ""
    
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
                    except json.JSONDecodeError:
                        # Пропускаем некорректные JSON чанки
                        continue
    
    return full_response


async def test_question_generation():
    """
    Тестовая функция для проверки генерации вопросов
    
    Генерирует 3 вопроса по тестовому тексту об искусственном интеллекте
    для проверки работоспособности API DeepSeek
    """
    test_text = """
    Искусственный интеллект (ИИ) — это область информатики, которая занимается созданием 
    интеллектуальных машин, способных работать и реагировать как люди. ИИ включает в себя 
    машинное обучение, обработку естественного языка, компьютерное зрение и многие другие 
    технологии. Современные системы ИИ используются в различных областях: от медицины и 
    финансов до транспорта и развлечений.
    """
    
    try:
        print("🚀 Запуск тестовой генерации вопросов...")
        questions = await generate_questions_deepseek(test_text, 3)
        print("✅ Тест успешно завершен!")
        print(f"📋 Результат:\n{questions}")
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")


if __name__ == "__main__":
    asyncio.run(test_question_generation()) 