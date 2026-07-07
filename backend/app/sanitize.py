import re

_SCRIPT = re.compile(r"<script\b[^>]*>.*?</script>", re.IGNORECASE | re.DOTALL)
_SCRIPT_ABERTO = re.compile(r"</?script\b[^>]*>", re.IGNORECASE)
_ON_ATTR = re.compile(r"\son\w+\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", re.IGNORECASE)


def limpar_html(html: str) -> str:
    """Remove <script> e handlers on* do HTML. Ferramenta de uso proprio,
    mas evita script embutido no corpo salvo."""
    if not html:
        return ""
    limpo = _SCRIPT.sub("", html)
    limpo = _SCRIPT_ABERTO.sub("", limpo)
    limpo = _ON_ATTR.sub("", limpo)
    return limpo
