import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from bs4 import BeautifulSoup


SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "https://zvtammcfyqcrjgoovvyt.supabase.co").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY") or "sb_publishable_iXbUaclnDaI6d0mRQKbe5Q_LwDkid9Z"
EVENTOS_CONFLICT = os.environ.get("SUPABASE_EVENTOS_CONFLICT", "nome")
INVASOES_URL = "https://mulotus.net/guide/invasoes"


def salvar_no_banco_supabase(tabela: str, dados_lista: list[dict[str, Any]]) -> bool:
    if not dados_lista:
        return True
    if not SUPABASE_KEY or SUPABASE_KEY.startswith("SUA_"):
        print("[-] Defina SUPABASE_ANON_KEY antes de sincronizar.")
        return False

    query = urllib.parse.urlencode({"on_conflict": EVENTOS_CONFLICT})
    request = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{tabela}?{query}",
        data=json.dumps(dados_lista).encode("utf-8"),
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            if response.status not in (200, 201, 204):
                print(f"[-] Supabase respondeu HTTP {response.status}.")
                return False
    except urllib.error.HTTPError as error:
        detalhe = error.read().decode("utf-8", errors="replace")
        print(f"[-] Erro HTTP {error.code} na sincronização: {detalhe}")
        return False
    except urllib.error.URLError as error:
        print(f"[-] Erro de conexão na sincronização: {error.reason}")
        return False

    print(f"[+] {len(dados_lista)} invasões sincronizadas com sucesso no Supabase.")
    return True


def extrair_invasoes_mulotus(html: str) -> list[dict[str, str]]:
    soup = BeautifulSoup(html, "html.parser")
    invasoes: list[dict[str, str]] = []

    for elemento in soup.select("table tbody tr, .guide-item"):
        colunas = elemento.find_all("td")
        if len(colunas) >= 3:
            nome = colunas[0].get_text(" ", strip=True)
            mapa = colunas[1].get_text(" ", strip=True)
            horarios = colunas[2].get_text(" ", strip=True)
        else:
            nome_elemento = elemento.select_one(".name, .title, .event-name")
            mapa_elemento = elemento.select_one(".map, .location")
            horario_elemento = elemento.select_one(".schedule, .time, .hours")
            if not nome_elemento or not horario_elemento:
                continue
            nome = nome_elemento.get_text(" ", strip=True)
            mapa = mapa_elemento.get_text(" ", strip=True) if mapa_elemento else "Não informado"
            horarios = horario_elemento.get_text(" ", strip=True)

        if nome and horarios:
            invasoes.append({
                "nome": nome,
                "mapa": mapa,
                "horarios": horarios,
                "categoria": "invasao",
            })

    unicas: dict[tuple[str, str], dict[str, str]] = {}
    for invasao in invasoes:
        unicas[(invasao["nome"].lower(), invasao["mapa"].lower())] = invasao
    return list(unicas.values())


def executar_sincronizacao() -> int:
    print("--- SINCRONIZANDO INVASÕES DO GUIA MU LOTUS ---")
    request = urllib.request.Request(
        INVASOES_URL,
        headers={"User-Agent": "Mozilla/5.0"},
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            html = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        print(f"[-] Mu Lotus respondeu HTTP {error.code}.")
        return 1
    except urllib.error.URLError as error:
        print(f"[-] Erro ao acessar o guia do Mu Lotus: {error.reason}")
        return 1

    invasoes = extrair_invasoes_mulotus(html)
    print(f"[+] Encontradas {len(invasoes)} invasões no guia.")
    return 0 if salvar_no_banco_supabase("eventos", invasoes) else 1


if __name__ == "__main__":
    raise SystemExit(executar_sincronizacao())
