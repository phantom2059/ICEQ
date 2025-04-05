import os
import json
from langchain_community.tools.tavily_search import TavilySearchResults  # type: ignore
from langchain_community.utilities.tavily_search import TavilySearchAPIWrapper  # type: ignore
from dotenv import load_dotenv

load_dotenv()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")


promt = "Дай мне топ 20 самых популярных книг на данный момент"

search = TavilySearchAPIWrapper(tavily_api_key=TAVILY_API_KEY)
tavily_search = TavilySearchResults(max_results=3, api_wrapper=search)
search_docs = tavily_search.invoke(promt)

with open('search_docs.json', 'w', encoding='utf-8') as json_file:
    json.dump(search_docs, json_file, ensure_ascii=False, indent=4)

print('Готово')