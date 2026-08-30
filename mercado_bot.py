import json
import os
import re
import urllib.error
import urllib.request
from typing import Any

from bs4 import BeautifulSoup


SUPABASE_URL = os.environ.get(
    "SUPABASE_URL",
    "https://zvtammcfyqcrjgoovvyt.supabase.co",
).rstrip("/")
SUPABASE_KEY = os.environ.get(
    "SUPABASE_ANON_KEY",
    "sb_publishable_iXbUaclnDaI6d0mRQKbe5Q_LwDkid9Z",
)
MARKET_URL = "https://mulotus.net/market/items"
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
}


def enviar_para_supabase(item: dict[str, Any]) -> bool:
    """Send one scraped item to the public Supabase REST endpoint."""
    if not SUPABASE_KEY or SUPABASE_KEY.startswith("SUA_"):
        print("[-] Defina SUPABASE_ANON_KEY antes de enviar itens.")
        return False

    request = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/mercado_itens",
        data=json.dumps(item).encode("utf-8"),
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            if response.status not in (200, 201, 204):
                print(f"[-] Supabase respondeu HTTP {response.status}.")
                return False
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        print(f"[-] Erro HTTP {error.code} ao enviar item: {detail}")
        return False
    except urllib.error.URLError as error:
        print(f"[-] Erro de conexão com o Supabase: {error.reason}")
        return False

    print(f"[+] Item capturado e enviado: {item['nome_item']} ({item['preco']} {item['moeda']})")
    return True


def extrair_preco(preco_texto: str) -> float:
    """Extract the first numeric price, accepting decimal comma or dot."""
    match = re.search(r"\d+(?:[.,]\d+)?", preco_texto.replace(" ", ""))
    if not match:
        return 0.0
    return float(match.group().replace(",", "."))


def identificar_moeda(preco_texto: str) -> str:
    texto = preco_texto.upper()
    if "HP" in texto or "HUNT" in texto:
        return "HP"
    if "CREDIT" in texto or "CRÉDIT" in texto:
        return "CREDITOS"
    if "ZEN" in texto:
        return "ZEN"
    return "WC"


def identificar_categoria(nome: str) -> str:
    texto = nome.upper()
    if any(palavra in texto for palavra in ("WING", "ASA", "CAPE")):
        return "Asas / AZA"
    if any(palavra in texto for palavra in ("STAFF", "SWORD", "BOW", "CROSSBOW")):
        return "Armas / Swords"
    if "SHIELD" in texto:
        return "Escudos / Shields"
    if any(palavra in texto for palavra in ("JEWEL", "PACK")):
        return "Joias / Gems"
    return "Equipamentos"


def extrair_itens(html_page: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html_page, "html.parser")
    elementos = soup.select(".market-item, .card-item, tr.item-row, .item-card, .table tbody tr")
    itens: list[dict[str, Any]] = []

    for elemento in elementos:
        nome_elemento = elemento.select_one(".item-name, .title, .name, td:nth-child(2)")
        preco_elemento = elemento.select_one(".item-price, .price, td:nth-child(4)")
        vendedor_elemento = elemento.select_one(".seller, .author, td:nth-child(3)")
        if not nome_elemento or not preco_elemento:
            continue

        nome = nome_elemento.get_text(" ", strip=True)
        preco_texto = preco_elemento.get_text(" ", strip=True)
        itens.append({
            "nome_item": nome,
            "categoria": identificar_categoria(nome),
            "preco": extrair_preco(preco_texto),
            "moeda": identificar_moeda(preco_texto),
            "vendedor": vendedor_elemento.get_text(" ", strip=True) if vendedor_elemento else "Player MuLotus",
            "link_anuncio": MARKET_URL,
        })

    return itens


def executar_bot_mulotus() -> int:
    print("--- INICIANDO BOT RASPADOR DE MERCADO MU LOTUS ---")
    request = urllib.request.Request(MARKET_URL, headers=REQUEST_HEADERS)

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            html_page = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        print(f"[-] Site Mu Lotus respondeu HTTP {error.code}.")
        return 1
    except urllib.error.URLError as error:
        print(f"[-] Erro ao acessar o site Mu Lotus: {error.reason}")
        return 1

    itens = extrair_itens(html_page)
    print(f"[+] Encontrados {len(itens)} elementos de mercado na página.")
    enviados = sum(enviar_para_supabase(item) for item in itens)
    print(f"[+] Publicados {enviados} de {len(itens)} itens capturados.")
    return 0


if __name__ == "__main__":
    raise SystemExit(executar_bot_mulotus())
