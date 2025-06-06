import aiohttp
import asyncio
import json
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()


async def invoke_chute():
    api_token = os.getenv('DEEPSEEK_API_KEY')
    
    if not api_token:
        raise ValueError("DEEPSEEK_API_KEY не найден в переменных окружения")

    headers = {
        "Authorization": "Bearer " + api_token,
        "Content-Type": "application/json"
    }

    body = {
        "model": "deepseek-ai/DeepSeek-V3-0324",
        "messages": [
            {
                "role": "user",
                "content": "напиши мне историю про легенрарного фантома 2059 который всех разносил в майнкве в пвп, строительстве и во всем "
            }
        ],
        "stream": True,
        "max_tokens": 100000,
        "temperature": 0.5
    }

    full_response = ""
    
    async with aiohttp.ClientSession() as session:
        async with session.post(
                "https://llm.chutes.ai/v1/chat/completions",
                headers=headers,
                json=body
        ) as response:
            async for line in response.content:
                line = line.decode("utf-8").strip()
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        chunk_json = json.loads(data)
                        if 'choices' in chunk_json and len(chunk_json['choices']) > 0:
                            delta = chunk_json['choices'][0].get('delta', {})
                            if 'content' in delta and delta['content']:
                                content = delta['content']
                                full_response += content
                                print(content, end='', flush=True) 
                    except json.JSONDecodeError:
                        continue
    
    print("\n\n--- Полный ответ ---")
    print(full_response)


asyncio.run(invoke_chute())