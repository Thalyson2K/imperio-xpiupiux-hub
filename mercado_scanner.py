import json
import os
import urllib.error
import urllib.request


SUPABASE_URL = os.environ.get(
    "SUPABASE_URL",
    "https://zvtammcfyqcrjgoovvyt.supabase.co",
).rstrip("/")
SUPABASE_KEY = os.environ.get(
    "SUPABASE_ANON_KEY",
    "sb_publishable_iXbUaclnDaI6d0mRQKbe5Q_LwDkid9Z",
)
REFERENCE_PRICES = {"WC": 600.0}


def analisar_e_publicar_item(
    nome_item: str,
    categoria: str,
    preco: float,
    moeda: str,
    vendedor: str,
) -> bool:
    """Publish one market item and print its discount against a known reference."""
    if not SUPABASE_KEY or SUPABASE_KEY.startswith("SUA_"):
        raise RuntimeError("Defina SUPABASE_ANON_KEY antes de publicar o item.")

    preco_numerico = float(preco)
    if preco_numerico < 0:
        raise ValueError("O preço não pode ser negativo.")

    moeda_normalizada = moeda.strip().upper()
    dados = {
        "nome_item": nome_item.strip(),
        "categoria": categoria.strip(),
        "preco": preco_numerico,
        "moeda": moeda_normalizada,
        "vendedor": vendedor.strip(),
        "link_anuncio": "https://mulotus.net",
    }

    if not dados["nome_item"] or not dados["categoria"] or not dados["vendedor"]:
        raise ValueError("Nome, categoria e vendedor são obrigatórios.")

    url = f"{SUPABASE_URL}/rest/v1/mercado_itens"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(dados).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            if response.status not in (200, 201, 204):
                print(f"[-] Supabase respondeu HTTP {response.status}.")
                return False
    except urllib.error.HTTPError as error:
        detalhe = error.read().decode("utf-8", errors="replace")
        print(f"[-] Erro HTTP {error.code} ao publicar item: {detalhe}")
        return False
    except urllib.error.URLError as error:
        print(f"[-] Erro de conexão ao publicar item: {error.reason}")
        return False

    referencia = REFERENCE_PRICES.get(moeda_normalizada)
    analise = "sem preço de referência"
    if referencia and referencia > 0:
        desconto = (1 - preco_numerico / referencia) * 100
        analise = f"{desconto:.0f}% abaixo da média" if desconto >= 0 else f"{abs(desconto):.0f}% acima da média"

    print(f"[+] Item '{dados['nome_item']}' ({preco_numerico:g} {moeda_normalizada}) publicado: {analise}.")
    return True


if __name__ == "__main__":
    print("--- SCANNER E ANALISADOR DE MERCADO MU LOTUS ATIVO ---")
    analisar_e_publicar_item(
        "Wing of Dragon +11 +L +16",
        "Asas / AZA",
        420,
        "WC",
        "Vendedor_Lotus",
    )
