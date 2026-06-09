"""
list.am browser agent.

В MVP — httpx + selectolax (CSS-селекторы по HTML). Headless-браузера не
нужно: list.am отдаёт листинги в обычном HTML без JS-рендера.

Структура URL list.am:
  https://www.list.am/category/56?type=1&n=Yerevan&price1=...&price2=...

  category=56 — продажа квартир
  type=1 — for-sale (type=3 — for-rent)
  price1/price2 — диапазон цен (в USD)
  n=Yerevan — город

В реальности параметры list.am периодически меняются. Если что-то перестанет
работать — обновляем селекторы.

ВАЖНО: list.am запрещает агрессивный скрейпинг через robots.txt. Этот
агент должен использоваться экономно: 1-2 поиска в минуту максимум, с
User-Agent похожим на обычный браузер. При жалобах от list.am его сторону
поддержит юрист, не код.
"""

from __future__ import annotations

import logging
import re
from typing import Any

import httpx
from selectolax.parser import HTMLParser

from app.models.schemas import RawListing

logger = logging.getLogger(__name__)

BASE_URL = "https://www.list.am"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)


def search(params: dict[str, Any], target_count: int = 100) -> list[RawListing]:
    """Главная точка входа агента."""
    deal = params.get("deal", "buy")
    type_code = "1" if deal == "buy" else "3"
    price_max = params.get("price_max")

    query: dict[str, str | int] = {"type": type_code}
    if price_max:
        query["price2"] = int(price_max)
        query["pricesign"] = "1"  # USD; list.am использует 1=USD, 2=AMD, 3=RUB, 4=EUR

    listings: list[RawListing] = []
    page = 1

    with httpx.Client(
        headers={"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9,ru;q=0.8"},
        timeout=15.0,
        follow_redirects=True,
    ) as client:
        while len(listings) < target_count and page <= 10:
            q = dict(query)
            if page > 1:
                q["pn"] = page  # page number
            try:
                r = client.get(f"{BASE_URL}/category/56", params=q)
                r.raise_for_status()
            except httpx.HTTPError as exc:
                logger.warning("list.am request failed on page %s: %s", page, exc)
                break

            parsed = _parse_list_page(r.text)
            if not parsed:
                break
            listings.extend(parsed)
            page += 1

    return listings[:target_count]


def _parse_list_page(html: str) -> list[RawListing]:
    """Парсим страницу списка объявлений.

    Структура (на момент написания): div.gl > a (карточки). У каждой карточки:
      - href: ссылка на объявление
      - div.l: цена
      - div.at: адрес / район
      - div.p: заголовок
    Селекторы могут меняться — если ломается, начинаем с обновления здесь.
    """
    tree = HTMLParser(html)
    results: list[RawListing] = []

    for card in tree.css("div.gl a"):
        href = card.attributes.get("href", "")
        if not href.startswith("/item/"):
            continue

        external_id = href.split("/item/")[-1].rstrip("/")

        # Извлекаем заголовок / адрес.
        title_node = card.css_first("div.p")
        title = title_node.text(strip=True) if title_node else "list.am listing"

        district_node = card.css_first("div.at")
        district = district_node.text(strip=True) if district_node else None

        # Цена.
        price_node = card.css_first("div.l, div.p span")
        price_text = price_node.text(strip=True) if price_node else ""
        price, currency = _extract_price(price_text)
        if price is None:
            continue

        url = f"{BASE_URL}{href}"
        results.append(RawListing(
            source="list-am-browser",
            external_id=external_id,
            title=title[:200],
            url=url,
            country="AM",
            city="Yerevan",
            district=district,
            price=price,
            currency=currency,
        ))

    return results


def _extract_price(text: str) -> tuple[float | None, str]:
    """Цены на list.am: '$120,000', '120 000 ֏', '€85,000' и т.д."""
    # Уберём пробелы-разделители тысяч
    cleaned = text.replace("\xa0", " ").replace(",", "")
    m = re.search(r"([$€֏₽])?\s?([\d\s]+)\s?([$€֏₽a-zA-Zа-яА-Я]*)", cleaned)
    if not m:
        return None, "USD"

    raw = m.group(2).replace(" ", "")
    try:
        value = float(raw)
    except ValueError:
        return None, "USD"

    cur_symbol = (m.group(1) or m.group(3) or "").lower()
    currency_map = {"$": "USD", "€": "EUR", "֏": "AMD", "₽": "RUB", "usd": "USD", "amd": "AMD"}
    currency = currency_map.get(cur_symbol, "USD")

    # Цены вида 120 (без единиц измерения) — это, скорее всего, аренда в месяц.
    # Для MVP мы их пропускаем — фокус на продаже.
    if value < 1000:
        return None, currency

    return value, currency
